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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({ windowMs: 30 * 60 * 1000, max: 1000, message: { error: 'Muitas requisições. Tente novamente mais tarde.' }, standardHeaders: true, legacyHeaders: false });

//app.use(limiter);

const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, message: { error: 'Muitas tentativas de login. Aguarde 10 minutos.' }, skipSuccessfulRequests: true });

//app.use('/api/auth/login', loginLimiter);

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
});