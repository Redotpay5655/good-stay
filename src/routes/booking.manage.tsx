import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/booking/manage")({
  head: () => ({
    meta: [
      { title: "Find my booking" },
      { name: "description", content: "Look up your booking with your reference and email to check status or complete payment." },
      { property: "og:title", content: "Find my booking" },
      { property: "og:description", content: "Check your booking status or complete payment." },
    ],
  }),
  component: Manage,
});

function Manage() {
  const navigate = useNavigate();
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const field = "mt-1 min-h-12 w-full rounded-xl border bg-background px-3 text-base";
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="eyebrow">Your stay</p>
      <h1 className="mt-2 text-4xl">Find my booking</h1>
      <p className="mt-3 text-muted-foreground">Enter the booking reference from your confirmation and the email you booked with.</p>
      <form className="mt-8 grid gap-4" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/booking/pay", search: { ref: ref.trim().toUpperCase(), email: email.trim() } }); }}>
        <label className="text-sm font-medium">Booking reference<input required minLength={5} className={`${field} uppercase`} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. BNB-2026-0001" /></label>
        <label className="text-sm font-medium">Email<input required type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <button className="min-h-12 rounded-full bg-primary font-semibold text-primary-foreground">Find booking</button>
      </form>
    </div>
  );
}
