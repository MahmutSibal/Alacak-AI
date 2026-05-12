from fastapi import APIRouter

from ..database import get_db

router = APIRouter(prefix="/agent-logs", tags=["agent-logs"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id", ""))
    if "ts" in doc:
        doc["ts"] = doc["ts"].isoformat() if hasattr(doc["ts"], "isoformat") else str(doc["ts"])
    return doc


@router.get("/")
async def list_logs(limit: int = 20):
    try:
        db = get_db()
        cursor = db.agent_logs.find({}).sort("ts", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [_serialize(d) for d in docs]
    except Exception:
        return []


@router.get("/summary")
async def agent_summary():
    try:
        db = get_db()
        total = await db.agent_logs.count_documents({})
        by_agent: dict[str, int] = {}
        for agent in ["orchestrator", "monitoring", "risk", "communication", "proposal", "cashflow"]:
            try:
                by_agent[agent] = await db.agent_logs.count_documents({"agent": agent})
            except Exception:
                by_agent[agent] = 0
        return {"total": total, "by_agent": by_agent}
    except Exception:
        return {"total": 0, "by_agent": {}}
