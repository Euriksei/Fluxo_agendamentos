import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts';
import { useApi, notifySuccess } from '@/hooks/useApi';

import { Building2, Search, Edit, Key, ChevronRight, User, Users as UsersIcon, Crown, Check, TriangleAlert, Mail, Eye } from 'lucide-react';

import Button from '@/components/ui/Button';
import ResponsiveModal from '@/components/ui/ResponsiveModal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

const STATUS_CONFIG = 
{
    ACTIVE: { label: 'Ativo', color: 'bg-green-500/20 text-green-500' },
    TRIAL: { label: 'Trial', color: 'bg-blue-500/20 text-blue-500' },
    OVERDUE: { label: 'Inadimplente', color: 'bg-red-500/20 text-red-500' },
    CANCELLED: { label: 'Cancelado', color: 'bg-gray-500/20 text-gray-500' },
    PENDING: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-500' },
    SUSPENDED: { label: 'Suspenso', color: 'bg-orange-500/20 text-orange-400' },
    NONE: { label: 'Sem assinatura', color: 'bg-gray-500/20 text-gray-400' }
};

const MODAL_TITLES = { edit: 'Editar Barbearia', password: 'Resetar Senha', details: 'Detalhes da Barbearia', plan: 'Alterar Plano' };

const EMPTY_PLAN_FORM = { planId: '', status: '', nextPaymentAt: '' };

// Phone card actions: same four modals as the desktop icon row, with a visible label under each icon
const MOBILE_ACTIONS = [
    { tipo: 'details', label: 'Detalhes', icon: Eye, color: 'text-white', name: shop => `Ver detalhes de ${shop.shop}` },
    { tipo: 'edit', label: 'Editar', icon: Edit, color: 'text-brand-blue', name: shop => `Editar ${shop.shop}` },
    { tipo: 'password', label: 'Senha', icon: Key, color: 'text-yellow-500', name: shop => `Resetar senha de ${shop.shop}` },
    { tipo: 'plan', label: 'Plano', icon: Crown, color: 'text-brand-purple', name: shop => `Alterar plano de ${shop.shop}` }
];

const formatDate = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '—';

export default function Users() 
{
    const { user } = useAuth();
    const { authRequest, loading, setLoading } = useApi();

    const [barbershops, setBarbershops] = useState([]);
    const [search, setSearch] = useState('');

    const [modalAberto, setModalAberto] = useState(false);
    const [selectedShop, setSelectedShop] = useState(null);
    const [modalTipo, setModalTipo] = useState('edit');

    const [formData, setFormData] = useState({ name: '', email: '', shop: '' });
    const [newPassword, setNewPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(null);

    // "Alterar plano": plans come from /api/admin/plans (loaded on first open); the API may answer with warnings to show
    const [plans, setPlans] = useState([]);
    const [planForm, setPlanForm] = useState(EMPTY_PLAN_FORM);
    const [planWarning, setPlanWarning] = useState(null);

    useEffect(() => { loadBarbershops(); }, []);

    const loadBarbershops = async () => 
    {
        if (user?.user.role !== 'ADMIN') return;

        try 
        {
            const data = await authRequest('/api/admin/barbershops');
            setBarbershops(data);
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

    const openModal = async (shop, tipo) => 
    {
        setSelectedShop(shop);
        setModalTipo(tipo);
        setSuccess(null);

        if (tipo === 'edit') 
        {
            setFormData({ name: shop.name, email: shop.email, shop: shop.shop });
        } 
        else if (tipo === 'password') 
        {
            setNewPassword('');
        }
        else if (tipo === 'plan')
        {
            setPlanWarning(null);
            setPlanForm({ ...EMPTY_PLAN_FORM, planId: shop.planId ? String(shop.planId) : '' });

            if (plans.length === 0)
            {
                try
                {
                    const data = await authRequest('/api/admin/plans');
                    setPlans(data.filter(p => p.isActive));
                }
                catch (err)
                {
                    console.error(err);
                    return;
                }
            }
        } 
        else if (tipo === 'details') 
        {
            try 
            {
                const data = await authRequest(`/api/admin/barbershops/${shop.id}`);
                setSelectedShop(data);
            } 
            catch (err) 
            {
                console.error(err);
            }
        }

        setModalAberto(true);
    };

    const closeModal = () => { setModalAberto(false); setSelectedShop(null); setSuccess(null); setPlanWarning(null); };

    const handleChangePlan = async (e) =>
    {
        e.preventDefault();
        setSaving(true);
        setPlanWarning(null);

        try
        {
            const body = { planId: Number(planForm.planId), ...(planForm.status && { status: planForm.status }), ...(planForm.nextPaymentAt && { nextPaymentAt: planForm.nextPaymentAt }) };
            const data = await authRequest(`/api/admin/users/${selectedShop.id}/plan`, { method: 'PUT', body: JSON.stringify(body) });

            setBarbershops(prev => prev.map(b => b.id === selectedShop.id ? { ...b, ...data.barbershop } : b));
            setSelectedShop(prev => ({ ...prev, ...data.barbershop }));
            notifySuccess(`Plano de ${data.barbershop.shop} alterado para ${data.barbershop.planName}`);

            // Warnings (Asaas billing unchanged, employees over the limit, inactive status) stay on screen until the admin closes
            if (data.warnings?.length) setPlanWarning(data.warnings);
            else closeModal();
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

    const handleSaveEdit = async (e) => 
    {
        e.preventDefault();
        setSaving(true);

        try 
        {
            const data = await authRequest(`/api/admin/users/${selectedShop.id}`, { method: 'PUT', body: JSON.stringify(formData) });
            setBarbershops(prev => prev.map(b => b.id === selectedShop.id ? { ...b, ...data } : b));
            setSuccess('Dados atualizados com sucesso');
            setTimeout(closeModal, 1500);
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

    const handleResetPassword = async (e) => 
    {
        e.preventDefault();
        setSaving(true);

        try 
        {
            await authRequest(`/api/admin/users/${selectedShop.id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) });
            setSuccess('Senha alterada com sucesso');
            setTimeout(closeModal, 1500);
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

    const filteredShops = barbershops.filter(shop => shop.name.toLowerCase().includes(search.toLowerCase()) || shop.shop.toLowerCase().includes(search.toLowerCase()) ||
        shop.email.toLowerCase().includes(search.toLowerCase()));

    if (loading) return <div className="text-center py-12 text-brand-gray">Carregando...</div>;

    return (
        <div>
            <div className="flex flex-col gap-4 sm:flex-row justify-between sm:items-center mb-8">
                <h1 className="text-3xl font-bold">Usuários</h1>
                <div className="relative w-full sm:w-auto">
                    <Search size={18} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" />
                    <Input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar..."
                        className="pl-10 w-full sm:w-64" aria-label="Buscar barbearias" inputMode="search" enterKeyHint="search"
                    />
                </div>
            </div>

            {/* Lista no celular: um card por barbearia, ações com rótulo numa linha própria */}
            <ul className="space-y-3 md:hidden">
                {filteredShops.map(shop => {
                    const statusConfig = STATUS_CONFIG[shop.subscriptionStatus || 'NONE'] || STATUS_CONFIG.PENDING;
                    return (
                        <li key={shop.id} className="rounded-xl border border-white/5 bg-brand-dark p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple/15 text-brand-purple">
                                    <Building2 size={20} aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold leading-snug text-white [overflow-wrap:anywhere]">{shop.shop}</p>
                                    <p className="truncate text-sm text-brand-gray">{shop.name}</p>
                                </div>
                                <span className={`shrink-0 whitespace-nowrap rounded px-2 py-1 text-xs ${statusConfig.color}`}>
                                    {statusConfig.label}
                                </span>
                            </div>

                            <p className="mt-3 flex items-start gap-2 text-sm text-brand-gray">
                                <Mail size={14} aria-hidden="true" className="mt-[3px] shrink-0" />
                                <span className="min-w-0 [overflow-wrap:anywhere]">{shop.email}</span>
                            </p>

                            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                                <div className="min-w-0">
                                    <dt className="text-xs text-brand-gray">Plano</dt>
                                    <dd className="truncate text-white">{shop.planName || 'Grátis'}</dd>
                                </div>
                                <div className="min-w-0">
                                    <dt className="text-xs text-brand-gray">Funcionários</dt>
                                    <dd className="flex items-center gap-1 text-white">
                                        <UsersIcon size={14} aria-hidden="true" className="text-brand-gray" />
                                        {shop.employeeCount || 0}
                                    </dd>
                                </div>
                                <div className="min-w-0">
                                    <dt className="text-xs text-brand-gray">Cadastro</dt>
                                    <dd className="text-white tabular-nums">{formatDate(shop.created_at)}</dd>
                                </div>
                            </dl>

                            <div className="-mx-1 mt-3 grid grid-cols-4 gap-1 border-t border-white/5 pt-2">
                                {MOBILE_ACTIONS.map(({ tipo, label, icon: Icon, color, name }) => (
                                    <button key={tipo} type="button" onClick={() => openModal(shop, tipo)} aria-label={name(shop)}
                                        className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs text-brand-gray transition-colors
                                            hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                                        <Icon size={18} aria-hidden="true" className={color} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </li>
                    );
                })}
            </ul>

            {filteredShops.length === 0 && (
                <div className="rounded-xl bg-brand-dark py-12 text-center text-brand-gray md:hidden">
                    Nenhuma barbearia encontrada
                </div>
            )}

            {/* Tabela (md+) */}
            <div className="hidden md:block bg-brand-dark rounded-xl overflow-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Loja</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Email</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Plano</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Status</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Funcionários</th>
                            <th className="text-left text-sm text-brand-gray font-medium p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredShops.map(shop => {
                            const statusConfig = STATUS_CONFIG[shop.subscriptionStatus || 'NONE'] || STATUS_CONFIG.PENDING;
                            return (
                                <tr key={shop.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td data-label="Loja" className="p-4">
                                        <div className="flex flex-col">
                                            <p className="text-white font-medium">{shop.shop}</p>
                                            <p className="text-brand-gray text-sm">{shop.name}</p>
                                        </div>
                                    </td>
                                    <td data-label="Email" className="p-4 text-brand-gray text-sm">{shop.email}</td>
                                    <td data-label="Plano" className="p-4">
                                        <span className="text-white text-sm">{shop.planName || 'Grátis'}</span>
                                    </td>
                                    <td data-label="Status" className="p-4">
                                        <span className={`whitespace-nowrap text-xs px-2 py-1 rounded ${statusConfig.color}`}>
                                            {statusConfig.label}
                                        </span>
                                    </td>
                                    <td data-label="Funcionários" className="p-4">
                                        <span className="text-white text-sm flex items-center gap-1">
                                            <UsersIcon size={14} className="text-brand-gray" />
                                            {shop.employeeCount || 0}
                                        </span>
                                    </td>
                                    <td data-label="" className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => openModal(shop, 'details')}
                                                className="inline-flex size-11 items-center justify-center hover:bg-white/10 rounded-lg text-brand-gray hover:text-white"
                                                title="Ver detalhes" aria-label="Ver detalhes"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                            <button 
                                                onClick={() => openModal(shop, 'edit')}
                                                className="inline-flex size-11 items-center justify-center hover:bg-white/10 rounded-lg text-brand-blue hover:text-blue-400"
                                                title="Editar" aria-label="Editar"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={() => openModal(shop, 'password')}
                                                className="inline-flex size-11 items-center justify-center hover:bg-white/10 rounded-lg text-yellow-500 hover:text-yellow-400"
                                                title="Resetar senha" aria-label="Resetar senha"
                                            >
                                                <Key size={18} />
                                            </button>
                                            <button
                                                onClick={() => openModal(shop, 'plan')}
                                                className="inline-flex size-11 items-center justify-center hover:bg-white/10 rounded-lg text-brand-purple hover:text-purple-400"
                                                title="Alterar plano" aria-label={`Alterar plano de ${shop.shop}`}
                                            >
                                                <Crown size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredShops.length === 0 && (
                    <div className="text-center py-12 text-brand-gray">
                        Nenhuma barbearia encontrada
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalAberto && selectedShop && (
                <ResponsiveModal onClose={closeModal} title={MODAL_TITLES[modalTipo]}>
                        
                        {/* Modal: Editar */}
                        {modalTipo === 'edit' && (
                            <form onSubmit={handleSaveEdit}>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Nome do Proprietário</label>
                                        <Input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            fullWidth
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Nome da Barbearia</label>
                                        <Input
                                            value={formData.shop}
                                            onChange={e => setFormData({ ...formData, shop: e.target.value })}
                                            fullWidth
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Email</label>
                                        <Input
                                            type="email"
                                            inputMode="email"
                                            autoCapitalize="none"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            fullWidth
                                            required
                                        />
                                    </div>

                                    {success && (
                                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                                            <Check size={16} />
                                            {success}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={saving} fullWidth>
                                            {saving ? 'Salvando...' : 'Salvar'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Modal: Resetar Senha */}
                        {modalTipo === 'password' && (
                            <form onSubmit={handleResetPassword}>
                                <div className="text-sm mb-6">
                                    <p className="text-white [overflow-wrap:anywhere]">{selectedShop.name}</p>
                                    <p className="text-brand-gray [overflow-wrap:anywhere]">{selectedShop.email}</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Nova Senha</label>
                                        <Input
                                            type="password"
                                            autoComplete="new-password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                            fullWidth
                                            required
                                            minLength={8}
                                        />
                                    </div>

                                    {success && (
                                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                                            <Check size={16} />
                                            {success}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={saving} fullWidth>
                                            {saving ? 'Salvando...' : 'Alterar Senha'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Modal: Alterar plano */}
                        {modalTipo === 'plan' && (
                            <form onSubmit={handleChangePlan}>
                                <div className="text-sm mb-4">
                                    <p className="text-white [overflow-wrap:anywhere]">{selectedShop.shop}</p>
                                    <p className="text-brand-gray [overflow-wrap:anywhere]">{selectedShop.email}</p>
                                </div>

                                <div className="bg-white/5 rounded-lg p-4 mb-4 text-sm grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <p className="text-brand-gray">Plano atual</p>
                                        <p className="text-white">{selectedShop.planName || 'Sem assinatura (grátis)'}</p>
                                    </div>
                                    <div>
                                        <p className="text-brand-gray">Status</p>
                                        <p className="text-white">{STATUS_CONFIG[selectedShop.subscriptionStatus || 'NONE']?.label || selectedShop.subscriptionStatus}</p>
                                    </div>
                                    {selectedShop.asaasSubscriptionId && (
                                        <p className="col-span-2 text-xs text-yellow-400">Tem cobrança no Asaas: trocar o plano aqui não muda o valor cobrado.</p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="plan-select" className="block text-sm text-brand-gray mb-1">Novo plano</label>
                                        <Select id="plan-select" value={planForm.planId} onChange={e => setPlanForm({ ...planForm, planId: e.target.value })} variant="dark" fullWidth required>
                                            <option value="" disabled>Selecione um plano</option>
                                            {plans.map(plan => (
                                                <option key={plan.id} value={plan.id}>
                                                    {plan.name} - {(plan.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                                                </option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <label htmlFor="plan-status" className="block text-sm text-brand-gray mb-1">Status (opcional)</label>
                                        <Select id="plan-status" value={planForm.status} onChange={e => setPlanForm({ ...planForm, status: e.target.value })} variant="dark" fullWidth>
                                            <option value="">{selectedShop.subscriptionStatus ? `Manter (${STATUS_CONFIG[selectedShop.subscriptionStatus]?.label || selectedShop.subscriptionStatus})` : 'Ativo (padrão)'}</option>
                                            {['ACTIVE', 'TRIAL', 'PENDING', 'OVERDUE', 'SUSPENDED', 'CANCELLED'].map(key => (
                                                <option key={key} value={key}>{STATUS_CONFIG[key].label}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div>
                                        <label htmlFor="plan-date" className="block text-sm text-brand-gray mb-1">Próximo pagamento / renovação (opcional)</label>
                                        <Input id="plan-date" type="date" value={planForm.nextPaymentAt} onChange={e => setPlanForm({ ...planForm, nextPaymentAt: e.target.value })} fullWidth />
                                    </div>

                                    {planWarning && (
                                        <div role="alert" className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm rounded-lg px-4 py-3 flex gap-2">
                                            <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                            <div className="space-y-1">
                                                <p className="font-semibold">Plano alterado, com avisos:</p>
                                                {planWarning.map(w => <p key={w}>{w}</p>)}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                            {planWarning ? 'Fechar' : 'Cancelar'}
                                        </Button>
                                        {!planWarning && (
                                            <Button type="submit" disabled={saving || !planForm.planId} fullWidth>
                                                {saving ? 'Salvando...' : 'Salvar'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* Modal: Detalhes */}
                        {modalTipo === 'details' && (
                            <div>

                                <div className="space-y-6">
                                    {/* Info Principal */}
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <div className="flex items-center gap-3 mb-4 sm:gap-4">
                                            <div className="size-12 shrink-0 bg-brand-purple/20 rounded-xl flex items-center justify-center sm:size-14">
                                                <Building2 size={26} aria-hidden="true" className="text-brand-purple" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-white font-bold text-lg leading-snug [overflow-wrap:anywhere]">{selectedShop.shop}</h3>
                                                <p className="text-brand-gray [overflow-wrap:anywhere]">{selectedShop.name}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
                                            <div className="min-w-0">
                                                <p className="text-brand-gray">Email</p>
                                                <p className="text-white [overflow-wrap:anywhere]">{selectedShop.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-brand-gray">Cadastro</p>
                                                <p className="text-white">
                                                    {new Date(selectedShop.created_at).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Assinatura */}
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                            <Crown size={18} className="text-yellow-500" />
                                            Assinatura
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-brand-gray">Plano</p>
                                                <p className="text-white">{selectedShop.planName || 'Grátis'}</p>
                                            </div>
                                            <div>
                                                <p className="text-brand-gray">Status</p>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    STATUS_CONFIG[selectedShop.subscriptionStatus]?.color || 'bg-gray-500/20 text-gray-500'
                                                }`}>
                                                    {STATUS_CONFIG[selectedShop.subscriptionStatus]?.label || 'Sem assinatura'}
                                                </span>
                                            </div>
                                            {selectedShop.nextPaymentAt && (
                                                <div>
                                                    <p className="text-brand-gray">Próximo Pagamento</p>
                                                    <p className="text-white">
                                                        {new Date(selectedShop.nextPaymentAt).toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Funcionários */}
                                    {selectedShop.employees && selectedShop.employees.length > 0 && (
                                        <div className="bg-white/5 rounded-lg p-4">
                                            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                                <UsersIcon size={18} className="text-brand-purple" />
                                                Funcionários ({selectedShop.employees.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedShop.employees.map(emp => (
                                                    <div key={emp.id} className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0">
                                                        <User size={14} aria-hidden="true" className="mt-1 shrink-0 text-brand-gray" />
                                                        <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-3">
                                                            <p className="text-white text-sm [overflow-wrap:anywhere]">{emp.name}</p>
                                                            <p className="text-brand-gray text-xs [overflow-wrap:anywhere] sm:text-right">{emp.email}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Button onClick={closeModal} variant="outline" fullWidth>
                                        Fechar
                                    </Button>
                                </div>
                            </div>
                        )}
                </ResponsiveModal>
            )}
        </div>
    );
}