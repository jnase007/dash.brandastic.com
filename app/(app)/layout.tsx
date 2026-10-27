import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EmbedAwareShell } from "@/components/EmbedAwareShell";
import { isAuthed } from "@/lib/auth";
import { CLIENTS } from "@/lib/clients";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthed())) redirect("/login");
  const clients = CLIENTS.map((c) => ({ name: c.name, slug: c.slug }));
  return (
    <Suspense fallback={<main className="main">{children}</main>}>
      <EmbedAwareShell clients={clients}>{children}</EmbedAwareShell>
    </Suspense>
  );
}
