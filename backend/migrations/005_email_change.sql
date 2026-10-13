-- Troca de email com confirmação: o email novo fica em users.pendingEmail até o link enviado para ele ser aberto.
-- O login continua com o email atual até a confirmação.
ALTER TABLE users ADD COLUMN IF NOT EXISTS pendingEmail VARCHAR(100) NULL AFTER email;

-- email_verifications passa a servir aos dois fluxos:
--   email NULL      = confirmação do cadastro (marca users.emailVerifiedAt)
--   email preenchido = troca de email (vira o novo users.email ao confirmar)
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL AFTER userId;

-- Reverter:
-- ALTER TABLE email_verifications DROP COLUMN email;
-- ALTER TABLE users DROP COLUMN pendingEmail;
