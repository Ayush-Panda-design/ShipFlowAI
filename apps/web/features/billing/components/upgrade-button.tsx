"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ButtonLoadingLabel } from "@/components/ui/loading-illustration";

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

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        keyId?: string;
        subscriptionId?: string;
        amount?: number;
        currency?: string;
        prefill?: { name?: string; email?: string };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Checkout failed");
      }

      if (!window.Razorpay || !data.keyId || !data.subscriptionId) {
        throw new Error("Razorpay checkout is not available");
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "ShipFlow AI",
        description: "Pro monthly subscription",
        prefill: data.prefill,
        theme: { color: "#7c3aed" },
        handler: async (response: {
          razorpay_subscription_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyResponse = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = (await verifyResponse.json()) as {
            error?: string;
            ok?: boolean;
            alreadyProcessed?: boolean;
          };

          if (!verifyResponse.ok) {
            throw new Error(verifyData.error ?? "Payment verification failed");
          }

          toast.success(
            verifyData.alreadyProcessed
              ? "Pro subscription is already active for this workspace."
              : "Subscribed to Pro — credits and limits updated.",
          );
          router.refresh();
        },
      });

      rzp.open();
    } catch (checkoutError) {
      const message =
        checkoutError instanceof Error
          ? checkoutError.message
          : "Upgrade failed";
      setError(message);
      toast.error(message);
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
          {loading ? (
            <ButtonLoadingLabel>Opening checkout…</ButtonLoadingLabel>
          ) : (
            "Upgrade to Pro"
          )}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </>
  );
}
