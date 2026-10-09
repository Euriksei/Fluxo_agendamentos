-- Upgrade de plano só vale após pagamento confirmado: o plano novo fica em pendingPlanId
-- até o webhook PAYMENT_CONFIRMED/RECEIVED (ou /me/sync) confirmar um pagamento no valor do plano novo.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pendingPlanId INT NULL AFTER planId;
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_pending_plan FOREIGN KEY IF NOT EXISTS (pendingPlanId) REFERENCES plans(id) ON DELETE SET NULL;

-- Reverter:
-- ALTER TABLE subscriptions DROP FOREIGN KEY fk_subscriptions_pending_plan;
-- ALTER TABLE subscriptions DROP COLUMN pendingPlanId;
