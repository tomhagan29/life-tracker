-- AlterTable
ALTER TABLE "Goal" ADD COLUMN "isComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "GoalMilestone" ADD COLUMN "isComplete" BOOLEAN NOT NULL DEFAULT false;
