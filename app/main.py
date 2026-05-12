from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .agents.personas import list_personas
from .database import ping as ping_mongo
from .routes import agent_logs, ai, auth, customers, invoices, risk, whatsapp

app = FastAPI(title="AlacakAI API", version="1.1.0", docs_url="/docs", redoc_url="/redoc")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(ai.router)
app.include_router(customers.router)
app.include_router(agent_logs.router)
app.include_router(risk.router)
app.include_router(whatsapp.router)


@app.get("/health")
async def health():
    """Liveness probe — never blocks. Surfaces dependency status to the dashboard."""
    return {
        "status": "ok",
        "service": "AlacakAI API",
        "version": "1.1.0",
        "mongo": await ping_mongo(),
    }


@app.get("/agents/personas")
async def get_personas():
    """Surface the four LLM personas to the frontend (Settings, status panel)."""
    return {"personas": list_personas()}
