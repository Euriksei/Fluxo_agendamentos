import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import path from 'path';
import rateLimit from 'express-rate-limit';

import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import employeesRoutes from './routes/employees.js';
import servicesRoutes from './routes/services.js';
import agendasRoutes from './routes/agendas.js';
import appointmentsRoutes from './routes/appointments.js';
import flowsRoutes from './routes/flows.js';
import plansRoutes from './routes/plans.js';
import subscriptionsRoutes from './routes/subscriptions.js';

import { describeAsaasEnvironment } from './services/asaas.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Em dev o Vite (localhost) faz proxy de /api com X-Forwarded-For: confiar só no loopback para req.ip ser o IP real do cliente
app.set('trust proxy', 'loopback');

app.use(helmet());

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({ windowMs: 30 * 60 * 1000, max: 1000, message: { error: 'Muitas requisições. Tente novamente mais tarde.' }, standardHeaders: true, legacyHeaders: false });

app.use('/api', limiter);

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' }, standardHeaders: true, legacyHeaders: false,
    skipSuccessfulRequests: true });

app.use('/api/auth/login', loginLimiter);

// Recuperação/troca de senha: cada pedido pode disparar um email, e a troca confere a senha atual (força bruta)
const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { error: 'Muitas solicitações de redefinição. Aguarde 15 minutos.' }, standardHeaders: true,
    legacyHeaders: false });
const resetPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' }, standardHeaders: true, legacyHeaders: false });
const changePasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Muitas tentativas de troca de senha. Aguarde 15 minutos.' }, standardHeaders: true,
    legacyHeaders: false, skipSuccessfulRequests: true });

app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', resetPasswordLimiter);
app.use('/api/auth/password', changePasswordLimiter);

// Confirmação de email: cadastro e reenvio disparam email (evita usar o app para mandar spam a terceiros)
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'Muitos cadastros a partir desta rede. Tente novamente mais tarde.' }, standardHeaders: true,
    legacyHeaders: false });
const resendVerificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3, message: { error: 'Muitos reenvios. Aguarde 15 minutos e confira também a caixa de spam.' }, standardHeaders: true,
    legacyHeaders: false });
const verifyEmailLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas. Aguarde 15 minutos.' }, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/resend-verification', resendVerificationLimiter);
app.use('/api/auth/verify-email', verifyEmailLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/agendas', agendasRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

app.get('/health', (req, res) => { res.json({ status: 'OK', timestamp: new Date().toISOString() }); });

app.get('/api', (req, res) => 
{
    res.json({
        message: 'Fluxo API',
        version: '1.0.0',
        endpoints:
        {
            admin: '/api/admin',
            auth: '/api/auth',
            employees: '/api/employees',
            services: '/api/services',
            agendas: '/api/agendas',
            appointments: '/api/appointments',
            flows: '/api/flows',
            plans: '/api/plans',
            subscriptions: '/api/subscriptions',
        }
    });
});

const frontendPath = path.join(__dirname, '..', 'dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });

app.use((err, req, res, next) => 
{
    console.error('Error:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => 
{
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`💳 ${describeAsaasEnvironment()}`);
});