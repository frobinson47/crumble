ALTER TABLE meal_plan_items
  ADD COLUMN meal_type VARCHAR(20) DEFAULT NULL AFTER day_of_week;
