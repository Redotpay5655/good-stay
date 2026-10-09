import { Link } from "@tanstack/react-router";
import { WhatsAppButton } from "./WhatsAppButton";
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="eyebrow">Online booking opening soon</p>
      <h1 className="mt-3 text-4xl">{title}</h1>
      <p className="mt-4 text-muted-foreground">This step is still being set up. Please contact us directly to book.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/contact" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground">Contact Us</Link>
        <WhatsAppButton />
      </div>
    </div>
  );
}
