import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  approveReleaseAction,
  rejectReleaseAction,
  requestReReviewAction,
} from "@/lib/actions/shipflow";

type ApprovalRecord = {
  id: string;
  decision: string;
  notes: string | null;
  createdAt: Date;
  reviewer: { name: string; email: string };
};

export function ReleaseApprovalPanel({
  featureRequestId,
  status,
}: {
  featureRequestId: string;
  status: string;
}) {
  if (status === "fix_needed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fix & re-review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Blocking issues were found. After pushing fixes to the linked PR,
            GitHub will auto-queue a re-review. You can also trigger one
            manually:
          </p>
          <form
            action={async () => {
              "use server";
              await requestReReviewAction(featureRequestId);
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Request re-review now
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (status !== "awaiting_approval") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Human release gate</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <form
          action={async (formData) => {
            "use server";
            await approveReleaseAction(
              featureRequestId,
              formData.get("approveNotes")?.toString()
            );
          }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">
            Approve when the feature meets the PRD and passes AI review.
          </p>
          <Textarea
            name="approveNotes"
            placeholder="Optional approval notes"
            rows={3}
          />
          <Button type="submit" size="sm">
            Approve & ship
          </Button>
        </form>

        <form
          action={async (formData) => {
            "use server";
            await rejectReleaseAction(
              featureRequestId,
              formData.get("rejectNotes")?.toString()
            );
          }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">
            Reject to send the feature back for fixes (status → fix needed).
          </p>
          <Textarea
            name="rejectNotes"
            placeholder="What must be fixed before release?"
            rows={3}
            required
          />
          <Button type="submit" variant="destructive" size="sm">
            Reject release
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ApprovalHistory({ approvals }: { approvals: ApprovalRecord[] }) {
  if (approvals.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Approval history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {approvals.map((approval) => (
          <div key={approval.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium capitalize">{approval.decision}</span>
              <span className="text-xs text-muted-foreground">
                {approval.reviewer.name} ·{" "}
                {approval.createdAt.toLocaleString()}
              </span>
            </div>
            {approval.notes && (
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {approval.notes}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
