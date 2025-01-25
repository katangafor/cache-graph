-- CreateTable
CREATE TABLE "user" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "bio" TEXT
);

-- CreateTable
CREATE TABLE "friend_relationship" (
    "userId" INTEGER NOT NULL,
    "friendId" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "friendId"),
    CONSTRAINT "friend_relationship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "friend_relationship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO user (id, name, bio) VALUES
(1, 'doomguy', 'rip and tear'),
(2, 'master chief', 'oh shit jackal snipers'),
(3, 'link', 'navi PLEASE shut UP'),
(4, 'samus', 'beep boop'),
(5, 'kratos', 'boooyyyy');

INSERT INTO friend_relationship (userId, friendId) VALUES
(1, 2),
(1, 3),
(2, 1),
(3, 1),
(5, 3),
(5, 4);