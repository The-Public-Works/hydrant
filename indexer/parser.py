"""Local-clone walker.

For each repo we:
  - shallow-clone (or `git fetch`) into the cache dir,
  - walk the tree at HEAD,
  - emit File records (with optional language detection),
  - emit Symbol records for Python files via stdlib `ast`,
  - split markdown files into DocChunk records by ATX heading.
"""

from __future__ import annotations

import ast
import logging
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger(__name__)

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".cache"}
TEXT_EXTS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java", ".rb", ".php",
    ".c", ".cc", ".cpp", ".h", ".hpp", ".cs", ".kt", ".swift", ".scala",
    ".md", ".rst", ".txt", ".yaml", ".yml", ".toml", ".json", ".sql",
}
MAX_FILE_BYTES = 512 * 1024  # skip blobs larger than 512 KiB


@dataclass
class FileRecord:
    path: str
    language: str | None
    size: int
    last_commit_sha: str | None = None
    last_commit_at: str | None = None


@dataclass
class SymbolRecord:
    file_path: str
    name: str           # e.g. "Foo.bar" or "module_level_fn"
    kind: str           # "function" | "class" | "method"
    line_start: int
    line_end: int
    body: str
    docstring: str | None = None


@dataclass
class DocChunkRecord:
    file_path: str
    section: str        # heading text or "<intro>"
    line_start: int
    line_end: int
    text: str


@dataclass
class WalkResult:
    head_sha: str
    default_branch: str
    files: list[FileRecord] = field(default_factory=list)
    symbols: list[SymbolRecord] = field(default_factory=list)
    doc_chunks: list[DocChunkRecord] = field(default_factory=list)


def _run_git(repo_dir: Path, *args: str) -> str:
    out = subprocess.run(
        ["git", "-C", str(repo_dir), *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return out.stdout.strip()


def ensure_clone(repo_url: str, dest: Path) -> Path:
    """Clone or update a working copy. Returns the local path."""
    if dest.exists() and (dest / ".git").exists():
        # Refresh
        try:
            _run_git(dest, "fetch", "--depth=1", "origin")
            default = _run_git(dest, "remote", "show", "origin")
            # Pull head_branch from `git remote show` output
            m = re.search(r"HEAD branch:\s*(\S+)", default)
            branch = m.group(1) if m else "main"
            _run_git(dest, "checkout", branch)
            _run_git(dest, "reset", "--hard", f"origin/{branch}")
        except subprocess.CalledProcessError:
            log.warning("fetch failed for %s, re-cloning", repo_url)
            subprocess.run(["rm", "-rf", str(dest)], check=True)
            return ensure_clone(repo_url, dest)
        return dest

    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["git", "clone", "--depth=50", repo_url, str(dest)],
        check=True,
        capture_output=True,
    )
    return dest


def _detect_language(path: Path) -> str | None:
    return {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".tsx": "tsx", ".jsx": "jsx", ".go": "go", ".rs": "rust",
        ".java": "java", ".rb": "ruby", ".php": "php", ".c": "c",
        ".cc": "cpp", ".cpp": "cpp", ".h": "c", ".hpp": "cpp",
        ".cs": "csharp", ".kt": "kotlin", ".swift": "swift",
        ".scala": "scala", ".md": "markdown", ".rst": "rst",
        ".sql": "sql",
    }.get(path.suffix)


def _extract_python_symbols(file_path: str, source: str) -> list[SymbolRecord]:
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []
    out: list[SymbolRecord] = []
    src_lines = source.splitlines()

    def _emit(node: ast.AST, name: str, kind: str) -> None:
        if not hasattr(node, "lineno"):
            return
        start = node.lineno
        end = getattr(node, "end_lineno", start) or start
        body = "\n".join(src_lines[start - 1 : end])
        # Truncate huge bodies so embeddings don't go through the roof
        if len(body) > 4000:
            body = body[:4000] + "\n# ...[truncated]"
        doc = ast.get_docstring(node) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) else None
        out.append(SymbolRecord(
            file_path=file_path, name=name, kind=kind,
            line_start=start, line_end=end, body=body, docstring=doc,
        ))

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            _emit(node, node.name, "function")
        elif isinstance(node, ast.ClassDef):
            _emit(node, node.name, "class")
            for sub in node.body:
                if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    _emit(sub, f"{node.name}.{sub.name}", "method")
    return out


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


def _split_markdown(file_path: str, source: str) -> list[DocChunkRecord]:
    """Split by ATX headings. Each heading starts a new chunk; pre-heading
    intro text becomes a `<intro>` chunk if non-empty."""
    lines = source.splitlines()
    out: list[DocChunkRecord] = []
    cur_section = "<intro>"
    cur_start = 1
    cur_lines: list[str] = []

    def _flush(end_lineno: int) -> None:
        text = "\n".join(cur_lines).strip()
        if text:
            out.append(DocChunkRecord(
                file_path=file_path, section=cur_section,
                line_start=cur_start, line_end=end_lineno, text=text,
            ))

    for i, line in enumerate(lines, start=1):
        m = _HEADING_RE.match(line)
        if m:
            _flush(i - 1)
            cur_section = m.group(2).strip()
            cur_start = i
            cur_lines = [line]
        else:
            cur_lines.append(line)
    _flush(len(lines))
    return out


def _last_commit_for(repo_dir: Path, rel_path: str) -> tuple[str | None, str | None]:
    try:
        out = subprocess.run(
            ["git", "-C", str(repo_dir), "log", "-1", "--format=%H%x09%cI", "--", rel_path],
            check=True, capture_output=True, text=True,
        ).stdout.strip()
        if not out:
            return None, None
        sha, _, when = out.partition("\t")
        return sha, when or None
    except subprocess.CalledProcessError:
        return None, None


def walk_repo(repo_dir: Path) -> WalkResult:
    head_sha = _run_git(repo_dir, "rev-parse", "HEAD")
    default_branch = ""
    try:
        # symbolic-ref of remote HEAD; falls back if upstream unset
        ref = _run_git(repo_dir, "symbolic-ref", "refs/remotes/origin/HEAD")
        default_branch = ref.rsplit("/", 1)[-1]
    except subprocess.CalledProcessError:
        default_branch = "main"

    result = WalkResult(head_sha=head_sha, default_branch=default_branch)

    for path in repo_dir.rglob("*"):
        if not path.is_file():
            continue
        rel_parts = path.relative_to(repo_dir).parts
        if any(part in SKIP_DIRS for part in rel_parts):
            continue
        if path.suffix.lower() not in TEXT_EXTS:
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        if size > MAX_FILE_BYTES:
            continue
        rel = "/".join(rel_parts)
        try:
            source = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        last_sha, last_when = _last_commit_for(repo_dir, rel)
        result.files.append(FileRecord(
            path=rel, language=_detect_language(path),
            size=size, last_commit_sha=last_sha, last_commit_at=last_when,
        ))
        if path.suffix == ".py":
            result.symbols.extend(_extract_python_symbols(rel, source))
        elif path.suffix == ".md":
            result.doc_chunks.extend(_split_markdown(rel, source))

    return result
