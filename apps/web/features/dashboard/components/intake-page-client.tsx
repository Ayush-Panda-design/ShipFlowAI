"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Mail, Phone, Ticket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { trpc } from "@/trpc/client";

const sources = [
  { id: "email", label: "Email", icon: Mail },
  { id: "ticket", label: "Support ticket", icon: Ticket },
  { id: "call", label: "Customer call", icon: Phone },
] as const;

type IntakePageClientProps = {
  projectId: string;
  projectName: string;
};

export function IntakePageClient({ projectId, projectName }: IntakePageClientProps) {
  const router = useRouter();
  const [source, setSource] = useState<(typeof sources)[number]["id"]>("email");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = trpc.featureRequest.create.useMutation({
    onSuccess: (feature) => {
      toast.success("Request received", {
        description: "ShipFlow is starting AI clarification now.",
      });
      router.push(`/dashboard/feature-requests/${feature.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const canSubmit =
    title.trim().length >= 3 && description.trim().length >= 10 && !createMutation.isPending;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customer intake</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log what a customer asked for by email, support ticket, or call. ShipFlow
            turns it into a feature request and starts clarifying the requirements with
            AI.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href={`${DASHBOARD_BASE_PATH}/feature-requests`}>
            All requests
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <SectionGuideCard section="intake" />

      <Card>
        <CardHeader>
          <CardTitle>New customer request</CardTitle>
          <CardDescription>
            Added to project <span className="font-medium text-foreground">{projectName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>How did this arrive?</Label>
            <div className="flex flex-wrap gap-2">
              {sources.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={source === item.id ? "default" : "outline"}
                    onClick={() => setSource(item.id)}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="intake-title">Short summary</Label>
            <Input
              id="intake-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Export reports to CSV"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intake-description">What did they ask for?</Label>
            <Textarea
              id="intake-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the email, ticket notes, or call summary here…"
              className="min-h-32"
            />
            <p className="text-xs text-muted-foreground">
              A few sentences is enough — AI will ask follow-up questions if needed.
            </p>
          </div>

          <Button
            disabled={!canSubmit}
            onClick={() =>
              createMutation.mutate({
                projectId,
                title: title.trim(),
                description: description.trim(),
                source,
              })
            }
          >
            {createMutation.isPending ? "Submitting…" : "Submit request"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
