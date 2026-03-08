CREATE TABLE IF NOT EXISTS meal_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY idx_user_week (user_id, week_start)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meal_plan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  recipe_id INT NOT NULL,
  day_of_week TINYINT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  servings_override INT DEFAULT NULL,
  FOREIGN KEY (plan_id) REFERENCES meal_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  INDEX idx_plan_day (plan_id, day_of_week)
) ENGINE=InnoDB;
