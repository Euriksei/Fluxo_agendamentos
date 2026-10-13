-- Recuperação de senha por email: guarda só o SHA-256 do token enviado no link (o token puro nunca vai para o banco).
-- Token vale 1h e é de uso único (usedAt). Um pedido novo ou uma troca de senha invalida os anteriores do usuário.
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,

    tokenHash CHAR(64) NOT NULL UNIQUE,
    expiresAt DATETIME NOT NULL,
    usedAt DATETIME NULL,

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_password_resets_user (userId),
    CONSTRAINT fk_password_resets_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reverter:
-- DROP TABLE IF EXISTS password_resets;
