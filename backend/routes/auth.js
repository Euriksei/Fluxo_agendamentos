import bcrypt from 'bcrypt';
import crypto from 'crypto';
import express from 'express';

import pool from '../config/database.js';

import { authenticateToken, requireAdmin, signUserToken } from '../middlewares/authentication.js';

import { validateEmail, validatePassword, PASSWORD_MIN_LENGTH } from '../utils/validations.js';
import { getOwnerId, generateSlug } from '../utils/user.js';
import { getPlans } from '../utils/plans.js';
import { sendPasswordResetEmail, sendEmailVerificationEmail } from '../utils/mailer.js';
import { ownerHasFeature } from '../middlewares/subscription.js';

const router = express.Router();

const PASSWORD_RULE_ERROR = `Senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
const RESET_TOKEN_TTL_MINUTES = 60;
const FORGOT_PASSWORD_MESSAGE = 'Se o email estiver cadastrado, você receberá um link em instantes.';
const INVALID_RESET_TOKEN = { error: 'Este link de redefinição é inválido, já foi usado ou expirou. Peça um novo link.', code: 'INVALID_RESET_TOKEN' };

const VERIFY_TOKEN_TTL_MINUTES = 24 * 60;
const RESEND_VERIFICATION_COOLDOWN_SECONDS = 60;
const RESEND_VERIFICATION_MESSAGE = 'Se houver uma conta aguardando confirmação com este email, enviamos um novo link.';
const INVALID_VERIFY_TOKEN = { error: 'Este link de confirmação é inválido ou expirou. Peça um novo link.', code: 'INVALID_VERIFY_TOKEN' };

// No banco vai só o SHA-256 do token; o token puro existe apenas no link do email
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const isLinkToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

// Base do link do email vem do .env, nunca do Host da requisição (evita link envenenado apontando para outro domínio)
const getPublicUrl = () => (process.env.PUBLIC_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')).replace(/\/+$/, '');

// Momento da troca de senha truncado ao segundo: vai para users.passwordChangedAt e vira o iat do JWT novo da sessão atual
const passwordChangeStamp = () => { const iat = Math.floor(Date.now() / 1000); return { iat, at: new Date(iat * 1000) }; };

// Gera o token de confirmação (substitui os anteriores do usuário) e dispara o email sem await.
// Recebe a conexão para entrar na mesma transação do cadastro.
const issueEmailVerification = async (db, user) =>
{
    const publicUrl = getPublicUrl();
    const token = crypto.randomBytes(32).toString('hex');

    await db.query('DELETE FROM email_verifications WHERE userId = ?', [user.id]);
    await db.query('INSERT INTO email_verifications (userId, tokenHash, expiresAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
        [user.id, hashResetToken(token), VERIFY_TOKEN_TTL_MINUTES]);

    if (!publicUrl)
    {
        console.error('[email-verification] PUBLIC_URL não configurado: link de confirmação não enviado.');
        return;
    }

    return () => sendEmailVerificationEmail({ to: user.email, name: user.name, link: `${publicUrl}/confirmar-email?token=${token}`, expiresInMinutes: VERIFY_TOKEN_TTL_MINUTES })
        .catch((error) => console.error('[email-verification] Erro no envio:', error.message));
};

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

        // Só depois da senha validada: senão o estado da conta vazaria para quem não sabe a senha
        if (!user.emailVerifiedAt) return res.status(403).json({ error: 'Confirme seu email para entrar. Enviamos um link de confirmação no cadastro.', code: 'EMAIL_NOT_VERIFIED', email: user.email });

        const token = signUserToken(user);

        const { password: password_hash, passwordChangedAt, ...safeUser } = user;

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
        const [users] = await pool.query('SELECT id, name, shop FROM users WHERE slug = ?', [slug]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

        // Dados básicos sempre públicos; bookingAvailable avisa a página quando o plano do dono não permite agendamento online
        const bookingAvailable = (await ownerHasFeature(users[0].id, 'appointments')) === true;
        res.json({ name: users[0].name, shop: users[0].shop, bookingAvailable });
    } 
    catch (error) 
    {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
});

router.post('/register', async (req, res) =>
{
    const connection = await pool.getConnection();

    try
    {
        // O cadastro público sempre cria o dono da barbearia; o role do body é ignorado (funcionários são criados pelo dono)
        const { name, shop, email, password, confPassword } = req.body;
        const safeRole = 'BARBER';

        if (!name || !shop || !email || !password || !confPassword) return res.status(400).json({ error: 'Todos os campos são obrigatórios' });

        if (!validateEmail(email)) return res.status(400).json({ error: 'Email inválido' });

        if (!validatePassword(password)) return res.status(400).json({ error: PASSWORD_RULE_ERROR });
        if (password !== confPassword) return res.status(400).json({ error: 'As senhas não coincidem' });

        const sanitizedEmail = email.toLowerCase().trim();

        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [sanitizedEmail]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email já cadastrado' });

        const slug = generateSlug(shop);
        const passwordHash = await bcrypt.hash(password, 12);

        await connection.beginTransaction();

        // emailVerifiedAt NULL: o login fica bloqueado até o dono clicar no link do email
        const [result] = await connection.query('INSERT INTO users (name, shop, slug, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
            [name.trim(), shop.trim(), slug, sanitizedEmail, passwordHash, safeRole]);

        const sendEmail = await issueEmailVerification(connection, { id: result.insertId, name: name.trim(), email: sanitizedEmail });

        await connection.commit();
        sendEmail?.();

        // Sem JWT: a conta só entra depois de confirmar o email
        res.status(201).json({ id: result.insertId, name: name.trim(), shop: shop.trim(), slug, email: sanitizedEmail, role: safeRole, emailVerificationRequired: true });
    }
    catch (error)
    {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erro ao registrar' });
    }
    finally
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.post('/verify-email', async (req, res) =>
{
    const connection = await pool.getConnection();

    try
    {
        const { token } = req.body || {};
        if (!isLinkToken(token)) return res.status(400).json(INVALID_VERIFY_TOKEN);

        await connection.beginTransaction();

        const [rows] = await connection.query(`SELECT v.id, v.userId, v.usedAt, v.expiresAt > NOW() AS valid, u.emailVerifiedAt FROM email_verifications v
            JOIN users u ON u.id = v.userId WHERE v.tokenHash = ? FOR UPDATE`, [hashResetToken(token)]);
        if (rows.length === 0) return res.status(400).json(INVALID_VERIFY_TOKEN);

        const verification = rows[0];

        // Link aberto de novo (ou conta já confirmada por outro caminho, ex.: redefinição de senha): sucesso idempotente
        if (verification.emailVerifiedAt) return res.json({ message: 'Email já confirmado. Você já pode entrar.', alreadyVerified: true });

        if (verification.usedAt || !verification.valid) return res.status(400).json(INVALID_VERIFY_TOKEN);

        await connection.query('UPDATE users SET emailVerifiedAt = NOW() WHERE id = ?', [verification.userId]);
        await connection.query('UPDATE email_verifications SET usedAt = NOW() WHERE id = ?', [verification.id]);
        await connection.query('DELETE FROM email_verifications WHERE userId = ? AND id <> ?', [verification.userId, verification.id]);

        await connection.commit();

        res.json({ message: 'Email confirmado. Você já pode entrar.', alreadyVerified: false });
    }
    catch (error)
    {
        console.error('Verify email error:', error);
        res.status(500).json({ error: 'Erro ao confirmar email' });
    }
    finally
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.post('/resend-verification', async (req, res) =>
{
    try
    {
        // Mesma resposta para qualquer caso: não revela se a conta existe nem se já está confirmada
        const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
        if (!validateEmail(email)) return res.json({ message: RESEND_VERIFICATION_MESSAGE });

        const [users] = await pool.query(`SELECT u.id, u.name, u.email, (SELECT MAX(v.createdAt) > DATE_SUB(NOW(), INTERVAL ? SECOND) FROM email_verifications v WHERE v.userId = u.id) AS recent
            FROM users u WHERE u.email = ? AND u.emailVerifiedAt IS NULL`, [RESEND_VERIFICATION_COOLDOWN_SECONDS, email]);

        // Intervalo mínimo por usuário (além do rate limit por IP): um link novo a cada 60s no máximo
        if (users.length > 0 && !users[0].recent)
        {
            const sendEmail = await issueEmailVerification(pool, users[0]);
            sendEmail?.();
        }

        res.json({ message: RESEND_VERIFICATION_MESSAGE });
    }
    catch (error)
    {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Erro ao reenviar confirmação' });
    }
});

router.post('/forgot-password', async (req, res) =>
{
    try
    {
        // Mesma resposta exista o email ou não (inclusive email malformado): não revela quem tem conta
        const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
        if (!validateEmail(email)) return res.json({ message: FORGOT_PASSWORD_MESSAGE });

        const [users] = await pool.query('SELECT id, name, email FROM users WHERE email = ?', [email]);

        if (users.length > 0)
        {
            const user = users[0];
            const publicUrl = getPublicUrl();

            if (!publicUrl)
            {
                console.error('[forgot-password] PUBLIC_URL não configurado: link de redefinição não gerado.');
                return res.json({ message: FORGOT_PASSWORD_MESSAGE });
            }

            const token = crypto.randomBytes(32).toString('hex');

            // Um pedido novo invalida os links anteriores do usuário
            await pool.query('DELETE FROM password_resets WHERE userId = ?', [user.id]);
            await pool.query('INSERT INTO password_resets (userId, tokenHash, expiresAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
                [user.id, hashResetToken(token), RESET_TOKEN_TTL_MINUTES]);

            // Sem await: o tempo de resposta não depende do SMTP (nem denuncia que o email existe)
            sendPasswordResetEmail({ to: user.email, name: user.name, link: `${publicUrl}/redefinir-senha?token=${token}`, expiresInMinutes: RESET_TOKEN_TTL_MINUTES })
                .catch((error) => console.error('[forgot-password] Erro no envio:', error.message));
        }

        res.json({ message: FORGOT_PASSWORD_MESSAGE });
    }
    catch (error)
    {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Erro ao solicitar redefinição de senha' });
    }
});

router.post('/reset-password', async (req, res) =>
{
    const connection = await pool.getConnection();

    try
    {
        const { token, password, confPassword } = req.body || {};

        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json(INVALID_RESET_TOKEN);

        await connection.beginTransaction();

        // FOR UPDATE: dois envios simultâneos do mesmo link não conseguem usar o token duas vezes
        const [resets] = await connection.query('SELECT id, userId FROM password_resets WHERE tokenHash = ? AND usedAt IS NULL AND expiresAt > NOW() FOR UPDATE',
            [hashResetToken(token)]);
        if (resets.length === 0) return res.status(400).json(INVALID_RESET_TOKEN);

        if (!validatePassword(password)) return res.status(400).json({ error: PASSWORD_RULE_ERROR });
        if (confPassword !== undefined && password !== confPassword) return res.status(400).json({ error: 'As senhas não coincidem' });

        const reset = resets[0];
        const passwordHash = await bcrypt.hash(password, 12);

        // Derruba as sessões abertas (JWT anterior à troca) e confirma o email: quem abriu o link provou ter acesso à caixa
        await connection.query('UPDATE users SET password = ?, passwordChangedAt = ?, emailVerifiedAt = COALESCE(emailVerifiedAt, NOW()) WHERE id = ?',
            [passwordHash, passwordChangeStamp().at, reset.userId]);
        await connection.query('UPDATE password_resets SET usedAt = NOW() WHERE id = ?', [reset.id]);
        await connection.query('DELETE FROM password_resets WHERE userId = ? AND id <> ?', [reset.userId, reset.id]);

        await connection.commit();

        res.json({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
    }
    catch (error)
    {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
    finally
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

// ROTAS PROTEGIDAS

router.use(authenticateToken);

// Troca de senha de qualquer perfil logado (dono, funcionário, admin)
router.put('/password', async (req, res) =>
{
    try
    {
        const { currentPassword, newPassword, confPassword } = req.body || {};

        if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
        if (!validatePassword(newPassword)) return res.status(400).json({ error: PASSWORD_RULE_ERROR });
        if (confPassword !== undefined && newPassword !== confPassword) return res.status(400).json({ error: 'As senhas não coincidem' });
        if (newPassword === currentPassword) return res.status(400).json({ error: 'A nova senha deve ser diferente da atual' });

        const [users] = await pool.query('SELECT id, email, role, password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

        // 400 e não 401: o front trata 401 como sessão expirada e desloga
        const isValidPassword = await bcrypt.compare(String(currentPassword), users[0].password);
        if (!isValidPassword) return res.status(400).json({ error: 'Senha atual incorreta' });

        const passwordHash = await bcrypt.hash(newPassword, 12);

        // Outras sessões (JWT anterior a passwordChangedAt) caem; esta continua com o JWT novo, emitido no mesmo segundo
        const stamp = passwordChangeStamp();
        await pool.query('UPDATE users SET password = ?, passwordChangedAt = ? WHERE id = ?', [passwordHash, stamp.at, req.user.id]);

        // Links de redefinição pendentes deixam de valer depois da troca
        await pool.query('DELETE FROM password_resets WHERE userId = ?', [req.user.id]);

        res.json({ message: 'Senha alterada com sucesso', token: signUserToken(users[0], stamp.iat) });
    }
    catch (error)
    {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

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
                plans p ON s.planId = p.id WHERE s.userId = ? ORDER BY s.id DESC LIMIT 1`, [ownerId]);

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
        let newToken = null;

        if (!name || !shop || !email) return res.status(400).json({ error: 'Nome, Loja e Email são obrigatórios' });

        if (!validateEmail(email)) return res.status(400).json({ error: 'Email inválido' });

        const sanitizedEmail = email.toLowerCase().trim();

        const [emailInUse] = await connection.query('SELECT id FROM users WHERE email = ? AND id <> ?', [sanitizedEmail, userId]);
        if (emailInUse.length > 0) return res.status(400).json({ error: 'Email já está em uso' });

        if (newPassword) 
        {
            if (!currentPassword) return res.status(400).json({ error: 'Senha atual é obrigatória para trocar a senha' });

            if (!validatePassword(newPassword)) return res.status(400).json({ error: `Nova senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres` });

            const [user] = await connection.query('SELECT password FROM users WHERE id = ?', [userId]);

            // 400 e não 401: o front trata 401 como sessão expirada e desloga
            const isValidPassword = await bcrypt.compare(currentPassword, user[0].password);
            if (!isValidPassword) return res.status(400).json({ error: 'Senha atual incorreta' });

            const newPasswordHash = await bcrypt.hash(newPassword, 12);

            // Mesma regra do PUT /password: derruba as outras sessões e devolve um JWT novo para esta
            const stamp = passwordChangeStamp();
            await connection.query('UPDATE users SET name = ?, shop = ?, email = ?, password = ?, passwordChangedAt = ? WHERE id = ?',
                [name.trim(), shop.trim(), sanitizedEmail, newPasswordHash, stamp.at, userId]);
            newToken = signUserToken({ id: userId, email: sanitizedEmail, role: req.user.role }, stamp.iat);
        } 
        else 
        {
            await connection.query('UPDATE users SET name = ?, shop = ?, email = ? WHERE id = ?', [name.trim(), shop.trim(), sanitizedEmail, userId]);
        }

        await connection.commit();

        res.status(200).json({ id: userId, name: name.trim(), shop: shop.trim(), email: sanitizedEmail, ...(newToken && { token: newToken }) });
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