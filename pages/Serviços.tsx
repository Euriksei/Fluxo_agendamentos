import { useState } from 'react';
import { useServices } from '@/contexts';

import { Edit, Trash2 } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import ResponsiveModal from '@/components/ui/ResponsiveModal';

import { formatarMoeda, parseMoeda } from '@/utils';

export default function Servicos() 
{
    const { loading, setLoading, services, createService, updateService, offerService, deleteService } = useServices();

    const [modalAberto, setModalAberto] = useState(false);

    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', value: '', duration: '', offerService: false });

    const handleChange = (campo, valor) => 
    {
        if (campo === 'value') 
        {
            const centavos = parseMoeda(valor);
            setForm({ ...form, value: centavos ? formatarMoeda(centavos) : '' });
        } 
        else if (campo === 'duration') 
        {
            setForm({ ...form, duration: valor.replace(/\D/g, '').slice(0, 3) });
        } 
        else 
        {
            setForm({ ...form, [campo]: valor });
        }
    };

    const openModal = (service = null) => 
    {
        if (service) 
        {
            setEditandoId(service.id);
            setForm({ name: service.name, description: service.description, value: formatarMoeda(service.value), duration: String(service.duration), 
                offerService: service.userOffersService ?? false });
        } 
        else 
        {
            setEditandoId(null);
            setForm({ name: '', description: '', value: '', duration: '', offerService: false });
        }

        setModalAberto(true);
    };

    const closeModal = () => 
    {
        setModalAberto(false);
        setEditandoId(null);
        setForm({ name: '', description: '', value: '', duration: '', offerService: false });
    };

    const handleSubmit = async (e) => 
    {
        e.preventDefault();

        try 
        {
            setLoading(true);

            const data = 
            {
                name: form.name.trim() || 'Sem nome',
                description: form.description.trim() || 'Sem descrição',
                value: parseMoeda(form.value) || 0,
                duration: parseInt(form.duration) || 0,
                offerService: form.offerService,
            };      

            if (editandoId) await updateService(editandoId, data);
            else await createService(data);

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

    const handleDelete = async (serviceId) => 
    {
        if (confirm('Tem certeza que deseja excluir este serviço? Seus dados serão perdidos permanentemente.')) 
        {
            await deleteService(serviceId)
            closeModal();
        }
    };

    if (loading && !services?.length) return <div className="text-brand-gray">Carregando...</div>;

    return (
        <div>
            <div className="flex flex-col gap-4 sm:flex-row justify-between sm:items-center mb-8">
                <h1 className="text-3xl font-bold">Serviços</h1>
                <Button onClick={() => openModal()} className="w-full sm:w-auto">
                    + Novo Serviço
                </Button>
            </div>

            {services && services.length > 0
            ?
            (
                <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {services.map(service => (
                        <li key={service.id} className="flex flex-col justify-between gap-3 md:min-h-48 bg-brand-dark p-5 shadow-lg rounded-lg">
                            <div className="flex justify-between items-start gap-3">
                                <h3 className="min-w-0 break-words text-brand-purple font-semibold text-lg">
                                    {service.name}
                                    {!service.userOffersService && <span className="block text-brand-gray text-sm font-normal">(Não ofereço)</span>}
                                </h3>
                                <span className="shrink-0 text-brand-blue font-bold">{formatarMoeda(service.value)}</span>
                            </div>
                            <p className="text-brand-gray text-sm break-words">
                                {service.description}
                            </p>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-brand-gray">
                                    {service.duration} min
                                </span>
                                <button type="button" onClick={() => openModal(service)} aria-label={`Editar ${service.name}`}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-brand-blue hover:bg-white/5 hover:text-brand-purple cursor-pointer" >
                                    <Edit size={16} aria-hidden="true" /> Editar
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )
            :
            (
                <div className="bg-brand-dark rounded-lg p-8 text-center">
                    <p className="text-brand-gray mb-4">Nenhum serviço encontrado. Cadastre o primeiro.</p>
                    <Button onClick={() => openModal()}>+ Novo Serviço</Button>
                </div>
            )}

            {modalAberto && (
                <ResponsiveModal title={editandoId ? 'Editar Serviço' : 'Novo Serviço'} onClose={closeModal} onSubmit={handleSubmit}
                    footer={
                        <>
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>Cancelar</Button>
                            <Button type="submit" disabled={loading} fullWidth>{loading ? 'Salvando...' : (editandoId ? 'Salvar' : 'Cadastrar')}</Button>
                        </>
                    }>
                    <div>
                        <label htmlFor="servico-nome" className="block text-sm text-brand-gray mb-1">Nome</label>
                        <Input id="servico-nome" type="text" autoComplete="off" autoCapitalize="sentences" value={form.name} onChange={e => handleChange('name', e.target.value)}
                            placeholder="Ex: Corte Degradê" fullWidth required />
                    </div>

                    <div>
                        <label htmlFor="servico-descricao" className="block text-sm text-brand-gray mb-1">Descrição</label>
                        <TextArea id="servico-descricao" value={form.description} onChange={e => handleChange('description', e.target.value)}
                            placeholder="Descrição do serviço..." fullWidth rows={4} required />
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer py-1">
                        <input type="checkbox" checked={form.offerService} onChange={e => setForm({ ...form, offerService: e.target.checked })}
                            className="mt-0.5 size-5 shrink-0 rounded border-white/20 bg-brand-darker text-brand-purple focus:ring-brand-purple"/>
                        <span>
                            <span className="block text-white font-medium">Eu ofereço este serviço</span>
                            <span className="block text-brand-gray text-sm">Marque se você pessoalmente realiza este serviço</span>
                        </span>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label htmlFor="servico-valor" className="block text-sm text-brand-gray mb-1">Valor</label>
                            <Input id="servico-valor" type="text" inputMode="numeric" autoComplete="off" value={form.value} onChange={e => handleChange('value', e.target.value)}
                                placeholder="R$ 0,00" fullWidth required />
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="servico-duracao" className="block text-sm text-brand-gray mb-1">Duração (min)</label>
                            <Input id="servico-duracao" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={form.duration} onChange={e => handleChange('duration', e.target.value)}
                                placeholder="30" fullWidth required />
                        </div>
                    </div>

                    {editandoId && (
                        <div className="flex justify-end">
                            <button type="button" onClick={() => handleDelete(editandoId)}
                                    className="inline-flex min-h-11 items-center justify-center gap-1 px-2 text-sm text-red-500 hover:text-red-400 cursor-pointer" >
                                <Trash2 size={16} aria-hidden="true" /> Excluir serviço
                            </button>
                        </div>
                    )}
                </ResponsiveModal>
            )}
        </div>
    );
}