import type { Metadata } from "next";
import { CreateInviteForm } from "@/components/CreateInviteForm";
import { listInvites, type InviteRow } from "@/lib/invites";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Invites" };

function status(invite: InviteRow) {
  if (invite.used_by_name) return `Joined as ${invite.used_by_name}`;
  if (invite.claimed_at) return "Sign-up in progress";
  if (invite.expires_at < new Date()) return "Expired";
  return "Open";
}

export default async function AdminPage() {
  await requireAdmin();
  const invites = await listInvites();

  return (
    <>
      <h1 className="mb-6 font-serif text-3xl font-semibold">Invites</h1>
      <CreateInviteForm />
      <h2 className="mb-3 mt-8 text-xs uppercase tracking-wide text-muted">Recent invites</h2>
      {invites.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-4 font-normal">For</th>
                <th className="py-2 pr-4 font-normal">Role</th>
                <th className="py-2 pr-4 font-normal">Created</th>
                <th className="py-2 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invites.map((i) => (
                <tr key={i.id}>
                  <td className="py-2 pr-4">{i.note ?? "—"}</td>
                  <td className="py-2 pr-4">{i.role}</td>
                  <td className="py-2 pr-4">{i.created_at.toLocaleDateString()}</td>
                  <td className="py-2">{status(i)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
