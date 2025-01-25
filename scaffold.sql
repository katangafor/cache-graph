CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    bio TEXT
);

CREATE TABLE IF NOT EXISTS friend_relationships (
    user_id INTEGER,
    friend_id INTEGER,
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO users (id, name, bio) VALUES
(1, 'doomguy', 'rip and tear'),
(2, 'master chief', 'oh shit jackal snipers'),
(3, 'link', 'navi PLEASE shut UP'),
(4, 'samus', 'beep boop'),
(5, 'kratos', 'boooyyyy');

INSERT INTO friend_relationships (user_id, friend_id) VALUES
(1, 2),
(1, 3),
(2, 1),
(3, 1),
(5, 3),
(5, 4);

SELECT * FROM users;
SELECT * FROM friend_relationships;
