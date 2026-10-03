import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts';
import { useApi } from '@/hooks/useApi';

import { Search, Edit, Building2 } from 'lucide-react';

import Button from '@/components/ui/Button';
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
            <div className="flex flex-col gap-4 md:flex-row md:gap-0 justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Assinaturas</h1>
            </div>

            {/* Cards de Resumo */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-6 mb-6">
                {Object.entries(SUBSCRIPTION_STATUS_CONFIG).map(([status, config]) => {
                    const count = subscriptions.filter(s => s.status === status).length;
                    const Icon = config.icon;
                    return (
                        <div 
                            key={status}
                            className={`
                                bg-brand-dark p-4 rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/20
                            `}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon size={16} className={config.color.split(' ')[1]} />
                                <span className="text-brand-gray text-sm">{config.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{count}</p>
                        </div>
                    );
                })}
            </div>

            {/* Tabela */}
            <div className="bg-brand-dark rounded-xl overflow-hidden">
                <table className="w-full">
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
                        {subscriptions.map(sub => {
                            const statusConfig = SUBSCRIPTION_STATUS_CONFIG[sub.status] || SUBSCRIPTION_STATUS_CONFIG.PENDING;
                            const StatusIcon = statusConfig.icon;
                            return (
                                <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <p className="text-white font-medium">{sub.shop}</p>
                                                <p className="text-brand-gray text-sm">{sub.ownerName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-white">{sub.planName}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${statusConfig.color}`}>
                                            <StatusIcon size={12} />
                                            {statusConfig.label}
                                        </span>
                                    </td>
                                    <td className="p-4 text-brand-gray text-sm">
                                        {formatarData(sub.nextPaymentAt)}
                                    </td>
                                    <td className="p-4 text-white font-medium">
                                        {formatarMoeda(sub.planPrice)}
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => openModal(sub)}
                                            className="p-2 hover:bg-white/10 rounded text-brand-blue hover:text-blue-400"
                                        >
                                            <Edit size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {subscriptions.length === 0 && (
                    <div className="text-center py-12 text-brand-gray">
                        Nenhuma assinatura encontrada
                    </div>
                )}
            </div>

            {/* Modal de Edição */}
            {modalAberto && selectedSub && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                    <div className="bg-brand-dark border border-white/10 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-2">Editar Assinatura</h2>
                        <p className="text-brand-gray text-sm mb-6">{selectedSub.shop} - {selectedSub.ownerName}</p>

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
                    </div>
                </div>
            )}
        </div>
    );
}