-- CreateTable
CREATE TABLE "user_site_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "pageTitle" TEXT,
    "action" TEXT,
    "detail" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_site_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_site_event_userId_createdAt_idx" ON "user_site_event"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_site_event_userId_visitId_idx" ON "user_site_event"("userId", "visitId");

-- CreateIndex
CREATE INDEX "user_site_event_visitId_idx" ON "user_site_event"("visitId");

-- AddForeignKey
ALTER TABLE "user_site_event" ADD CONSTRAINT "user_site_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
