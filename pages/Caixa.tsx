import { useState, useEffect } from 'react';
import { useFlows, useServices } from '@/contexts';

import { Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

import { FLOW_TYPES, FLOW_CATEGORIES } from '@/types';
import { formatarMoeda, parseMoeda, formatarData } from '@/utils';

const isSystemFlow = (flow) => flow.category === 'SYSTEM';

export default function Caixa() 
{
    const { loading, setLoading, flows, getFlows, createFlow, updateFlow, deleteFlow } = useFlows();
    const { services } = useServices();

    const [modalAberto, setModalAberto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState({ serviceId: '', value: '', date: '', type: 'ENTRADA', category: 'Sem Categoria' });

    useEffect(() => { getFlows(); }, [getFlows]);

    const handleChange = (campo, valor) => 
    {
        if (campo === 'value') 
        {
            const centavos = parseMoeda(valor);
            setForm({ ...form, value: centavos ? formatarMoeda(centavos) : '' });
        } 
        else 
        {
            setForm({ ...form, [campo]: valor });
        }
    };

    const openModal = (flow = null) => 
    {
        if (flow) 
        {
            setEditandoId(flow.id);
            setForm({ serviceId: flow.serviceId || '', value: formatarMoeda(flow.value), date: flow.date ? flow.date.slice(0, 10) : '', type: flow.type, category: flow.category });
        } 
        else 
        {
            setEditandoId(null);
            setForm({ serviceId: '', value: '', date: '', type: 'ENTRADA', category: 'Serviço' });
        }

        setModalAberto(true);
    };

    const closeModal = () => 
    {
        setModalAberto(false);
        setEditandoId(null);
        setForm({ serviceId: '', value: '', date: '', type: 'ENTRADA', category: 'Serviço' });
    };

    const handleSubmit = async (e) => 
    {
        e.preventDefault();

        try 
        {
            setLoading(true);

            const data = 
            {
                serviceId: form.serviceId || null,
                value: parseMoeda(form.value) || 0,
                date: form.date || null,
                type: form.type,
                category: form.category
            };

            if (editandoId) await updateFlow(editandoId, data);
            else await createFlow(data);

            closeModal();
        } 
        catch (err) 
        {
            console.error(err.message);
        } 
        finally 
        {
            setLoading(false);
        }
    };

    const handleDelete = async (flowId) => 
    {
        if (confirm('Tem certeza que deseja excluir este lançamento?')) 
        {
            await deleteFlow(flowId);
            closeModal();
        }
    };

    const calcularSaldo = () => 
    {
        if (!flows || flows.length === 0) return { entradas: 0, saidas: 0, saldo: 0 };

        const entradas = flows.filter(f => f.type === 'ENTRADA').reduce((acc, f) => acc + f.value, 0);
        const saidas = flows.filter(f => f.type === 'SAIDA').reduce((acc, f) => acc + f.value, 0);

        return { entradas, saidas, saldo: entradas - saidas };
    };

    const { entradas, saidas, saldo } = calcularSaldo();

    if (loading) return <div>Carregando...</div>;

    return (
        <div>
            <div>
                <div className="flex flex-col gap-4 md:flex-row md:gap-0 justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
                    <Button onClick={() => openModal()}>
                        + Novo Lançamento
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3 mb-8">
                    <div className="bg-brand-dark p-5 rounded-lg">
                        <div className="flex items-center gap-2 text-green-500 mb-2">
                            <TrendingUp size={20} />
                            <span className="text-sm text-brand-gray">Entradas</span>
                        </div>
                        <p className="text-2xl font-bold text-green-500">{formatarMoeda(entradas)}</p>
                    </div>
                    <div className="bg-brand-dark p-5 rounded-lg">
                        <div className="flex items-center gap-2 text-red-500 mb-2">
                            <TrendingDown size={20} />
                            <span className="text-sm text-brand-gray">Saídas</span>
                        </div>
                        <p className="text-2xl font-bold text-red-500">{formatarMoeda(saidas)}</p>
                    </div>
                    <div className="bg-brand-dark p-5 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-brand-gray">Saldo</span>
                        </div>
                        <p className={`text-2xl font-bold text-blue-600 ${saldo > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatarMoeda(saldo)}
                        </p>
                    </div>
                </div>

                {flows && flows.length > 0
                ?
                (
                    <div className="bg-brand-dark rounded-lg overflow-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left text-sm text-brand-gray font-medium p-4">Data</th>
                                    <th className="text-left text-sm text-brand-gray font-medium p-4">Categoria</th>
                                    <th className="text-left text-sm text-brand-gray font-medium p-4">Tipo</th>
                                    <th className="text-left text-sm text-brand-gray font-medium p-4">Valor</th>
                                    <th className="text-left text-sm text-brand-gray font-medium p-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {flows.map(flow => (
                                    <tr key={flow.id} className="text-white border-b border-white/5 hover:bg-white/5 cursor-pointer">
                                        <td className="p-4 text-sm">{flow.date ? formatarData(flow.date) : '-'}</td>
                                        <td className="p-4 text-sm flex flex-col gap-2">
                                            {isSystemFlow(flow) ? `Agendamento` : `${flow.category}`}
                                            {flow.serviceId && (() => 
                                            {
                                                const service = services.find(s => s.id === flow.serviceId);

                                                return service ? (
                                                    <span className="w-fit text-xs px-2 py-1 rounded bg-brand-gray/20 text-brand-gray">
                                                        {service.name}
                                                    </span>
                                                ) : null;
                                            })()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-1 rounded ${flow.type === 'ENTRADA' ? 'bg-green-500/20 text-green-500' :
                                                    flow.type === 'SAIDA' ? 'bg-red-500/20 text-red-500' : 'bg-brand-gray/20 text-brand-gray'}`}>
                                                {flow.type}
                                            </span>
                                        </td>
                                        <td className={`text-sm p-4 ${flow.type === 'ENTRADA' ? 'text-green-500' : flow.type === 'SAIDA' ? 'text-red-500' : ''}`}>
                                            {formatarMoeda(flow.value)}
                                        </td>
                                        <td className="p-4">
                                            {isSystemFlow(flow)
                                            ?
                                            (
                                                <span className="text-sm text-brand-gray/50 italic">Automático</span>
                                            )
                                            :
                                            (          
                                                <div className="flex gap-4 items-center">     
                                                    <button onClick={() => openModal(flow)} className="text-brand-blue hover:text-brand-purple">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button type="button" onClick={() => handleDelete(flow.id)} className="text-red-500 hover:text-red-400">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
                :
                (
                    <div className="bg-brand-dark rounded-lg p-8 text-center">
                        <p className="text-brand-gray">Nenhum lançamento encontrado. Cadastre um novo.</p>
                    </div>
                )}

                {modalAberto && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                        <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                            <h2 className="text-white text-xl font-bold mb-6">
                                {editandoId ? 'Editar Lançamento' : 'Novo Lançamento'}
                            </h2>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-4">
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Tipo</label>
                                        <Select value={form.type} onChange={e => handleChange('type', e.target.value)} variant="dark" fullWidth>
                                            {Object.entries(FLOW_TYPES).map(([key, value]) => (
                                                <option key={key} value={key}>
                                                    {value}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Categoria</label>
                                        <Select value={form.category} onChange={e => handleChange('category', e.target.value)} variant="dark" fullWidth>
                                            {FLOW_CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Valor</label>
                                        <Input type="text" inputMode="numeric" value={form.value} onChange={e => handleChange('value', e.target.value)}
                                            placeholder="R$ 0,00" fullWidth required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Data</label>
                                        <Input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} fullWidth />
                                    </div>
                                </div>

                                {services && services.length > 0 && (
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Serviço (opcional)</label>
                                        <Select value={form.serviceId} onChange={e => handleChange('serviceId', e.target.value)} variant="dark" fullWidth>
                                            <option value="">Nenhum</option>
                                            {services.map(service => (
                                                <option key={service.id} value={service.id}>{service.name}</option>
                                            ))}
                                        </Select>
                                    </div>
                                )}

                                {editandoId && (
                                    <div className="w-full flex justify-end">
                                        <button type="button" onClick={() => handleDelete(editandoId)} className="flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-400">
                                            <Trash2 size={16} /> Excluir
                                        </button>
                                    </div>
                                )}

                                <div className="pt-2" />        

                                <div className="flex gap-3">
                                    <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={loading} fullWidth>
                                        {loading ? 'Salvando...' : (editandoId ? 'Salvar' : 'Cadastrar')}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}