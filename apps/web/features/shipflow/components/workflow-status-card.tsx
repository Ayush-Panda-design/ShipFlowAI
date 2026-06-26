import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { describeWorkflowStatus } from "@/features/shipflow/server/feature-workflow";

export function WorkflowStatusCard({ status }: { status: string }) {
  const description = describeWorkflowStatus(status);

  if (!description) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Delivery loop</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}
