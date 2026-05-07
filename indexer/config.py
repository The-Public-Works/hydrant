import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    database_url: str
    github_token: str
    voyage_api_key: str
    voyage_model: str
    cache_dir: Path
    openrouter_api_key: str | None
    openrouter_model: str
    # Per-source tokens. Each is optional — ingestion subcommands fail with a
    # clear error if their source's token isn't set.
    slack_bot_token: str | None
    notion_api_key: str | None
    linear_api_key: str | None

    @classmethod
    def load(cls) -> "Config":
        return cls(
            database_url=os.environ["DATABASE_URL"],
            github_token=os.environ["GITHUB_TOKEN"],
            voyage_api_key=os.environ["VOYAGE_API_KEY"],
            voyage_model=os.getenv("VOYAGE_EMBED_MODEL", "voyage-3-lite"),
            cache_dir=Path(os.getenv("INDEXER_CACHE_DIR", "./.cache/repos")).resolve(),
            # Only required by the web demo; indexer & MCP server work without it.
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
            openrouter_model=os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5"),
            # Each required only by its matching `python -m indexer <source>` subcommand.
            slack_bot_token=os.getenv("SLACK_BOT_TOKEN"),
            notion_api_key=os.getenv("NOTION_API_KEY"),
            linear_api_key=os.getenv("LINEAR_API_KEY"),
        )
