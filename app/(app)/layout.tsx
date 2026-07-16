import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopChrome } from "@/components/TopChrome";
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
    <div className="app-shell premium-shell">
      <Sidebar />
      <div className="main-wrap">
        <TopChrome clients={clients} />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
