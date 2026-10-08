import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

import { NavLink } from '@/components/NavLink';
import { LogOut } from 'lucide-react';

export default function Layout() 
{
    const { user, logout } = useAuth();
    const userRole = 'Administrador';

    const [collapsed, setCollapsed] = useState(true);

    if (user?.user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

    return (
        <div className="flex flex-col md:flex-row">
            {!collapsed && ( <div className="hidden md:block fixed inset-0 bg-black/80 z-30" onClick={() => setCollapsed(true)} /> )}

            <aside className={`fixed z-40 w-full md:min-h-screen ${collapsed ? "md:w-20" : "md:w-56"} bg-brand-black text-white flex md:flex-col justify-center 
                    md:justify-between transition-all duration-300`} >

                <div className="flex gap-8 md:flex-col md:gap-0">
                    <div className={`hidden p-4 border-b border-gray-700 md:flex ${collapsed ? "justify-center" : "justify-between"} items-center`}>
                        {!collapsed && (
                            <div>
                                <h2 className="text-lg font-bold">{user.user.name}</h2>
                                <p className="text-sm text-gray-400">{userRole}</p>
                            </div>
                        )}

                        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white text-sm" >
                            {collapsed ? ">>" : "<<"}
                        </button>
                    </div>

                    <nav className="flex flex-row md:flex-col gap-8 md:gap-4 p-4 md:p-6 md:space-y-2">
                        <NavLink to="/admin/dashboard" label="Dashboard" icon="LayoutDashboard" collapsed={collapsed} />
                        <NavLink to="/admin/usuarios" label="Usuários" icon="Users" collapsed={collapsed} />
                        <NavLink to="/admin/assinaturas" label="Assinaturas" icon="CreditCard" collapsed={collapsed} />
                        <NavLink to="/admin/planos" label="Planos" icon="Crown" collapsed={collapsed} />
                    </nav>
                </div>

                <div className="hidden md:flex items-center justify-center p-4 border-t border-gray-700">
                    <button onClick={logout} className="flex items-center justify-center gap-2 w-full text-sm text-center text-red-400 hover:text-red-300 cursor-pointer" >
                        <LogOut size={18} /> 
                        {!collapsed && "Sair"}
                    </button>
                </div>
            </aside>

            {/* Same fix as the barber Layout: offset by the fixed aside instead of md:px-48. */}
            <main className="min-h-screen flex-1 min-w-0 bg-linear-to-br from-brand-black via-brand-dark to-brand-black text-white px-4 pt-20 pb-10 sm:px-6 md:ml-20 md:px-10 md:py-12 xl:px-12">
                <div className="mx-auto w-full max-w-[1760px]">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}