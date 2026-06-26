import { createHmac } from "node:crypto";

const PRO_PLAN_AMOUNT_PAISE = 99_900;
const PRO_PLAN_CURRENCY = "INR";

function readEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

export function isRazorpayConfigured() {
  return Boolean(readEnv("RAZORPAY_KEY_ID") && readEnv("RAZORPAY_KEY_SECRET"));
}

export function getRazorpayConfigError(): string | null {
  if (!readEnv("RAZORPAY_KEY_ID")) {
    return "RAZORPAY_KEY_ID is missing.";
  }
  if (!readEnv("RAZORPAY_KEY_SECRET")) {
    return "RAZORPAY_KEY_SECRET is missing.";
  }
  return null;
}

function getAuthHeader() {
  const keyId = readEnv("RAZORPAY_KEY_ID");
  const keySecret = readEnv("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured");
  }

  const token = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${token}`;
}

export async function createProCheckoutOrder(workspaceId: string) {
  const keyId = readEnv("RAZORPAY_KEY_ID");
  if (!keyId) {
    throw new Error("RAZORPAY_KEY_ID is not set");
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: PRO_PLAN_AMOUNT_PAISE,
      currency: PRO_PLAN_CURRENCY,
      receipt: `shipflow-${workspaceId}-${Date.now()}`,
      notes: {
        workspaceId,
        plan: "pro",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Razorpay order failed: ${errorBody}`);
  }

  const order = (await response.json()) as {
    id: string;
    amount: number;
    currency: string;
  };

  return {
    keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
  };
}

export function verifyRazorpayWebhookSignature(body: string, signature: string) {
  const secret = readEnv("RAZORPAY_KEY_SECRET");
  if (!secret) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expected === signature;
}

export const PRO_PLAN_LIMITS = {
  aiCredits: 200,
  repoLimit: 100,
} as const;
