import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

import { ROLE_LABELS } from '@/types';

import { NavLink } from '@/components/NavLink';
import { LogOut } from 'lucide-react';

export default function Layout() 
{
    const { user, logout } = useAuth();
    const userRole = ROLE_LABELS[user.user.role] || 'Desconhecido';

    const [collapsed, setCollapsed] = useState(true);

    if (user?.user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;

    return (
        <div className="flex flex-col md:flex-row">

            {!collapsed && ( <div className="hidden md:block  fixed inset-0 bg-black/80 z-30" onClick={() => setCollapsed(true)} /> )}

            <aside className={`fixed z-40 w-full md:min-h-screen ${collapsed ? "md:w-20" : "md:w-56"} bg-brand-black text-white flex md:flex-col justify-center 
                    md:justify-between transition-all duration-300`} >

                <div className="flex gap-8 md:flex-col md:gap-0">
                    <div className={`hidden p-4 border-b border-gray-700 md:flex ${collapsed ? "justify-center" : "justify-between"} items-center`}>
                        {!collapsed && 
                        (
                            <div>
                                <h2 className="text-lg font-bold">{user.user.shop}</h2>
                                <p className="text-sm text-gray-400">{userRole}</p>
                            </div>
                        )}

                        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white text-sm" >
                            {collapsed ? ">>" : "<<"}
                        </button>
                    </div>

                    <nav className="flex flex-row md:flex-col gap-4 p-4 md:p-6 md:space-y-2">
                        <NavLink to="/dashboard" label="Dashboard" icon="LayoutDashboard" collapsed={collapsed} />
                        <NavLink to="/agenda" label="Agenda" icon="Calendar" collapsed={collapsed} />
                        <NavLink to="/horarios" label="Horários" icon="Clock" collapsed={collapsed} />
                        {user.user.role === "BARBER" && ( <NavLink to="/caixa" label="Caixa" icon="DollarSign" collapsed={collapsed} /> )}
                        {user.user.role === "BARBER" && ( <NavLink to="/servicos" label="Serviços" icon="Toolbox" collapsed={collapsed} /> )}
                        {user.user.role === "BARBER" && ( <NavLink to="/equipe" label="Equipe" icon="Users" collapsed={collapsed} /> )}
                        {user.user.role === "BARBER" && ( <NavLink to="/assinatura" label="Assinatura" icon="CreditCard" collapsed={collapsed} /> )}

                        <button onClick={logout} aria-label="Sair" title="Sair" className="block md:hidden text-red-400 hover:text-red-300"><LogOut size={18} /></button>
                    </nav>
                </div>

                <div className="hidden md:flex items-center justify-center p-4 border-t border-gray-700">
                    <button onClick={logout} aria-label="Sair" title="Sair" className="flex items-center justify-center gap-2 w-full text-sm text-center text-red-400 hover:text-red-300" >
                        <LogOut size={18} /> 
                        {!collapsed && "Sair"}
                    </button>
                </div>
            </aside>

            <main className="min-h-screen flex-1 min-w-0 bg-linear-to-br from-brand-black via-brand-dark to-brand-black text-white p-8 py-16 md:px-48">
                <Outlet />
            </main>
        </div>
    );
}