"""CLI entrypoint.

Usage:
    python -m indexer <repo-url-or-slug>            (legacy, == github)
    python -m indexer github <repo-url-or-slug>
    python -m indexer slack  [--channels GLOB ...]
    python -m indexer notion
    python -m indexer linear [--teams KEY ...]
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys

from .config import Config


def _add_github_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("repo", help="GitHub repo URL or owner/name slug")


def _add_slack_args(p: argparse.ArgumentParser) -> None:
    p.add_argument(
        "--channels",
        action="append",
        metavar="GLOB",
        help=(
            "Channel name glob to include (e.g. 'incident-*'). May be repeated. "
            "If omitted, ingests every channel the bot is in."
        ),
    )


def _add_notion_args(p: argparse.ArgumentParser) -> None:
    # Notion has no useful filter at the API level — `/search` is workspace-wide
    # and the integration only sees what's been explicitly shared with it. So
    # there's nothing to flag here yet; reserved for future scope filters.
    pass


def _add_linear_args(p: argparse.ArgumentParser) -> None:
    p.add_argument(
        "--teams",
        nargs="+",
        metavar="KEY",
        help=(
            "Linear team keys to include (e.g. ENG OPS). "
            "If omitted, ingests every team the API key can see."
        ),
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="indexer", description=__doc__)
    parser.add_argument("-v", "--verbose", action="store_true")

    sub = parser.add_subparsers(dest="source")

    p_gh = sub.add_parser("github", help="Index a GitHub repo (default).")
    _add_github_args(p_gh)

    p_sl = sub.add_parser("slack", help="Index Slack channels & threads.")
    _add_slack_args(p_sl)

    p_no = sub.add_parser("notion", help="Index Notion pages & databases.")
    _add_notion_args(p_no)

    p_li = sub.add_parser("linear", help="Index Linear issues & comments.")
    _add_linear_args(p_li)

    # Backward compatibility: a positional that looks like a repo means
    # "github <repo>". This keeps the README's existing one-arg invocation
    # working: `python -m indexer https://github.com/foo/bar`. Argparse's
    # subparsers reject unknown choices at parse time, so we have to
    # detect-and-rewrite *before* invoking the parser.
    raw = list(argv) if argv is not None else sys.argv[1:]
    SOURCES = {"github", "slack", "notion", "linear"}
    flags = {"-h", "--help", "-v", "--verbose"}
    first_positional = next((a for a in raw if not a.startswith("-")), None)
    if first_positional is not None and first_positional not in SOURCES:
        # Prepend "github" so the legacy `indexer <repo>` invocation routes
        # through the github subparser. We only do this when the user clearly
        # didn't ask for a different source.
        # Insertion point: before the first non-flag argument.
        idx = raw.index(first_positional)
        raw = [*raw[:idx], "github", *raw[idx:]]

    args = parser.parse_args(raw)
    if args.source is None:
        parser.error("missing source: try `github <repo>` or `slack`")
    _ = flags  # kept for readability; argparse handles -h / -v itself

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
    cfg = Config.load()

    # Lazy imports so a missing-token misconfig in one source doesn't break
    # the other sources' CLI parse — and so unrelated import failures don't
    # punish a connector you're not using.
    if args.source == "github":
        from .run import index_repo
        stats = asyncio.run(index_repo(args.repo, cfg))
    elif args.source == "slack":
        from .slack_run import index_slack
        stats = asyncio.run(index_slack(channels=args.channels, cfg=cfg))
    elif args.source == "notion":
        from .notion_run import index_notion
        stats = asyncio.run(index_notion(cfg=cfg))
    elif args.source == "linear":
        from .linear_run import index_linear
        stats = asyncio.run(index_linear(team_keys=args.teams, cfg=cfg))
    else:  # pragma: no cover
        parser.error(f"unknown source: {args.source}")

    print(stats)
    return 0


if __name__ == "__main__":
    sys.exit(main())
