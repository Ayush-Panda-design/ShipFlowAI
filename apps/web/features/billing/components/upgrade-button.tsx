"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

import { Button } from "@/components/ui/button";

type RazorpayConstructor = new (options: Record<string, unknown>) => {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export function UpgradeButton({
  workspaceId,
  disabled,
}: {
  workspaceId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      const data = (await response.json()) as {
        error?: string;
        keyId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        prefill?: { name?: string; email?: string };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Checkout failed");
      }

      if (!window.Razorpay || !data.keyId || !data.orderId) {
        throw new Error("Razorpay checkout is not available");
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "ShipFlow AI",
        description: "Pro plan — monthly",
        prefill: data.prefill,
        theme: { color: "#7c3aed" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId,
              ...response,
            }),
          });
          router.refresh();
        },
      });

      rzp.open();
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Upgrade failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="space-y-2">
        <Button
          type="button"
          onClick={handleUpgrade}
          disabled={disabled || loading}
        >
          {loading ? "Opening checkout…" : "Upgrade with Razorpay"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </>
  );
}
