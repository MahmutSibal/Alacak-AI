import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Allow large invoice PDFs/images up to 25MB.
export const maxDuration = 120;

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Multipart upload proxy.
 *
 * Next.js's `rewrites()` proxy is unreliable with multipart/form-data in App
 * Router dev mode — it can swallow the body and return a 400
 * "There was an error parsing the body" before the request ever reaches the
 * backend. We bypass that here by re-forwarding the FormData ourselves.
 */
export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { detail: `Form verisi okunamadı: ${msg}` },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "file alanı gerekli" }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.append("file", file, file.name);

  const headers: Record<string, string> = {};
  const auth = req.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND}/invoices/upload`, {
      method: "POST",
      headers,
      body: outbound,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { detail: `Backend ulaşılamadı: ${msg}` },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { detail: text || `HTTP ${upstream.status}` };
  }
  return NextResponse.json(payload, { status: upstream.status });
}
