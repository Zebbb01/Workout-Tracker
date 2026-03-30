-- CreateTable
CREATE TABLE "FastingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "targetHours" INTEGER NOT NULL DEFAULT 16,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FastingSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FastingSession" ADD CONSTRAINT "FastingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
