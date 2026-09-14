// GET /api/passages?ref=Alma%2032:21&ref=Moroni%2010:4-5 — resolve references (public:
//   scripture text is public).
// POST /api/passages {text} — find and check every reference in an assistant answer,
//   bracketed or plain. Members only, since it accepts large bodies.
import { auth } from "@/lib/auth";
import { checkCitations, toCitationResult, type CitationResult } from "@/lib/citations-server";
import { resolveReference } from "@/lib/scriptures";

export type PassageResult = CitationResult;

export async function GET(req: Request) {
  const refs = new URL(req.url).searchParams.getAll("ref").slice(0, 40).map((r) => r.slice(0, 80));
  const results: PassageResult[] = await Promise.all(refs.map(async (ref) => toCitationResult(ref, await resolveReference(ref))));
  return Response.json({ results });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  if (typeof body?.text !== "string") return Response.json({ error: "Expected {text}." }, { status: 400 });
  return Response.json({ results: await checkCitations(body.text.slice(0, 60000)) });
}
