-- Complete the class/level model migration while preserving the legacy data.
CREATE TYPE "Cycle" AS ENUM ('MATERNELLE', 'PRIMAIRE', 'SECONDAIRE');
CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'INACTIVE');
CREATE TYPE "ClassSection" AS ENUM ('A', 'B', 'C', 'D', 'UNIQUE');

ALTER TYPE "ClassOrientation" ADD VALUE 'LITTERAIRE';
ALTER TYPE "ClassOrientation" ADD VALUE 'COMMERCIALE';
ALTER TYPE "ClassOrientation" ADD VALUE 'TECHNIQUE';
ALTER TYPE "ClassOrientation" ADD VALUE 'GENERALE';

CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cycle" "Cycle" NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Level_code_key" ON "Level"("code");
CREATE INDEX "Level_cycle_order_idx" ON "Level"("cycle", "order");
CREATE INDEX "Level_status_idx" ON "Level"("status");

INSERT INTO "Level" ("id", "code", "name", "cycle", "order", "updatedAt") VALUES
  ('legacy-maternelle', 'MATERNELLE', 'Maternelle', 'MATERNELLE', 1, CURRENT_TIMESTAMP),
  ('legacy-primaire', 'PRIMAIRE', 'Primaire', 'PRIMAIRE', 2, CURRENT_TIMESTAMP);

ALTER TABLE "Class"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "section" "ClassSection" NOT NULL DEFAULT 'UNIQUE',
  ADD COLUMN "capacity" INTEGER,
  ADD COLUMN "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "levelId" TEXT,
  ADD COLUMN "teacherId" TEXT;

UPDATE "Class"
SET "code" = "name",
    "levelId" = CASE "level"
      WHEN 'Maternelle' THEN 'legacy-maternelle'
      ELSE 'legacy-primaire'
    END;

ALTER TABLE "Class"
  ALTER COLUMN "code" SET NOT NULL,
  ALTER COLUMN "levelId" SET NOT NULL,
  DROP COLUMN "level";

ALTER TABLE "Fee" ADD COLUMN "levelId" TEXT;

CREATE UNIQUE INDEX "Class_schoolYearId_code_key" ON "Class"("schoolYearId", "code");
CREATE INDEX "Class_levelId_idx" ON "Class"("levelId");
CREATE INDEX "Class_orientation_idx" ON "Class"("orientation");
CREATE INDEX "Class_status_idx" ON "Class"("status");
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");
CREATE INDEX "Class_schoolYearId_levelId_idx" ON "Class"("schoolYearId", "levelId");
CREATE INDEX "Fee_levelId_idx" ON "Fee"("levelId");

ALTER TABLE "Class"
  ADD CONSTRAINT "Class_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Fee"
  ADD CONSTRAINT "Fee_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;
