import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';

import { authenticateToken, requireAdmin } from '../middlewares/authentication.js';
import { toLocalDateString } from '../utils/date.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/stats', async (req, res) => 
{
    try 
    {
        const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role != "ADMIN"');
        const [totalBarbers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "BARBER"');
        const [totalEmployees] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "EMPLOYEE"');

        const [activeSubscriptions] = await pool.query('SELECT COUNT(*) as count FROM subscriptions WHERE status = "ACTIVE"');
        const [trialSubscriptions] = await pool.query('SELECT COUNT(*) as count FROM subscriptions WHERE status = "TRIAL"');
        const [overdueSubscriptions] = await pool.query('SELECT COUNT(*) as count FROM subscriptions WHERE status = "OVERDUE"');

        //const [monthlyRevenue] = await pool.query(`SELECT SUM(amount) as total FROM payments WHERE status IN ('CONFIRMED', 'RECEIVED')  AND MONTH(paidAt) = MONTH(CURRENT_DATE()) 
        //    AND YEAR(paidAt) = YEAR(CURRENT_DATE())`);

        res.json({
            totalUsers: totalUsers[0].count,
            totalBarbers: totalBarbers[0].count,
            totalEmployees: totalEmployees[0].count,
            activeSubscriptions: activeSubscriptions[0].count,
            trialSubscriptions: trialSubscriptions[0].count,
            overdueSubscriptions: overdueSubscriptions[0].count,
            //monthlyRevenue: monthlyRevenue[0].total || 0
        });
    } 
    catch (error) 
    {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

router.get('/barbershops', async (req, res) => 
{
    try 
    {
        const [barbershops] = await pool.query(`SELECT u.id, u.name, u.shop, u.email, u.role, u.created_at, s.status as subscriptionStatus, s.nextPaymentAt,
            p.name as planName, p.slug as planSlug, (SELECT COUNT(*) FROM users WHERE userId = u.id) as employeeCount FROM users u LEFT JOIN subscriptions s ON u.id = s.userId 
                LEFT JOIN plans p ON s.planId = p.id WHERE u.role = 'BARBER' AND u.userId IS NULL ORDER BY u.created_at DESC`);

        res.json(barbershops);
    } 
    catch (error) 
    {
        console.error('Get barbershops error:', error);
        res.status(500).json({ error: 'Erro ao buscar barbearias' });
    }
});

router.get('/barbershops/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Busca o dono
        const [owners] = await pool.query(`
            SELECT 
                u.id, u.name, u.shop, u.email, u.role, u.created_at,
                s.id as subscriptionId,
                s.status as subscriptionStatus,
                s.trialEndsAt,
                s.currentPeriodStart,
                s.currentPeriodEnd,
                s.nextPaymentAt,
                s.asaasCustomerId,
                p.id as planId,
                p.name as planName,
                p.slug as planSlug,
                p.price as planPrice,
                p.maxEmployees
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.userId
            LEFT JOIN plans p ON s.planId = p.id
            WHERE u.id = ?
        `, [id]);

        if (owners.length === 0) {
            return res.status(404).json({ error: 'Barbearia não encontrada' });
        }

        const owner = owners[0];

        // Busca funcionários
        const [employees] = await pool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE userId = ?',
            [id]
        );

        res.json({
            ...owner,
            employees
        });
    } catch (error) {
        console.error('Get barbershop error:', error);
        res.status(500).json({ error: 'Erro ao buscar barbearia' });
    }
});

router.put('/users/:id', async (req, res) => 
{
    try {
        const { id } = req.params;
        const { name, email, shop, password } = req.body;

        // Verifica se existe
        const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verifica email duplicado
        if (email) {
            const [emailInUse] = await pool.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email.toLowerCase(), id]
            );
            if (emailInUse.length > 0) {
                return res.status(400).json({ error: 'Email já está em uso' });
            }
        }

        // Atualiza
        if (password && password.length >= 8) {
            const hash = await bcrypt.hash(password, 12);
            await pool.query(
                'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), shop = COALESCE(?, shop), password = ? WHERE id = ?',
                [name, email?.toLowerCase(), shop, hash, id]
            );
        } else {
            await pool.query(
                'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), shop = COALESCE(?, shop) WHERE id = ?',
                [name, email?.toLowerCase(), shop, id]
            );
        }

        const [updated] = await pool.query(
            'SELECT id, name, email, shop, role, created_at FROM users WHERE id = ?',
            [id]
        );

        res.json(updated[0]);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

router.post('/users/:id/reset-password', async (req, res) => 
{
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
        }

        const hash = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, id]);

        res.json({ message: 'Senha atualizada com sucesso' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Erro ao resetar senha' });
    }
});

router.get('/plans', async (req, res) => 
{
    try 
    {
        const [plans] = await pool.query('SELECT * FROM plans ORDER BY price ASC');
        const plansFormatted = plans.map(plan => ({ ...plan, features: typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []) }));
        res.json(plansFormatted);
    } 
    catch (error) 
    {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Erro ao buscar planos' });
    }
});

router.post('/plans', async (req, res) => 
{
    try 
    {
        const { name, slug, description, about, price, maxEmployees, features } = req.body;

        const parsedPrice = parseInt(price, 10);

        let featuresJson;
        if (Array.isArray(features))
        {
            featuresJson = JSON.stringify(features);
        } 
        else if (typeof features === 'string') 
        {
            try 
            {
                JSON.parse(features);
                featuresJson = features;
            } 
            catch 
            {
                featuresJson = JSON.stringify(features.split('\n').filter(f => f.trim()));
            }
        } 
        else 
        {
            featuresJson = '[]';
        }

        const [result] = await pool.query(`INSERT INTO plans (name, slug, description, about, price, maxEmployees, features) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, slug, description, about, parsedPrice, maxEmployees, featuresJson]);

        const [plan] = await pool.query('SELECT * FROM plans WHERE id = ?', [result.insertId]);
        
        res.status(201).json({ ...plan[0], features: typeof plan[0].features === 'string' ? JSON.parse(plan[0].features) : (plan[0].features || []) });
    } 
    catch (error) 
    {
        console.error('Create plan error:', error);
        res.status(500).json({ error: 'Erro ao criar plano' });
    }
});

router.put('/plans/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const { name, description, about, price, maxEmployees, features, isActive } = req.body;

        const [existing] = await pool.query('SELECT * FROM plans WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });

        let featuresJson = null;
        if (features !== undefined) 
        {
            if (Array.isArray(features)) 
            {
                featuresJson = JSON.stringify(features);
            } 
            else if (typeof features === 'string') 
            {
                try 
                {
                    JSON.parse(features);
                    featuresJson = features;
                } 
                catch 
                {
                    featuresJson = JSON.stringify(features.split('\n').filter(f => f.trim()));
                }
            } 
            else if (typeof features === 'object') 
            {
                featuresJson = JSON.stringify(features);
            }
        }

        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name); } 
        if (description !== undefined) { updates.push('description = ?'); values.push(description); } 
        if (about !== undefined) { updates.push('about = ?'); values.push(about); } 
        if (price !== undefined) { updates.push('price = ?'); values.push(parseInt(price) || 0); } 
        if (maxEmployees !== undefined) { updates.push('maxEmployees = ?'); values.push(parseInt(maxEmployees) || 0); } 
        if (featuresJson !== null) { updates.push('features = ?'); values.push(featuresJson); }
        if (isActive !== undefined) { updates.push('isActive = ?'); values.push(isActive ? 1 : 0); }

        if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

        values.push(id);

        await pool.query(`UPDATE plans SET ${updates.join(', ')} WHERE id = ?`, values);

        const [plan] = await pool.query('SELECT * FROM plans WHERE id = ?', [id]);
        
        res.json({ ...plan[0], features: typeof plan[0].features === 'string' ? JSON.parse(plan[0].features) : (plan[0].features || []) });
    } 
    catch (error) 
    {
        console.error('Update plan error:', error);
        res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
});

router.get('/subscriptions', async (req, res) => 
{
    try 
    {
        const { status, planId, offset = 0, limit = 50 } = req.query;

        let query = `SELECT s.*, u.name as ownerName, u.shop, u.email, u.email as userEmail, p.name as planName, p.slug as planSlug, p.price as planPrice FROM subscriptions s JOIN users u 
            ON s.userId = u.id JOIN plans p ON s.planId = p.id WHERE 1=1`;
        const params = [];

        if (status) 
        {
            query += ' AND s.status = ?';
            params.push(status);
        }

        if (planId) 
        {
            query += ' AND s.planId = ?';
            params.push(planId);
        }

        query += ' ORDER BY s.createdAt DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [subscriptions] = await pool.query(query, params);

        res.json(subscriptions);
    } 
    catch (error) 
    {
        console.error('List subscriptions error:', error);
        res.status(500).json({ error: 'Erro ao listar assinaturas' });
    }
});

router.get('/subscriptions/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;

        const [subscriptions] = await pool.query(`
            SELECT s.*, u.name as userName, u.email as userEmail, p.name as planName, p.slug as planSlug, p.features 
            FROM subscriptions s 
            JOIN users u ON s.userId = u.id 
            JOIN plans p ON s.planId = p.id 
            WHERE s.id = ?`, [id]);

        if (subscriptions.length === 0) 
        {
            return res.status(404).json({ error: 'Assinatura não encontrada' });
        }

        const sub = subscriptions[0];
        sub.features = JSON.parse(sub.features || '[]');

        if (sub.asaasSubscriptionId) 
        {
            try 
            {
                const asaasSub = await asaasService.getSubscription(sub.asaasSubscriptionId);
                sub.asaasData = asaasSub;
            } 
            catch (err) 
            {
                console.error('Error fetching ASAAS subscription:', err);
            }
        }

        res.json(sub);
    } 
    catch (error) 
    {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
});

router.put('/subscriptions/:id', async (req, res) =>
{
    try
    {
        const { id } = req.params;
        const { planId, status, nextPaymentAt } = req.body;

        const validStatuses = ['ACTIVE', 'PENDING', 'TRIAL', 'OVERDUE', 'SUSPENDED', 'CANCELLED'];
        if (status != null && !validStatuses.includes(status)) return res.status(400).json({ error: 'Status inválido' });

        if (planId != null && (!Number.isInteger(planId) || planId <= 0)) return res.status(400).json({ error: 'Plano inválido' });

        if (nextPaymentAt != null)
        {
            const validDate = typeof nextPaymentAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(nextPaymentAt) && toLocalDateString(new Date(nextPaymentAt + 'T00:00:00')) === nextPaymentAt;
            if (!validDate) return res.status(400).json({ error: 'Data do próximo pagamento inválida' });
        }

        if (planId != null)
        {
            const [plans] = await pool.query('SELECT id FROM plans WHERE id = ?', [planId]);
            if (plans.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
        }

        const [result] = await pool.query('UPDATE subscriptions SET planId = COALESCE(?, planId), status = COALESCE(?, status), nextPaymentAt = COALESCE(?, nextPaymentAt) WHERE id = ?',
            [planId ?? null, status ?? null, nextPaymentAt ?? null, id]);

        if (result.affectedRows === 0) return res.status(404).json({ error: 'Assinatura não encontrada' });

        const [subscriptions] = await pool.query(`SELECT s.*, u.name as ownerName, u.shop, u.email, u.email as userEmail, p.name as planName, p.slug as planSlug, p.price as planPrice
            FROM subscriptions s JOIN users u ON s.userId = u.id JOIN plans p ON s.planId = p.id WHERE s.id = ?`, [id]);

        res.json(subscriptions[0]);
    }
    catch (error)
    {
        console.error('Update subscription error:', error);
        res.status(500).json({ error: 'Erro ao atualizar assinatura' });
    }
});

router.put('/subscriptions/:id/status', async (req, res) =>
{
    try 
    {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'PENDING', 'TRIAL', 'OVERDUE', 'SUSPENDED', 'CANCELLED'];
        if (!validStatuses.includes(status)) 
        {
            return res.status(400).json({ error: 'Status inválido' });
        }

        const [result] = await pool.query('UPDATE subscriptions SET status = ? WHERE id = ?', [status, id]);

        if (result.affectedRows === 0) 
        {
            return res.status(404).json({ error: 'Assinatura não encontrada' });
        }

        res.json({ message: 'Status atualizado com sucesso' });
    } 
    catch (error) 
    {
        console.error('Update subscription status error:', error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});

export default router;