/*
  Warnings:

  - You are about to drop the column `createAt` on the `Edge` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `linkUrl` on the `Note` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Edge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "wallId" INTEGER NOT NULL,
    CONSTRAINT "Edge_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Edge" ("id", "sourceId", "targetId", "wallId") SELECT "id", "sourceId", "targetId", "wallId" FROM "Edge";
DROP TABLE "Edge";
ALTER TABLE "new_Edge" RENAME TO "Edge";
CREATE TABLE "new_Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "textContent" TEXT,
    "mediaUrl" TEXT,
    "authorId" INTEGER NOT NULL,
    "positionX" REAL,
    "positionY" REAL,
    "wallId" INTEGER NOT NULL,
    CONSTRAINT "Note_wallId_fkey" FOREIGN KEY ("wallId") REFERENCES "Wall" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Note" ("authorId", "id", "positionX", "positionY", "textContent", "type", "wallId") SELECT "authorId", "id", "positionX", "positionY", "textContent", "type", "wallId" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
