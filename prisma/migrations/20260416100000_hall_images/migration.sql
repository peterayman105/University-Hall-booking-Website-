CREATE TABLE "HallImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hallId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HallImage_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "HallImage_hallId_idx" ON "HallImage"("hallId");

INSERT INTO "HallImage" ("id", "hallId", "url", "createdAt")
SELECT lower(hex(randomblob(16))), "id", "photoUrl", CURRENT_TIMESTAMP
FROM "Hall"
WHERE "photoUrl" IS NOT NULL AND trim("photoUrl") <> '';
