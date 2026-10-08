import { useState, useEffect, useRef } from 'react';
import { useAuth, useAppointments, useFlows, useSubscription } from '@/contexts';
import { Link } from 'react-router-dom';

import { Copy, Check, Download, QrCode, Calendar, Clock, DollarSign, TrendingUp, Users, Scissors, ChevronRight, User, ExternalLink } from 'lucide-react';

import Button from '@/components/ui/Button';

import { formatarMoeda, formatarData, formatarDataCurta, hojeLocal } from '@/utils';
import { STATUS_CONFIG, SUBSCRIPTION_STATUS_CONFIG, PLAN_FEATURE_LABELS } from '@/types';

export default function Dashboard() 
{
    const { user } = useAuth();
    const { getBarberAppointments } = useAppointments();
    const { getFlows } = useFlows();
    const { subscription } = useSubscription();

    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const qrRef = useRef(null);

    const [todayAppointments, setTodayAppointments] = useState([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [recentFlows, setRecentFlows] = useState([]);
    const [stats, setStats] = useState({ todayCount: 0, todayRevenue: 0, weekCount: 0, weekRevenue: 0, monthCount: 0, monthRevenue: 0, pendingCount: 0 });

    const userId = user?.user?.id;
    const slug = user?.user.slug || user?.user.ownerSlug;
    const publicUrl = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/+$/, '');
    const bookingLink = `${publicUrl}/agendar/${slug}`;

    const statusConfig = SUBSCRIPTION_STATUS_CONFIG[subscription?.status] || SUBSCRIPTION_STATUS_CONFIG.NONE;
    const StatusIcon = statusConfig.icon;

    useEffect(() => 
    {
        const loadDashboard = async () => 
        {
            try 
            {
                setLoading(true);

                const hoje = hojeLocal();
                const todayData = await getBarberAppointments(hoje);

                if (todayData) 
                {
                    setTodayAppointments(todayData);
                    
                    const completed = todayData.filter(a => a.status === 'COMPLETED');
                    setStats(prev => ({ ...prev, todayCount: todayData.length, todayRevenue: completed.reduce((sum, a) => sum + (a.price || 0), 0) }));
                }

                const upcomingData = await getBarberAppointments();
                if (upcomingData)
                {
                    const now = new Date();
                    const horaAtual = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

                    const upcoming = upcomingData.filter(a => 
                    {
                        const aptDate = typeof a.appointmentDate === 'string' ? a.appointmentDate.split('T')[0] : a.appointmentDate;
                        if (a.status === 'CANCELLED' || a.status === 'COMPLETED') return false;
                        if (aptDate > hoje) return true;
                        if (aptDate === hoje) { const aptTime = a.startTime?.toString().slice(0, 5); return aptTime > horaAtual; }
                        return false;
                    }).slice(0, 5);
                    setUpcomingAppointments(upcoming);

                    const pendingCount = upcomingData.filter(a => a.status === 'PENDING' && String(a.appointmentDate).split('T')[0] >= hoje).length;
                    setStats(prev => ({ ...prev, pendingCount }));

                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay());
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

                    const weekCompleted = upcomingData.filter(a => 
                    {
                        const aptDate = new Date(a.appointmentDate);
                        return a.status === 'COMPLETED' && aptDate >= weekStart;
                    });

                    const monthCompleted = upcomingData.filter(a => 
                    {
                        const aptDate = new Date(a.appointmentDate);
                        return a.status === 'COMPLETED' && aptDate >= monthStart;
                    });

                    setStats(prev => ({ ...prev, weekCount: weekCompleted.length, weekRevenue: weekCompleted.reduce((sum, a) => sum + (a.price || 0), 0), 
                        monthCount: monthCompleted.length, monthRevenue: monthCompleted.reduce((sum, a) => sum + (a.price || 0), 0) }));
                }

                const flowsData = await getFlows(1);
                setRecentFlows(Array.isArray(flowsData) ? flowsData.slice(0, 5) : []);
            } 
            catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };

        if (userId) {
            loadDashboard();
        }
    }, [userId, getBarberAppointments, getFlows]);

    const handleCopyLink = async () => 
    {
        try 
        {
            await navigator.clipboard.writeText(bookingLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } 
        catch (err) 
        {
            console.error('Erro ao copiar:', err);
        }
    };

    const handleDownloadQR = async () => 
    {
        try 
        {
            const QRCode = (await import('qrcode')).default;
            const canvas = document.createElement('canvas');
            await QRCode.toCanvas(canvas, bookingLink, { width: 1000, margin: 1, color: { dark: '#FFFFFF', light: '#1a1a2e' }});

            const link = document.createElement('a');
            link.download = `qrcode-${user?.name || 'agendamento'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } 
        catch (err) 
        {
            console.error('Erro ao gerar QR Code para download:', err);
        }
    };

    const QRCodeComponent = ({ value, size = 180 }) => 
    {
        const canvasRef = useRef(null);

        useEffect(() => 
        {
            const generateQR = async () => 
            {
                try
                {
                    const QRCode = (await import('qrcode')).default;
                    if (canvasRef.current) await QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1, color: { dark: '#FFFFFF', light: '#1a1a2e' } });
                } 
                catch (err) 
                {
                    console.error('Erro ao gerar QR Code:', err);
                }
            };
            generateQR();
        }, [value, size]);

        return <canvas ref={canvasRef} />;
    };

    if (loading) 
    {
        return (
            <div className="flex items-center justify-center min-h-100">
                <div className="animate-spin w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">
                    Olá, {user?.user.name?.split(' ')[0]}! 👋
                </h1>
                <p className="text-brand-gray mt-1">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-brand-dark p-6 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusConfig.color}`}>
                        <StatusIcon size={24} />
                    </div>
                    <div className="flex flex-row gap-6">
                        <h2 className="text-white text-xl">
                            Seu Plano: <b>{subscription?.plan?.name || 'Sem Plano'}</b>
                        </h2>
                        <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>
                    </div>
                </div>

                {subscription?.plan?.price > 0 && (
                    <div className="flex flex-row items-center justify-center gap-6">
                        <p className="text-brand-gray text-sm">Valor mensal</p>
                        <p className="text-brand-blue text-2xl font-bold">
                            {formatarMoeda(subscription.plan.price)}
                        </p>
                    </div>
                )}
            </div>

            <div className="bg-linear-to-br from-brand-purple/20 to-brand-blue/20 border border-brand-purple/30 rounded-xl p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <QrCode size={24} className="text-brand-purple" />
                            <h2 className="text-lg md:text-xl font-bold">Compartilhe seu link de agendamento</h2>
                        </div>
                        <p className="text-sm md:text-base mb-4">
                            Envie este link para seus clientes agendarem diretamente com você.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <a href={bookingLink} target="_blank" rel="noopener noreferrer" title={bookingLink} className="flex-1 min-w-0 bg-white/10 border border-white/30 
                                    rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                                <ExternalLink size={18} className="shrink-0" aria-hidden="true" />
                                <span className="text-sm truncate">{bookingLink}</span>
                            </a>
                            <Button onClick={handleCopyLink} className="shrink-0">
                                {copied 
                                ? 
                                (
                                    <div className="flex items-center justify-center gap-2">
                                        <Check size={16} /> Copiado!
                                    </div>
                                ) 
                                : 
                                (
                                    <div className="flex items-center justify-center gap-2">
                                        <Copy size={16} className="mr-2" />
                                        Copiar Link
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col items-center" ref={qrRef}>
                        <div className="bg-brand-darker p-2 rounded-xl">
                            <QRCodeComponent value={bookingLink} size={150} />
                        </div>
                        <Button onClick={handleDownloadQR} variant="outline" className="flex items-center justify-center gap-2 py-2! px-4! text-sm font-bold">
                            <Download size={14} /> Baixar QR Code
                        </Button>
                    </div>
                </div>
            </div>

            {user?.user.role === 'BARBER' && (
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <div className="bg-brand-dark p-5 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-brand-purple/20 rounded-lg flex items-center justify-center">
                                <Calendar size={20} className="text-brand-purple" />
                            </div>
                            <span className="text-brand-gray text-sm">Hoje</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.todayCount}</p>
                        <p className="text-brand-gray text-xs mt-1">agendamentos</p>
                    </div>

                    <div className="bg-brand-dark p-5 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                                <Clock size={20} className="text-yellow-500" />
                            </div>
                            <span className="text-brand-gray text-sm">Pendentes</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-500">{stats.pendingCount}</p>
                        <p className="text-brand-gray text-xs mt-1">aguardando</p>
                    </div>

                    <div className="bg-brand-dark p-5 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <DollarSign size={20} className="text-green-500" />
                            </div>
                            <span className="text-brand-gray text-sm">Receita Hoje</span>
                        </div>
                        <p className="text-2xl font-bold text-green-500">{formatarMoeda(stats.todayRevenue)}</p>
                        <p className="text-brand-gray text-xs mt-1">concluídos</p>
                    </div>

                    <div className="bg-brand-dark p-5 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <TrendingUp size={20} className="text-blue-500" />
                            </div>
                            <span className="text-brand-gray text-sm">Este Mês</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-500">{formatarMoeda(stats.monthRevenue)}</p>
                        <p className="text-brand-gray text-xs mt-1">{stats.monthCount} atendimentos</p>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="bg-brand-dark rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Calendar size={20} className="text-brand-purple" />
                            Agendamentos de Hoje
                        </h3>
                        <Link to="/agenda" className="text-brand-purple hover:text-brand-blue text-sm flex items-center gap-1">
                            Ver todos <ChevronRight size={16} />
                        </Link>
                    </div>

                    {todayAppointments.length > 0 
                    ? 
                    (
                        <div className="space-y-3">
                            {todayAppointments.slice(0, 5).map(apt => {
                                const statusConfig = STATUS_CONFIG[apt.status];
                                const StatusIcon = statusConfig?.icon || Clock;
                                return (
                                    <div key={apt.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                                        <div className="text-center min-w-12.5">
                                            <p className="text-white font-bold">{apt.startTime?.toString().slice(0, 5)}</p>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{apt.clientName}</p>
                                            <p className="text-brand-gray text-sm truncate">{apt.serviceName}</p>
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${statusConfig?.color}`}>
                                            <StatusIcon size={12} />
                                            <span className="hidden sm:inline">{statusConfig?.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) 
                    : 
                    (
                        <div className="text-center py-8">
                            <Calendar size={40} className="mx-auto text-brand-gray mb-3" />
                            <p className="text-brand-gray">Nenhum agendamento para hoje</p>
                        </div>
                    )}
                </div>

                <div className="bg-brand-dark rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Clock size={20} className="text-brand-purple" />
                            Próximos Agendamentos
                        </h3>
                        <Link to="/agenda" className="text-brand-purple hover:text-brand-blue text-sm flex items-center gap-1">
                            Ver todos <ChevronRight size={16} />
                        </Link>
                    </div>

                    {upcomingAppointments.length > 0 
                    ? 
                    (
                        <div className="space-y-3">
                            {upcomingAppointments.map(apt => 
                            {
                                const aptDate = typeof apt.appointmentDate === 'string' ? apt.appointmentDate.split('T')[0] : apt.appointmentDate;
                                return (
                                    <div key={apt.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                                        <div className="text-center min-w-15 bg-brand-purple/10 rounded-lg py-2 px-3">
                                            <p className="text-brand-purple text-xs font-bold">
                                                {formatarDataCurta(aptDate)}
                                            </p>
                                            <p className="text-white font-bold text-sm">
                                                {apt.startTime?.toString().slice(0, 5)}
                                            </p>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{apt.clientName}</p>
                                            <p className="text-brand-gray text-sm truncate">{apt.serviceName}</p>
                                        </div>
                                        {apt.barberName && (
                                            <div className="flex flex-col md:flex-row items-center gap-1 text-brand-gray text-xs">
                                                <User size={12} />
                                                {apt.barberName}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) 
                    : 
                    (
                        <div className="text-center py-8">
                            <Clock size={40} className="mx-auto text-brand-gray mb-3" />
                            <p className="text-brand-gray">Nenhum agendamento futuro</p>
                        </div>
                    )}
                </div>
            </div>

            {user?.user.role === 'BARBER' && (
                <div className="bg-brand-dark rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <DollarSign size={20} className="text-brand-purple" />
                            Movimentações Recentes
                        </h3>
                        <Link to="/caixa" className="text-brand-purple hover:text-brand-blue text-sm flex items-center gap-1">
                            Ver fluxo completo <ChevronRight size={16} />
                        </Link>
                    </div>

                    {recentFlows.length > 0 
                    ? 
                    (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-white/10">
                                        <th className="text-brand-gray text-sm font-medium pb-3">Data</th>
                                        <th className="text-brand-gray text-sm font-medium pb-3">Descrição</th>
                                        <th className="text-brand-gray text-sm font-medium pb-3">Profissional</th>
                                        <th className="text-brand-gray text-sm font-medium pb-3">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentFlows.map(flow => (
                                        <tr key={flow.id} className="border-b border-white/5">
                                            <td className="py-3 text-white text-sm">
                                                {formatarData(flow.date || flow.created_at)}
                                            </td>
                                            <td className="py-3 text-white text-sm">
                                                {flow.description || flow.type || '-'}
                                            </td>
                                            <td className="py-3 text-brand-gray text-sm">
                                                {flow.userName || '-'}
                                            </td>
                                            <td className={`py-3 text-sm font-medium ${flow.type === 'INCOME' || flow.value > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {flow.type === 'INCOME' || flow.value > 0 ? '+' : ''}
                                                {formatarMoeda(Math.abs(flow.value))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) 
                    : 
                    (
                        <div className="text-center py-8">
                            <DollarSign size={40} className="mx-auto text-brand-gray mb-3" />
                            <p className="text-brand-gray">Nenhuma movimentação recente</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}