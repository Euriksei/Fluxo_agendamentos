import express from 'express';
import pool from '../config/database.js';

import { authenticateToken } from '../middlewares/authentication.js';

import { getOwnerId } from '../utils/user.js';

const router = express.Router();

router.get('/', async (req, res) => 
{
    try 
    {
        const [plans] = await pool.query('SELECT * FROM plans WHERE isActive = TRUE ORDER BY price ASC');
        const plansWithFeatures = plans.map(plan => ({ ...plan, features: Array.isArray(plan.features) ? plan.features : [] }));
        res.json(plansWithFeatures);
    } 
    catch (error) 
    {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Erro ao buscar planos' });
    }
});

router.get('/me', authenticateToken, async (req, res) => 
{
    try 
    {
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const [subscriptions] = await pool.query(`SELECT s.*, p.name as planName, p.slug as planSlug, p.price as planPrice, p.maxEmployees, p.features 
            FROM subscriptions s JOIN plans p ON s.planId = p.id WHERE s.userId = ? `, [ownerId]);

        if (subscriptions.length === 0) 
        {
            const [basicPlan] = await pool.query('SELECT * FROM plans WHERE slug = "free"');

            return res.json({
                status: 'NONE',
                plan: basicPlan[0] ? { ...basicPlan[0], features: Array.isArray(basicPlan[0].features) ? basicPlan[0].features : [] } : null,
                isLimited: true
            });
        }

        const sub = subscriptions[0];

        res.json({
            ...sub,
            plan: {
                id: sub.planId,
                name: sub.planName,
                slug: sub.planSlug,
                price: sub.planPrice,
                maxEmployees: sub.maxEmployees,
                features: JSON.parse(sub.features || '[]')
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

export default router;