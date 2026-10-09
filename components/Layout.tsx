import { Navigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

import { ROLE_LABELS } from '@/types';

import SidebarLayout, { SidebarItem } from '@/components/SidebarLayout';

export default function Layout() 
{
    const { user, logout } = useAuth();
    const role = user.user.role;

    if (role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;

    const items: SidebarItem[] = 
    [
        { to: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
        { to: '/agenda', label: 'Agenda', icon: 'Calendar' },
        { to: '/horarios', label: 'Horários', icon: 'Clock' },
        ...(role === 'BARBER' ? 
        [
            { to: '/caixa', label: 'Caixa', icon: 'DollarSign' },
            { to: '/servicos', label: 'Serviços', icon: 'Toolbox' },
            { to: '/equipe', label: 'Equipe', icon: 'Users' },
            { to: '/assinatura', label: 'Assinatura', icon: 'CreditCard' },
        ] as SidebarItem[] : []),
    ];

    return (
        <SidebarLayout title={user.user.shop} subtitle={ROLE_LABELS[role] || 'Desconhecido'} items={items} onLogout={logout} storageKey="fluxo:sidebar-expanded" />
    );
}
