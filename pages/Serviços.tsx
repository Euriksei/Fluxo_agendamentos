import { useState } from 'react';
import { useServices } from '@/contexts';

import { Edit, Trash2 } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';

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

    if (loading) return <div>Carregando...</div>;

    return (
        <div>
            <div>
                <div className="flex flex-col gap-4 md:flex-row md:gap-0 justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Serviços</h1>
                    <Button onClick={() => setModalAberto(true)} >
                        + Novo Serviço
                    </Button>
                </div>

                {services && services.length > 0
                ?
                (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {services.map(service => (
                            <div key={service.id} className="flex flex-col justify-between md:min-h-48 bg-brand-dark p-5 shadow-lg rounded-lg">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-brand-purple font-semibold text-lg">
                                        {service.name} <br />
                                        {!service.userOffersService && <span className="text-brand-gray text-sm">(Não ofereço)</span>}
                                    </h3>
                                    <span className="text-brand-blue font-bold">{formatarMoeda(service.value)}</span>
                                </div>
                                <p className="text-brand-gray text-sm mb-4">
                                    {service.description}
                                </p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-brand-gray">
                                        {service.duration} min
                                    </span>
                                    <button onClick={() => openModal(service)} className="text-brand-blue hover:text-brand-purple cursor-pointer" >
                                        <Edit size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
                :
                (
                    <div className="bg-brand-dark rounded-lg p-8 text-center">
                        <p className="text-brand-gray">Nenhum serviço encontrado. Cadastre um novo.</p>
                    </div>
                )}

                {modalAberto && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                        <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                            <h2 className="text-white text-xl font-bold mb-6">
                                {editandoId ? 'Editar Serviço' : 'Novo Serviço'}
                            </h2>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Nome</label>
                                    <Input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)} 
                                        placeholder="Ex: Corte Degradê" fullWidth required />
                                </div>

                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Descrição</label>
                                    <TextArea value={form.description} onChange={e => handleChange('description', e.target.value)} 
                                        placeholder="Descrição do serviço..." fullWidth rows={4} required />
                                </div>

                                <div>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={form.offerService} onChange={e => setForm({ ...form, offerService: e.target.checked })}
                                            className="w-5 h-5 rounded border-white/20 bg-brand-darker text-brand-purple focus:ring-brand-purple"/>
                                        <div>
                                            <span className="text-white font-medium">Eu ofereço este serviço</span>
                                            <p className="text-brand-gray text-sm">Marque se você pessoalmente realiza este serviço</p>
                                        </div>
                                    </label>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Valor</label>
                                        <Input type="text"inputMode="numeric" value={form.value} onChange={e => handleChange('value', e.target.value)}
                                            placeholder="R$ 0,00" fullWidth required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Duração (minutos)</label>
                                        <Input type="text" inputMode="numeric" value={form.duration} onChange={e => handleChange('duration', e.target.value)}
                                            placeholder="30" fullWidth required />
                                    </div>
                                </div>

                                {editandoId && (
                                    <div className="w-full flex justify-end">
                                        <button onClick={() => handleDelete(editandoId)} 
                                                className="flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-400 cursor-pointer" >
                                            <Trash2 size={16} /> Excluir
                                        </button>
                                    </div>
                                )}

                                <div className="pt-2" />        

                                <div className="flex gap-3">
                                    <Button type="button" onClick={closeModal} variant="outline" fullWidth >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={loading} fullWidth >
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