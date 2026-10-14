-- Plano concedido pelo admin (assinatura sem asaasSubscriptionId) vence sozinho: depois da data em nextPaymentAt o status vira EXPIRED
-- e a barbearia cai para o plano grátis. Idempotente: MODIFY com a lista completa pode rodar quantas vezes for preciso.
ALTER TABLE subscriptions MODIFY COLUMN status ENUM('ACTIVE', 'PENDING', 'TRIAL', 'OVERDUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED') DEFAULT 'PENDING';

-- Reverter (antes, tirar as linhas de EXPIRED: UPDATE subscriptions SET status = 'CANCELLED' WHERE status = 'EXPIRED'):
-- ALTER TABLE subscriptions MODIFY COLUMN status ENUM('ACTIVE', 'PENDING', 'TRIAL', 'OVERDUE', 'SUSPENDED', 'CANCELLED') DEFAULT 'PENDING';
