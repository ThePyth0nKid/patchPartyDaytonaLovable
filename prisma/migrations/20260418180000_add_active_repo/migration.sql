-- CreateTable
CREATE TABLE "ActiveRepo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "defaultBranch" TEXT,
    "language" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiveRepo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActiveRepo_userId_lastUsedAt_idx" ON "ActiveRepo"("userId", "lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveRepo_userId_owner_name_key" ON "ActiveRepo"("userId", "owner", "name");

-- AddForeignKey
ALTER TABLE "ActiveRepo" ADD CONSTRAINT "ActiveRepo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
