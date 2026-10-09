import { Navigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

import SidebarLayout, { SidebarItem } from '@/components/SidebarLayout';

const ITEMS: SidebarItem[] = 
[
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { to: '/admin/usuarios', label: 'Usuários', icon: 'Users' },
    { to: '/admin/assinaturas', label: 'Assinaturas', icon: 'CreditCard' },
    { to: '/admin/planos', label: 'Planos', icon: 'Crown' },
];

export default function Layout() 
{
    const { user, logout } = useAuth();

    if (user?.user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

    return (
        <SidebarLayout title={user.user.name} subtitle="Administrador" items={ITEMS} onLogout={logout} storageKey="fluxo:admin-sidebar-expanded" />
    );
}
