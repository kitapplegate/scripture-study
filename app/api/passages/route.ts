// GET /api/passages?ref=Alma%2032:21&ref=Moroni%2010:4-5 — resolve references (public:
//   scripture text is public). Used by the talk editor's Insert scripture box.
// POST /api/passages {text} — find and check every reference in an answer or draft,
//   bracketed or plain. Members only, since it accepts large bodies.
import { auth } from "@/lib/auth";
import { checkCitations, type CitationResult } from "@/lib/citations-server";
import { resolveReference } from "@/lib/scriptures";

export type PassageResult = CitationResult;

export async function GET(req: Request) {
  const refs = new URL(req.url).searchParams.getAll("ref").slice(0, 40).map((r) => r.slice(0, 80));
  const results: PassageResult[] = await Promise.all(
    refs.map(async (ref) => {
      const p = await resolveReference(ref);
      return p ? { ref, found: true as const, reference: p.reference, href: p.href, verses: p.verses } : { ref, found: false as const };
    }),
  );
  return Response.json({ results });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  if (typeof body?.text !== "string") return Response.json({ error: "Expected {text}." }, { status: 400 });
  return Response.json({ results: await checkCitations(body.text.slice(0, 60000)) });
}
