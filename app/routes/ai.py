from datetime import datetime, date
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Request

from ..database import get_db
from ..agents.communication_agent import CommunicationAgent
from ..agents.proposal_agent import ProposalAgent
from ..agents.llm_client import generate_text, stream_text
from ..services.auth_service import AuthService
from ..utils.access_control import company_filter, get_company_name, get_current_user, require_roles
import json
import re

router = APIRouter(prefix="/ai", tags=["ai"])
_comm = CommunicationAgent()
_proposal = ProposalAgent()


def _extract_text(d: any) -> str:
    if d is None:
        return ""
    if isinstance(d, str):
        return d
    if isinstance(d, dict):
        if isinstance(d.get("outputText"), str):
            return d.get("outputText")
        if isinstance(d.get("text"), str):
            return d.get("text")
        if isinstance(d.get("result"), dict):
            r = d.get("result")
            if isinstance(r.get("text"), str):
                return r.get("text")
        if d.get("error"):
            err = d.get("error")
            return err.get("message") if isinstance(err, dict) and err.get("message") else str(err)
        if isinstance(d.get("choices"), list) and d.get("choices"):
            c = d.get("choices")[0]
            if isinstance(c, dict):
                return c.get("message", {}).get("content") or c.get("text") or str(c)
        if isinstance(d.get("output"), list) and d.get("output"):
            o = d.get("output")[0]
            if isinstance(o, dict) and isinstance(o.get("text"), str):
                return o.get("text")
        try:
            return str(d)
        except Exception:
            return ""
    return str(d)


auth_service = AuthService()


def _parse_dt(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", ""))
        except Exception:
            return None
    return None


def _invoice_amount(invoice: dict) -> float:
    try:
        return float(invoice.get("tutar") or invoice.get("parsed", {}).get("tutar") or 0)
    except Exception:
        return 0.0


def _is_overdue(invoice: dict, today: datetime) -> bool:
    if str(invoice.get("durum") or "").lower() == "ödendi":
        return False
    due = _parse_dt(invoice.get("vade_tarihi"))
    return bool(due and due < today)


def _month_label(dt: datetime) -> str:
    months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
    return months[dt.month - 1]


def _cashflow_series(invoices: list[dict], horizon_days: int) -> list[dict]:
    steps = 12 if horizon_days >= 365 else 3 if horizon_days >= 90 else 2 if horizon_days >= 60 else 1
    today = datetime.utcnow()
    month_start = datetime(today.year, today.month, 1)
    series: list[dict] = []

    for step in range(steps):
        idx = month_start.month - 1 + step
        year = month_start.year + idx // 12
        month = idx % 12 + 1
        period_start = datetime(year, month, 1)
        next_idx = idx + 1
        next_year = month_start.year + next_idx // 12
        next_month = next_idx % 12 + 1
        period_end = datetime(next_year, next_month, 1)

        tahsilat = 0.0
        gider = 0.0

        for inv in invoices:
            amount = _invoice_amount(inv)
            due = _parse_dt(inv.get("vade_tarihi"))
            created = _parse_dt(inv.get("created_at"))
            status = str(inv.get("durum") or "").lower()

            if status == "ödendi":
                if created and period_start <= created < period_end:
                    tahsilat += amount
                continue

            if due and period_start <= due < period_end:
                tahsilat += amount * 0.75
                gider += amount * 0.15

        series.append({"ay": _month_label(period_start), "tahsilat": round(tahsilat), "gider": round(gider), "net": round(tahsilat - gider)})

    return series


def _top_risk_customers(customers: list[dict], limit: int = 5) -> list[dict]:
    ranked = []
    for c in customers:
        risk = c.get("risk") if isinstance(c.get("risk"), dict) else {}
        score = int(risk.get("risk_score", 0) or 0)
        ranked.append({
            "id": str(c.get("_id", "")),
            "isim": c.get("isim", "—"),
            "score": score,
            "acik_borc": c.get("acik_borc", 0),
            "sektor": c.get("sektor"),
            "payment_probability": risk.get("payment_probability"),
            "recommended_action": risk.get("recommended_action"),
        })
    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked[:limit]


def _risk_label(score: int) -> str:
    if score >= 70:
        return "Kritik"
    if score >= 50:
        return "Yüksek"
    if score >= 30:
        return "Orta"
    return "Düşük"


async def _company_snapshot(user: dict) -> dict[str, Any]:
    db = get_db()
    company_name = get_company_name(user)
    scope = company_filter(company_name)
    today = datetime.utcnow()

    invoices = await db.invoices.find(scope).to_list(length=2000)
    customers = await db.customers.find(scope).to_list(length=1000)
    overdue_invoices = [inv for inv in invoices if _is_overdue(inv, today)]
    total_amount = sum(_invoice_amount(inv) for inv in invoices)
    overdue_amount = sum(_invoice_amount(inv) for inv in overdue_invoices)
    risk_customers = _top_risk_customers(customers, 5)

    this_month_paid = 0.0
    for inv in invoices:
        if str(inv.get("durum") or "").lower() == "ödendi":
            created = _parse_dt(inv.get("created_at"))
            if created and created.year == today.year and created.month == today.month:
                this_month_paid += _invoice_amount(inv)

    cashflow_90 = _cashflow_series(invoices, 90)
    cashflow_365 = _cashflow_series(invoices, 365)

    return {
        "company_name": company_name,
        "invoice_count": len(invoices),
        "customer_count": len(customers),
        "total_amount": round(total_amount),
        "overdue_count": len(overdue_invoices),
        "overdue_amount": round(overdue_amount),
        "this_month_paid": round(this_month_paid),
        "risk_customers": risk_customers,
        "overdue_invoices": [
            {
                "id": str(inv.get("_id", "")),
                "fatura_no": inv.get("fatura_no") or "—",
                "firma_adi": inv.get("firma_adi") or "—",
                "tutar": _invoice_amount(inv),
                "vade_tarihi": inv.get("vade_tarihi"),
                "musteri_id": inv.get("musteri_id"),
            }
            for inv in overdue_invoices[:10]
        ],
        "cashflow_90": cashflow_90,
        "cashflow_365": cashflow_365,
        "risk_summary": {
            "risk_rate": round((overdue_amount / total_amount) * 100) if total_amount else 0,
            "risk_label": _risk_label(round((overdue_amount / total_amount) * 100) if total_amount else 0),
        },
    }


async def _generate_contextual_answer(prompt: str, snapshot: dict[str, Any], system_hint: str) -> str:
    res = await generate_text(
        prompt=json.dumps({"prompt": prompt, "data": snapshot}, ensure_ascii=False),
        system=system_hint,
        temperature=0.2,
    )
    if isinstance(res, dict) and res.get("text"):
        return res["text"]
    if isinstance(res, dict) and res.get("error"):
        return f"AI yanıtı üretilemedi: {res['error']}"
    return str(res)


async def _answer_with_data(prompt: str, user: dict) -> dict[str, Any]:
    snapshot = await _company_snapshot(user)
    lowered = prompt.lower()

    if any(k in lowered for k in ["tahsilat risk", "riskim", "risk nedir"]):
        answer = await _generate_contextual_answer(
            prompt,
            snapshot,
            "Sen bir finans analiz asistanısın. Sadece verilen veriyle konuş. Kısa, net ve sayısal cevap ver. Tahsilat riski, yüzde ve gerekçe üret.",
        )
        return {"mode": "risk_summary", "text": answer, "data": snapshot}

    if any(k in lowered for k in ["en riskli", "riskli müşterileri"]):
        answer = await _generate_contextual_answer(
            prompt,
            snapshot,
            "Sen bir finans analiz asistanısın. Verilen müşteri listesini en riskli olandan başlayarak özetle. İstersen madde madde ver.",
        )
        return {"mode": "top_risk_customers", "text": answer, "data": {"risk_customers": snapshot["risk_customers"]}}

    if any(k in lowered for k in ["geciken faturalar", "mesaj oluştur", "mesaj hazırla"]):
        overdue = snapshot["overdue_invoices"]
        if not overdue:
            return {"mode": "message_draft", "text": "Şu anda geciken fatura görünmüyor.", "data": snapshot}

        invoice = overdue[0]
        db = get_db()
        customer = None
        if invoice.get("musteri_id"):
            try:
                customer = await db.customers.find_one({"_id": ObjectId(invoice["musteri_id"]), **company_filter(get_company_name(user))})
            except Exception:
                customer = None
        if not customer:
            customer = await db.customers.find_one({**company_filter(get_company_name(user)), "isim": invoice.get("firma_adi")})
        if not customer:
            customer = {"isim": invoice.get("firma_adi", "Müşteri"), "risk": {"risk_score": 50}}

        message = await _comm.create_message(
            customer,
            {"amount": invoice["tutar"], "due_date": invoice.get("vade_tarihi")},
            channel="whatsapp",
        )
        draft_text = ""
        if isinstance(message, dict):
            draft_text = message.get("body") or message.get("error") or "Mesaj taslağı oluşturulamadı."
        else:
            draft_text = str(message)
        return {
            "mode": "message_draft",
            "text": draft_text,
            "data": {"invoice": invoice, "customer": customer, "message": message},
        }

    if any(k in lowered for k in ["nakit akışı", "nakit akisi", "nakit akış", "tahminimi analiz"]):
        answer = await _generate_contextual_answer(
            prompt,
            snapshot,
            "Sen bir CFO analiz asistanısın. Verilen nakit akışı serisini yorumla. 30/60/90 ve 1y görünümünde riskli dönemleri, güçlü tarafları ve 3 öneri ver.",
        )
        return {"mode": "cashflow_analysis", "text": answer, "data": {"cashflow_90": snapshot["cashflow_90"], "cashflow_365": snapshot["cashflow_365"]}}

    if any(k in lowered for k in ["yapılandırma", "yapilandirma", "öner", "oner"]):
        proposals = []
        db = get_db()
        for customer in snapshot["risk_customers"][:3]:
            try:
                customer_doc = await db.customers.find_one({"_id": ObjectId(customer["id"]), **company_filter(get_company_name(user))})
            except Exception:
                customer_doc = None
            if not customer_doc:
                continue
            overdue_invoice = next((inv for inv in snapshot["overdue_invoices"] if str(inv.get("musteri_id")) == customer["id"]), None)
            if not overdue_invoice:
                overdue_invoice = snapshot["overdue_invoices"][0] if snapshot["overdue_invoices"] else None
            if not overdue_invoice:
                continue
            proposal = await _proposal.propose({"_id": overdue_invoice["id"], **overdue_invoice}, customer_doc)
            proposals.append({"customer": customer_doc.get("isim"), "score": customer["score"], "proposal": proposal})
        answer = await _generate_contextual_answer(
            prompt,
            snapshot,
            "Sen bir yeniden yapılandırma uzmanısın. Kritik müşteriler için kısa, uygulanabilir teklif özeti ver. Sayı ve koşulları somutlaştır.",
        )
        return {"mode": "restructuring", "text": answer, "data": {"proposals": proposals}}

    answer = await _generate_contextual_answer(
        prompt,
        snapshot,
        "Sen AlacakAI'nin veri analistisin. Sohbet etmiyorsun; verilen şirket verisini kullanarak kısa, net ve eylem odaklı cevap ver. Veri dışı bilgi uydurma.",
    )
    # Post-process assistant text: strip casual greetings and, when data is sparse,
    # produce a deterministic, concise numeric summary instead of a chatty reply.
    def _strip_greeting(t: str) -> str:
        if not t:
            return t
        t = t.strip()
        # remove common salutations at start
        t = re.sub(r'^(merhaba[,\.!\s]*|selam[,\.!\s]*|hello[,\.!\s]*)+', '', t, flags=re.I)
        return t.strip()

    def _snapshot_summary(snap: dict) -> str:
        # Build a concise, data-first summary in Turkish
        lines = []
        lines.append(f"Firma: {snap.get('company_name') or '—'}")
        lines.append(f"Faturalar: {snap.get('invoice_count', 0)} | Müşteriler: {snap.get('customer_count', 0)} | Toplam tutar: {snap.get('total_amount', 0)} TL")
        lines.append(f"Geciken faturalar: {snap.get('overdue_count', 0)} adet | Geciken toplam: {snap.get('overdue_amount', 0)} TL")
        lines.append(f"Bu ay tahsilat: {snap.get('this_month_paid', 0)} TL")
        # cashflow brief
        cf90 = snap.get('cashflow_90', [])
        if cf90:
            cf_lines = ", ".join([f"{c.get('ay')}: {c.get('tahsilat',0)}" for c in cf90])
            lines.append(f"90g nakit (tahsilat): {cf_lines}")
        # risk
        rs = snap.get('risk_summary', {})
        lines.append(f"Risk oranı: {rs.get('risk_rate',0)}% — Etiket: {rs.get('risk_label','Düşük')}")
        return "\n".join(lines)

    cleaned = _strip_greeting(answer)
    # If dataset is essentially empty, prefer the deterministic summary
    if snapshot.get('invoice_count', 0) == 0 and snapshot.get('customer_count', 0) == 0:
        final_text = _snapshot_summary(snapshot)
    else:
        # keep model answer but remove casual lead-ins and excessive whitespace
        final_text = re.sub(r'\s{2,}', ' ', cleaned).strip()

    return {"mode": "general_analysis", "text": final_text, "data": snapshot}


@router.post('/chat')
async def chat(payload: dict, request: Request):
    prompt = payload.get('prompt')
    if not prompt:
        raise HTTPException(status_code=400, detail='prompt gereklidir')
    user = await get_current_user(request)
    require_roles(user, {"admin", "finans_sorumlusu", "tahsilat_elemani", "muhasebe_veri_giris"})
    result = await _answer_with_data(prompt, user)
    return {"result": result}


@router.websocket('/ws')
async def websocket_chat(ws: WebSocket):
    token = ws.query_params.get('token')
    if not token:
        await ws.accept()
        await ws.send_text(json.dumps({"error": "token gerekli"}))
        await ws.close()
        return

    decoded = auth_service.decode_access_token(token)
    if not decoded:
        await ws.accept()
        await ws.send_text(json.dumps({"error": "geçersiz token"}))
        await ws.close()
        return

    await ws.accept()
    try:
        while True:
            data = await ws.receive_text()
            try:
                payload = json.loads(data)
            except Exception:
                await ws.send_text(json.dumps({"error": "geçersiz json"}))
                continue
            prompt = payload.get('prompt')
            if not prompt:
                await ws.send_text(json.dumps({"error": "prompt gerekli"}))
                continue
            model = payload.get('model')
            async for chunk in stream_text(prompt, model_name=model, temperature=payload.get('temperature', 0.2)):
                await ws.send_text(json.dumps({"type": "chunk", "data": str(chunk)}))
            await ws.send_text(json.dumps({"type": "done"}))
    except WebSocketDisconnect:
        return
