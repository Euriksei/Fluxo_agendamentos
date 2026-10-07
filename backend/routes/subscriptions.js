import express from 'express';
import pool from '../config/database.js';

import { authenticateToken } from '../middlewares/authentication.js';

import { getOwnerId } from '../utils/user.js';
import { centavosParaReais } from '../utils/currency.js';

import asaasService from '../services/asaas.js';

const router = express.Router();

const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN;
router.post('/webhook', async (req, res) => 
{
    if (!ASAAS_WEBHOOK_TOKEN) return res.status(400).json({ error: 'Token do ASAAS não definido' });
    const receivedToken = req.headers['asaas-access-token'];
    if (!receivedToken || receivedToken !== ASAAS_WEBHOOK_TOKEN) { console.log('Token recebido:', receivedToken); return res.status(401).json({ error: 'Token inválido' }); }

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
                const [subs] = await connection.query('SELECT * FROM subscriptions WHERE asaasSubscriptionId = ?', [asaasSubscriptionId]);
                
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
                            break;

                        case 'PAYMENT_OVERDUE':
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
            const [subs] = await connection.query('SELECT * FROM subscriptions WHERE asaasSubscriptionId = ?', [subscription.id]);
            
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

        const [subscriptions] = await pool.query(`SELECT s.*, p.name as planName, p.slug as planSlug, p.price as planPrice, p.maxEmployees, p.features FROM subscriptions s 
            JOIN plans p ON s.planId = p.id WHERE s.userId = ?`, [ownerId]);

        if (subscriptions.length === 0) 
        {
            const [basicPlan] = await pool.query('SELECT * FROM plans WHERE slug = "free"');

            const features = typeof basicPlan[0].features === 'string' ? JSON.parse(basicPlan[0].features) : (basicPlan[0].features || []);

            return res.json({
                status: 'NONE',
                plan: basicPlan[0] ? { ...basicPlan[0], features: features } : null,
                isLimited: true
            });
        }

        const sub = subscriptions[0];

        const features = typeof sub.features === 'string' ? JSON.parse(sub.features) : (sub.features || []);

        res.json({
            ...sub,
            plan: {
                id: sub.planId,
                name: sub.planName,
                slug: sub.planSlug,
                price: sub.planPrice,
                maxEmployees: sub.maxEmployees,
                features: features
            },
            isLimited: sub.status !== 'ACTIVE' && sub.status !== 'TRIAL'
        });
    } 
    catch (error) 
    {
        console.error('Get my subscription error:', error);
        res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
});

router.post('/', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const { planId, billingType, customerData } = req.body;
        if (!planId || !billingType) return res.status(400).json({ error: 'Plano e tipo de cobrança são obrigatórios' });

        const [existingSub] = await connection.query('SELECT id FROM subscriptions WHERE userId = ? AND status IN ("ACTIVE", "TRIAL")', [ownerId]);
        if (existingSub.length > 0) return res.status(400).json({ error: 'Já existe uma assinatura ativa para este usuário' });

        const [plans] = await connection.query('SELECT * FROM plans WHERE id = ? AND isActive = TRUE', [planId]);
        if (plans.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
        const plan = plans[0];

        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [ownerId]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        const user = users[0];

        const asaasCustomer = await asaasService.findOrCreateCustomer({
            name: customerData?.name || user.name,
            email: customerData?.email || user.email,
            cpfCnpj: customerData?.cpfCnpj,
            phone: customerData?.phone,
            mobilePhone: customerData?.mobilePhone,
            postalCode: customerData?.postalCode,
            address: customerData?.address,
            addressNumber: customerData?.addressNumber,
            province: customerData?.province,
            externalReference: `user_${ownerId}`
        });

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

        const [result] = await connection.query(`INSERT INTO subscriptions (userId, planId, asaasSubscriptionId, asaasCustomerId, status, nextPaymentAt, createdAt) 
            VALUES (?, ?, ?, ?, 'PENDING', ?, NOW())`, [ownerId, planId, asaasSubscription.id, asaasCustomer.id, formattedDueDate]);

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
            id: result.insertId,
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
        res.status(error.status || 500).json({ error: error.message || 'Erro ao criar assinatura' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.post('/credit-card', async (req, res) => 
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

        const [existingSub] = await connection.query('SELECT id FROM subscriptions WHERE userId = ? AND status IN ("ACTIVE", "TRIAL")', [ownerId]);
        if (existingSub.length > 0) return res.status(400).json({ error: 'Já existe uma assinatura ativa para este usuário' });

        const [plans] = await connection.query('SELECT * FROM plans WHERE id = ? AND isActive = TRUE', [planId]);
        if (plans.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
        const plan = plans[0];

        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [ownerId]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        const user = users[0];

        const asaasCustomer = await asaasService.findOrCreateCustomer({
            name: creditCardHolderInfo.name || user.name,
            email: creditCardHolderInfo.email || user.email,
            cpfCnpj: creditCardHolderInfo.cpfCnpj,
            phone: creditCardHolderInfo.phone,
            mobilePhone: creditCardHolderInfo.mobilePhone,
            postalCode: creditCardHolderInfo.postalCode,
            address: creditCardHolderInfo.address,
            addressNumber: creditCardHolderInfo.addressNumber,
            province: creditCardHolderInfo.province,
            externalReference: `user_${ownerId}`
        });

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
            creditCardHolderInfo
        );

        const [result] = await connection.query(`INSERT INTO subscriptions (userId, planId, asaasSubscriptionId, asaasCustomerId, status, nextPaymentAt, createdAt) 
            VALUES (?, ?, ?, ?, 'ACTIVE', ?, NOW())`, [ownerId, planId, asaasSubscription.id, asaasCustomer.id, formattedDueDate]);

        await connection.commit();

        res.status(201).json({
            id: result.insertId,
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
        res.status(error.status || 500).json({ error: error.message || 'Erro ao criar assinatura com cartão' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.post('/trial', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);
        const { planId, trialDays = 7 } = req.body;

        if (!planId) return res.status(400).json({ error: 'Plano é obrigatório' });

        const [existingSub] = await connection.query('SELECT id FROM subscriptions WHERE userId = ?', [ownerId]);
        if (existingSub.length > 0) return res.status(400).json({ error: 'Usuário já possui ou possuiu uma assinatura. Trial disponível apenas para novos usuários.' });

        const [plans] = await connection.query('SELECT * FROM plans WHERE id = ? AND isActive = TRUE', [planId]);
        if (plans.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
        const plan = plans[0];

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
        const formattedTrialEnd = trialEndsAt.toISOString().split('T')[0];

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
            trialDays: trialDays
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

router.post('/convert-trial', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);
        const { billingType, creditCard, creditCardHolderInfo, customerData } = req.body;

        if (!billingType) return res.status(400).json({ error: 'Tipo de cobrança é obrigatório' });

        const [subscriptions] = await connection.query(`SELECT s.*, p.* FROM subscriptions s JOIN plans p ON s.planId = p.id WHERE s.userId = ? AND s.status = 'TRIAL'`, [ownerId]);
        if (subscriptions.length === 0) return res.status(404).json({ error: 'Nenhum período de teste ativo encontrado' });
        const subscription = subscriptions[0];

        const plan = { id: subscription.planId, name: subscription.name, price: subscription.price };

        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [ownerId]);
        const user = users[0];

        const customerInfo = customerData || creditCardHolderInfo || {};

        const asaasCustomer = await asaasService.findOrCreateCustomer({
            name: customerInfo.name || user.name,
            email: customerInfo.email || user.email,
            cpfCnpj: customerInfo.cpfCnpj,
            phone: customerInfo.phone,
            mobilePhone: customerInfo.mobilePhone,
            postalCode: customerInfo.postalCode,
            address: customerInfo.address,
            addressNumber: customerInfo.addressNumber,
            province: customerInfo.province,
            externalReference: `user_${ownerId}`
        });

        const nextDueDate = new Date();
        nextDueDate.setDate(nextDueDate.getDate() + (billingType === 'CREDIT_CARD' ? 1 : 5));
        const formattedDueDate = nextDueDate.toISOString().split('T')[0];

        let asaasSubscription;

        if (billingType === 'CREDIT_CARD') 
        {
            if (!creditCard || !creditCardHolderInfo) return res.status(400).json({ error: 'Dados do cartão e titular são obrigatórios' });

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
                creditCardHolderInfo
            );
        } 
        else 
        {
            asaasSubscription = await asaasService.createSubscription({
                customer: asaasCustomer.id,
                billingType: billingType,
                value: plan.price,
                nextDueDate: formattedDueDate,
                cycle: 'MONTHLY',
                description: `Assinatura ${plan.name}`,
                externalReference: `plan_${plan.id}_user_${ownerId}`
            });
        }

        const newStatus = billingType === 'CREDIT_CARD' ? 'ACTIVE' : 'PENDING';
        await connection.query(`UPDATE subscriptions SET asaasSubscriptionId = ?, asaasCustomerId = ?, status = ?, nextPaymentAt = ?, trialEndsAt = NULL WHERE id = ?`,
            [asaasSubscription.id, asaasCustomer.id, newStatus, formattedDueDate, subscription.id]);

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
        res.status(error.status || 500).json({ error: error.message || 'Erro ao converter período de teste' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.put('/me', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const { planId, updatePendingPayments } = req.body;
        if (!planId) return res.status(400).json({ error: 'Plano é obrigatório' });

        const [subscriptions] = await connection.query('SELECT * FROM subscriptions WHERE userId = ? AND status IN ("ACTIVE", "TRIAL", "PENDING")', [ownerId]);
        if (subscriptions.length === 0) return res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada' });

        const subscription = subscriptions[0];

        const [plans] = await connection.query('SELECT * FROM plans WHERE id = ? AND isActive = TRUE', [planId]);
        if (plans.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });

        const newPlan = plans[0];

        if (subscription.asaasSubscriptionId) 
        {
            await asaasService.updateSubscription(subscription.asaasSubscriptionId, {
                value: centavosParaReais(newPlan.price),
                description: `Assinatura ${newPlan.name}`,
                externalReference: `plan_${planId}_user_${ownerId}`,
                updatePendingPayments: updatePendingPayments || false
            });
        }

        await connection.query('UPDATE subscriptions SET planId = ? WHERE id = ?', [planId, subscription.id]);

        await connection.commit();

        const features = typeof newPlan.features === 'string' ? JSON.parse(newPlan.features) : (newPlan.features || []);

        res.json({
            id: subscription.id,
            status: subscription.status,
            plan: { id: newPlan.id, name: newPlan.name, slug: newPlan.slug, price: newPlan.price, features: features }
        });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Update subscription error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao atualizar assinatura' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.put('/me/credit-card', async (req, res) => 
{
    try 
    {
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);
        const { creditCard, creditCardHolderInfo } = req.body;

        if (!creditCard || !creditCardHolderInfo)  return res.status(400).json({ error: 'Dados do cartão e do titular são obrigatórios' });

        const [subscriptions] = await pool.query('SELECT * FROM subscriptions WHERE userId = ? AND asaasSubscriptionId IS NOT NULL', [ownerId]);
        if (subscriptions.length === 0) return res.status(404).json({ error: 'Nenhuma assinatura encontrada' });
        const subscription = subscriptions[0];

        await asaasService.updateSubscriptionCreditCard(subscription.asaasSubscriptionId, creditCard, creditCardHolderInfo);

        res.json({ message: 'Cartão atualizado com sucesso' });
    } 
    catch (error) 
    {
        console.error('Update credit card error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao atualizar cartão' });
    }
});

router.delete('/me', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const [subscriptions] = await connection.query('SELECT * FROM subscriptions WHERE userId = ? AND status IN ("ACTIVE", "TRIAL", "PENDING")', [ownerId]);
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
        res.status(error.status || 500).json({ error: error.message || 'Erro ao cancelar assinatura' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.get('/me/payments', async (req, res) => 
{
    try 
    {
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);
        const { status, offset, limit } = req.query;

        const [subscriptions] = await pool.query('SELECT * FROM subscriptions WHERE userId = ? AND asaasSubscriptionId IS NOT NULL', [ownerId]);
        if (subscriptions.length === 0) return res.json({ data: [], hasMore: false, totalCount: 0 });
        const subscription = subscriptions[0];

        const payments = await asaasService.listSubscriptionPayments(subscription.asaasSubscriptionId, { status, offset, limit });

        res.json(payments);
    } 
    catch (error) 
    {
        console.error('List payments error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Erro ao listar cobranças' });
    }
});

router.get('/payments/:paymentId', async (req, res) => 
{
    try 
    {
        const { paymentId } = req.params;

        const payment = await asaasService.getPayment(paymentId);
        
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
        res.status(error.status || 500).json({ error: error.message || 'Erro ao buscar cobrança' });
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
            JOIN plans p ON s.planId = p.id WHERE s.userId = ?`, [ownerId]);

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

        await connection.commit();

        const [updatedSub] = await pool.query(`SELECT s.*, p.name as planName, p.slug as planSlug, p.price as planPrice, p.maxEmployees, p.features FROM subscriptions s 
            JOIN plans p ON s.planId = p.id WHERE s.id = ?`, [localSub.id]);

        const sub = updatedSub[0];
        const features = typeof sub.features === 'string' ? JSON.parse(sub.features) : (sub.features || []);

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
                isLimited: sub.status !== 'ACTIVE' && sub.status !== 'TRIAL'
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