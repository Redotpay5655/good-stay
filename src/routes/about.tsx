import { createFileRoute, Link } from "@tanstack/react-router";
import { useSite, FALLBACK_IMAGES } from "@/components/site/use-site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About us — Our story & hospitality" },
      { name: "description", content: "Meet your hosts and learn what makes a stay with us warm, quiet and personal." },
      { property: "og:title", content: "About us — Our story & hospitality" },
      { property: "og:description", content: "Meet your hosts and learn about our bed & breakfast." },
    ],
  }),
  component: About,
});

function About() {
  const { settings: s } = useSite();
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:py-20">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <p className="eyebrow">About {s.business_name}</p>
          <h1 className="mt-2 text-4xl md:text-5xl">{s.about_title}</h1>
          <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">{s.about_text}</p>
          <Link to="/rooms" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">See our rooms</Link>
        </div>
        <img src={s.about_image_url || FALLBACK_IMAGES.about} alt={s.about_image_url ? `${s.business_name}` : "Placeholder photo"} className="aspect-[4/5] w-full rounded-3xl object-cover" />
      </div>
      {s.why_stay.length > 0 && (
        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {s.why_stay.map((w) => <div key={w.title} className="rounded-2xl border p-6"><h2 className="text-xl">{w.title}</h2><p className="mt-2 text-sm text-muted-foreground">{w.text}</p></div>)}
        </div>
      )}
      {s.house_rules && <div className="mt-16 rounded-2xl bg-muted/50 p-6"><h2 className="text-2xl">House rules</h2><p className="mt-3 whitespace-pre-line text-sm">{s.house_rules}</p></div>}
    </div>
  );
}
