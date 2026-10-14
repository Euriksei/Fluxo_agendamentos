import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts';
import { useApi } from '@/hooks/useApi';

import { Search, Edit, Building2 } from 'lucide-react';

import Button from '@/components/ui/Button';
import ResponsiveModal from '@/components/ui/ResponsiveModal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

import { SUBSCRIPTION_STATUS_CONFIG } from '@/types';
import { formatarMoeda, formatarData } from '@/utils';

export default function AdminAssinaturas() 
{
    const { user } = useAuth();
    const { authRequest, loading, setLoading } = useApi();

    const [subscriptions, setSubscriptions] = useState([]);
    const [plans, setPlans] = useState([]);

    const [modalAberto, setModalAberto] = useState(false);
    const [selectedSub, setSelectedSub] = useState(null);
    const [formData, setFormData] = useState({ planId: '', status: '', nextPaymentAt: '' });
    const [saving, setSaving] = useState(false);

    // ?status=OVERDUE (link do dashboard) filtra a lista; os cards de resumo e o select escrevem no mesmo parâmetro
    const [searchParams, setSearchParams] = useSearchParams();
    const rawStatus = searchParams.get('status')?.toUpperCase() ?? '';
    const statusFilter = rawStatus in SUBSCRIPTION_STATUS_CONFIG ? rawStatus : '';
    const setStatusFilter = (status: string) =>
    {
        const next = new URLSearchParams(searchParams);
        if (status) next.set('status', status); else next.delete('status');
        setSearchParams(next, { replace: true });
    };
    const visibleSubscriptions = statusFilter ? subscriptions.filter(s => s.status === statusFilter) : subscriptions;

    useEffect(() => { loadData(); }, []);

    const loadData = async () => 
    {
        if (user?.user.role !== 'ADMIN') return;

        try 
        {
            setLoading(true);

            let url = '/api/admin/subscriptions';
            const subsData = await authRequest(url);
            setSubscriptions(subsData);

            const plansData = await authRequest('/api/admin/plans');
            setPlans(plansData);
        } 
        catch (err) 
        {
            console.error(err);
        } 
        finally 
        {
            setLoading(false);
        }
    };

    const openModal = (sub) => 
    {
        setSelectedSub(sub);
        setFormData({ planId: sub.planId?.toString() || '', status: sub.status || '', nextPaymentAt: sub.nextPaymentAt ? sub.nextPaymentAt.split('T')[0] : '' });
        setModalAberto(true);
    };

    const closeModal = () => { setModalAberto(false); setSelectedSub(null); };

    const handleSubmit = async (e) => 
    {
        e.preventDefault();
        setSaving(true);

        try 
        {
            const data = await authRequest(`/api/admin/subscriptions/${selectedSub.id}`, { method: 'PUT',
                body: JSON.stringify({ planId: parseInt(formData.planId), status: formData.status, nextPaymentAt: formData.nextPaymentAt || null }) });

            setSubscriptions(prev => prev.map(s => s.id === selectedSub.id ? { ...s, ...data } : s));
            closeModal();
        } 
        catch (err) 
        {
            console.error(err);
        } 
        finally 
        {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-12 text-brand-gray">Carregando...</div>;

    return (
        <div>
            <div className="flex flex-col gap-4 md:flex-row justify-between md:items-center mb-8">
                <h1 className="text-3xl font-bold">Assinaturas</h1>

                <label className="flex flex-col gap-1 text-sm text-brand-gray md:flex-row md:items-center md:gap-3">
                    Filtrar por status
                    <Select variant="dark" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full md:w-56">
                        <option value="">Todos</option>
                        {Object.entries(SUBSCRIPTION_STATUS_CONFIG).map(([status, config]) => <option key={status} value={status}>{config.label}</option>)}
                    </Select>
                </label>
            </div>

            {/* Cards de Resumo */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-6 mb-6">
                {Object.entries(SUBSCRIPTION_STATUS_CONFIG).map(([status, config]) => {
                    const count = subscriptions.filter(s => s.status === status).length;
                    const Icon = config.icon;
                    const active = statusFilter === status;
                    return (
                        <button
                            key={status}
                            type="button"
                            onClick={() => setStatusFilter(active ? '' : status)}
                            aria-pressed={active}
                            className={`bg-brand-dark p-4 rounded-xl text-left transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple
                                ${active ? 'border-brand-purple' : 'border-transparent hover:border-white/20'}`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon size={16} className={config.color.split(' ')[1]} />
                                <span className="text-brand-gray text-sm">{config.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{count}</p>
                        </button>
                    );
                })}
            </div>

            {statusFilter && (
                <div className="mb-4 flex flex-wrap items-center gap-x-3 text-sm text-brand-gray" aria-live="polite">
                    <span>Mostrando {visibleSubscriptions.length} {visibleSubscriptions.length === 1 ? 'assinatura' : 'assinaturas'} com status <strong className="text-white">{SUBSCRIPTION_STATUS_CONFIG[statusFilter].label}</strong></span>
                    <button type="button" onClick={() => setStatusFilter('')}
                        className="inline-flex min-h-11 items-center rounded-sm font-semibold text-brand-purple hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                        Limpar filtro
                    </button>
                </div>
            )}

            {/* Tabela */}
            <div className="md:bg-brand-dark rounded-xl md:overflow-hidden">
                <table className="w-full table-cards">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Loja</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Plano</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Status</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Próx. Pagamento</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Valor</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleSubscriptions.map(sub => {
                            const statusConfig = SUBSCRIPTION_STATUS_CONFIG[sub.status] || SUBSCRIPTION_STATUS_CONFIG.PENDING;
                            const StatusIcon = statusConfig.icon;
                            return (
                                <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td data-label="Loja" className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <p className="text-white font-medium">{sub.shop}</p>
                                                <p className="text-brand-gray text-sm">{sub.ownerName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Plano" className="p-4">
                                        <span className="text-white">{sub.planName}</span>
                                    </td>
                                    <td data-label="Status" className="p-4">
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${statusConfig.color}`}>
                                            <StatusIcon size={12} />
                                            {statusConfig.label}
                                        </span>
                                    </td>
                                    <td data-label="Próx. Pagamento" className="p-4 text-brand-gray text-sm">
                                        {formatarData(sub.nextPaymentAt)}
                                    </td>
                                    <td data-label="Valor" className="p-4 text-white font-medium">
                                        {formatarMoeda(sub.planPrice)}
                                    </td>
                                    <td data-label="" className="p-4">
                                        <button 
                                            onClick={() => openModal(sub)} aria-label={`Editar assinatura de ${sub.shop}`}
                                            className="inline-flex size-11 items-center justify-center hover:bg-white/10 rounded-lg text-brand-blue hover:text-blue-400"
                                        >
                                            <Edit size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {visibleSubscriptions.length === 0 && (
                    <div className="text-center py-12 text-brand-gray">
                        {statusFilter ? 'Nenhuma assinatura com esse status' : 'Nenhuma assinatura encontrada'}
                    </div>
                )}
            </div>

            {/* Modal de Edição */}
            {modalAberto && selectedSub && (
                <ResponsiveModal title="Editar Assinatura" onClose={closeModal}>
                        <p className="text-brand-gray text-sm">{selectedSub.shop} - {selectedSub.ownerName}</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-brand-gray mb-1">Plano</label>
                                <Select
                                    value={formData.planId}
                                    onChange={e => setFormData({ ...formData, planId: e.target.value })}
                                    variant="dark"
                                    fullWidth
                                >
                                    {plans.map(plan => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name} - {formatarMoeda(plan.price)}/mês
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm text-brand-gray mb-1">Status</label>
                                <Select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    variant="dark"
                                    fullWidth
                                >
                                    {Object.entries(SUBSCRIPTION_STATUS_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm text-brand-gray mb-1">Próximo Pagamento</label>
                                <Input
                                    type="date"
                                    value={formData.nextPaymentAt}
                                    onChange={e => setFormData({ ...formData, nextPaymentAt: e.target.value })}
                                    fullWidth
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={saving} fullWidth>
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </div>
                        </form>
                </ResponsiveModal>
            )}
        </div>
    );
}