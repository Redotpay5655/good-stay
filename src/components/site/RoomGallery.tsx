import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { RoomImage } from "@/lib/types";
import { FALLBACK_IMAGES } from "./use-site";

export function RoomGallery({ images, name }: { images: RoomImage[]; name: string }) {
  const list = images.length ? images : [{ id: "ph", url: FALLBACK_IMAGES.room, alt: `${name} (placeholder photo)`, sort_order: 0 }];
  const [open, setOpen] = useState<number | null>(null);
  const go = (d: number) => setOpen((i) => (i === null ? i : (i + d + list.length) % list.length));

  return (
    <>
      {/* Mobile: swipeable strip */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-2 md:hidden">
        {list.map((img, i) => (
          <button key={img.id} onClick={() => setOpen(i)} className="aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl">
            <img src={img.url} alt={img.alt ?? name} loading={i === 0 ? "eager" : "lazy"} className="size-full object-cover" />
          </button>
        ))}
      </div>
      {/* Desktop: mosaic */}
      <div className="hidden h-[480px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl md:grid">
        {list.slice(0, 5).map((img, i) => (
          <button key={img.id} onClick={() => setOpen(i)} className={`relative overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""} ${list.length === 1 ? "col-span-4" : ""}`}>
            <img src={img.url} alt={img.alt ?? name} loading={i === 0 ? "eager" : "lazy"} className="size-full object-cover transition duration-500 hover:scale-105" />
            {i === 4 && list.length > 5 && <span className="absolute inset-0 flex items-center justify-center bg-foreground/50 font-semibold text-background">+{list.length - 5} photos</span>}
          </button>
        ))}
      </div>
      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/95 p-4" onClick={() => setOpen(null)}>
          <button className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-background/15 text-background" aria-label="Close" onClick={() => setOpen(null)}><X /></button>
          {list.length > 1 && <button className="absolute left-3 flex size-11 items-center justify-center rounded-full bg-background/15 text-background" aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }}><ChevronLeft /></button>}
          <img src={list[open]!.url} alt={list[open]!.alt ?? name} className="max-h-[85vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          {list.length > 1 && <button className="absolute right-3 flex size-11 items-center justify-center rounded-full bg-background/15 text-background" aria-label="Next" onClick={(e) => { e.stopPropagation(); go(1); }}><ChevronRight /></button>}
          <p className="absolute bottom-4 text-sm text-background/70">{open + 1} / {list.length}</p>
        </div>
      )}
    </>
  );
}
