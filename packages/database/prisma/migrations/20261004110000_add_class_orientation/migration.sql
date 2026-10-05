CREATE TYPE "ClassOrientation" AS ENUM ('SCIENTIFIQUE', 'MECANIQUE', 'CYCLE_DE_BASE');

ALTER TABLE "Class"
ADD COLUMN "orientation" "ClassOrientation";
