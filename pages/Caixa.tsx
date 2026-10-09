import { useState, useEffect } from 'react';
import { useFlows, useServices } from '@/contexts';

import { Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ResponsiveModal from '@/components/ui/ResponsiveModal';

import { FLOW_TYPES, FLOW_CATEGORIES } from '@/types';
import { formatarMoeda, parseMoeda, formatarData, hojeLocal } from '@/utils';

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
            setForm({ serviceId: '', value: '', date: hojeLocal(), type: 'ENTRADA', category: 'Serviço' });
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

    const serviceName = (flow) => flow.serviceId ? services.find(s => s.id === flow.serviceId)?.name : null;
    const tipoClasse = (type) => type === 'ENTRADA' ? 'bg-green-500/20 text-green-500' : type === 'SAIDA' ? 'bg-red-500/20 text-red-500' : 'bg-brand-gray/20 text-brand-gray';
    const valorClasse = (type) => type === 'ENTRADA' ? 'text-green-500' : type === 'SAIDA' ? 'text-red-500' : 'text-white';

    if (loading && !flows?.length) return <div className="text-brand-gray">Carregando...</div>;

    return (
        <div>
            <div className="flex flex-col gap-4 sm:flex-row justify-between sm:items-center mb-8">
                <h1 className="text-3xl font-bold">Fluxo de Caixa</h1>
                <Button onClick={() => openModal()} className="w-full sm:w-auto">
                    + Novo Lançamento
                </Button>
            </div>

            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 md:gap-4 mb-8">
                <div className="bg-brand-dark p-4 md:p-5 rounded-lg min-w-0">
                    <div className="flex items-center gap-2 text-green-500 mb-2">
                        <TrendingUp size={20} aria-hidden="true" />
                        <span className="text-sm text-brand-gray">Entradas</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-green-500 break-words">{formatarMoeda(entradas)}</p>
                </div>
                <div className="bg-brand-dark p-4 md:p-5 rounded-lg min-w-0">
                    <div className="flex items-center gap-2 text-red-500 mb-2">
                        <TrendingDown size={20} aria-hidden="true" />
                        <span className="text-sm text-brand-gray">Saídas</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-red-500 break-words">{formatarMoeda(saidas)}</p>
                </div>
                <div className="col-span-2 md:col-span-1 bg-brand-dark p-4 md:p-5 rounded-lg min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-brand-gray">Saldo</span>
                    </div>
                    <p className={`text-xl md:text-2xl font-bold break-words ${saldo > 0 ? 'text-green-500' : saldo < 0 ? 'text-red-500' : 'text-white'}`}>
                        {formatarMoeda(saldo)}
                    </p>
                </div>
            </div>

            {flows && flows.length > 0
            ?
            (
                <>
                <ul className="md:hidden space-y-3">
                    {flows.map(flow => (
                        <li key={flow.id} className="bg-brand-dark rounded-lg border border-white/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-white break-words">{isSystemFlow(flow) ? 'Agendamento' : flow.category}</p>
                                    <p className="text-sm text-brand-gray">{flow.date ? formatarData(flow.date) : 'Sem data'}</p>
                                    {serviceName(flow) && <span className="mt-1 inline-block text-xs px-2 py-1 rounded bg-brand-gray/20 text-brand-gray">{serviceName(flow)}</span>}
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className={`font-bold ${valorClasse(flow.type)}`}>{formatarMoeda(flow.value)}</p>
                                    <span className={`mt-1 inline-block text-xs px-2 py-1 rounded ${tipoClasse(flow.type)}`}>{FLOW_TYPES[flow.type] || flow.type}</span>
                                </div>
                            </div>
                            {isSystemFlow(flow)
                            ? <p className="mt-3 border-t border-white/5 pt-3 text-xs text-brand-gray/60 italic">Lançamento automático</p>
                            : (
                                <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
                                    <button type="button" onClick={() => openModal(flow)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-white/5 text-sm text-brand-blue">
                                        <Edit size={16} aria-hidden="true" /> Editar
                                    </button>
                                    <button type="button" onClick={() => handleDelete(flow.id)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-white/5 text-sm text-red-500">
                                        <Trash2 size={16} aria-hidden="true" /> Excluir
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>

                <div className="hidden md:block bg-brand-dark rounded-lg overflow-auto">
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
                                <tr key={flow.id} className="text-white border-b border-white/5 hover:bg-white/5">
                                    <td className="p-4 text-sm">{flow.date ? formatarData(flow.date) : '-'}</td>
                                    <td className="p-4 text-sm">
                                        <div className="flex flex-col gap-2">
                                            {isSystemFlow(flow) ? 'Agendamento' : flow.category}
                                            {serviceName(flow) && <span className="w-fit text-xs px-2 py-1 rounded bg-brand-gray/20 text-brand-gray">{serviceName(flow)}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded ${tipoClasse(flow.type)}`}>{FLOW_TYPES[flow.type] || flow.type}</span>
                                    </td>
                                    <td className={`text-sm p-4 ${valorClasse(flow.type)}`}>{formatarMoeda(flow.value)}</td>
                                    <td className="p-4">
                                        {isSystemFlow(flow)
                                        ? <span className="text-sm text-brand-gray/50 italic">Automático</span>
                                        : (
                                            <div className="flex gap-1 items-center">
                                                <button type="button" onClick={() => openModal(flow)} aria-label="Editar lançamento" className="inline-flex size-10 items-center justify-center rounded-lg text-brand-blue hover:bg-white/5 hover:text-brand-purple">
                                                    <Edit size={16} />
                                                </button>
                                                <button type="button" onClick={() => handleDelete(flow.id)} aria-label="Excluir lançamento" className="inline-flex size-10 items-center justify-center rounded-lg text-red-500 hover:bg-white/5 hover:text-red-400">
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
                </>
            )
            :
            (
                <div className="bg-brand-dark rounded-lg p-8 text-center">
                    <p className="text-brand-gray mb-4">Nenhum lançamento encontrado.</p>
                    <Button onClick={() => openModal()}>+ Novo Lançamento</Button>
                </div>
            )}

            {modalAberto && (
                <ResponsiveModal title={editandoId ? 'Editar Lançamento' : 'Novo Lançamento'} onClose={closeModal} onSubmit={handleSubmit}
                    footer={
                        <>
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>Cancelar</Button>
                            <Button type="submit" disabled={loading} fullWidth>{loading ? 'Salvando...' : (editandoId ? 'Salvar' : 'Cadastrar')}</Button>
                        </>
                    }>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label htmlFor="caixa-tipo" className="block text-sm text-brand-gray mb-1">Tipo</label>
                            <Select id="caixa-tipo" value={form.type} onChange={e => handleChange('type', e.target.value)} variant="dark" fullWidth>
                                {Object.entries(FLOW_TYPES).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="caixa-categoria" className="block text-sm text-brand-gray mb-1">Categoria</label>
                            <Select id="caixa-categoria" value={form.category} onChange={e => handleChange('category', e.target.value)} variant="dark" fullWidth>
                                {FLOW_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label htmlFor="caixa-valor" className="block text-sm text-brand-gray mb-1">Valor</label>
                            <Input id="caixa-valor" type="text" inputMode="numeric" autoComplete="off" value={form.value} onChange={e => handleChange('value', e.target.value)}
                                placeholder="R$ 0,00" fullWidth required />
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="caixa-data" className="block text-sm text-brand-gray mb-1">Data</label>
                            <Input id="caixa-data" type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} fullWidth className="min-h-12 appearance-none" />
                        </div>
                    </div>

                    {services && services.length > 0 && (
                        <div>
                            <label htmlFor="caixa-servico" className="block text-sm text-brand-gray mb-1">Serviço (opcional)</label>
                            <Select id="caixa-servico" value={form.serviceId} onChange={e => handleChange('serviceId', e.target.value)} variant="dark" fullWidth>
                                <option value="">Nenhum</option>
                                {services.map(service => (
                                    <option key={service.id} value={service.id}>{service.name}</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {editandoId && (
                        <div className="flex justify-end">
                            <button type="button" onClick={() => handleDelete(editandoId)} className="inline-flex min-h-11 items-center justify-center gap-1 px-2 text-sm text-red-500 hover:text-red-400">
                                <Trash2 size={16} aria-hidden="true" /> Excluir lançamento
                            </button>
                        </div>
                    )}
                </ResponsiveModal>
            )}
        </div>
    );
}