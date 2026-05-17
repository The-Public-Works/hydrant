import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    database_url: str
    github_token: str
    openai_api_key: str
    openai_embed_model: str
    embed_dim: int
    cache_dir: Path
    openrouter_api_key: str | None
    openrouter_model: str
    # Per-source tokens. Each is optional — ingestion subcommands fail with a
    # clear error if their source's token isn't set.
    slack_bot_token: str | None
    notion_api_key: str | None
    linear_api_key: str | None
    # GitHub ingestion tunables (all overridable via env / CLI). 0 = uncapped.
    max_prs: int
    max_issues: int
    pr_files_max_age_days: int
    github_concurrency: int
    pr_files_batch_size: int
    embed_concurrency: int

    @classmethod
    def load(cls) -> "Config":
        return cls(
            database_url=os.environ["DATABASE_URL"],
            github_token=os.environ["GITHUB_TOKEN"],
            openai_api_key=os.environ["OPENAI_API_KEY"],
            openai_embed_model=os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
            embed_dim=int(os.getenv("EMBED_DIM", "1536")),
            cache_dir=Path(os.getenv("INDEXER_CACHE_DIR", "./.cache/repos")).resolve(),
            # Only required by the web demo; indexer & MCP server work without it.
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
            openrouter_model=os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5"),
            # Each required only by its matching `python -m indexer <source>` subcommand.
            slack_bot_token=os.getenv("SLACK_BOT_TOKEN"),
            notion_api_key=os.getenv("NOTION_API_KEY"),
            linear_api_key=os.getenv("LINEAR_API_KEY"),
            max_prs=int(os.getenv("INDEXER_MAX_PRS", "0")),
            max_issues=int(os.getenv("INDEXER_MAX_ISSUES", "0")),
            pr_files_max_age_days=int(os.getenv("INDEXER_PR_FILES_MAX_AGE_DAYS", "180")),
            github_concurrency=int(os.getenv("INDEXER_GITHUB_CONCURRENCY", "16")),
            pr_files_batch_size=int(os.getenv("INDEXER_PR_FILES_BATCH", "16")),
            embed_concurrency=int(os.getenv("INDEXER_EMBED_CONCURRENCY", "16")),
        )
