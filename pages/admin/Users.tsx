import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts';
import { useApi } from '@/hooks/useApi';

import { Building2, Search, Edit, Key, ChevronRight, User, Users as UsersIcon, Crown, Check } from 'lucide-react';

import Button from '@/components/ui/Button';
import ResponsiveModal from '@/components/ui/ResponsiveModal';
import Input from '@/components/ui/Input';

const STATUS_CONFIG = 
{
    ACTIVE: { label: 'Ativo', color: 'bg-green-500/20 text-green-500' },
    TRIAL: { label: 'Trial', color: 'bg-blue-500/20 text-blue-500' },
    OVERDUE: { label: 'Inadimplente', color: 'bg-red-500/20 text-red-500' },
    CANCELLED: { label: 'Cancelado', color: 'bg-gray-500/20 text-gray-500' },
    PENDING: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-500' }
};

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

    const closeModal = () => { setModalAberto(false); setSelectedShop(null); setSuccess(null); };

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

            {/* Lista */}
            <div className="md:bg-brand-dark rounded-xl md:overflow-auto">
                <table className="w-full table-cards">
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
                            const statusConfig = STATUS_CONFIG[shop.subscriptionStatus] || STATUS_CONFIG.PENDING;
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
                                        <span className={`text-xs px-2 py-1 rounded ${statusConfig.color}`}>
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
                <ResponsiveModal onClose={closeModal} title={modalTipo === 'edit' ? 'Editar Barbearia' : modalTipo === 'password' ? 'Resetar Senha' : 'Detalhes da Barbearia'}>
                        
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
                                <p className="text-brand-gray text-sm mb-6">{selectedShop.name} - {selectedShop.email}</p>

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

                        {/* Modal: Detalhes */}
                        {modalTipo === 'details' && (
                            <div>

                                <div className="space-y-6">
                                    {/* Info Principal */}
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-14 h-14 bg-brand-purple/20 rounded-xl flex items-center justify-center">
                                                <Building2 size={28} className="text-brand-purple" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold text-lg">{selectedShop.shop}</h3>
                                                <p className="text-brand-gray">{selectedShop.name}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-brand-gray">Email</p>
                                                <p className="text-white break-all">{selectedShop.email}</p>
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
                                                    <div key={emp.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                                        <div className="flex items-center gap-2">
                                                            <User size={14} className="text-brand-gray" />
                                                            <span className="text-white text-sm">{emp.name}</span>
                                                        </div>
                                                        <span className="text-brand-gray text-xs break-all text-right">{emp.email}</span>
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