"""CLI entrypoint: `python -m indexer <repo-url-or-slug>`."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys

from .config import Config
from .run import index_repo


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="indexer", description=__doc__)
    parser.add_argument("repo", help="GitHub repo URL or owner/name slug")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
    cfg = Config.load()
    stats = asyncio.run(index_repo(args.repo, cfg))
    print(stats)
    return 0


if __name__ == "__main__":
    sys.exit(main())
