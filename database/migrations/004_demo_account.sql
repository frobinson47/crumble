ALTER TABLE users ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE AFTER locked_until;

INSERT INTO users (username, password_hash, role, is_demo)
VALUES ('demo', '$2y$10$placeholder', 'member', TRUE)
ON DUPLICATE KEY UPDATE is_demo = TRUE;
