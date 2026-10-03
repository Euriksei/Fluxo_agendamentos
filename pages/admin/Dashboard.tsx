import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';

import { Users, Building2, CreditCard, DollarSign, TrendingUp, AlertTriangle, Clock, ChevronRight, UserPlus, Activity, PieChart, BarChart3 } from 'lucide-react';

import { formatarMoeda, formatarData } from '@/utils';

const STATUS_COLORS = {
    ACTIVE: 'bg-green-500/20 text-green-500',
    TRIAL: 'bg-blue-500/20 text-blue-500',
    OVERDUE: 'bg-red-500/20 text-red-500',
    CANCELLED: 'bg-gray-500/20 text-gray-500',
    PENDING: 'bg-yellow-500/20 text-yellow-500'
};

const STATUS_LABELS = {
    ACTIVE: 'Ativo',
    TRIAL: 'Trial',
    OVERDUE: 'Inadimplente',
    CANCELLED: 'Cancelado',
    PENDING: 'Pendente'
};

export default function AdminDashboard() 
{
    const { authRequest, setLoading } = useApi();
    
    const [stats, setStats] = useState(null);
    const [recentBarbershops, setRecentBarbershops] = useState([]);
    const [overdueSubscriptions, setOverdueSubscriptions] = useState([]);

    useEffect(() => { loadDashboardData(); }, []);

    const loadDashboardData = async () => 
    {
        try 
        {
            setLoading(true);

            const statsData = await authRequest('/api/admin/stats');
            setStats(statsData);

            const barbershopsData= await authRequest('/api/admin/barbershops?limit=5');
            setRecentBarbershops(Array.isArray(barbershopsData) ? barbershopsData.slice(0, 5) : []);

            const overdueData = await authRequest('/api/admin/subscriptions?status=OVERDUE');
            setOverdueSubscriptions(Array.isArray(overdueData) ? overdueData.slice(0, 5) : []);

        } 
        catch (err) 
        {
            console.error('Erro ao carregar dashboard:', err);
        } 
        finally 
        {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-brand-gray mt-1">
                    Visão geral do sistema • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            <div className="grid gap-4 grid-cols-3">
                <div className="bg-brand-dark rounded-xl p-4 md:p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-6 md:w-12 h-6 md:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <Building2 size={24} className="text-blue-500" />
                        </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white">{stats?.totalBarbers || 0}</p>
                    <p className="text-white text-xs md:text-sm mt-1">Lojas cadastradas</p>
                </div>

                <div className="bg-brand-dark rounded-xl p-4 md:p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-6 md:w-12 h-6 md:h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <Users size={24} className="text-purple-500" />
                        </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
                    <p className="text-white text-xs md:text-sm mt-1">Usuários totais</p>
                    <p className="text-brand-gray text-xs mt-1">
                        {stats?.totalEmployees || 0} funcionários
                    </p>
                </div>

                <div className="bg-brand-dark rounded-xl p-4 md:p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-6 md:w-12 h-6 md:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <CreditCard size={24} className="text-green-500" />
                        </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white">{stats?.activeSubscriptions || 0}</p>
                    <p className="text-white text-xs md:text-sm mt-1">Assinaturas ativas</p>
                    <p className="text-brand-gray text-xs mt-1">
                        {stats?.trialSubscriptions || 0} em trial
                    </p>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className={`rounded-xl p-5 border ${(stats?.overdueSubscriptions || 0) > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-brand-dark border-white/10'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <AlertTriangle size={20} className={`${(stats?.overdueSubscriptions || 0) > 0 ? 'text-red-500' : 'text-brand-gray'}`} />
                        <span className="text-white font-medium">Inadimplentes</span>
                    </div>
                    <p className={`text-2xl font-bold ${(stats?.overdueSubscriptions || 0) > 0 ? 'text-red-500' : 'text-white'}`}>
                        {stats?.overdueSubscriptions || 0}
                    </p>
                    {(stats?.overdueSubscriptions || 0) > 0 && (
                        <Link to="/admin/assinaturas?status=OVERDUE" className="text-red-400 text-sm hover:underline mt-2 inline-block">
                            Ver detalhes →
                        </Link>
                    )}
                </div>

                <div className="bg-brand-dark rounded-xl p-5 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock size={20} className="text-yellow-500" />
                        <span className="text-white font-medium">Trials expirando</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-500">
                        {stats?.expiringTrials || 0}
                    </p>
                    <p className="text-brand-gray text-xs mt-1">Nos próximos 7 dias</p>
                </div>

                <div className="bg-brand-dark rounded-xl p-5 border border-white/10">
                    <div className="flex items-center gap-3 mb-2">
                        <UserPlus size={20} className="text-green-500" />
                        <span className="text-white font-medium">Novos cadastros</span>
                    </div>
                    <p className="text-2xl font-bold text-green-500">
                        {stats?.newThisMonth || 0}
                    </p>
                    <p className="text-brand-gray text-xs mt-1">Este mês</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-brand-dark rounded-xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Building2 size={20} className="text-brand-purple" />
                            Cadastros Recentes
                        </h3>
                        <Link to="/admin/users" className="text-brand-purple hover:text-brand-blue text-sm flex items-center gap-1">
                            Ver todos <ChevronRight size={16} />
                        </Link>
                    </div>

                    {recentBarbershops.length > 0 
                    ? 
                    (
                        <div className="space-y-3">
                            {recentBarbershops.map(shop => (
                                <div key={shop.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-purple/20 rounded-lg flex items-center justify-center">
                                            <Building2 size={18} className="text-brand-purple" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">{shop.shop || shop.name}</p>
                                            <p className="text-brand-gray text-xs">{shop.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-xs px-2 py-1 rounded ${STATUS_COLORS[shop.subscriptionStatus] || 'bg-gray-500/20 text-gray-500'}`}>
                                            {STATUS_LABELS[shop.subscriptionStatus] || 'Sem plano'}
                                        </span>
                                        <p className="text-brand-gray text-xs mt-1">
                                            {formatarData(shop.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) 
                    : 
                    (
                        <div className="text-center py-8 text-brand-gray">
                            <Building2 size={40} className="mx-auto mb-3 opacity-50" />
                            <p>Nenhuma barbearia cadastrada</p>
                        </div>
                    )}
                </div>
            </div>

            {overdueSubscriptions.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <AlertTriangle size={20} className="text-red-500" />
                            Assinaturas Inadimplentes
                        </h3>
                        <Link to="/admin/assinaturas?status=OVERDUE" className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1">
                            Ver todos <ChevronRight size={16} />
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-red-500/20">
                                    <th className="text-brand-gray text-sm font-medium pb-3">Barbearia</th>
                                    <th className="text-brand-gray text-sm font-medium pb-3">Plano</th>
                                    <th className="text-brand-gray text-sm font-medium pb-3">Vencimento</th>
                                    <th className="text-brand-gray text-sm font-medium pb-3">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overdueSubscriptions.map(sub => (
                                    <tr key={sub.id} className="border-b border-red-500/10">
                                        <td className="py-3">
                                            <div>
                                                <p className="text-white text-sm">{sub.shop || sub.ownerName}</p>
                                                <p className="text-brand-gray text-xs">{sub.email}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 text-white text-sm">{sub.planName}</td>
                                        <td className="py-3 text-red-400 text-sm">{formatarData(sub.nextPaymentAt)}</td>
                                        <td className="py-3 text-white text-sm font-medium">{formatarMoeda(sub.planPrice)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}