// M-Pesa Daraja (Lipa Na M-Pesa Online / STK Push) integration.
// All credentials are read from server secrets at call time — see docs/payment-setup.md.

type MpesaConfig = {
  env: "sandbox" | "production";
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  transactionType: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  partyB: string;
  callbackUrl: string;
};

export function getMpesaConfig(): MpesaConfig | null {
  const consumerKey = process.env['MPESA_CONSUMER_KEY'];
  const consumerSecret = process.env['MPESA_CONSUMER_SECRET'];
  const shortcode = process.env['MPESA_SHORTCODE'];
  const passkey = process.env['MPESA_PASSKEY'];
  const callbackBase = process.env['MPESA_CALLBACK_BASE_URL'];
  const callbackToken = process.env['MPESA_CALLBACK_TOKEN'];
  if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callbackBase || !callbackToken) return null;
  const till = process.env['MPESA_TILL_NUMBER'];
  return {
    env: process.env['MPESA_ENV'] === "production" ? "production" : "sandbox",
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    transactionType: till ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
    partyB: till || shortcode,
    callbackUrl: `${callbackBase.replace(/\/$/, "")}/api/public/mpesa/callback?token=${encodeURIComponent(callbackToken)}`,
  };
}

const base = (c: MpesaConfig) =>
  c.env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

async function getToken(c: MpesaConfig) {
  const res = await fetch(`${base(c)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${btoa(`${c.consumerKey}:${c.consumerSecret}`)}` },
  });
  if (!res.ok) throw new Error(`MPESA_AUTH_${res.status}`);
  const j = (await res.json()) as { access_token: string };
  return j.access_token;
}

function timestamp() {
  // Daraja expects Nairobi time YYYYMMDDHHmmss
  const d = new Date(Date.now() + 3 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

/** 07XX / +2547XX / 2547XX / 01XX → 2547XXXXXXXX */
export function normalizeKenyanPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = "254" + d.slice(1);
  if (d.length === 9 && (d.startsWith("7") || d.startsWith("1"))) d = "254" + d;
  return /^254(7|1)\d{8}$/.test(d) ? d : null;
}

export async function stkPush(c: MpesaConfig, args: { phone: string; amount: number; accountRef: string; desc: string }) {
  const token = await getToken(c);
  const ts = timestamp();
  const res = await fetch(`${base(c)}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: c.shortcode,
      Password: btoa(`${c.shortcode}${c.passkey}${ts}`),
      Timestamp: ts,
      TransactionType: c.transactionType,
      Amount: Math.ceil(args.amount),
      PartyA: args.phone,
      PartyB: c.partyB,
      PhoneNumber: args.phone,
      CallBackURL: c.callbackUrl,
      AccountReference: args.accountRef.slice(0, 12),
      TransactionDesc: args.desc.slice(0, 13),
    }),
  });
  const j = (await res.json()) as Record<string, string>;
  if (!res.ok || j['ResponseCode'] !== "0") throw new Error(j['errorMessage'] || j['ResponseDescription'] || "STK_FAILED");
  return { checkoutRequestId: j['CheckoutRequestID'], merchantRequestId: j['MerchantRequestID'] };
}

export async function stkQuery(c: MpesaConfig, checkoutRequestId: string) {
  const token = await getToken(c);
  const ts = timestamp();
  const res = await fetch(`${base(c)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: c.shortcode,
      Password: btoa(`${c.shortcode}${c.passkey}${ts}`),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const j = (await res.json()) as Record<string, string>;
  // While the guest hasn't responded Daraja returns an error code like 500.001.1001
  if (j['ResultCode'] === undefined) return { state: "pending" as const, raw: j };
  return { state: j['ResultCode'] === "0" ? ("completed" as const) : ("failed" as const), code: j['ResultCode'], desc: j['ResultDesc'], raw: j };
}
