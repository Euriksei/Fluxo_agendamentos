-- Confirmação de email no cadastro (login bloqueado até confirmar) e invalidação de sessões ao trocar a senha.
ALTER TABLE users ADD COLUMN IF NOT EXISTS emailVerifiedAt DATETIME NULL AFTER role;
-- JWT com iat anterior a passwordChangedAt é recusado pelo authenticateToken
ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordChangedAt DATETIME NULL AFTER emailVerifiedAt;

-- Mesmo padrão do password_resets: só o SHA-256 do token do link, validade de 24h, uso único
CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,

    tokenHash CHAR(64) NOT NULL UNIQUE,
    expiresAt DATETIME NOT NULL,
    usedAt DATETIME NULL,

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_email_verifications_user (userId),
    CONSTRAINT fk_email_verifications_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contas que já existiam antes desta migration (admin, donos, funcionários) entram como confirmadas, senão ninguém loga depois do deploy.
-- Só na primeira execução: depois do deploy todo cadastro novo cria uma linha em email_verifications na mesma transação,
-- então com a tabela já preenchida uma reexecução não confirma ninguém por engano.
UPDATE users SET emailVerifiedAt = NOW() WHERE emailVerifiedAt IS NULL AND NOT EXISTS (SELECT 1 FROM email_verifications);

-- Reverter:
-- DROP TABLE IF EXISTS email_verifications;
-- ALTER TABLE users DROP COLUMN passwordChangedAt;
-- ALTER TABLE users DROP COLUMN emailVerifiedAt;
