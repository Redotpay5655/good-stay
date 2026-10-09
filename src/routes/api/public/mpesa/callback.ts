import { createFileRoute } from "@tanstack/react-router";

// Daraja STK Push callback. Protected by a secret token in the URL
// (MPESA_CALLBACK_TOKEN). Never returns private data.
export const Route = createFileRoute("/api/public/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = () => Response.json({ ResultCode: 0, ResultDesc: "Accepted" });
        const expected = process.env['MPESA_CALLBACK_TOKEN'];
        const token = new URL(request.url).searchParams.get("token");
        if (!expected || token !== expected) return new Response("Forbidden", { status: 403 });

        let body: { Body?: { stkCallback?: Record<string, unknown> } };
        try { body = await request.json(); } catch { return ok(); }
        const cb = body.Body?.stkCallback as
          | { CheckoutRequestID: string; ResultCode: number; ResultDesc: string; CallbackMetadata?: { Item: { Name: string; Value?: string | number }[] } }
          | undefined;
        if (!cb?.CheckoutRequestID) return ok();

        const { getAdminClient } = await import("@/lib/supabase.server");
        const db = getAdminClient();
        const { data: p } = await db.from("payments").select("id,booking_id,amount,status")
          .eq("checkout_request_id", cb.CheckoutRequestID).maybeSingle();
        if (!p) return ok();
        const meta = Object.fromEntries((cb.CallbackMetadata?.Item ?? []).map((i) => [i.Name, i.Value]));
        if (p.status === "completed") {
          if (meta['MpesaReceiptNumber']) await db.from("payments").update({ reference: String(meta['MpesaReceiptNumber']), raw: body }).eq("id", p.id).is("reference", null);
          return ok();
        }
        const success = Number(cb.ResultCode) === 0;
        if (success && Number(meta['Amount'] ?? 0) + 0.01 < Number(p.amount)) {
          await db.from("payments").update({ status: "failed", result_desc: "Amount mismatch", raw: body }).eq("id", p.id);
          return ok();
        }
        await db.from("payments").update({
          status: success ? "completed" : "failed",
          result_code: String(cb.ResultCode),
          result_desc: cb.ResultDesc,
          reference: success ? String(meta['MpesaReceiptNumber'] ?? "") || null : null,
          transaction_date: success ? new Date().toISOString() : null,
          raw: body,
        }).eq("id", p.id);
        if (success) {
          const { sendBookingConfirmation } = await import("@/lib/notify.server");
          await sendBookingConfirmation(db, p.booking_id);
        }
        return ok();
      },
    },
  },
});
