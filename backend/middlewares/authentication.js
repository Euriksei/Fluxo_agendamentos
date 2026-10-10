import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => 
{
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => 
    {
        if (err) return res.status(401).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

export const requireAdmin = (req, res, next) =>
{
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acesso negado' });
    next();
};

// Ações do dono da barbearia (assinatura, cadastro de funcionários): funcionário não pode
export const requireOwner = (req, res, next) =>
{
    if (req.user.role === 'EMPLOYEE') return res.status(403).json({ error: 'Apenas o dono da barbearia pode realizar esta ação', code: 'OWNER_ONLY' });
    next();
};