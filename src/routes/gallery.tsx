import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X } from "lucide-react";
import { galleryQuery } from "@/lib/queries";
import { EmptyState, ErrorState, Skeleton } from "@/components/site/states";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Rooms, gardens & breakfast" },
      { name: "description", content: "Photos of our rooms, gardens, breakfast and surroundings." },
      { property: "og:title", content: "Gallery — Rooms, gardens & breakfast" },
      { property: "og:description", content: "Photos of our rooms, gardens, breakfast and surroundings." },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const q = useQuery(galleryQuery);
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<string | null>(null);
  const cats = ["All", ...Array.from(new Set((q.data ?? []).map((g) => g.category || "General")))];
  const items = (q.data ?? []).filter((g) => cat === "All" || (g.category || "General") === cat);
  const current = items.find((i) => i.id === open);
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="eyebrow">Gallery</p>
      <h1 className="mt-2 text-4xl md:text-5xl">A look around</h1>
      {cats.length > 2 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`min-h-10 rounded-full border px-4 text-sm ${c === cat ? "bg-primary text-primary-foreground" : ""}`}>{c}</button>)}
        </div>
      )}
      <div className="mt-8">
        {q.isLoading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
          : q.isError ? <ErrorState onRetry={() => q.refetch()} />
          : items.length === 0 ? <EmptyState title="Photos coming soon" text="We're adding photos of the property. Check back shortly." />
          : (
            <div className="columns-2 gap-3 md:columns-3">
              {items.map((g) => (
                <button key={g.id} onClick={() => setOpen(g.id)} className="mb-3 block w-full overflow-hidden rounded-2xl">
                  <img src={g.url} alt={g.caption ?? "Gallery photo"} loading="lazy" className="w-full transition hover:scale-[1.02]" />
                </button>
              ))}
            </div>
          )}
      </div>
      {current && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4" onClick={() => setOpen(null)}>
          <button aria-label="Close" className="absolute right-4 top-4 rounded-full bg-background p-2"><X className="size-5" /></button>
          <figure className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img src={current.url} alt={current.caption ?? ""} className="max-h-[80vh] rounded-xl object-contain" />
            {current.caption && <figcaption className="mt-3 text-center text-sm text-background">{current.caption}</figcaption>}
          </figure>
        </div>
      )}
    </div>
  );
}
