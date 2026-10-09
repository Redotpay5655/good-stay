import type { ReactNode } from "react";
import { AlertCircle, Database, Inbox } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <h3 className="text-xl">{title}</h3>
      {text && <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ text = "We couldn't load this right now. Please check your connection and try again.", onRetry }: { text?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertCircle className="mx-auto mb-3 size-6 text-destructive" />
      <p className="text-sm">{text}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 min-h-11 rounded-full border px-5 text-sm font-medium hover:bg-secondary">
          Try again
        </button>
      )}
    </div>
  );
}

export function NotConfiguredBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-forest px-4 py-2 text-center text-xs text-forest-foreground">
      <Database className="mr-1.5 inline size-3.5" />
      Setup mode: the database isn't connected yet, so placeholder content is shown. See docs/setup.md.
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}
