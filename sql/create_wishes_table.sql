CREATE TABLE IF NOT EXISTS wishes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(20) NOT NULL DEFAULT '匿名',
  message VARCHAR(120) NOT NULL,
  slice_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  inserted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_created_at (created_at),
  KEY idx_inserted_at (inserted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
