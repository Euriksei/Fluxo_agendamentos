import React from 'react';
import { Routes, Route } from 'react-router-dom';

import { ProtectedRoute } from '@/components/ProtectedRoute';

import NotificationToast from '@/components/NotificationToast';

import LandingPage from '@/components/Landing Page/LandingPage';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Agendar from '@/pages/Agendar';
import MeusAgendamentos from '@/pages/MeusAgendamentos';

import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Horarios from '@/pages/Horarios';
import Agenda from '@/pages/Agenda';
import Serviços from '@/pages/Serviços';
import Caixa from '@/pages/Caixa';
import Equipe from '@/pages/Equipe';
import Assinatura from '@/pages/Assinatura';

import AdminLayout from '@/components/admin/Layout';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminUsers from '@/pages/admin/Users';
import AdminAssinaturas from '@/pages/admin/Assinaturas';
import AdminPlanos from '@/pages/admin/Planos';

const App: React.FC = () =>
{
    return (
        <>
            <NotificationToast />
        
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
                    <Route path="/agenda" element={ <Agenda /> } />    
                    <Route path="/horarios" element={ <Horarios /> } />
                    <Route path="/servicos" element={ <Serviços /> } />
                    <Route path="/caixa" element={ <Caixa /> } />
                    <Route path="/equipe" element={ <Equipe /> } />
                    <Route path="/assinatura" element={ <Assinatura /> } />
                </Route>

                {/* Rotas admin */}
                <Route element={ <ProtectedRoute requireAdmin> <AdminLayout /> </ProtectedRoute>  }>
                    <Route path="/admin/dashboard" element={ <AdminDashboard /> } />
                    <Route path="/admin/usuarios" element={ <AdminUsers /> } />
                    <Route path="/admin/assinaturas" element={ <AdminAssinaturas /> } />
                    <Route path="/admin/planos" element={ <AdminPlanos /> } />
                </Route>      
            </Routes>
        </>
    );
};

export default App;