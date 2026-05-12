"""MongoDB Motor client with short selection timeout.

The default selection timeout is 30s which is way too long for a dev workflow.
If Mongo is unreachable, every async query blocks the uvicorn worker for 30s,
which looks identical to a backend hang from the frontend's perspective. 2s
fails fast — endpoints can fall back to empty data instead.
"""

from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient

from .config import settings

_client: AsyncIOMotorClient | None = None


def _get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.mongo_uri,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=10000,
        )
    return _client


def get_db():
    """Return the alacakai database. Connection is lazy — failures show up at query time."""
    return _get_client().alacakai


async def ping() -> dict:
    """Used by /health and the frontend status badge to check Mongo reachability."""
    try:
        await _get_client().admin.command("ping")
        return {"connected": True}
    except Exception as e:
        return {"connected": False, "error": str(e)[:200]}
