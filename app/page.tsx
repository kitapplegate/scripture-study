import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { ComeFollowMeCard } from "@/components/ComeFollowMeCard";
import { PostCard } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { assistantConfigured, assistantProviderLabels } from "@/lib/llm";
import { listFeed } from "@/lib/posts";
import { getSession } from "@/lib/session";

const HOME_POSTS = 10;

// Signed in: the family feed beside the study assistant. Signed out: a welcome page.
// The "wide" wrapper widens the layout's reading column for this page (see layout.tsx).
export default async function HomePage() {
  const session = await getSession().catch((err: Error) => {
    unstable_rethrow(err);
    console.warn(`[home] session lookup failed, showing welcome page: ${err.message}`);
    return null;
  });
  if (!session) return <Welcome />;

  const user = session.user;
  const posts = (await listFeed(user.id)).slice(0, HOME_POSTS);
  const providers = assistantProviderLabels();

  return (
    <div className="wide">
      <h1 className="mb-6 font-serif text-3xl font-semibold">Welcome, {user.name.split(" ")[0]}</h1>
      <ComeFollowMeCard />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
        <section aria-labelledby="feed-heading" className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="feed-heading" className="font-serif text-xl font-semibold">Family feed</h2>
            <Link href="/feed" className="text-sm text-muted hover:text-accent">All posts →</Link>
          </div>
          <div className="mb-4 rounded-xl border border-line bg-card p-4">
            <PostComposer returnTo="/" />
            <p className="mt-2 text-xs text-muted">Or tap any verse while you're reading, then Share.</p>
          </div>
          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
              Nothing shared yet. <Link href="/scriptures" className="text-accent underline">Open the library</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} viewer={user} returnTo="/" />
              ))}
            </div>
          )}
        </section>

        <aside
          aria-labelledby="assistant-heading"
          className="rounded-xl border border-line bg-card p-4 max-lg:order-first lg:sticky lg:top-28"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="assistant-heading" className="font-serif text-xl font-semibold">Study assistant</h2>
            <Link href="/study" className="text-sm text-muted hover:text-accent">Full page →</Link>
          </div>
          {assistantConfigured() ? (
            <AssistantChat compact userId={user.id} />
          ) : (
            <p className="text-sm text-muted">The assistant isn't set up yet.</p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted">
            AI answers can be wrong and aren't Church doctrine; cited verses are checked against the real text. What you
            type goes to outside AI services{providers.length ? ` (${providers.join(", ")})` : ""}, so don't include private
            information.
            {providers.includes("Google Gemini") && " Google may use and review it to improve its products."}
          </p>
        </aside>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: "The standard works",
    body: "The Old and New Testaments (KJV), the Book of Mormon, the Doctrine and Covenants, and the Pearl of Great Price, with Bible cross-references.",
  },
  {
    title: "A family feed",
    body: "Share a verse with what it means to you. React, comment, and keep each other going.",
  },
  {
    title: "A study assistant",
    body: "Find scriptures on any topic. Every verse it cites is checked against the real text.",
  },
];

function Welcome() {
  return (
    <div className="wide">
      <section className="mx-auto max-w-2xl py-10 text-center sm:py-16">
        <h1 className="font-serif text-4xl font-semibold sm:text-5xl">Knit</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Read the scriptures together with family and friends, share what you're learning, and find scriptures on
          any topic with a study assistant.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/sign-in" className="rounded-lg bg-accent px-5 py-2.5 font-medium text-bg">Sign in</Link>
          <Link href="/scriptures" className="rounded-lg border border-control px-5 py-2.5 hover:border-accent">
            Browse the scriptures
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted">Membership is by invitation from a family member.</p>
      </section>
      <ul className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="rounded-xl border border-line bg-card p-5">
            <h2 className="font-serif text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
