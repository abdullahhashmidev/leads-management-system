import { requireAdmin } from "@/lib/admin/auth";
import { LogoutButton, Nav, ThemeToggle } from "./_components/actions";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="shell">
      <aside className="sb">
        <div className="brand"><span className="logo">LM</span>Leads Console</div>
        <Nav />
        <div className="grow" />
        <LogoutButton />
      </aside>
      <div className="main">
        <header className="top">
          <span className="who">Owner console</span>
          <ThemeToggle />
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
