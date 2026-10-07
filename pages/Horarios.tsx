import { useState } from 'react';
import { useAgendas } from '@/contexts';

import { Edit, Trash2, Calendar, Clock, Lock, Unlock } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

import { DIAS_SEMANA } from '@/types';
import { formatarData, formatarHora } from '@/utils';

export default function Horarios() 
{
    const { agendas, loading, setLoading } = useAgendas();
    const { blocks, createBlock, deleteBlock, createAgenda, updateAgenda, deleteAgenda } = useAgendas();

    const [tab, setTab] = useState('horarios');
    const [modalAberto, setModalAberto] = useState(false);
    const [modalTipo, setModalTipo] = useState('agenda');
    const [editandoId, setEditandoId] = useState(null);

    const [formAgenda, setFormAgenda] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:00', hasLunch: false, slotDuration: 30 });

    const [formBloqueio, setFormBloqueio] = useState({ blockDate: '', blockDateEnd: '', startTime: '', endTime: '', reason: '', diaInteiro: true });

    const openModalAgenda = (agenda = null) => 
    {
        if (agenda) 
        {
            setEditandoId(agenda.id);
            setFormAgenda({ dayOfWeek: agenda.dayOfWeek, startTime: agenda.startTime.slice(0, 5), endTime: agenda.endTime.slice(0, 5),
                lunchStart: agenda.lunchStart ? formatarHora(agenda.lunchStart) : '', lunchEnd: agenda.lunchEnd ? formatarHora(agenda.lunchEnd) : '',
                    hasLunch: !!(agenda.lunchStart && agenda.lunchEnd), slotDuration: agenda.slotDuration });
        } 
        else 
        {
            setEditandoId(null);
            setFormAgenda({ dayOfWeek: 1, startTime: '09:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:00', hasLunch: false, slotDuration: 30 });
        }
        setModalTipo('agenda');
        setModalAberto(true);
    };

    const openModalBloqueio = () => 
    {
        setFormBloqueio({ blockDate: '', blockDateEnd: '', startTime: '', endTime: '', reason: '', diaInteiro: true });
        setModalTipo('bloqueio');
        setModalAberto(true);
    };

    const closeModal = () => 
    {
        setModalAberto(false);
        setEditandoId(null);
        setFormAgenda({ dayOfWeek: 1, startTime: '09:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:00', hasLunch: false, slotDuration: 30 });
        setFormBloqueio({ blockDate: '', blockDateEnd: '', startTime: '', endTime: '', reason: '', diaInteiro: true });
    };

    const handleSubmitAgenda = async (e) => 
    {
        e.preventDefault();

        try 
        {
            setLoading(true);
            const data = { dayOfWeek: formAgenda.dayOfWeek, startTime: formAgenda.startTime, endTime: formAgenda.endTime,
                lunchStart: formAgenda.hasLunch ? formAgenda.lunchStart : null, lunchEnd: formAgenda.hasLunch ? formAgenda.lunchEnd : null, slotDuration: formAgenda.slotDuration };

            if (editandoId) await updateAgenda(editandoId, data);
            else await createAgenda(data);
            
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

    const handleSubmitBloqueio = async (e) => 
    {
        e.preventDefault();

        try 
        {
            setLoading(true);
            
            const blockData = { blockDate: formBloqueio.blockDate, blockDateEnd: formBloqueio.blockDateEnd || null, reason: formBloqueio.reason || null, 
                startTime: formBloqueio.diaInteiro ? null : formBloqueio.startTime, endTime: formBloqueio.diaInteiro ? null : formBloqueio.endTime };

            const result = await createBlock(blockData);
            if (result) closeModal();
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

    const handleDeleteAgenda = async (agendaId) => 
    {
        if (confirm('Tem certeza que deseja remover este dia da agenda?')) 
        {
            try 
            {
                await deleteAgenda(agendaId);
            } 
            catch (err) 
            {
                console.error(err.message);
            }
        }
    };

    const handleDeleteBloqueio = async (blockId) => 
    {
        if (confirm('Tem certeza que deseja remover este bloqueio?')) 
        {
            try 
            {
                await deleteBlock(blockId);
            } 
            catch (err) 
            {

                console.error(err.message);
            }
        }
    };

    const getDayName = (dayOfWeek) => DIAS_SEMANA.find(d => d.value === dayOfWeek)?.label || '';

    if (loading && !agendas.length) return <div>Carregando...</div>;

    return (
        <div>
            <div className="flex flex-col gap-4 md:flex-row md:gap-0 justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Horários</h1>
                <div className="flex gap-2">
                    <Button onClick={openModalBloqueio} variant="outline" className="flex items-center justify-center gap-2" >
                        <Lock size={16} />
                        Novo Bloqueio
                    </Button>
                    <Button onClick={() => openModalAgenda()} className="flex items-center justify-center gap-2" >
                        <Calendar size={16} />
                        Configurar Dia
                    </Button>
                </div>
            </div>

            <div className="grid gap-2 grid-cols-7 mb-8">
                {DIAS_SEMANA.map(dia => 
                {
                    const agenda = agendas.find(a => a.dayOfWeek === dia.value);
                    return (
                        <div key={dia.value} className={`p-3 rounded-lg text-center ${agenda ? 'bg-brand-purple/20 border border-brand-purple/30' : 'bg-brand-dark border border-white/5' }`} >

                            <p className={`text-sm font-bold ${agenda ? 'text-brand-purple' : 'text-brand-gray'}`}>
                                {dia.short}
                            </p>

                            {agenda && (
                                <p className="text-xs mt-1">
                                    {agenda.startTime.slice(0, 5)}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-4 mb-6 border-b border-white/10">
                <button onClick={() => setTab('horarios')}
                    className={`cursor-pointer pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'horarios' ? 'border-brand-purple text-brand-purple' 
                        : 'border-transparent text-brand-gray hover:text-black' }`}>
                    <Clock size={16} className="inline mr-2" />
                    Horários de Trabalho
                </button>
                <button onClick={() => setTab('bloqueios')}
                    className={`cursor-pointer pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'bloqueios' ? 'border-brand-purple text-brand-purple' 
                        : 'border-transparent text-brand-gray hover:text-black' }`}>
                    <Lock size={16} className="inline mr-2" />
                    Bloqueios ({blocks.length})
                </button>
            </div>

            {tab === 'horarios' && (
                <>
                    {agendas && agendas.length > 0 
                    ? 
                    (
                        <div className="bg-brand-dark rounded-lg overflow-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Dia</th>
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Expediente</th>
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Almoço</th>
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Intervalo</th>
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Status</th>
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agendas.map(agenda => (
                                        <tr key={agenda.id} className="text-white border-b border-white/5 hover:bg-white/5">
                                            <td className="p-4 text-sm font-medium">{getDayName(agenda.dayOfWeek)}</td>
                                            <td className="p-4 text-sm">
                                                {formatarHora(agenda.startTime)} - {formatarHora(agenda.endTime)}
                                            </td>
                                            <td className="p-4 text-sm">
                                                {formatarHora(agenda.lunchStart)} - {formatarHora(agenda.lunchEnd)}
                                            </td>
                                            <td className="p-4 text-sm">{agenda.slotDuration} min</td>
                                            <td className="p-4">
                                                <span className={`text-xs px-2 py-1 rounded 
                                                        ${agenda.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                    {agenda.isActive ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-4 items-center">                             
                                                    <button onClick={() => openModalAgenda(agenda)} className="text-brand-blue hover:text-brand-purple">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteAgenda(agenda.id)} className="text-red-500 hover:text-red-400">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
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
                            <Calendar size={48} className="mx-auto text-brand-gray mb-4" />
                            <p className="text-brand-gray">Nenhum horário configurado.</p>
                            <p className="text-brand-gray text-sm mt-1">Configure os dias e horários que você trabalha.</p>
                        </div>
                    )}
                </>
            )}

            {tab === 'bloqueios' && (
                <>
                    {blocks && blocks.length > 0 
                    ? 
                    (
                        <div className="bg-brand-dark rounded-lg overflow-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Data</th>
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Horário</th>
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Motivo</th>
                                        <th className="text-left text-sm text-brand-gray font-medium p-4">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {blocks.map(block => (
                                        <tr key={block.id} className="text-white border-b border-white/5 hover:bg-white/5">
                                            <td className="p-4 text-sm font-medium">
                                                {formatarData(block.blockDate)}
                                                {block.blockDateEnd && block.blockDateEnd !== block.blockDate && (
                                                    <span> até {formatarData(block.blockDateEnd)}</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {block.startTime 
                                                ? 
                                                (
                                                    <span className="text-sm">
                                                        {block.startTime.slice(0, 5)} - {block.endTime.slice(0, 5)}
                                                    </span>
                                                ) 
                                                : 
                                                (
                                                    <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-500">
                                                        Dia inteiro
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-brand-gray">
                                                {block.reason || '-'}
                                            </td>
                                            <td className="p-4">
                                                <button onClick={() => handleDeleteBloqueio(block.id)} className="text-red-500 hover:text-red-400">
                                                    <Unlock size={16} />
                                                </button>
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
                            <Lock size={48} className="mx-auto text-brand-gray mb-4" />
                            <p className="text-brand-gray">Nenhum bloqueio ativo.</p>
                            <p className="text-brand-gray text-sm mt-1">Bloqueie datas ou horários quando não puder atender.</p>
                        </div>
                    )}
                </>
            )}

            {modalAberto && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>           
                        {modalTipo === 'agenda' && (
                            <>
                                <h2 className="text-white text-xl font-bold mb-6">
                                    {editandoId ? 'Editar Horário' : 'Configurar Dia de Trabalho'}
                                </h2>
                                
                                <form onSubmit={handleSubmitAgenda} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Dia da Semana</label>
                                        <Select value={formAgenda.dayOfWeek} variant="dark" fullWidth disabled={!!editandoId}
                                                onChange={e => setFormAgenda({ ...formAgenda, dayOfWeek: parseInt(e.target.value) })} >
                                            {DIAS_SEMANA.map(dia => (
                                                <option key={dia.value} value={dia.value}>{dia.label}</option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Início do Expediente</label>
                                            <Input type="time" value={formAgenda.startTime} fullWidth required 
                                                onChange={e => setFormAgenda({ ...formAgenda, startTime: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Fim do Expediente</label>
                                            <Input type="time" value={formAgenda.endTime} fullWidth required
                                                onChange={e => setFormAgenda({ ...formAgenda, endTime: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <label className="flex items-center gap-2 text-white cursor-pointer">
                                            <input type="checkbox" checked={formAgenda.hasLunch} className="rounded"
                                                onChange={e => setFormAgenda({ ...formAgenda, hasLunch: e.target.checked })} />
                                            Definir horário de almoço
                                        </label>
                                    </div>

                                    {formAgenda.hasLunch && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">Início do Almoço</label>
                                                <Input type="time" value={formAgenda.lunchStart} fullWidth required={formAgenda.hasLunch}
                                                    onChange={e => setFormAgenda({ ...formAgenda, lunchStart: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">Fim do Almoço</label>
                                                <Input type="time" value={formAgenda.lunchEnd} fullWidth required={formAgenda.hasLunch}
                                                    onChange={e => setFormAgenda({ ...formAgenda, lunchEnd: e.target.value })} />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Intervalo entre Horários (minutos)</label>
                                        <Select value={formAgenda.slotDuration} variant="dark" fullWidth
                                                onChange={e => setFormAgenda({ ...formAgenda, slotDuration: parseInt(e.target.value) })} >                                
                                            <option value={15}>15 minutos</option>
                                            <option value={30}>30 minutos</option>
                                            <option value={45}>45 minutos</option>
                                            <option value={60}>1 hora</option>
                                            <option value={90}>1h 30min</option>
                                            <option value={120}>2 horas</option>
                                        </Select>
                                    </div>

                                    {editandoId && (
                                        <div className="w-full flex justify-end">
                                            <button type="button" onClick={() => handleDeleteAgenda(editandoId)} className="flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-400">
                                                <Trash2 size={16} /> Remover
                                            </button>
                                        </div>
                                    )}        

                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={loading} fullWidth>
                                            {loading ? 'Salvando...' : 'Salvar'}
                                        </Button>
                                    </div>
                                </form>
                            </>
                        )}

                        {modalTipo === 'bloqueio' && (
                            <>
                                <h2 className="text-white text-xl font-bold mb-6">
                                    Novo Bloqueio
                                </h2>
                                
                                <form onSubmit={handleSubmitBloqueio} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Data Início</label>
                                            <Input type="date" value={formBloqueio.blockDate} min={new Date().toISOString().split('T')[0]} fullWidth required 
                                                onChange={e => setFormBloqueio({ ...formBloqueio, blockDate: e.target.value, blockDateEnd: formBloqueio.blockDateEnd && 
                                                    formBloqueio.blockDateEnd < e.target.value ? e.target.value : formBloqueio.blockDateEnd })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Data Fim <span className="text-brand-gray/60">(opcional)</span></label>
                                            <Input type="date" value={formBloqueio.blockDateEnd} min={formBloqueio.blockDate || new Date().toISOString().split('T')[0]} fullWidth
                                                onChange={e => setFormBloqueio({ ...formBloqueio, blockDateEnd: e.target.value })} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-2 text-white cursor-pointer">
                                            <input type="checkbox" checked={formBloqueio.diaInteiro}
                                                onChange={e => setFormBloqueio({ ...formBloqueio, diaInteiro: e.target.checked })} className="rounded" />
                                            Bloquear dia(s) inteiro(s)
                                        </label>
                                    </div>

                                    {!formBloqueio.diaInteiro && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">Início</label>
                                                <Input type="time" value={formBloqueio.startTime} fullWidth required={!formBloqueio.diaInteiro}
                                                    onChange={e => setFormBloqueio({ ...formBloqueio, startTime: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">Fim</label>
                                                <Input type="time" value={formBloqueio.endTime} fullWidth required={!formBloqueio.diaInteiro}
                                                    onChange={e => setFormBloqueio({ ...formBloqueio, endTime: e.target.value })} />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Motivo (opcional)</label>
                                        <Input type="text" value={formBloqueio.reason} placeholder="Ex: Férias, Consulta médica..." fullWidth
                                            onChange={e => setFormBloqueio({ ...formBloqueio, reason: e.target.value })} />
                                    </div>      

                                    <div className="flex gap-3 pt-2">
                                        <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={loading} fullWidth>
                                            {loading ? 'Salvando...' : 'Criar Bloqueio'}
                                        </Button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}