-- CPF/CNPJ do dono guardado na conta (só dígitos): gravado depois de validado numa assinatura/pagamento bem-sucedido (ou na troca do
-- cartão) e usado para preencher o formulário da próxima cobrança. Nunca sai em listas; no admin aparece mascarado.
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpfCnpj VARCHAR(14) NULL AFTER email;

-- Reverter:
-- ALTER TABLE users DROP COLUMN cpfCnpj;
