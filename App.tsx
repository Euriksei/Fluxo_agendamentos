import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import { ProtectedRoute, OwnerRoute } from '@/components/ProtectedRoute';

import NotificationToast from '@/components/NotificationToast';
import ErrorBoundary from '@/components/ErrorBoundary';
import FeatureGate from '@/components/FeatureGate';

// Each route is its own chunk: /login and /registro no longer download the landing page, the panel and the admin.
const LandingPage = lazy(() => import('@/components/Landing Page/LandingPage'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const EsqueciSenha = lazy(() => import('@/pages/EsqueciSenha'));
const RedefinirSenha = lazy(() => import('@/pages/RedefinirSenha'));
const ConfirmarEmail = lazy(() => import('@/pages/ConfirmarEmail'));
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

const NotFound = lazy(() => import('@/pages/NotFound'));

// Same dark background as every page, so the chunk download never flashes white
const RouteFallback = () => <div className="min-h-svh bg-brand-black" aria-busy="true" />;

const App: React.FC = () =>
{
    const { pathname } = useLocation();

    return (
        <>
            <NotificationToast />
        
            {/* resetKey: after an error, navigating to another page renders it again instead of keeping the error screen */}
            <ErrorBoundary resetKey={ pathname }>
                <Suspense fallback={ <RouteFallback /> }>
                    <Routes>
                        {/* Rotas públicas */}
                        <Route path="/" element={ <LandingPage /> } />
                        <Route path="/login" element={ <Login /> } />
                        <Route path="/registro" element={ <Register /> } />
                        <Route path="/esqueci-senha" element={ <EsqueciSenha /> } />
                        <Route path="/redefinir-senha" element={ <RedefinirSenha /> } />
                        <Route path="/confirmar-email" element={ <ConfirmarEmail /> } />
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

                        {/* Qualquer URL sem rota: página 404 em vez de tela preta */}
                        <Route path="*" element={ <NotFound /> } />
                    </Routes>
                </Suspense>
            </ErrorBoundary>
        </>
    );
};

export default App;