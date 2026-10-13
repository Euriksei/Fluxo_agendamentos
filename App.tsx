import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import { ProtectedRoute, OwnerRoute } from '@/components/ProtectedRoute';

import NotificationToast from '@/components/NotificationToast';
import FeatureGate from '@/components/FeatureGate';

// Each route is its own chunk: /login and /registro no longer download the landing page, the panel and the admin.
const LandingPage = lazy(() => import('@/components/Landing Page/LandingPage'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Agendar = lazy(() => import('@/pages/Agendar'));
const MeusAgendamentos = lazy(() => import('@/pages/MeusAgendamentos'));

const Layout = lazy(() => import('@/components/Layout'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Horarios = lazy(() => import('@/pages/Horarios'));
const Agenda = lazy(() => import('@/pages/Agenda'));
const Serviços = lazy(() => import('@/pages/Serviços'));
const Caixa = lazy(() => import('@/pages/Caixa'));
const Equipe = lazy(() => import('@/pages/Equipe'));
const Assinatura = lazy(() => import('@/pages/Assinatura'));

const AdminLayout = lazy(() => import('@/components/admin/Layout'));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminAssinaturas = lazy(() => import('@/pages/admin/Assinaturas'));
const AdminPlanos = lazy(() => import('@/pages/admin/Planos'));

// Same dark background as every page, so the chunk download never flashes white
const RouteFallback = () => <div className="min-h-svh bg-brand-black" aria-busy="true" />;

const App: React.FC = () =>
{
    return (
        <>
            <NotificationToast />
        
            <Suspense fallback={ <RouteFallback /> }>
                <Routes>
                    {/* Rotas públicas */}
                    <Route path="/" element={ <LandingPage /> } />
                    <Route path="/login" element={ <Login /> } />
                    <Route path="/registro" element={ <Register /> } />
                    <Route path="/agendar/:slug" element={ <Agendar /> } />
                    <Route path="/meus-agendamentos" element={ <MeusAgendamentos /> } />

                    {/* Rotas protegidas */}
                    <Route element={ <ProtectedRoute> <Layout /> </ProtectedRoute>  }>
                        <Route path="/dashboard" element={ <Dashboard /> } />
                        <Route path="/agenda" element={ <FeatureGate feature="appointments"><Agenda /></FeatureGate> } />    
                        <Route path="/horarios" element={ <FeatureGate feature="agendas"><Horarios /></FeatureGate> } />
                        <Route path="/servicos" element={ <OwnerRoute><FeatureGate feature="services"><Serviços /></FeatureGate></OwnerRoute> } />
                        <Route path="/caixa" element={ <OwnerRoute><FeatureGate feature="flows"><Caixa /></FeatureGate></OwnerRoute> } />
                        <Route path="/equipe" element={ <OwnerRoute><FeatureGate feature="employees"><Equipe /></FeatureGate></OwnerRoute> } />
                        <Route path="/assinatura" element={ <OwnerRoute><Assinatura /></OwnerRoute> } />
                    </Route>

                    {/* Rotas admin */}
                    <Route element={ <ProtectedRoute requireAdmin> <AdminLayout /> </ProtectedRoute>  }>
                        <Route path="/admin/dashboard" element={ <AdminDashboard /> } />
                        <Route path="/admin/usuarios" element={ <AdminUsers /> } />
                        <Route path="/admin/assinaturas" element={ <AdminAssinaturas /> } />
                        <Route path="/admin/planos" element={ <AdminPlanos /> } />
                    </Route>      
                </Routes>
            </Suspense>
        </>
    );
};

export default App;