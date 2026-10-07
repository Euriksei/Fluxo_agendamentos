import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';

import pool from '../config/database.js';

import { authenticateToken, requireAdmin } from '../middlewares/authentication.js';

import { validateEmail } from '../utils/validations.js';
import { getOwnerId, generateSlug } from '../utils/user.js';
import { getPlans } from '../utils/plans.js';

const router = express.Router();

router.post('/login', async (req, res) => 
{
    try 
    {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        
        if (users.length === 0) 
        {
            await bcrypt.compare(password, '$2b$10$dummyhashtopreventtimingattacks');
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = users[0];

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return res.status(401).json({ error: 'Credenciais inválidas' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });

        const { password: password_hash, ...safeUser } = user;

        res.json({ user: safeUser, token });
    } 
    catch (error) 
    {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

router.get('/barber/:slug', async (req, res) => 
{
    try 
    {
        const { slug } = req.params;
        const [users] = await pool.query('SELECT id FROM users WHERE slug = ?', [slug]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(users[0].id);
    } 
    catch (error) 
    {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

router.get('/barber/:slug/data', async (req, res) => 
{
    try 
    {
        const { slug } = req.params;
        const [users] = await pool.query('SELECT name, shop FROM users WHERE slug = ?', [slug]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(users[0]);
    } 
    catch (error) 
    {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

router.post('/register', async (req, res) => 
{
    try 
    {
        const { name, shop, email, password, confPassword, role = 'BARBER' } = req.body;

        if (!name || !shop || !email || !password || !confPassword) return res.status(400).json({ error: 'Todos os campos são obrigatórios' });

        if (role === 'ADMIN' || (role !== 'BARBER' && role !== 'EMPLOYEE')) return res.status(400).json({ error: 'Perfil inválido' });
        const safeRole = role === 'BARBER' || role === 'EMPLOYEE' ? role : 'BARBER';

        if (!validateEmail(email)) return res.status(400).json({ error: 'Email inválido' });

        if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
        if (password !== confPassword) return res.status(400).json({ error: 'As senhas não coincidem' });

        const sanitizedEmail = email.toLowerCase().trim();

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [sanitizedEmail]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email já cadastrado' });

        const slug = generateSlug(shop);
        const passwordHash = await bcrypt.hash(password, 12);

        const [result] = await pool.query('INSERT INTO users (name, shop, slug, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
            [name.trim(), shop.trim(), slug, sanitizedEmail, passwordHash, safeRole]);

        res.status(201).json({ id: result.insertId, name: name.trim(), shop: shop.trim(), slug, email: sanitizedEmail, role: safeRole });
    } 
    catch (error) 
    {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erro ao registrar' });
    }
});

// ROTAS PROTEGIDAS

router.use(authenticateToken);

router.get('/me', async (req, res) => 
{
    try 
    {
        const [users] = await pool.query('SELECT id, name, shop, role, slug FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        let ownerSlug = users[0].slug;
        if (ownerId !== userId) 
        {
            const [ownerData] = await pool.query('SELECT slug FROM users WHERE id = ?', [ownerId]);
            if (ownerData.length > 0) ownerSlug = ownerData[0].slug;
        }

        const [subscriptions] = await pool.query(`SELECT s.id, s.userId, s.planId, s.asaasSubscriptionId, s.asaasCustomerId, s.status, s.trialEndsAt, s.nextPaymentAt, 
            s.lastPaymentAt, s.cancelledAt, s.createdAt, p.name as planName, p.slug as planSlug, p.price as planPrice, p.maxEmployees, p.features FROM subscriptions s JOIN 
                plans p ON s.planId = p.id WHERE s.userId = ?`, [ownerId]);

        const plans = await getPlans();
        let subscription = null;

        if (subscriptions.length === 0) 
        {
            const freePlan = plans.free || { maxEmployees: 0, features: ['services', 'agendas'] };
            subscription = { 
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
            let trialDaysRemaining = null;
            
            if (sub.status === 'TRIAL' && sub.trialEndsAt) 
            {
                const trialEnd = new Date(sub.trialEndsAt);
                const now = new Date();
                
                if (now > trialEnd) 
                {
                    status = 'EXPIRED';
                } 
                else 
                {
                    const diffTime = trialEnd - now;
                    trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
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

            subscription = 
            {
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
                trialDaysRemaining: trialDaysRemaining,
                nextPaymentAt: sub.nextPaymentAt,
                lastPaymentAt: sub.lastPaymentAt,
                isLimited: !isActive || status === 'EXPIRED'
            };
        }

        res.json({ user: { ...users[0], ownerSlug }, subscription });
    } 
    catch (error) 
    {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

router.put('/me', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const userId = req.user.id;
        const { name, shop, email, currentPassword, newPassword } = req.body;

        if (!name || !shop || !email) return res.status(400).json({ error: 'Nome, Loja e Email são obrigatórios' });

        if (!validateEmail(email)) return res.status(400).json({ error: 'Email inválido' });

        const sanitizedEmail = email.toLowerCase().trim();

        const [emailInUse] = await connection.query('SELECT id FROM users WHERE email = ? AND id <> ?', [sanitizedEmail, userId]);
        if (emailInUse.length > 0) return res.status(400).json({ error: 'Email já está em uso' });

        if (newPassword) 
        {
            if (!currentPassword) return res.status(400).json({ error: 'Senha atual é obrigatória para trocar a senha' });

            if (newPassword.length < 8) return res.status(400).json({ error: 'Nova senha deve ter no mínimo 8 caracteres' });

            const [user] = await connection.query('SELECT password FROM users WHERE id = ?', [userId]);

            const isValidPassword = await bcrypt.compare(currentPassword, user[0].password);
            if (!isValidPassword) return res.status(401).json({ error: 'Senha atual incorreta' });

            const newPasswordHash = await bcrypt.hash(newPassword, 12);

            await connection.query('UPDATE users SET name = ?, shop = ?, email = ?, password = ? WHERE id = ?',
                [name.trim(), shop.trim(), sanitizedEmail, newPasswordHash, userId]);
        } 
        else 
        {
            await connection.query('UPDATE users SET name = ?, shop = ?, email = ? WHERE id = ?', [name.trim(), shop.trim(), sanitizedEmail, userId]);
        }

        await connection.commit();

        res.status(200).json({ id: userId, name: name.trim(), shop: shop.trim(), email: sanitizedEmail });
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

// ROTAS ADMIN

router.use(requireAdmin);

router.get('/users', async (req, res) => 
{
    try 
    {
        const [users] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
        res.json(users);
    } 
    catch (error) 
    {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

router.put('/users/:id', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const { id } = req.params;
        const { name, email, role } = req.body;
        if (!name || !email || !role) return res.status(400).json({ error: 'Nome, email e perfil são obrigatórios' });

        const [existingUser] = await connection.query('SELECT id FROM users WHERE id = ?', [id]);
        if (existingUser.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

        const [emailInUse] = await connection.query('SELECT id FROM users WHERE email = ? AND id <> ?', [email, id]);
        if (emailInUse.length > 0) return res.status(400).json({ error: 'Email já está em uso por outro usuário' });

        await connection.query('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?', [name, email, role, id]);

        const [users] = await connection.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);

        await connection.commit();

        res.json(users[0]);
    } 
    catch (error)
    {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
    finally
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.delete('/users/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Não é possível deletar a si mesmo' });

        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

        res.json({ message: 'Usuário deletado com sucesso' });
    } 
    catch (error) 
    {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Erro ao deletar' });
    }
});

export default router;