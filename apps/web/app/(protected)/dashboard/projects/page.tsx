import Link from "next/link";
import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { createProject, listProjects } from "@repo/services";

export default async function ProjectsPage() {
  const workspace = await ensureWorkspaceAction();
  const projects = await listProjects(workspace.id);

  async function createProjectAction(formData: FormData) {
    "use server";
    const ws = await ensureWorkspaceAction();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) return;

    await createProject(ws.id, {
      name,
      description: description || undefined,
    });
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/feature-requests");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Organize feature requests and connected repositories per project
        </p>
      </div>

      <SectionGuideCard section="projects" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New project</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProjectAction} className="grid gap-3">
            <input
              name="name"
              placeholder="Project name"
              className="rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <textarea
              name="description"
              placeholder="Optional description"
              className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" className="w-fit">
              Create project
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{project.name}</p>
                  {project.description ? (
                    <p className="text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  ) : null}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{project._count.featureRequests} features</p>
                  <p>{project._count.repositories} repos</p>
                  <Link
                    href="/dashboard/feature-requests"
                    className="mt-1 inline-block underline"
                  >
                    View features
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
