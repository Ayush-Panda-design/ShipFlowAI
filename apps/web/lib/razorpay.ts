import { createHmac } from "node:crypto";

const PRO_PLAN_AMOUNT_PAISE = 99_900;
const PRO_PLAN_CURRENCY = "INR";
const PRO_SUBSCRIPTION_MONTHS = 12;

let cachedPlanId: string | null = null;

function readEnv(name: string) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return undefined;
  }

  return raw.replace(/^["']|["']$/g, "");
}

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly path: string,
    readonly body?: string,
  ) {
    super(message);
    this.name = "RazorpayApiError";
  }
}

function parseRazorpayErrorBody(body: string) {
  try {
    const parsed = JSON.parse(body) as {
      error?: { code?: string; description?: string; reason?: string };
    };
    const err = parsed.error;
    if (err?.description) {
      return err.description;
    }
    if (err?.reason) {
      return err.reason;
    }
    if (err?.code) {
      return err.code;
    }
  } catch {
    // ignore JSON parse errors
  }

  return body.slice(0, 300);
}

export function formatRazorpayClientError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof RazorpayApiError) {
    const detail = error.message;
    if (error.statusCode === 401 || /unauthorized/i.test(detail)) {
      return {
        status: 401,
        message:
          "Razorpay rejected your API keys. In Vercel, set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from Test Mode → Settings → API Keys (not the webhook secret), then redeploy.",
      };
    }

    if (/subscription/i.test(detail) && /not enabled|disabled/i.test(detail)) {
      return {
        status: 503,
        message:
          "Subscriptions are not enabled on your Razorpay account. Enable Subscriptions in the Razorpay dashboard, then try again.",
      };
    }

    return {
      status: error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502,
      message: detail,
    };
  }

  const message =
    error instanceof Error ? error.message : "Failed to create checkout";
  return { message, status: 500 };
}

export function isRazorpayConfigured() {
  return Boolean(readEnv("RAZORPAY_KEY_ID") && readEnv("RAZORPAY_KEY_SECRET"));
}

export function isRazorpayWebhookConfigured() {
  return Boolean(readEnv("RAZORPAY_WEBHOOK_SECRET"));
}

/** Live checkout + webhook backup both ready (required for production). */
export function isRazorpayProductionReady() {
  return isRazorpayConfigured() && isRazorpayWebhookConfigured();
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

export function getRazorpayProductionConfigError(): string | null {
  const checkoutError = getRazorpayConfigError();
  if (checkoutError) {
    return checkoutError;
  }
  if (!readEnv("RAZORPAY_WEBHOOK_SECRET")) {
    return "RAZORPAY_WEBHOOK_SECRET is missing (required for production webhooks).";
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

async function razorpayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const detail = parseRazorpayErrorBody(errorBody);
    throw new RazorpayApiError(
      `Razorpay API ${path} failed: ${detail}`,
      response.status,
      path,
      errorBody,
    );
  }

  return response.json() as Promise<T>;
}

/** Read-only ping — verifies Key ID + Key Secret without creating billing resources. */
export async function verifyRazorpayCredentials() {
  await razorpayFetch<{ count?: number }>("/plans?count=1");
  return { ok: true as const };
}

/** Returns dashboard plan id or creates a monthly Pro plan once per process. */
export async function getOrCreateProPlanId() {
  const fromEnv = readEnv("RAZORPAY_PLAN_ID");
  if (fromEnv) {
    return fromEnv;
  }

  if (cachedPlanId) {
    return cachedPlanId;
  }

  const plan = await razorpayFetch<{ id: string }>("/plans", {
    method: "POST",
    body: JSON.stringify({
      period: "monthly",
      interval: 1,
      item: {
        name: "ShipFlow Pro",
        amount: PRO_PLAN_AMOUNT_PAISE,
        currency: PRO_PLAN_CURRENCY,
        description: "Monthly Pro subscription — 200 AI credits, 100 repos",
      },
    }),
  });

  cachedPlanId = plan.id;
  return plan.id;
}

/** Creates a Razorpay subscription for monthly Pro billing. */
export async function createProSubscription(workspaceId: string) {
  const keyId = readEnv("RAZORPAY_KEY_ID");
  if (!keyId) {
    throw new Error("RAZORPAY_KEY_ID is not set");
  }

  const planId = await getOrCreateProPlanId();
  const subscription = await razorpayFetch<{
    id: string;
    status: string;
    plan_id: string;
  }>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      total_count: PRO_SUBSCRIPTION_MONTHS,
      quantity: 1,
      customer_notify: 1,
      notes: {
        workspaceId,
        plan: "pro",
      },
    }),
  });

  return {
    keyId,
    subscriptionId: subscription.id,
    planId: subscription.plan_id,
    amount: PRO_PLAN_AMOUNT_PAISE,
    currency: PRO_PLAN_CURRENCY,
  };
}

export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
) {
  const secret = readEnv("RAZORPAY_KEY_SECRET");
  if (!secret) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expected === signature;
}

export function verifyRazorpaySubscriptionSignature(
  subscriptionId: string,
  paymentId: string,
  signature: string,
) {
  const secret = readEnv("RAZORPAY_KEY_SECRET");
  if (!secret) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");

  return expected === signature;
}

export function verifyRazorpayWebhookSignature(body: string, signature: string) {
  const secret = readEnv("RAZORPAY_WEBHOOK_SECRET");
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

export const PRO_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
