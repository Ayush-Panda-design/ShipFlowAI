import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";

const plans = [
  {
    name: "Free",
    price: "₹0",
    features: ["2 repositories", "10 AI review credits/mo", "Basic workflow"],
  },
  {
    name: "Pro",
    price: "₹999/mo",
    features: [
      "100 repositories",
      "200 AI credits",
      "PRD + task agents",
      "PRD-aware AI reviews",
    ],
    highlighted: true,
  },
];

export default async function BillingPage() {
  const workspace = await ensureWorkspaceAction();
  const razorpayReady = isRazorpayConfigured();
  const isPro = workspace.plan === "pro";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Workspace: {workspace.name} · Current plan: {workspace.plan}
        </p>
      </div>

      {!razorpayReady && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Add <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code>{" "}
            to <code>apps/web/.env</code> to enable live checkout. Point Razorpay
            webhooks to <code>/api/razorpay/webhook</code>.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent =
            (plan.name === "Free" && !isPro) || (plan.name === "Pro" && isPro);

          return (
            <Card
              key={plan.name}
              className={plan.highlighted ? "border-violet-500" : undefined}
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.price}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                {plan.name === "Free" ? (
                  <Button variant="outline" disabled={isCurrent}>
                    {isCurrent ? "Current plan" : "Downgrade via support"}
                  </Button>
                ) : isCurrent ? (
                  <Button disabled>Current plan</Button>
                ) : (
                  <UpgradeButton
                    workspaceId={workspace.id}
                    disabled={!razorpayReady}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          AI credits remaining: {workspace.aiCredits} · Repository limit:{" "}
          {workspace.repoLimit}
        </CardContent>
      </Card>
    </div>
  );
}
