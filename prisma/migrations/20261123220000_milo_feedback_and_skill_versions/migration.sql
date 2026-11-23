-- Milo: giudizi delle persone sulle risposte e versioni approvate delle competenze degli specialisti.
CREATE TABLE "MiloAnswerFeedback" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "operatorName" TEXT,
    "operatorRole" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "correction" TEXT,
    "mode" TEXT,
    "intent" TEXT,
    "members" TEXT[],
    "tools" TEXT[],
    "skillVersions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MiloAnswerFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MiloAnswerFeedback_answerId_operatorId_key" ON "MiloAnswerFeedback"("answerId", "operatorId");
CREATE INDEX "MiloAnswerFeedback_status_createdAt_idx" ON "MiloAnswerFeedback"("status", "createdAt");

CREATE TABLE "MiloSkillVersion" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "baseVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "instructions" JSONB NOT NULL,
    "rationale" TEXT,
    "feedbackIds" TEXT[],
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMP(3),
    CONSTRAINT "MiloSkillVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MiloSkillVersion_skillId_version_key" ON "MiloSkillVersion"("skillId", "version");
CREATE INDEX "MiloSkillVersion_skillId_status_idx" ON "MiloSkillVersion"("skillId", "status");
