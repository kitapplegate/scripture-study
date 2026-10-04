// POST /api/deep-study/passages {text} — find and check every reference in a Deep Study
// chat answer: scripture as usual, plus Deep Study passages ("Antiquities 7.13.1"),
// which come back marked deepStudy. Members only, like /api/passages POST.
import { auth } from "@/lib/auth";
import { checkDeepStudyCitations } from "@/lib/deep-study-assistant";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  if (typeof body?.text !== "string") return Response.json({ error: "Expected {text}." }, { status: 400 });
  return Response.json({ results: await checkDeepStudyCitations(body.text.slice(0, 60000)) });
}
