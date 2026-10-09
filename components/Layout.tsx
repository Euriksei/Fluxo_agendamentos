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
        { to: '/agenda', label: 'Agenda', icon: 'Calendar', feature: 'appointments' },
        { to: '/horarios', label: 'Horários', icon: 'Clock', feature: 'agendas' },
        ...(role === 'BARBER' ? 
        [
            { to: '/caixa', label: 'Caixa', icon: 'DollarSign', feature: 'flows' },
            { to: '/servicos', label: 'Serviços', icon: 'Toolbox', feature: 'services' },
            { to: '/equipe', label: 'Equipe', icon: 'Users', feature: 'employees' },
            { to: '/assinatura', label: 'Assinatura', icon: 'CreditCard' },
        ] as SidebarItem[] : []),
    ];

    return (
        <SidebarLayout title={user.user.shop} subtitle={ROLE_LABELS[role] || 'Desconhecido'} items={items} onLogout={logout} storageKey="fluxo:sidebar-expanded" />
    );
}
