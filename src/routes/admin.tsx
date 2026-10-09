import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — B&B management" }, { name: "description", content: "Owner dashboard for bookings, rooms and settings." }, { property: "og:title", content: "Admin" }, { property: "og:description", content: "Owner dashboard." }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  useEffect(() => {
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" || e === "SIGNED_OUT") setSession(s); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session || !supabase) { setIsStaff(null); return; }
    supabase.rpc("is_staff", { _user_id: session.user.id }).then(({ data }) => setIsStaff(Boolean(data)));
  }, [session]);

  if (!supabase) return <Center><h1 className="text-2xl">Database not connected</h1><p className="mt-2 text-sm text-muted-foreground">Add your Supabase URL and key (see docs/setup.md) to use the admin.</p></Center>;
  if (session === undefined) return <Center>Loading…</Center>;
  if (!session) return <Login />;
  if (isStaff === null) return <Center>Checking access…</Center>;
  if (!isStaff) return <Center><h1 className="text-2xl">No admin access</h1><p className="mt-2 text-sm text-muted-foreground">This account isn't an admin. See docs/setup.md to grant access.</p><button onClick={() => supabase!.auth.signOut()} className="mt-4 underline">Sign out</button></Center>;

  const nav = [["/admin", "Bookings"], ["/admin/rooms", "Rooms"], ["/admin/calendar", "Blocked dates"], ["/admin/content", "Gallery & reviews"], ["/admin/settings", "Settings"]] as const;
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 text-sm">
          <Link to="/" className="font-display text-lg">View site ↗</Link>
          <nav className="flex flex-wrap gap-1">
            {nav.map(([to, l]) => <Link key={to} to={to} activeOptions={{ exact: true }} activeProps={{ className: "bg-primary text-primary-foreground" }} className="rounded-full px-3 py-1.5">{l}</Link>)}
          </nav>
          <button onClick={() => supabase!.auth.signOut()} className="ml-auto text-muted-foreground underline">Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8"><Outlet /></main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center px-5 text-center"><div>{children}</div></div>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = "mt-1 min-h-12 w-full rounded-xl border bg-background px-3";
  return (
    <Center>
      <form className="w-80 text-left" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const { error } = await supabase!.auth.signInWithPassword({ email, password }); setBusy(false); if (error) setErr("Incorrect email or password."); }}>
        <h1 className="text-3xl">Owner sign in</h1>
        <label className="mt-6 block text-sm">Email<input type="email" required className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="mt-3 block text-sm">Password<input type="password" required className={field} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        <button disabled={busy} className="mt-5 min-h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </Center>
  );
}
