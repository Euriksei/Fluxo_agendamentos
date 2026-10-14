import express from 'express';
import pool from '../config/database.js';

import { authenticateToken, requireOwner } from '../middlewares/authentication.js';
import { resolveSubscription, expireGrantedSubscriptions, isGrantedSubscription, toDateString } from '../middlewares/subscription.js';
import { getPlans } from '../utils/plans.js';

import { getOwnerId, getAccountDocument, saveAccountDocument } from '../utils/user.js';
import { centavosParaReais } from '../utils/currency.js';
import { toLocalDateString } from '../utils/date.js';
import { validateCpfCnpj } from '../utils/validations.js';

import asaasService from '../services/asaas.js';

const router = express.Router();

const TRIAL_DAYS = 7;

// Upgrade pendente (PUT /me): aplica o plano novo só quando um pagamento confirmado cobre o valor dele
async function applyPendingPlan(connection, sub, paidValue) 
{
    if (!sub.pendingPlanId) return;

    const [plans] = await connection.query('SELECT price FROM plans WHERE id = ?', [sub.pendingPlanId]);
    if (plans.length === 0 || Number(paidValue) < centavosParaReais(plans[0].price)) return;

    await connection.query('UPDATE subscriptions SET planId = pendingPlanId, pendingPlanId = NULL WHERE id = ? AND pendingPlanId = ?', [sub.id, sub.pendingPlanId]);
}

// Uma linha de assinatura por dono: re-assinatura (após CANCELLED/OVERDUE/PENDING...) reaproveita a linha existente em vez de criar outra.
// Se a linha antiga tinha outra assinatura no Asaas ainda viva, ela é removida lá para não cobrar em dobro.
async function saveSubscription(connection, ownerId, { planId, asaasSubscriptionId, asaasCustomerId, status, nextPaymentAt }) 
{
    const [existing] = await connection.query('SELECT id, status, asaasSubscriptionId FROM subscriptions WHERE userId = ? ORDER BY id DESC LIMIT 1 FOR UPDATE', [ownerId]);

    if (existing.length === 0) 
    {
        const [result] = await connection.query(`INSERT INTO subscriptions (userId, planId, asaasSubscriptionId, asaasCustomerId, status, nextPaymentAt, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())`, [ownerId, planId, asaasSubscriptionId, asaasCustomerId, status, nextPaymentAt]);
        return result.insertId;
    }

    const old = existing[0];
    await connection.query(`UPDATE subscriptions SET planId = ?, pendingPlanId = NULL, asaasSubscriptionId = ?, asaasCustomerId = ?, status = ?, nextPaymentAt = ?, 
        trialEndsAt = NULL, cancelledAt = NULL WHERE id = ?`, [planId, asaasSubscriptionId, asaasCustomerId, status, nextPaymentAt, old.id]);

    if (old.asaasSubscriptionId && old.asaasSubscriptionId !== asaasSubscriptionId && old.status !== 'CANCELLED') 
    {
        try { await asaasService.deleteSubscription(old.asaasSubscriptionId); } 
        catch (err) { console.error('Delete old ASAAS subscription error:', err.message); }
    }

    return old.id;
}

// Pagador validado antes de qualquer chamada ao Asaas: nome obrigatório, CPF/CNPJ real (dígitos verificadores) e email SEMPRE o da conta do
// dono (o do body é ignorado, para a cobrança e os avisos do Asaas irem para quem é dono da conta). role: 'payer' (PIX/boleto) | 'holder' (cartão)
function buildPayer(source, user, role = 'payer')
{
    const name = typeof source?.name === 'string' ? source.name.trim() : '';
    if (!name) return { error: role === 'holder' ? 'Informe o nome do titular do cartão' : 'Informe o nome completo de quem vai pagar' };

    const doc = validateCpfCnpj(source?.cpfCnpj);
    if (!doc.valid) return { error: role === 'holder' ? `${doc.error} do titular do cartão` : doc.error };

    const onlyDigits = (value) => (value ? String(value).replace(/\D/g, '') : undefined);

    return {
        payer: {
            name,
            email: user.email,
            cpfCnpj: doc.digits,
            phone: onlyDigits(source.phone),
            mobilePhone: onlyDigits(source.mobilePhone),
            postalCode: onlyDigits(source.postalCode),
            address: source.address,
            addressNumber: source.addressNumber,
            addressComplement: source.addressComplement,
            province: source.province
        }
    };
}

// Cliente do Asaas DESTE dono, nunca o de outro usuário achado pelo CPF:
// 1º o asaasCustomerId já salvo nas assinaturas dele (se ainda for dele: externalReference user_<id> e não apagado);
// 2º o cliente com externalReference user_<id>; 3º cria um novo. Se os dados mudaram, atualiza o cliente antes de cobrar.
const CUSTOMER_SYNC_FIELDS = ['name', 'email', 'cpfCnpj', 'phone', 'mobilePhone', 'postalCode', 'addressNumber'];

async function resolveAsaasCustomer(connection, ownerId, payer)
{
    const externalReference = `user_${ownerId}`;
    let customer = null;

    const [saved] = await connection.query('SELECT asaasCustomerId FROM subscriptions WHERE userId = ? AND asaasCustomerId IS NOT NULL ORDER BY id DESC LIMIT 1', [ownerId]);
    if (saved.length > 0)
    {
        customer = await asaasService.getCustomer(saved[0].asaasCustomerId).catch((error) => { if (error.status === 404) return null; throw error; });
        // Legado: a busca antiga por CPF podia ter gravado aqui o cliente de outro usuário
        if (customer && (customer.deleted || customer.externalReference !== externalReference)) customer = null;
    }

    if (!customer) customer = await asaasService.findCustomerByExternalReference(externalReference);
    if (!customer) return asaasService.createCustomer({ ...payer, externalReference });

    const normalize = (field, value) => (value == null ? '' : ['name', 'email'].includes(field) ? String(value).trim().toLowerCase() : String(value).replace(/\D/g, ''));
    const changes = {};
    for (const field of CUSTOMER_SYNC_FIELDS)
    {
        if (payer[field] && normalize(field, payer[field]) !== normalize(field, customer[field])) changes[field] = payer[field];
    }

    return Object.keys(changes).length > 0 ? asaasService.updateCustomer(customer.id, changes) : customer;
}

const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;
router.post('/webhook', async (req, res) => 
{
    if (!ASAAS_WEBHOOK_TOKEN) return res.status(400).json({ error: 'Token do ASAAS não definido' });
    const receivedToken = req.headers['asaas-access-token'];
    if (!receivedToken || receivedToken !== ASAAS_WEBHOOK_TOKEN) return res.status(401).json({ error: 'Token inválido' });

    const connection = await pool.getConnection();

    try 
    {
        const { event, payment, subscription } = req.body;

        console.log('ASAAS Webhook received:', event, payment?.id || subscription?.id);

        await connection.beginTransaction();

        if (payment) 
        {
            const asaasSubscriptionId = payment.subscription;
            
            if (asaasSubscriptionId) 
            {
                const [subs] = await connection.query('SELECT * FROM subscriptions WHERE asaasSubscriptionId = ? ORDER BY id DESC LIMIT 1', [asaasSubscriptionId]);
                
                if (subs.length > 0) 
                {
                    const sub = subs[0];

                    switch (event) 
                    {
                        case 'PAYMENT_CONFIRMED':
                         case 'PAYMENT_RECEIVED':
                            const dueDate = new Date(payment.dueDate);
                            const nextPayment = new Date(dueDate);
                            nextPayment.setMonth(nextPayment.getMonth() + 1);
                            const fNextPayment = nextPayment.toISOString().split('T')[0];
                            await connection.query(`UPDATE subscriptions SET status = 'ACTIVE', lastPaymentAt = NOW(), nextPaymentAt = ? WHERE id = ?`, [fNextPayment, sub.id]);
                            await applyPendingPlan(connection, sub, payment.value);
                            break;

                        case 'PAYMENT_OVERDUE':
                        case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED': // cartão recusado na cobrança: mesmo efeito do atraso (cai para o free)
                            await connection.query('UPDATE subscriptions SET status = "OVERDUE" WHERE id = ?', [sub.id]);
                            break;

                        case 'PAYMENT_REFUNDED':
                        case 'PAYMENT_CHARGEBACK_REQUESTED':
                            await connection.query('UPDATE subscriptions SET status = "SUSPENDED" WHERE id = ?', [sub.id]);
                            break;

                        case 'PAYMENT_DELETED':
                        case 'PAYMENT_RESTORED':
                            console.log(`Payment ${event}:`, payment.id);
                            break;
                    }
                }
            }
        }

        if (subscription) 
        {
            const [subs] = await connection.query('SELECT * FROM subscriptions WHERE asaasSubscriptionId = ? ORDER BY id DESC LIMIT 1', [subscription.id]);
            
            if (subs.length > 0) 
            {
                const sub = subs[0];

                switch (event) 
                {
                    case 'SUBSCRIPTION_DELETED':
                    case 'SUBSCRIPTION_INACTIVATED':
                        await connection.query('UPDATE subscriptions SET status = "CANCELLED", cancelledAt = NOW() WHERE id = ?', [sub.id]);
                        break;

                    case 'SUBSCRIPTION_RENEWED':
                        await connection.query('UPDATE subscriptions SET status = "ACTIVE" WHERE id = ?', [sub.id]);
                        break;
                }
            }
        }

        await connection.commit();
        res.json({ received: true });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.use(authenticateToken);

router.get('/me', async (req, res) => 
{
    try 
    {
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        await expireGrantedSubscriptions(ownerId);

        const [subscriptions] = await pool.query(`SELECT s.*, p.name as planName, p.slug as planSlug, p.price as planPrice, p.maxEmployees, p.features,
            pp.name as pendingPlanName, pp.slug as pendingPlanSlug, pp.price as pendingPlanPrice FROM subscriptions s 
            JOIN plans p ON s.planId = p.id LEFT JOIN plans pp ON s.pendingPlanId = pp.id WHERE s.userId = ? ORDER BY s.id DESC LIMIT 1`, [ownerId]);

        if (subscriptions.length === 0) 
        {
            const [basicPlan] = await pool.query('SELECT * FROM plans WHERE slug = "free"');

            const features = typeof basicPlan[0].features === 'string' ? JSON.parse(basicPlan[0].features) : (basicPlan[0].features || []);

            return res.json({
                status: 'NONE',
                accountCpfCnpj: await getAccountDocument(ownerId),
                plan: basicPlan[0] ? { ...basicPlan[0], features: features } : null,
                contractedPlan: null,
                pendingPlan: null,
                isLimited: true
            });
        }

        const sub = subscriptions[0];

        const features = typeof sub.features === 'string' ? JSON.parse(sub.features) : (sub.features || []);

        // plan = o que vale agora (mesma regra do checkSubscription: OVERDUE/SUSPENDED/CANCELLED/PENDING/trial expirado caem no free);
        // contractedPlan = o plano assinado, para a tela de Assinatura
        const effective = await resolveSubscription(ownerId);
        const freePlan = (await getPlans()).free;
        const contractedPlan = { id: sub.planId, name: sub.planName, slug: sub.planSlug, price: sub.planPrice, maxEmployees: sub.maxEmployees, features };

        const granted = isGrantedSubscription(sub);

        res.json({
            ...sub,
            // Concedido vencido: EXPIRED mesmo se o UPDATE não pôde gravar (resolveSubscription calcula em memória)
            status: granted && effective.status === 'EXPIRED' ? 'EXPIRED' : sub.status,
            grantedByAdmin: granted,
            validUntil: granted && sub.nextPaymentAt ? toDateString(sub.nextPaymentAt) : null,
            accountCpfCnpj: await getAccountDocument(ownerId),
            plan: { ...contractedPlan, features: effective.plan.features, maxEmployees: effective.isLimited ? (freePlan?.maxEmployees ?? 0) : sub.maxEmployees },
            contractedPlan,
            pendingPlan: sub.pendingPlanId ? { id: sub.pendingPlanId, name: sub.pendingPlanName, slug: sub.pendingPlanSlug, price: sub.pendingPlanPrice } : null,
            isLimited: effective.isLimited
        });
    } 
    catch (error) 
    {
        console.error('Get my subscription error:', error);
        res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
});

router.post('/', requireOwner, async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const { planId, billingType, customerData } = req.body;
        if (!planId || !billingType) return res.status(400).json({ error: 'Plano e tipo de cobrança são obrigatórios' });

        // Plano concedido pelo admin já vencido deixa de contar como ativo (a linha é reaproveitada pelo saveSubscription)
        await expireGrantedSubscriptions(ownerId, connection);

        const [existingSub] = await connection.query('SELECT id FROM subscriptions WHERE userId = ? AND status IN ("ACTIVE", "TRIAL")', [ownerId]);
        if (existingSub.length > 0) return res.status(400).json({ error: 'Já existe uma assinatura ativa para este usuário' });

        const [plans] = await connection.query('SELECT * FROM plans WHERE id = ? AND isActive = TRUE', [planId]);
        if (plans.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
        const plan = plans[0];

        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [ownerId]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        const user = users[0];

        const { payer, error: payerError } = buildPayer(customerData, user);
        if (payerError) return res.status(400).json({ error: payerError, code: 'INVALID_PAYER' });

        const asaasCustomer = await resolveAsaasCustomer(connection, ownerId, payer);

        const formattedValue = centavosParaReais(plan.price);

        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 1);
        const formattedDueDate = nextDueDate.toISOString().split('T')[0];

        const asaasSubscription = await asaasService.createSubscription({
            customer: asaasCustomer.id,
            billingType: billingType,
            value: formattedValue,
            nextDueDate: formattedDueDate,
            cycle: 'MONTHLY',
            description: `Assinatura ${plan.name}`,
            externalReference: `plan_${planId}_user_${ownerId}`
        });

        const subscriptionId = await saveSubscription(connection, ownerId, { planId: plan.id, asaasSubscriptionId: asaasSubscription.id, asaasCustomerId: asaasCustomer.id,
            status: 'PENDING', nextPaymentAt: formattedDueDate });

        // Documento validado e aceito pelo Asaas: fica na conta para preencher a próxima cobrança
        await saveAccountDocument(ownerId, payer.cpfCnpj, connection);

        await connection.commit();

        const payments = await asaasService.listSubscriptionPayments(asaasSubscription.id);
        const firstPayment = payments.data?.[0];

        let paymentInfo = {};
        if (firstPayment) 
        {
            if (billingType === 'PIX') 
            {
                const pixData = await asaasService.getPixQrCode(firstPayment.id);
                paymentInfo = { pixQrCode: pixData.encodedImage, pixCopyPaste: pixData.payload, expirationDate: pixData.expirationDate };
            } 
            else if (billingType === 'BOLETO') 
            {
                const boletoData = await asaasService.getBoletoIdentificationField(firstPayment.id);
                paymentInfo = { boletoUrl: firstPayment.bankSlipUrl, boletoBarcode: boletoData.identificationField };
            }
        }

        res.status(201).json({
            id: subscriptionId,
            asaasSubscriptionId: asaasSubscription.id,
            status: 'PENDING',
            plan: { id: plan.id, name: plan.name, slug: plan.slug, price: plan.price },
            nextPaymentAt: formattedDueDate,
            payment: { id: firstPayment?.id, value: firstPayment?.value, dueDate: firstPayment?.dueDate, ...paymentInfo }
        });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Create subscription error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao criar assinatura', ...(error.code && { code: error.code }) });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.post('/credit-card', requireOwner, async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);
        const { planId, creditCard, creditCardHolderInfo } = req.body;

        if (!planId || !creditCard || !creditCardHolderInfo) return res.status(400).json({ error: 'Plano, dados do cartão e do titular são obrigatórios' });

        if (!creditCard.holderName || !creditCard.number || !creditCard.expiryMonth || !creditCard.expiryYear || !creditCard.ccv) 
        {
            return res.status(400).json({ error: 'Todos os dados do cartão são obrigatórios' });
        }

        // Plano concedido pelo admin já vencido deixa de contar como ativo (a linha é reaproveitada pelo saveSubscription)
        await expireGrantedSubscriptions(ownerId, connection);

        const [existingSub] = await connection.query('SELECT id FROM subscriptions WHERE userId = ? AND status IN ("ACTIVE", "TRIAL")', [ownerId]);
        if (existingSub.length > 0) return res.status(400).json({ error: 'Já existe uma assinatura ativa para este usuário' });

        const [plans] = await connection.query('SELECT * FROM plans WHERE id = ? AND isActive = TRUE', [planId]);
        if (plans.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
        const plan = plans[0];

        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [ownerId]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        const user = users[0];

        // Titular do cartão pode ser outra pessoa (nome e CPF dele); o email é sempre o da conta do dono
        const { payer: holder, error: holderError } = buildPayer(creditCardHolderInfo, user, 'holder');
        if (holderError) return res.status(400).json({ error: holderError, code: 'INVALID_PAYER' });

        const asaasCustomer = await resolveAsaasCustomer(connection, ownerId, holder);

        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + 1);
        const formattedDueDate = nextDueDate.toISOString().split('T')[0];

        const asaasSubscription = await asaasService.createSubscriptionWithCreditCard(
            {
                customer: asaasCustomer.id,
                value: centavosParaReais(plan.price),
                nextDueDate: formattedDueDate,
                cycle: 'MONTHLY',
                description: `Assinatura ${plan.name}`,
                externalReference: `plan_${planId}_user_${ownerId}`,
                remoteIp: req.ip
            },
            creditCard,
            holder
        );

        const subscriptionId = await saveSubscription(connection, ownerId, { planId: plan.id, asaasSubscriptionId: asaasSubscription.id, asaasCustomerId: asaasCustomer.id,
            status: 'ACTIVE', nextPaymentAt: formattedDueDate });

        await saveAccountDocument(ownerId, holder.cpfCnpj, connection);

        await connection.commit();

        res.status(201).json({
            id: subscriptionId,
            asaasSubscriptionId: asaasSubscription.id,
            status: 'ACTIVE',
            plan: { id: plan.id, name: plan.name, slug: plan.slug, price: plan.price },
            nextPaymentAt: formattedDueDate
        });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Create credit card subscription error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao criar assinatura com cartão', ...(error.code && { code: error.code }) });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.post('/trial', requireOwner, async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);
        const { planId } = req.body;

        if (!planId) return res.status(400).json({ error: 'Plano é obrigatório' });

        const [existingSub] = await connection.query('SELECT id FROM subscriptions WHERE userId = ?', [ownerId]);
        if (existingSub.length > 0) return res.status(400).json({ error: 'Usuário já possui ou possuiu uma assinatura. Trial disponível apenas para novos usuários.' });

        const [plans] = await connection.query('SELECT * FROM plans WHERE id = ? AND isActive = TRUE', [planId]);
        if (plans.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
        const plan = plans[0];

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
        const formattedTrialEnd = toLocalDateString(trialEndsAt);

        const [result] = await connection.query(`INSERT INTO subscriptions (userId, planId, status, trialEndsAt, createdAt) VALUES (?, ?, 'TRIAL', ?, NOW())`,
            [ownerId, planId, formattedTrialEnd]);

        await connection.commit();

        const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || [])

        res.status(201).json({
            id: result.insertId,
            status: 'TRIAL',
            plan: { 
                id: plan.id, 
                name: plan.name, 
                slug: plan.slug, 
                price: plan.price,
                features: features
            },
            trialEndsAt: formattedTrialEnd,
            trialDays: TRIAL_DAYS
        });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Create trial error:', error);
        res.status(500).json({ error: 'Erro ao criar período de teste' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.post('/convert-trial', requireOwner, async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);
        const { billingType, creditCard, creditCardHolderInfo, customerData } = req.body;

        if (!billingType) return res.status(400).json({ error: 'Tipo de cobrança é obrigatório' });

        const [subscriptions] = await connection.query(`SELECT s.id, s.planId, p.name, p.price FROM subscriptions s JOIN plans p ON s.planId = p.id WHERE s.userId = ? AND s.status = 'TRIAL' ORDER BY s.id DESC LIMIT 1`, [ownerId]);
        if (subscriptions.length === 0) return res.status(404).json({ error: 'Nenhum período de teste ativo encontrado' });
        const subscription = subscriptions[0];

        const plan = { id: subscription.planId, name: subscription.name, price: subscription.price };

        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [ownerId]);
        const user = users[0];

        const isCard = billingType === 'CREDIT_CARD';
        if (isCard && (!creditCard || !creditCardHolderInfo)) return res.status(400).json({ error: 'Dados do cartão e titular são obrigatórios' });

        const { payer, error: payerError } = buildPayer(isCard ? creditCardHolderInfo : customerData, user, isCard ? 'holder' : 'payer');
        if (payerError) return res.status(400).json({ error: payerError, code: 'INVALID_PAYER' });

        const asaasCustomer = await resolveAsaasCustomer(connection, ownerId, payer);

        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + (billingType === 'CREDIT_CARD' ? 1 : 5));
        const formattedDueDate = nextDueDate.toISOString().split('T')[0];

        let asaasSubscription;

        if (billingType === 'CREDIT_CARD') 
        {
            asaasSubscription = await asaasService.createSubscriptionWithCreditCard(
                {
                    customer: asaasCustomer.id,
                    value: centavosParaReais(plan.price),
                    nextDueDate: formattedDueDate,
                    cycle: 'MONTHLY',
                    description: `Assinatura ${plan.name}`,
                    externalReference: `plan_${plan.id}_user_${ownerId}`,
                    remoteIp: req.ip
                },
                creditCard,
                payer
            );
        } 
        else 
        {
            asaasSubscription = await asaasService.createSubscription({
                customer: asaasCustomer.id,
                billingType: billingType,
                value: centavosParaReais(plan.price),
                nextDueDate: formattedDueDate,
                cycle: 'MONTHLY',
                description: `Assinatura ${plan.name}`,
                externalReference: `plan_${plan.id}_user_${ownerId}`
            });
        }

        const newStatus = billingType === 'CREDIT_CARD' ? 'ACTIVE' : 'PENDING';
        await connection.query(`UPDATE subscriptions SET asaasSubscriptionId = ?, asaasCustomerId = ?, status = ?, nextPaymentAt = ?, trialEndsAt = NULL WHERE id = ?`,
            [asaasSubscription.id, asaasCustomer.id, newStatus, formattedDueDate, subscription.id]);

        await saveAccountDocument(ownerId, payer.cpfCnpj, connection);

        await connection.commit();

        let paymentInfo = {};
        if (billingType !== 'CREDIT_CARD') 
        {
            const payments = await asaasService.listSubscriptionPayments(asaasSubscription.id);
            const firstPayment = payments.data?.[0];

            if (firstPayment) 
            {
                if (billingType === 'PIX') 
                {
                    const pixData = await asaasService.getPixQrCode(firstPayment.id);
                    paymentInfo = { pixQrCode: pixData.encodedImage, pixCopyPaste: pixData.payload };
                } 
                else if (billingType === 'BOLETO') 
                {
                    const boletoData = await asaasService.getBoletoIdentificationField(firstPayment.id);
                    paymentInfo = { boletoUrl: firstPayment.bankSlipUrl, boletoBarcode: boletoData.identificationField };
                }
            }
        }

        res.json({
            id: subscription.id,
            asaasSubscriptionId: asaasSubscription.id,
            status: newStatus,
            plan: { id: plan.id, name: plan.name, price: plan.price },
            nextPaymentAt: formattedDueDate,
            payment: paymentInfo
        });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Convert trial error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao converter período de teste', ...(error.code && { code: error.code }) });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.put('/me', requireOwner, async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const { planId } = req.body;
        if (!planId) return res.status(400).json({ error: 'Plano é obrigatório' });

        const [subscriptions] = await connection.query(`SELECT s.*, p.price as currentPrice FROM subscriptions s JOIN plans p ON s.planId = p.id 
            WHERE s.userId = ? AND s.status IN ("ACTIVE", "TRIAL", "PENDING") ORDER BY s.id DESC LIMIT 1 FOR UPDATE`, [ownerId]);
        if (subscriptions.length === 0) return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada' });

        const subscription = subscriptions[0];

        const [plans] = await connection.query('SELECT * FROM plans WHERE id = ? AND isActive = TRUE', [planId]);
        if (plans.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });

        const newPlan = plans[0];
        const features = typeof newPlan.features === 'string' ? JSON.parse(newPlan.features) : (newPlan.features || []);
        const planResponse = { id: newPlan.id, name: newPlan.name, slug: newPlan.slug, price: newPlan.price, features };

        const updateAsaasValue = async (plan, updatePendingPayments) => 
        {
            if (!subscription.asaasSubscriptionId) return;
            await asaasService.updateSubscription(subscription.asaasSubscriptionId, {
                value: centavosParaReais(plan.price),
                description: `Assinatura ${plan.name}`,
                externalReference: `plan_${plan.id}_user_${ownerId}`,
                updatePendingPayments
            });
        };

        if (newPlan.id === subscription.planId) 
        {
            if (!subscription.pendingPlanId) return res.status(400).json({ error: 'Você já está neste plano' });

            // Desiste do upgrade pendente: volta a cobrança para o valor do plano atual
            await updateAsaasValue(newPlan, true);
            await connection.query('UPDATE subscriptions SET pendingPlanId = NULL WHERE id = ?', [subscription.id]);
            await connection.commit();

            return res.json({ id: subscription.id, status: subscription.status, plan: planResponse, pendingPlan: null });
        }

        const isUpgrade = newPlan.price > subscription.currentPrice;

        // Upgrade com cobrança no Asaas: o plano só muda quando o pagamento no valor novo for confirmado (webhook ou /me/sync).
        // Em TRIAL ainda não há cobrança: a troca vale na hora e o valor do plano novo é cobrado no convert-trial.
        if (isUpgrade && subscription.asaasSubscriptionId) 
        {
            await updateAsaasValue(newPlan, true);
            await connection.query('UPDATE subscriptions SET pendingPlanId = ? WHERE id = ?', [newPlan.id, subscription.id]);
            await connection.commit();

            // Cobrança pendente (já no valor novo) para o front levar o usuário ao pagamento; opcional se o Asaas falhar
            let payment;
            try 
            {
                const payments = await asaasService.listSubscriptionPayments(subscription.asaasSubscriptionId, { status: 'PENDING', limit: 1 });
                const pending = payments?.data?.[0];
                if (pending) payment = { id: pending.id, status: pending.status, billingType: pending.billingType, invoiceUrl: pending.invoiceUrl };
            } 
            catch (err) 
            {
                console.error('List pending payment error:', err.message);
            }

            return res.status(202).json({
                id: subscription.id,
                status: subscription.status,
                pendingPlan: { id: newPlan.id, name: newPlan.name, slug: newPlan.slug, price: newPlan.price },
                message: 'O novo plano será ativado assim que o pagamento for confirmado',
                ...(payment && { payment })
            });
        }

        if (!isUpgrade) 
        {
            const [employees] = await connection.query('SELECT COUNT(*) as count FROM users WHERE userId = ?', [ownerId]);
            const current = Number(employees[0].count);
            const max = newPlan.maxEmployees || 0;

            if (current > max) 
            {
                return res.status(409).json({ error: `Remova funcionários antes de mudar de plano (${current}/${max} permitidos)`, code: 'EMPLOYEE_LIMIT', current, max });
            }
        }

        await updateAsaasValue(newPlan, Boolean(req.body.updatePendingPayments));
        await connection.query('UPDATE subscriptions SET planId = ?, pendingPlanId = NULL WHERE id = ?', [newPlan.id, subscription.id]);

        await connection.commit();

        res.json({ id: subscription.id, status: subscription.status, plan: planResponse, pendingPlan: null });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Update subscription error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao atualizar assinatura', ...(error.code && { code: error.code }) });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.put('/me/credit-card', requireOwner, async (req, res) => 
{
    try 
    {
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);
        const { creditCard, creditCardHolderInfo } = req.body;

        if (!creditCard || !creditCardHolderInfo)  return res.status(400).json({ error: 'Dados do cartão e do titular são obrigatórios' });

        const [users] = await pool.query('SELECT email FROM users WHERE id = ?', [ownerId]);
        const { payer: holder, error: holderError } = buildPayer(creditCardHolderInfo, users[0], 'holder');
        if (holderError) return res.status(400).json({ error: holderError, code: 'INVALID_PAYER' });

        const [subscriptions] = await pool.query('SELECT * FROM subscriptions WHERE userId = ? AND asaasSubscriptionId IS NOT NULL ORDER BY id DESC LIMIT 1', [ownerId]);
        if (subscriptions.length === 0) return res.status(404).json({ error: 'Nenhuma assinatura encontrada' });
        const subscription = subscriptions[0];

        await resolveAsaasCustomer(pool, ownerId, holder);
        await asaasService.updateSubscriptionCreditCard(subscription.asaasSubscriptionId, creditCard, holder);
        await saveAccountDocument(ownerId, holder.cpfCnpj);

        res.json({ message: 'Cartão atualizado com sucesso' });
    } 
    catch (error) 
    {
        console.error('Update credit card error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao atualizar cartão', ...(error.code && { code: error.code }) });
    }
});

router.delete('/me', requireOwner, async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const [subscriptions] = await connection.query('SELECT * FROM subscriptions WHERE userId = ? AND status IN ("ACTIVE", "TRIAL", "PENDING") ORDER BY id DESC LIMIT 1', [ownerId]);
        if (subscriptions.length === 0) return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada' });
        const subscription = subscriptions[0];

        if (subscription.asaasSubscriptionId) await asaasService.deleteSubscription(subscription.asaasSubscriptionId);

        await connection.query('UPDATE subscriptions SET status = "CANCELLED", cancelledAt = NOW() WHERE id = ?', [subscription.id]);

        await connection.commit();

        res.json({ message: 'Assinatura cancelada com sucesso' });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Cancel subscription error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao cancelar assinatura', ...(error.code && { code: error.code }) });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.get('/me/payments', requireOwner, async (req, res) => 
{
    try 
    {
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);
        const { status, offset, limit } = req.query;

        const [subscriptions] = await pool.query('SELECT * FROM subscriptions WHERE userId = ? AND asaasSubscriptionId IS NOT NULL ORDER BY id DESC LIMIT 1', [ownerId]);
        // Sem assinatura no Asaas (nunca assinou, trial ou plano concedido pelo admin) não há cobrança: o front mostra o motivo
        if (subscriptions.length === 0) return res.json({ data: [], hasMore: false, totalCount: 0, reason: 'NO_ASAAS_SUBSCRIPTION' });
        const subscription = subscriptions[0];

        const payments = await asaasService.listSubscriptionPayments(subscription.asaasSubscriptionId, { status, offset, limit });

        res.json(payments);
    } 
    catch (error) 
    {
        console.error('List payments error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao listar cobranças', ...(error.code && { code: error.code }) });
    }
});

router.get('/payments/:paymentId', requireOwner, async (req, res) => 
{
    try 
    {
        const { paymentId } = req.params;
        const ownerId = await getOwnerId(req.user.id);

        // Só cobranças da assinatura do próprio dono (evita ler cobrança de outra barbearia pelo id)
        const [subscriptions] = await pool.query('SELECT asaasSubscriptionId FROM subscriptions WHERE userId = ? AND asaasSubscriptionId IS NOT NULL', [ownerId]);
        const payment = subscriptions.length > 0 ? await asaasService.getPayment(paymentId) : null;
        if (!payment || !subscriptions.some(sub => sub.asaasSubscriptionId === payment.subscription)) return res.status(404).json({ error: 'Cobrança não encontrada' });
        
        let paymentInfo = { ...payment };

        if (payment.billingType === 'PIX' && payment.status === 'PENDING') 
        {
            const pixData = await asaasService.getPixQrCode(paymentId);
            paymentInfo.pixQrCode = pixData.encodedImage;
            paymentInfo.pixCopyPaste = pixData.payload;
        } 
        else if (payment.billingType === 'BOLETO') 
        {
            const boletoData = await asaasService.getBoletoIdentificationField(paymentId);
            paymentInfo.boletoBarcode = boletoData.identificationField;
        }

        res.json(paymentInfo);
    } 
    catch (error) 
    {
        console.error('Get payment error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao buscar cobrança', ...(error.code && { code: error.code }) });
    }
});

router.post('/me/sync', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const [subscriptions] = await connection.query(`SELECT s.*, p.name as planName, p.slug as planSlug, p.price as planPrice, p.maxEmployees, p.features FROM subscriptions s 
            JOIN plans p ON s.planId = p.id WHERE s.userId = ? ORDER BY s.id DESC LIMIT 1`, [ownerId]);

        if (subscriptions.length === 0) 
        {
            await connection.commit();
            return res.json({ synced: false, message: 'Nenhuma assinatura encontrada' });
        }

        const localSub = subscriptions[0];

        if (!localSub.asaasSubscriptionId) 
        {
            await connection.commit();
            return res.json({ synced: false, message: 'Assinatura sem vínculo com ASAAS' });
        }

        let asaasSub;
        try 
        {
            asaasSub = await asaasService.getSubscription(localSub.asaasSubscriptionId);
        } 
        catch (err) 
        {
            console.error('Erro ao buscar assinatura no ASAAS:', err);
            await connection.commit();
            return res.json({ synced: false, message: 'Erro ao conectar com ASAAS' });
        }

        let asaasPayments;
        try 
        {
            asaasPayments = await asaasService.listSubscriptionPayments(localSub.asaasSubscriptionId, { limit: 10 });
        } 
        catch (err) 
        {
            console.error('Erro ao buscar cobranças no ASAAS:', err);
            asaasPayments = { data: [] };
        }

        const payments = asaasPayments.data || [];

        let newStatus = localSub.status;
        let lastPaymentAt = localSub.lastPaymentAt;
        let nextPaymentAt = localSub.nextPaymentAt;
        let lastConfirmedValue = null;

        if (asaasSub.deleted || asaasSub.status === 'INACTIVE') 
        {
            newStatus = 'CANCELLED';
        }
        else 
        {
            const confirmedPayments = payments.filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH');
            const pendingPayments = payments.filter(p => p.status === 'PENDING');
            const overduePayments = payments.filter(p => p.status === 'OVERDUE');

            if (confirmedPayments.length > 0) 
            {
                confirmedPayments.sort((a, b) => new Date(b.paymentDate || b.confirmedDate) - new Date(a.paymentDate || a.confirmedDate));
                
                const lastConfirmed = confirmedPayments[0];
                
                newStatus = 'ACTIVE';
                lastConfirmedValue = lastConfirmed.value;
                
                lastPaymentAt = lastConfirmed.paymentDate || lastConfirmed.confirmedDate || new Date().toISOString().split('T')[0];

                const lastDueDate = new Date(lastConfirmed.dueDate);
                const nextDue = new Date(lastDueDate);
                
                switch (asaasSub.cycle) 
                {
                    case 'WEEKLY':
                        nextDue.setDate(nextDue.getDate() + 7);
                        break;
                    case 'BIWEEKLY':
                        nextDue.setDate(nextDue.getDate() + 14);
                        break;
                    case 'MONTHLY':
                        nextDue.setMonth(nextDue.getMonth() + 1);
                        break;
                    case 'BIMONTHLY':
                        nextDue.setMonth(nextDue.getMonth() + 2);
                        break;
                    case 'QUARTERLY':
                        nextDue.setMonth(nextDue.getMonth() + 3);
                        break;
                    case 'SEMIANNUALLY':
                        nextDue.setMonth(nextDue.getMonth() + 6);
                        break;
                    case 'YEARLY':
                        nextDue.setFullYear(nextDue.getFullYear() + 1);
                        break;
                    default:
                        nextDue.setMonth(nextDue.getMonth() + 1);
                }
                
                nextPaymentAt = nextDue.toISOString().split('T')[0];
            }
            else if (overduePayments.length > 0) 
            {
                newStatus = 'OVERDUE';
                
                overduePayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                nextPaymentAt = overduePayments[0].dueDate;
            }
            else if (pendingPayments.length > 0) 
            {
                if (localSub.status !== 'TRIAL') newStatus = 'PENDING';
                
                pendingPayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                nextPaymentAt = pendingPayments[0].dueDate;
            }
        }

        const hasChanges = newStatus !== localSub.status || lastPaymentAt !== localSub.lastPaymentAt || nextPaymentAt !== localSub.nextPaymentAt;

        if (hasChanges) 
        {
            await connection.query(`UPDATE subscriptions SET status = ?, lastPaymentAt = ?, nextPaymentAt = ?, updatedAt = NOW() WHERE id = ?`,
                [newStatus, lastPaymentAt, nextPaymentAt, localSub.id]);
        }

        if (newStatus === 'ACTIVE' && lastConfirmedValue !== null) await applyPendingPlan(connection, localSub, lastConfirmedValue);

        await connection.commit();

        const [updatedSub] = await pool.query(`SELECT s.*, p.name as planName, p.slug as planSlug, p.price as planPrice, p.maxEmployees, p.features FROM subscriptions s 
            JOIN plans p ON s.planId = p.id WHERE s.id = ?`, [localSub.id]);

        const sub = updatedSub[0];
        const features = typeof sub.features === 'string' ? JSON.parse(sub.features) : (sub.features || []);
        const effective = await resolveSubscription(ownerId);

        res.json({
            synced: true,
            hasChanges,
            previousStatus: localSub.status,
            subscription: {
                id: sub.id,
                status: sub.status,
                asaasSubscriptionId: sub.asaasSubscriptionId,
                plan: {
                    id: sub.planId,
                    name: sub.planName,
                    slug: sub.planSlug,
                    price: sub.planPrice,
                    maxEmployees: sub.maxEmployees,
                    features: features
                },
                trialEndsAt: sub.trialEndsAt,
                nextPaymentAt: sub.nextPaymentAt,
                lastPaymentAt: sub.lastPaymentAt,
                isLimited: effective.isLimited
            }
        });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Sync subscription error:', error);
        res.status(500).json({ error: 'Erro ao sincronizar assinatura' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

export default router;