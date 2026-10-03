import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts';
import { useApi } from '@/hooks/useApi';

import { Edit, Check, Users, Star } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

import { PLAN_ICONS, PLAN_FEATURE_LABELS, PLAN_ALL_FEATURES } from '@/types';
import { formatarMoeda, parseMoeda } from '@/utils';

export default function AdminPlanos() 
{
    const { user } = useAuth();
    const { authRequest, loading, setLoading } = useApi();

    const [plans, setPlans] = useState([]);

    const [modalAberto, setModalAberto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [formData, setFormData] = useState({ name: '', slug: '', description: '', about: '', price: '', maxEmployees: '', features: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadPlans(); }, []);

    const loadPlans = async () => 
    {
        if (user?.user.role !== 'ADMIN') return;

        try 
        {
            const data = await authRequest('/api/admin/plans');
            setPlans(data);
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

    const openModal = (plan = null) => 
    {
        if (plan) 
        {
            setEditandoId(plan.id);
            setFormData({ name: plan.name, slug: plan.slug, description: plan.description || '',  about: plan.about || '', price: formatarMoeda(plan.price), 
                maxEmployees: plan.maxEmployees.toString(), features: plan.features || [] });
        } 
        else 
        {
            setEditandoId(null);
            setFormData({ name: '', slug: '', description: '', about: '', price: '', maxEmployees: '0', features: [] });
        }
        setModalAberto(true);
    };

    const closeModal = () => { setModalAberto(false); setEditandoId(null); };

    const handlePriceChange = (value) => { const centavos = parseMoeda(value); setFormData({ ...formData, price: centavos ? formatarMoeda(centavos) : '' }); };

    const toggleFeature = (feature) => 
    {
        setFormData(prev => ({ ...prev, features: prev.features.includes(feature) ? prev.features.filter(f => f !== feature) : [...prev.features, feature] }));
    };

    const handleSubmit = async (e) => 
    {
        e.preventDefault();
        setSaving(true);

        try 
        {
            console.log(formData.features);

            const payload = { name: formData.name, slug: formData.slug, description: formData.description, about: formData.about, price: parseMoeda(formData.price), 
                maxEmployees: parseInt(formData.maxEmployees) || 0, features: formData.features };

            const url = editandoId ? `/api/admin/plans/${editandoId}` : '/api/admin/plans';

            const data = await authRequest(url, { method: editandoId ? 'PUT' : 'POST', body: JSON.stringify(payload) });

            if (editandoId) setPlans(prev => prev.map(p => p.id === editandoId ? data : p));
            else setPlans(prev => [...prev, data]);

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
                <h1 className="text-3xl font-bold">Planos</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {plans.map(plan => 
                {
                    const Icon = PLAN_ICONS[plan.slug] || Star;
                    const features = Array.isArray(plan.features) ? plan.features : [];

                    return (
                        <div key={plan.id} className="bg-brand-dark rounded-xl p-6 border border-white/10">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                                    ${plan.slug === 'premium' ? 'bg-yellow-500/20' : plan.slug === 'professional' ? 'bg-brand-purple/20' : 'bg-white/10'}`}>
                                    <Icon size={24} className={plan.slug === 'premium' ? 'text-yellow-500' : plan.slug === 'professional' ? 'text-brand-purple' :
                                        'text-brand-gray'} />
                                </div>
                                <button 
                                    onClick={() => openModal(plan)}
                                    className="p-2 hover:bg-white/10 rounded text-brand-gray hover:text-white"
                                >
                                    <Edit size={18} />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                            <p className="text-brand-gray text-sm mb-4">{plan.description}</p>

                            <div className="mb-4">
                                <span className="text-3xl font-bold text-white">
                                    {plan.price === 0 ? 'Grátis' : formatarMoeda(plan.price)}
                                </span>
                                {plan.price > 0 && <span className="text-brand-gray">/mês</span>}
                            </div>

                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                                <Users size={16} className="text-brand-gray" />
                                <span className="text-white text-sm">
                                    {plan.maxEmployees === 0 
                                        ? '1 profissional (somente dono)' 
                                        : `Até ${plan.maxEmployees + 1} profissionais`}
                                </span>
                            </div>

                            <ul className="space-y-2">
                                {PLAN_ALL_FEATURES.map(feature => 
                                {
                                    const hasFeature = features.includes(feature);
                                    return (
                                        <div key={feature} className="flex items-center gap-2 text-sm">
                                            {hasFeature 
                                            ? 
                                            (
                                                <Check size={14} className="text-green-500" />
                                            ) 
                                            : (

                                                <div className="w-3.5 h-3.5 rounded border border-white/20" />
                                            )}
                                            <span className={hasFeature ? 'text-white' : 'text-brand-gray/50'}>
                                                {PLAN_FEATURE_LABELS[feature]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </ul>

                            <div className="mt-4 pt-4 border-t border-white/10">
                                <span className={`text-xs px-2 py-1 rounded ${
                                    plan.isActive !== false 
                                        ? 'bg-green-500/20 text-green-500' 
                                        : 'bg-red-500/20 text-red-500'
                                }`}>
                                    {plan.isActive !== false ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {modalAberto && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                    <div className="bg-brand-dark border border-white/10 rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-6">
                            {editandoId ? 'Editar Plano' : 'Novo Plano'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Nome</label>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Profissional"
                                        fullWidth
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Slug</label>
                                    <Input
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                                        placeholder="Ex: professional"
                                        fullWidth
                                        required
                                        disabled={!!editandoId}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-brand-gray mb-1">Descrição Curta</label>
                                <Input
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Breve descrição do plano"
                                    fullWidth
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-brand-gray mb-1">Descrição Longa</label>
                                <textarea value={formData.about} onChange={e => setFormData({ ...formData, about: e.target.value })} placeholder="Descrição completa dos planos"
                                    className='w-full px-4 py-3 rounded-xl text-white bg-brand-black border border-white/10 transition-colors duration-200 focus:outline-none 
                                        focus:ring-2 focus:ring-brand-blue focus:border-transparent placeholder-brand-gray' />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Preço Mensal</label>
                                    <Input
                                        value={formData.price}
                                        onChange={e => handlePriceChange(e.target.value)}
                                        placeholder="R$ 0,00"
                                        fullWidth
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Máx. Funcionários</label>
                                    <Input
                                        type="number"
                                        value={formData.maxEmployees}
                                        onChange={e => setFormData({ ...formData, maxEmployees: e.target.value })}
                                        placeholder="0"
                                        min="0"
                                        fullWidth
                                    />
                                    <p className="text-xs text-brand-gray mt-1">0 = apenas o dono</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-brand-gray mb-3">Funcionalidades</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PLAN_ALL_FEATURES.map(feature => 
                                    {
                                        const isChecked = formData.features.includes(feature);
                                        return (
                                            <label 
                                                key={feature}
                                                className={`
                                                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border
                                                    ${isChecked 
                                                        ? 'bg-brand-purple/20 border-brand-purple/50' 
                                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                                    }
                                                `}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleFeature(feature)}
                                                    className="sr-only"
                                                />
                                                <div className={`
                                                    w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                                                    ${isChecked 
                                                        ? 'bg-brand-purple border-brand-purple' 
                                                        : 'border-white/30'
                                                    }
                                                `}>
                                                    {isChecked && <Check size={12} className="text-white" />}
                                                </div>
                                                <span className="text-white text-sm">{PLAN_FEATURE_LABELS[feature]}</span>
                                            </label>
                                        );
                                    })}
                                </div>
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