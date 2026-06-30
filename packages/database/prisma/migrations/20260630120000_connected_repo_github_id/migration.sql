-- AlterTable
ALTER TABLE "connected_repository" ADD COLUMN "githubRepoId" INTEGER;

-- CreateIndex
CREATE INDEX "connected_repository_githubRepoId_idx" ON "connected_repository"("githubRepoId");
