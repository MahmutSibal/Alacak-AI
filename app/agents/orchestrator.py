import asyncio
from datetime import datetime
from ..database import get_db
from .monitoring_agent import MonitoringAgent
from .risk_agent import RiskAgent
from .communication_agent import CommunicationAgent
from .proposal_agent import ProposalAgent
from .cashflow_agent import CashflowAgent


class Orchestrator:
    def __init__(self):
        self.db = get_db()
        self.monitor = MonitoringAgent()
        self.risk = RiskAgent()
        self.comm = CommunicationAgent()
        self.proposal = ProposalAgent()
        self.cashflow = CashflowAgent()

    async def log(self, agent: str, message: str, meta: dict | None = None):
        await self.db.agent_logs.insert_one({"agent": agent, "message": message, "meta": meta or {}, "ts": datetime.utcnow()})

    async def _heartbeat(self):
        await self.log('orchestrator', 'heartbeat')

    async def run(self):
        # Basit scheduler: ajanların periyodik tetiklenmesi
        await self.log('orchestrator', 'starting')
        while True:
            try:
                await self._heartbeat()
                # Örnek: kritik müşterileri kontrol edip risk analizi çalıştır
                krit = self.db.customers.find({"is_critical": True})
                async for c in krit:
                    await self.risk.analyze_customer(str(c.get('_id')), {"recent_invoices": []})
                # Günlük cashflow güncellemesi
                await self.cashflow.simulate('company_default', horizon_days=90)
            except Exception as e:
                await self.log('orchestrator', 'error', {"error": str(e)})
            await asyncio.sleep(30)

