import jwt from 'jsonwebtoken';

import pool from '../config/database.js';

export const authenticateToken = (req, res, next) =>
{
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) =>
    {
        if (err) return res.status(401).json({ error: 'Token inválido' });

        try
        {
            // Defesa em profundidade: conta apagada, email não confirmado ou JWT emitido antes da última troca de senha
            const [rows] = await pool.query('SELECT emailVerifiedAt, passwordChangedAt FROM users WHERE id = ?', [user.id]);
            if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });

            const { emailVerifiedAt, passwordChangedAt } = rows[0];
            if (!emailVerifiedAt) return res.status(401).json({ error: 'Confirme seu email para entrar', code: 'EMAIL_NOT_VERIFIED' });

            // DATETIME e iat têm resolução de segundo: o JWT emitido no mesmo segundo da troca continua válido
            if (passwordChangedAt && user.iat * 1000 < new Date(passwordChangedAt).getTime())
                return res.status(401).json({ error: 'Sessão encerrada após troca de senha. Faça login novamente.', code: 'PASSWORD_CHANGED' });

            req.user = user;
            next();
        }
        catch (error)
        {
            console.error('Authenticate error:', error);
            res.status(500).json({ error: 'Erro ao validar sessão' });
        }
    });
};

// JWT do app. iat explícito quando precisa casar com o passwordChangedAt gravado (troca de senha mantém a sessão atual)
export const signUserToken = (user, iat) => jwt.sign({ id: user.id, email: user.email, role: user.role, ...(iat && { iat }) }, process.env.JWT_SECRET, { expiresIn: '12h' });

export const requireAdmin = (req, res, next) =>
{
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    next();
};

// Ações do dono do negócio (assinatura, cadastro de funcionários): funcionário não pode
export const requireOwner = (req, res, next) =>
{
    if (req.user.role === 'EMPLOYEE') return res.status(403).json({ error: 'Apenas o dono do negócio pode realizar esta ação', code: 'OWNER_ONLY' });
    next();
};
