CREATE DATABASE IF NOT EXISTS crumble_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE crumble_db;

-- Idempotent: DROP IF EXISTS before each CREATE to support re-runs
DROP TABLE IF EXISTS grocery_items;
DROP TABLE IF EXISTS grocery_lists;
DROP TABLE IF EXISTS recipe_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  prep_time INT DEFAULT NULL,
  cook_time INT DEFAULT NULL,
  servings INT DEFAULT NULL,
  source_url VARCHAR(2048) DEFAULT NULL,
  image_path VARCHAR(255) DEFAULT NULL,
  instructions JSON NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FULLTEXT INDEX idx_recipe_search (title, description)
) ENGINE=InnoDB;

CREATE TABLE ingredients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipe_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount VARCHAR(50) DEFAULT NULL,
  unit VARCHAR(50) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_ingredient_recipe (recipe_id)
) ENGINE=InnoDB;

CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE recipe_tags (
  recipe_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (recipe_id, tag_id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE grocery_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE grocery_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  list_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount VARCHAR(50) DEFAULT NULL,
  unit VARCHAR(50) DEFAULT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  recipe_id INT DEFAULT NULL,
  FOREIGN KEY (list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL,
  INDEX idx_grocery_list (list_id)
) ENGINE=InnoDB;

-- Seed admin user (placeholder hash — install.php generates the real one)
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2y$10$placeholder', 'admin');
