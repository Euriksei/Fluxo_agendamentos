import pool from '../config/database.js';

import { getOwnerId } from '../utils/user.js';
import { getPlans } from '../utils/plans.js';

const ADMIN_SUBSCRIPTION = { status: 'ACTIVE', plan: { slug: 'premium', maxEmployees: 999, features: ['services', 'agendas', 'appointments', 'employees', 'flows'] } };

// Plano efetivo do dono: assinatura ACTIVE/TRIAL (não expirada) usa as features do plano; sem assinatura ou OVERDUE/SUSPENDED/CANCELLED/PENDING cai para o free
export async function resolveSubscription(ownerId) 
{
    const plans = await getPlans();

    const [subscriptions] = await pool.query(`SELECT s.id, s.userId, s.planId, s.asaasSubscriptionId, s.asaasCustomerId, s.status, s.trialEndsAt, s.nextPaymentAt, 
        s.lastPaymentAt, s.cancelledAt, s.createdAt, p.name as planName, p.slug as planSlug, p.price as planPrice, p.maxEmployees, p.features FROM subscriptions s JOIN 
            plans p ON s.planId = p.id WHERE s.userId = ?`, [ownerId]);

    if (subscriptions.length === 0) 
    {
        const freePlan = plans.free || { maxEmployees: 0, features: ['services', 'agendas'] };
        return { 
            status: 'NONE', 
            plan: { 
                slug: 'free', 
                maxEmployees: freePlan.maxEmployees, 
                name: 'Free', 
                features: freePlan.features 
            }, 
            isLimited: true 
        };
    } 
    else 
    {
        const sub = subscriptions[0];
        const isActive = sub.status === 'ACTIVE' || sub.status === 'TRIAL';
        
        let status = sub.status;
        if (sub.status === 'TRIAL' && sub.trialEndsAt) 
        {
            const trialEnd = new Date(sub.trialEndsAt);
            if (new Date() > trialEnd) status = 'EXPIRED';
        }

        const planSlug = sub.planSlug || 'free';
        const planConfig = plans[planSlug] || plans.free;
        
        let features = planConfig.features;
        if (typeof sub.features === 'string') 
        {
            try { features = JSON.parse(sub.features); } 
            catch (e) { features = planConfig.features; }
        } 
        else if (Array.isArray(sub.features)) 
        {
            features = sub.features;
        }

        return {
            id: sub.id,
            status: status,
            asaasSubscriptionId: sub.asaasSubscriptionId,
            asaasCustomerId: sub.asaasCustomerId,
            plan: 
            {
                id: sub.planId,
                name: sub.planName,
                slug: planSlug,
                price: sub.planPrice,
                maxEmployees: sub.maxEmployees || planConfig.maxEmployees,
                features: (isActive && status !== 'EXPIRED') ? features : (plans.free?.features || ['services', 'agendas']),
            },
            trialEndsAt: sub.trialEndsAt,
            nextPaymentAt: sub.nextPaymentAt,
            lastPaymentAt: sub.lastPaymentAt,
            isLimited: !isActive || status === 'EXPIRED'
        };
    }
}

// Usado pelas rotas públicas (agendamento): o recurso depende do plano do dono da barbearia. null = usuário não existe
export async function ownerHasFeature(userId, featureName) 
{
    const ownerId = await getOwnerId(userId);
    if (!ownerId) return null;

    const [owner] = await pool.query('SELECT role FROM users WHERE id = ?', [ownerId]);
    if (owner.length === 0) return null;
    if (owner[0].role === 'ADMIN') return true;

    const subscription = await resolveSubscription(ownerId);
    return (subscription.plan?.features || []).includes(featureName);
}

export const checkSubscription = async (req, res, next) => 
{
    try 
    {
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const [user] = await pool.query('SELECT id, userId, role FROM users WHERE id = ?', [userId]);
        if (user.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });

        req.subscription = user[0].role === 'ADMIN' ? ADMIN_SUBSCRIPTION : await resolveSubscription(ownerId);

        next();
    } 
    catch (error) 
    {
        console.error('Check subscription error:', error);
        if (!res.headersSent) res.status(500).json({ error: 'Erro ao verificar assinatura' });
    }
};

export const requireFeature = (featureName) => 
{
    return (req, res, next) => 
    {
        const features = req.subscription?.plan?.features || [];
        
        if (!features.includes(featureName)) 
        {
            return res.status(403).json({ error: 'Funcionalidade não disponível no seu plano', code: 'FEATURE_NOT_AVAILABLE', feature: featureName });
        }

        next();
    };
};

export const requireCanAddEmployee = async (req, res, next) => 
{
    try 
    {
        if (res.headersSent) return;
        
        if (!req.subscription?.plan?.features?.includes('employees')) 
        {
            return res.status(403).json({ error: 'Seu plano não permite adicionar funcionários', code: 'FEATURE_NOT_AVAILABLE', feature: 'employees' });
        }

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const [employees] = await pool.query('SELECT COUNT(*) as count FROM users WHERE userId = ?', [ownerId]);

        const currentCount = employees[0].count;
        const maxAllowed = req.subscription?.plan?.maxEmployees || 0;

        if (currentCount >= maxAllowed) 
        {
            return res.status(403).json({ error: `Limite de funcionários atingido (${currentCount}/${maxAllowed})`, code: 'EMPLOYEE_LIMIT_REACHED',
                current: currentCount, max: maxAllowed });
        }

        next();
    } 
    catch (error) 
    {
        console.error('Check can add employee error:', error);
        res.status(500).json({ error: 'Erro ao verificar limite de funcionários' });
    }
};

export const requireActiveSubscription = (req, res, next) => 
{
    const status = req.subscription?.status;
    if (status !== 'ACTIVE' && status !== 'TRIAL') return res.status(403).json({ error: 'Assinatura inativa', code: 'SUBSCRIPTION_INACTIVE', status: status });
    next();
};

// Rotas públicas de agendamento: 403 BOOKING_UNAVAILABLE se o plano efetivo do dono não tem 'appointments'.
// resolveUserId(req) devolve o id do profissional (ou null para deixar a rota responder 400/404).
export const requireBookingAvailable = (resolveUserId) => 
{
    return async (req, res, next) => 
    {
        try 
        {
            const userId = await resolveUserId(req);
            if (userId == null) return next();

            const available = await ownerHasFeature(userId, 'appointments');
            if (available === false) return res.status(403).json({ error: 'Agendamento online indisponível para esta barbearia', code: 'BOOKING_UNAVAILABLE' });

            next();
        } 
        catch (error) 
        {
            console.error('Check booking availability error:', error);
            res.status(500).json({ error: 'Erro ao verificar disponibilidade de agendamento' });
        }
    };
};