import { useState } from 'react';
import { useAgendas } from '@/contexts';

import { Edit, Trash2, Calendar, Clock, Lock, Unlock } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ResponsiveModal from '@/components/ui/ResponsiveModal';

import { DIAS_SEMANA, INTERVALO_OPCOES } from '@/types';
import { formatarData, formatarHora, formatarIntervalo, hojeLocal } from '@/utils';

// 16px text (no iOS zoom on focus), 48px tall, min-w-0 so native time/date inputs can shrink inside the 2-column grid on 360px screens
const CAMPO = 'min-w-0 min-h-12 text-base';

const DIA_LETRA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const ATALHOS_DIAS = [ { label: 'Seg a Sex', days: [1, 2, 3, 4, 5] }, { label: 'Seg a Sáb', days: [1, 2, 3, 4, 5, 6] }, { label: 'Todos', days: [0, 1, 2, 3, 4, 5, 6] } ];

export default function Horarios() 
{
    const { agendas, loading, setLoading } = useAgendas();
    const { blocks, createBlock, deleteBlock, createAgenda, updateAgenda, deleteAgenda, getAgendas } = useAgendas();

    const [tab, setTab] = useState('horarios');
    const [modalAberto, setModalAberto] = useState(false);
    const [modalTipo, setModalTipo] = useState('agenda');
    const [editandoId, setEditandoId] = useState(null);
    const [salvando, setSalvando] = useState(false);

    const [formAgenda, setFormAgenda] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '18:00', lunchStart: '12:00', lunchEnd: '13:00', hasLunch: false, slotDuration: 30 });

    // Create mode picks several days at once; edit mode keeps formAgenda.dayOfWeek (one day).
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [formError, setFormError] = useState<string | null>(null);
    // MySQL returns isActive as 0/1: only active agendas block a day
    const existingDays = new Set((agendas || []).filter(a => Boolean(a.isActive)).map(a => a.dayOfWeek));

    const toggleDay = (day: number) => { setFormError(null); setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()); };
    const applyShortcut = (days: number[]) => { setFormError(null); setSelectedDays(days.filter(d => !existingDays.has(d))); };

    const [formBloqueio, setFormBloqueio]= useState({ blockDate: '', blockDateEnd: '', startTime: '', endTime: '', reason: '', diaInteiro: true });

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
        setSelectedDays([]);
        setFormError(null);
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

        if (!editandoId && selectedDays.length === 0)
        {
            setFormError('Selecione pelo menos um dia da semana.');
            return;
        }

        if (salvando) return;

        try
        {
            setSalvando(true);
            setFormError(null);

            const base = { startTime: formAgenda.startTime, endTime: formAgenda.endTime, slotDuration: formAgenda.slotDuration,
                lunchStart: formAgenda.hasLunch ? formAgenda.lunchStart : null, lunchEnd: formAgenda.hasLunch ? formAgenda.lunchEnd : null };

            if (editandoId) await updateAgenda(editandoId, { ...base, dayOfWeek: formAgenda.dayOfWeek });
            else await createAgenda({ ...base, daysOfWeek: selectedDays }, { silent: true });

            closeModal();
        }
        catch (err)
        {
            console.error(err.message);

            // 409: some selected days already have an agenda; nothing was created.
            const conflictDays: number[] = err?.data?.conflictDays || [];
            if (err?.status === 409 && conflictDays.length)
            {
                const nomes = conflictDays.map(getDayName).join(', ');
                // Those chips become disabled after the refresh, so drop them from the selection here.
                const restantes = selectedDays.filter(d => !conflictDays.includes(d));
                setSelectedDays(restantes);
                setFormError(`Já existe horário configurado em: ${nomes}. ${conflictDays.length > 1 ? 'Esses dias foram removidos' : 'Esse dia foi removido'} da seleção${restantes.length ? '; toque em Salvar para criar os demais.' : '.'}`);
                getAgendas?.().catch(() => {});
            }
            else setFormError(err?.status ? (err.message || 'Não foi possível salvar.') : 'Falha de conexão. Verifique sua internet e tente novamente.');
        } 
        finally 
        {
            setSalvando(false);
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

            <div className="flex gap-4 mb-6 border-b border-white/10">
                <button onClick={() => setTab('horarios')}
                    className={`inline-flex min-h-11 items-center cursor-pointer pb-1 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'horarios' ? 'border-brand-purple text-brand-purple' 
                        : 'border-transparent text-brand-gray hover:text-white' }`}>
                    <Clock size={16} className="inline mr-2" />
                    Horários de Trabalho
                </button>
                <button onClick={() => setTab('bloqueios')}
                    className={`inline-flex min-h-11 items-center cursor-pointer pb-1 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'bloqueios' ? 'border-brand-purple text-brand-purple' 
                        : 'border-transparent text-brand-gray hover:text-white' }`}>
                    <Lock size={16} className="inline mr-2" />
                    Bloqueios ({blocks.length})
                </button>
            </div>

            {tab === 'horarios' && (
                <>
                    {agendas && agendas.length > 0 
                    ? 
                    (
                        <>
                        <ul className="md:hidden space-y-3">
                            {agendas.map(agenda => (
                                <li key={agenda.id} className="bg-brand-dark rounded-lg border border-white/5 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-white">{getDayName(agenda.dayOfWeek)}</p>
                                            <p className="text-sm text-brand-gray mt-0.5">{formatarHora(agenda.startTime)} – {formatarHora(agenda.endTime)}</p>
                                        </div>
                                        <span className={`shrink-0 text-xs px-2 py-1 rounded ${agenda.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                            {agenda.isActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                        <div><dt className="text-brand-gray text-xs">Almoço</dt><dd className="text-white">{agenda.lunchStart ? `${formatarHora(agenda.lunchStart)} – ${formatarHora(agenda.lunchEnd)}` : 'Sem almoço'}</dd></div>
                                        <div><dt className="text-brand-gray text-xs">Intervalo</dt><dd className="text-white">{formatarIntervalo(agenda.slotDuration)}</dd></div>
                                    </dl>
                                    <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
                                        <button type="button" onClick={() => openModalAgenda(agenda)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-white/5 text-sm text-brand-blue hover:bg-white/10">
                                            <Edit size={16} aria-hidden="true" /> Editar
                                        </button>
                                        <button type="button" onClick={() => handleDeleteAgenda(agenda.id)} className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-white/5 text-sm text-red-500 hover:bg-white/10">
                                            <Trash2 size={16} aria-hidden="true" /> Remover
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="hidden md:block bg-brand-dark rounded-lg overflow-auto">
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
                                                {agenda.lunchStart ? `${formatarHora(agenda.lunchStart)} - ${formatarHora(agenda.lunchEnd)}` : 'Sem almoço'}
                                            </td>
                                            <td className="p-4 text-sm">{formatarIntervalo(agenda.slotDuration)}</td>
                                            <td className="p-4">
                                                <span className={`text-xs px-2 py-1 rounded 
                                                        ${agenda.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                    {agenda.isActive ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-4 items-center">                             
                                                    <button onClick={() => openModalAgenda(agenda)} aria-label={`Editar ${getDayName(agenda.dayOfWeek)}`} className="text-brand-blue hover:text-brand-purple">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteAgenda(agenda.id)} aria-label={`Remover ${getDayName(agenda.dayOfWeek)}`} className="text-red-500 hover:text-red-400">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
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
                            <Calendar size={48}className="mx-auto text-brand-gray mb-4" />
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

            {modalAberto && modalTipo === 'agenda' && (
                <ResponsiveModal title={editandoId ? 'Editar Horário' : 'Configurar Dia de Trabalho'} onClose={closeModal} onSubmit={handleSubmitAgenda}
                    footer={
                        <>
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>Cancelar</Button>
                            <Button type="submit" disabled={salvando} fullWidth>{salvando ? 'Salvando...' : 'Salvar'}</Button>
                        </>
                    }>
                    {editandoId
                    ?
                    (
                        <div>
                            <p className="block text-sm text-brand-gray mb-1">Dia da Semana</p>
                            <p className="text-white font-medium">{getDayName(formAgenda.dayOfWeek)}</p>
                        </div>
                    )
                    :
                    (
                        <fieldset>
                            <legend className="block text-sm text-brand-gray mb-2">Dias da Semana</legend>
                            {/* 7 equal columns; each chip is a square of at least 44px (fits 360px screens: 7 x 44 + 6 x 2 < 328) */}
                            <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
                                {DIAS_SEMANA.map(dia =>
                                {
                                    const exists = existingDays.has(dia.value);
                                    const selected = selectedDays.includes(dia.value);
                                    return (
                                        <button key={dia.value} type="button" disabled={exists} onClick={() => toggleDay(dia.value)}
                                            aria-pressed={selected} aria-label={`${dia.label}${exists ? ' (já configurado)' : ''}`} title={exists ? `${dia.label}: já configurado` : dia.label}
                                            className={`flex aspect-square min-h-11 w-full min-w-0 items-center justify-center rounded-lg border text-base font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple
                                                ${exists ? 'cursor-not-allowed border-white/5 bg-white/5 text-brand-gray/50 line-through'
                                                : selected ? 'border-brand-purple bg-brand-purple text-white' : 'border-white/15 bg-brand-black text-white hover:border-brand-purple/60'}`}>
                                            <span aria-hidden="true">{DIA_LETRA[dia.value]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {ATALHOS_DIAS.map(atalho => (
                                    <button key={atalho.label} type="button" onClick={() => applyShortcut(atalho.days)}
                                        className="min-h-11 rounded-lg border border-white/15 px-2 text-sm text-white hover:border-brand-purple/60 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                                        {atalho.label}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-brand-gray" aria-live="polite">
                                {selectedDays.length ? `Selecionados: ${selectedDays.map(d => DIAS_SEMANA[d].short).join(', ')}` : 'Nenhum dia selecionado'}
                                {existingDays.size > 0 && ' · riscados já têm horário'}
                            </p>
                        </fieldset>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label htmlFor="agenda-inicio" className="block text-sm text-brand-gray mb-1">Início do Expediente</label>
                            <Input id="agenda-inicio" type="time" value={formAgenda.startTime} fullWidth required className={CAMPO}
                                onChange={e => setFormAgenda(f => ({ ...f, startTime: e.target.value }))} />
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="agenda-fim" className="block text-sm text-brand-gray mb-1">Fim do Expediente</label>
                            <Input id="agenda-fim" type="time" value={formAgenda.endTime} fullWidth required className={CAMPO}
                                onChange={e => setFormAgenda(f => ({ ...f, endTime: e.target.value }))} />
                        </div>
                    </div>

                    <label className="flex min-h-11 items-center gap-3 text-white cursor-pointer">
                        <input type="checkbox" checked={formAgenda.hasLunch} className="size-5 rounded"
                            onChange={e => setFormAgenda(f => ({ ...f, hasLunch: e.target.checked }))} />
                        Definir horário de almoço
                    </label>

                    {formAgenda.hasLunch && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="min-w-0">
                                <label htmlFor="agenda-almoco-inicio" className="block text-sm text-brand-gray mb-1">Início do Almoço</label>
                                <Input id="agenda-almoco-inicio" type="time" value={formAgenda.lunchStart} fullWidth required className={CAMPO}
                                    onChange={e => setFormAgenda(f => ({ ...f, lunchStart: e.target.value }))} />
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="agenda-almoco-fim" className="block text-sm text-brand-gray mb-1">Fim do Almoço</label>
                                <Input id="agenda-almoco-fim" type="time" value={formAgenda.lunchEnd} fullWidth required className={CAMPO}
                                    onChange={e => setFormAgenda(f => ({ ...f, lunchEnd: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="agenda-intervalo" className="block text-sm text-brand-gray mb-1">Intervalo entre Horários</label>
                        <Select id="agenda-intervalo" value={formAgenda.slotDuration} variant="dark" fullWidth className="min-h-12 text-base"
                                onChange={e => setFormAgenda(f => ({ ...f, slotDuration: parseInt(e.target.value) }))} >
                            {INTERVALO_OPCOES.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </Select>
                        {formAgenda.slotDuration === 0 && (
                            <p className="mt-1 text-xs text-brand-gray">O próximo horário começa quando o serviço termina.</p>
                        )}
                    </div>

                    {editandoId && (
                        <div className="flex justify-end">
                            <button type="button" onClick={() => handleDeleteAgenda(editandoId)} className="flex min-h-11 items-center justify-center gap-1 px-2 text-sm text-red-500 hover:text-red-400">
                                <Trash2 size={16} aria-hidden="true" /> Remover este dia
                            </button>
                        </div>
                    )}

                    {formError && (
                        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{formError}</p>
                    )}
                </ResponsiveModal>
            )}

            {modalAberto && modalTipo === 'bloqueio' && (
                <ResponsiveModal title="Novo Bloqueio" onClose={closeModal} onSubmit={handleSubmitBloqueio}
                    footer={
                        <>
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>Cancelar</Button>
                            <Button type="submit" disabled={loading} fullWidth>{loading ? 'Salvando...' : 'Criar Bloqueio'}</Button>
                        </>
                    }>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label htmlFor="bloqueio-inicio" className="block text-sm text-brand-gray mb-1">Data Início</label>
                            <Input id="bloqueio-inicio" type="date" value={formBloqueio.blockDate} min={hojeLocal()} fullWidth required className={CAMPO}
                                onChange={e => { const v = e.target.value; setFormBloqueio(f => ({ ...f, blockDate: v, blockDateEnd: f.blockDateEnd && f.blockDateEnd < v ? v : f.blockDateEnd })); }} />
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="bloqueio-fim" className="block text-sm text-brand-gray mb-1">Data Fim <span className="text-brand-gray/60">(opcional)</span></label>
                            <Input id="bloqueio-fim" type="date" value={formBloqueio.blockDateEnd} min={formBloqueio.blockDate || hojeLocal()} fullWidth className={CAMPO}
                                onChange={e => setFormBloqueio(f => ({ ...f, blockDateEnd: e.target.value }))} />
                        </div>
                    </div>

                    <label className="flex min-h-11 items-center gap-3 text-white cursor-pointer">
                        <input type="checkbox" checked={formBloqueio.diaInteiro} className="size-5 rounded"
                            onChange={e => setFormBloqueio(f => ({ ...f, diaInteiro: e.target.checked }))} />
                        Bloquear dia(s) inteiro(s)
                    </label>

                    {!formBloqueio.diaInteiro && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="min-w-0">
                                <label htmlFor="bloqueio-hora-inicio" className="block text-sm text-brand-gray mb-1">Início</label>
                                <Input id="bloqueio-hora-inicio" type="time" value={formBloqueio.startTime} fullWidth required className={CAMPO}
                                    onChange={e => setFormBloqueio(f => ({ ...f, startTime: e.target.value }))} />
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="bloqueio-hora-fim" className="block text-sm text-brand-gray mb-1">Fim</label>
                                <Input id="bloqueio-hora-fim" type="time" value={formBloqueio.endTime} fullWidth required className={CAMPO}
                                    onChange={e => setFormBloqueio(f => ({ ...f, endTime: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="bloqueio-motivo" className="block text-sm text-brand-gray mb-1">Motivo (opcional)</label>
                        <Input id="bloqueio-motivo" type="text" value={formBloqueio.reason} placeholder="Ex: Férias, Consulta médica..." fullWidth className={CAMPO}
                            onChange={e => setFormBloqueio(f => ({ ...f, reason: e.target.value }))} />
                    </div>
                </ResponsiveModal>
            )}
        </div>
    );
}