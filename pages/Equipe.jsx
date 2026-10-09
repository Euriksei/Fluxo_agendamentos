import { useState } from 'react';
import { useEmployees, useAgendas, useServices } from '@/contexts';

import { Users, Plus, Edit, Trash2, Calendar, Clock, Scissors, ChevronRight, ChevronLeft, User, Mail, Lock, Coffee, Eye, EyeOff, X, Check } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ResponsiveModal from '@/components/ui/ResponsiveModal';

import { DIAS_SEMANA, INTERVALO_OPCOES } from '@/types';
import { formatarMoeda, formatarHora, formatarIntervalo } from '@/utils';

// Selectable row used in the "services" and "copy agenda" sheets: a real checkbox inside a label (>=44px, keyboard + screen reader friendly).
// Module scope so it is not re-created (and remounted) on every render.
const OptionRow = ({ checked, onChange, children }) => (
    <label className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all border ${checked ? 'bg-brand-purple/20 border-brand-purple/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
        <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 size-5 shrink-0 rounded accent-brand-purple" />
        <div className="min-w-0 flex-1">{children}</div>
    </label>
);

export default function Equipe() 
{
    const { loading, setLoading, setError, employees, selectedEmployee, setSelectedEmployee, getEmployeeById, createEmployee, updateEmployee, deleteEmployee, 
        createEmployeeAgenda, updateEmployeeAgenda, deleteEmployeeAgenda, updateEmployeeServices, removeEmployeeService } = useEmployees();
    const { getAgendas } = useAgendas();
    const { services } = useServices();

    const [view, setView] = useState('lista');

    const [modalTipo, setModalTipo] = useState(null);
    const [editandoId, setEditandoId] = useState(null);
    const [editandoAgendaId, setEditandoAgendaId] = useState(null);

    const [formEmployee, setFormEmployee] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    const [formAgenda, setFormAgenda] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '18:00', slotDuration: 30, hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00' });

    const [agendasDono, setAgendasDono] = useState([]);
    const [diasSelecionadosCopia, setDiasSelecionadosCopia] = useState([]);
    const [loadingAgendasDono, setLoadingAgendasDono] = useState(false);

    const [selectedServices, setSelectedServices] = useState([]);

    const selectEmployee = async (employee) => 
    {
        try 
        {
            setLoading(true);
            await getEmployeeById(employee.id);
            setView('detalhes');
        } 
        catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const voltarParaLista = () => { setView('lista'); setSelectedEmployee(null); };

    const openModalEmployee = (employee = null) => 
    {
        setError(null);
        if (employee) 
        {
            setEditandoId(employee.id);
            setFormEmployee({ name: employee.name, email: employee.email, password: '' });
        } 
        else 
        {
            setEditandoId(null);
            setFormEmployee({ name: '', email: '', password: '' });
        }
        setModalTipo('employee');
    };

    const openModalAgenda = () => 
    {
        setError(null);
        setEditandoAgendaId(null);
        setFormAgenda({ dayOfWeek: 1, startTime: '09:00', endTime: '18:00', slotDuration: 30, hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00' });
        setModalTipo('agenda');
    };

    const openModalEditarAgenda = (agenda) =>
    {
        setError(null);
        setEditandoAgendaId(agenda.id);
        setFormAgenda({
            dayOfWeek: agenda.dayOfWeek,
            startTime: agenda.startTime?.slice(0, 5) || '09:00',
            endTime: agenda.endTime?.slice(0, 5) || '18:00',
            slotDuration: agenda.slotDuration ?? 30,
            hasLunch: !!(agenda.lunchStart && agenda.lunchEnd),
            lunchStart: agenda.lunchStart?.slice(0, 5) || '12:00',
            lunchEnd: agenda.lunchEnd?.slice(0, 5) || '13:00',
        });
        setModalTipo('agenda');
    };

    const openModalCopiarAgenda = async () =>
    {
        setError(null);
        setDiasSelecionadosCopia([]);
        setModalTipo('copiarAgenda');
 
        try
        {
            setLoadingAgendasDono(true);
            const data = await getAgendas();
            const ativas = (data || []).filter(a => Boolean(a.isActive));
            setAgendasDono(ativas);
 
            const diasDoFuncionario = (selectedEmployee?.agendas || []).filter(a => Boolean(a.isActive)).map(a => a.dayOfWeek);
            const diasNovos = ativas.filter(a => !diasDoFuncionario.includes(a.dayOfWeek)).map(a => a.dayOfWeek);
 
            setDiasSelecionadosCopia(diasNovos);
        }
        catch (err) { console.error(err); }
        finally { setLoadingAgendasDono(false); }
    };

    const openModalServices = () => 
    {
        setError(null);
        const currentServiceIds = selectedEmployee?.services?.map(s => s.id) || [];
        setSelectedServices(currentServiceIds);
        setModalTipo('services');
    };

    const closeModal = () => { setModalTipo(null); setEditandoId(null); };

    const handleSubmitEmployee = async (e) => 
    {
        e.preventDefault();
        
        try 
        {
            setLoading(true);

            if (editandoId) 
            {
                result = await updateEmployee(editandoId, formEmployee);
                if (selectedEmployee && selectedEmployee.id === editandoId) setSelectedEmployee(prev => ({ ...prev, ...formEmployee }));
            } 
            else 
            {
                result = await createEmployee(formEmployee);
            }
        } 
        catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const handleSubmitAgenda = async (e) => 
    {
        e.preventDefault();

        if (!selectedEmployee) return;

        try 
        {
            setLoading(true);

            const agendaData = { dayOfWeek: formAgenda.dayOfWeek, startTime: formAgenda.startTime, endTime: formAgenda.endTime, slotDuration: formAgenda.slotDuration,
                lunchStart: formAgenda.hasLunch ? formAgenda.lunchStart : null, lunchEnd: formAgenda.hasLunch ? formAgenda.lunchEnd : null };

            if (editandoAgendaId)
            {
                await updateEmployeeAgenda(selectedEmployee.id, editandoAgendaId, agendaData);
            }
            else
            {
                await createEmployeeAgenda(selectedEmployee.id, agendaData);
            }

            closeModal();
        } 
        catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const handleConfirmarCopia = async () =>
    {
        if (!selectedEmployee || diasSelecionadosCopia.length === 0) return;
 
        const agendaParaCopiar = agendasDono.filter(a => diasSelecionadosCopia.includes(a.dayOfWeek));
 
        try
        {
            setLoading(true);
            for (const agenda of agendaParaCopiar)
            {
                await createEmployeeAgenda(selectedEmployee.id, { dayOfWeek: agenda.dayOfWeek, startTime: agenda.startTime, endTime: agenda.endTime, 
                    slotDuration: agenda.slotDuration, lunchStart: agenda.lunchStart || null, lunchEnd: agenda.lunchEnd || null });
            }
            closeModal();
        }
        catch (err) { console.error(err); }
        finally { setLoadingAgendasDono(false); }
    };

    const handleSubmitServices = async (e) => 
    {
        e.preventDefault();

        if (!selectedEmployee) return;

        try 
        {
            setLoading(true);
            await updateEmployeeServices(selectedEmployee.id, selectedServices);
            closeModal();
        } 
        catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const toggleDiaCopia = (dayOfWeek) => { setDiasSelecionadosCopia(prev => prev.includes(dayOfWeek) ? prev.filter(d => d !== dayOfWeek) : [...prev, dayOfWeek]); };

    const toggleService = (serviceId) => { setSelectedServices(prev => prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId] ); };

    const handleDeleteEmployee = async (employeeId) => 
    {
        const employee = employees.find(e => e.id === employeeId);
        if (confirm(`Tem certeza que deseja remover ${employee?.name}? Todos os dados serão perdidos.`)) 
        {
            try 
            {
                setLoading(true);
                await deleteEmployee(employeeId);
                if (view === 'detalhes') voltarParaLista();
            } 
            catch (err) 
            {
                console.error(err);
            } 
            finally 
            {
                setLoading(false);
            }
        }
    };

    const handleDeleteAgenda = async (agendaId) => 
    {
        if (confirm('Remover este dia da agenda?')) 
        {
            try { await deleteEmployeeAgenda(selectedEmployee.id, agendaId); } 
            catch (err) { console.error(err); }
        }
    };

    const handleRemoveService = async (serviceId) => 
    {
        if (confirm('Remover este serviço?')) 
        {
            try { await removeEmployeeService(selectedEmployee.id, serviceId); } 
            catch (err) { console.error(err); }
        }
    };

    const getDayName = (dayOfWeek) => DIAS_SEMANA.find(d => d.value === dayOfWeek)?.label || '';

    return (
        <div>
            <div className="flex flex-col gap-4 sm:flex-row justify-between sm:items-center mb-8">
                {view === 'lista'
                ?
                (
                    <>
                        <h1 className="text-3xl font-bold">Equipe</h1>
                        <Button onClick={() => openModalEmployee()} className="w-full sm:w-auto" >
                            <Plus size={16} aria-hidden="true" /> Novo Integrante
                        </Button>
                    </>
                )
                :
                (
                    <>
                        <div className="flex items-center gap-2 min-w-0">
                            <button type="button" onClick={voltarParaLista} aria-label="Voltar para a equipe" className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-brand-gray hover:bg-white/10 hover:text-white cursor-pointer">
                                <ChevronLeft size={24} aria-hidden="true" />
                            </button>
                            <h1 className="text-2xl sm:text-3xl font-bold truncate">{selectedEmployee?.name}</h1>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => openModalEmployee(selectedEmployee)} className="flex-1 sm:flex-none" >
                                <Edit size={16} aria-hidden="true" /> Editar
                            </Button>
                            <Button onClick={() => handleDeleteEmployee(selectedEmployee.id)} variant="destructive" aria-label={`Excluir ${selectedEmployee?.name}`} className="px-4!">
                                <Trash2 size={16} aria-hidden="true" />
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {view === 'lista' && (
                <>
                    {employees && employees.length > 0
                    ?
                    (
                        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {employees.map(employee => (
                                <li key={employee.id}>
                                    <button type="button" onClick={() => selectEmployee(employee)} className="w-full text-left bg-brand-dark p-5 rounded-lg border border-white/10 shadow-lg
                                            hover:bg-brand-dark/90 active:bg-white/5 transition-colors cursor-pointer" >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-12 h-12 shrink-0 bg-brand-purple/20 rounded-full flex items-center justify-center">
                                                    <User size={20} className="text-brand-purple" aria-hidden="true" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-white font-semibold truncate">{employee.name}</h3>
                                                    <p className="text-brand-gray text-sm truncate">{employee.email}</p>
                                                </div>
                                            </div>
                                            <ChevronRight size={20} className="shrink-0 text-brand-gray" aria-hidden="true" />
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )
                    :
                    (
                        <div className="bg-brand-dark rounded-lg p-8 text-center">
                            <Users size={48} className="mx-auto text-brand-gray mb-4" aria-hidden="true" />
                            <p className="text-brand-gray">{loading ? 'Carregando equipe...' : 'Nenhum funcionário cadastrado.'}</p>
                            {!loading && <p className="text-brand-gray text-sm mt-1 mb-4">Adicione membros à sua equipe.</p>}
                            {!loading && <Button onClick={() => openModalEmployee()}><Plus size={16} aria-hidden="true" /> Novo Integrante</Button>}
                        </div>
                    )}
                </>
            )}

            {view === 'detalhes' && selectedEmployee && (
                <div className="space-y-6 md:space-y-8">
                    <div className="bg-brand-dark rounded-lg p-4 sm:p-6">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="w-16 h-16 shrink-0 bg-brand-purple/20 rounded-full flex items-center justify-center">
                                <User size={28} className="text-brand-purple" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold text-white truncate">{selectedEmployee.name}</h2>
                                <a href={`mailto:${selectedEmployee.email}`} className="block text-brand-gray break-all">{selectedEmployee.email}</a>
                            </div>
                        </div>
                    </div>

                    <div className="bg-brand-dark rounded-lg p-4 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Calendar size={20} className="text-brand-purple" aria-hidden="true" />
                                Agenda
                            </h3>
                            <div className="grid grid-cols-2 gap-2 sm:flex">
                                <Button onClick={openModalCopiarAgenda} variant="secondary" size="sm" >
                                    Copiar do Dono
                                </Button>
                                <Button onClick={openModalAgenda} variant="outline" size="sm" >
                                    <Plus size={14} aria-hidden="true" /> Adicionar Dia
                                </Button>
                            </div>
                        </div>

                        {selectedEmployee.agendas && selectedEmployee.agendas.length > 0
                        ?
                        (
                            <ul className="grid md:grid-cols-2 gap-3 md:gap-4">
                                {selectedEmployee.agendas.filter(a => Boolean(a.isActive)).map(agenda => (
                                    <li key={agenda.id} className="flex items-center justify-between gap-3 p-4 bg-white/5 rounded-lg">
                                        <div className="min-w-0">
                                            <p className="text-white font-medium">{getDayName(agenda.dayOfWeek)}</p>
                                            <p className="text-brand-gray text-sm">
                                                {formatarHora(agenda.startTime)} - {formatarHora(agenda.endTime)} · {formatarIntervalo(agenda.slotDuration)}
                                            </p>
                                            {agenda.lunchStart && (
                                                <p className="text-brand-gray text-sm flex items-center gap-1">
                                                    <Coffee size={14} aria-hidden="true" />
                                                    {formatarHora(agenda.lunchStart)} - {formatarHora(agenda.lunchEnd)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center">
                                            <button type="button" onClick={() => openModalEditarAgenda(agenda)} aria-label={`Editar ${getDayName(agenda.dayOfWeek)}`} className="inline-flex size-11 items-center justify-center rounded-lg text-blue-500 hover:bg-white/10">
                                                <Edit size={18} aria-hidden="true" />
                                            </button>
                                            <button type="button" onClick={() => handleDeleteAgenda(agenda.id)} aria-label={`Remover ${getDayName(agenda.dayOfWeek)}`} className="inline-flex size-11 items-center justify-center rounded-lg text-red-500 hover:bg-white/10">
                                                <Trash2 size={18} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )
                        :
                        (
                            <p className="text-brand-gray text-sm text-center py-4">Nenhum horário configurado</p>
                        )}
                    </div>

                    <div className="bg-brand-dark rounded-lg p-4 sm:p-6">
                        <div className="flex justify-between items-center gap-3 mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Scissors size={20} className="text-brand-purple" aria-hidden="true" /> Serviços
                            </h3>
                            <Button onClick={openModalServices} variant="outline" size="sm" >
                                <Edit size={14} aria-hidden="true" /> Gerenciar
                            </Button>
                        </div>

                        {selectedEmployee.services && selectedEmployee.services.length > 0
                        ?
                        (
                            <ul className="grid md:grid-cols-2 gap-3 md:gap-4">
                                {selectedEmployee.services.map(service => (
                                    <li key={service.id} className="p-4 bg-white/5 rounded-lg">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <h4 className="text-white font-medium min-w-0 break-words">{service.name}</h4>
                                            <button type="button" onClick={() => handleRemoveService(service.id)} aria-label={`Remover ${service.name}`}
                                                className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-white/10 cursor-pointer">
                                                <X size={18} aria-hidden="true" />
                                            </button>
                                        </div>
                                        <p className="text-brand-gray text-sm mb-2 line-clamp-2">{service.description}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-brand-purple font-bold">{formatarMoeda(service.value)}</span>
                                            <span className="text-brand-gray text-sm">{service.duration} min</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )
                        :
                        (
                            <div className="text-center py-4">
                                <p className="text-brand-gray text-sm">Nenhum serviço associado</p>
                                {services.length === 0 && (
                                    <p className="text-brand-gray text-xs mt-1">
                                        Cadastre serviços na página de Serviços primeiro.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedEmployee.appointments && selectedEmployee.appointments.length > 0 && (
                        <div className="bg-brand-dark rounded-lg p-4 sm:p-6">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <Clock size={20} className="text-brand-purple" aria-hidden="true" />
                                Próximos Agendamentos
                            </h3>
                            <ul className="grid md:grid-cols-2 gap-3 md:gap-4">
                                {selectedEmployee.appointments.slice(0, 5).map(apt => (
                                    <li key={apt.id} className="flex justify-between items-center gap-3 p-3 bg-white/5 rounded-lg">
                                        <div className="min-w-0">
                                            <p className="text-white text-sm truncate">{apt.clientName}</p>
                                            <p className="text-brand-gray text-xs truncate">{apt.serviceName}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-white text-sm">
                                                {new Date(apt.appointmentDate).toLocaleDateString('pt-BR')}
                                            </p>
                                            <p className="text-brand-gray text-xs">
                                                {apt.startTime?.slice(0, 5)}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {modalTipo === 'employee' && (
                <ResponsiveModal title={editandoId ? 'Editar Funcionário' : 'Novo Funcionário'} onClose={closeModal} onSubmit={handleSubmitEmployee}
                    footer={
                        <>
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>Cancelar</Button>
                            <Button type="submit" disabled={loading} fullWidth>{loading ? 'Salvando...' : 'Salvar'}</Button>
                        </>
                    }>
                    <div>
                        <label htmlFor="func-nome" className="block text-sm text-brand-gray mb-1">
                            <User size={14} className="inline mr-1" aria-hidden="true" />
                            Nome
                        </label>
                        <Input id="func-nome" type="text" autoComplete="off" autoCapitalize="words" value={formEmployee.name} placeholder="Nome do funcionário" fullWidth required
                            onChange={e => setFormEmployee({ ...formEmployee, name: e.target.value })} />
                    </div>

                    <div>
                        <label htmlFor="func-email" className="block text-sm text-brand-gray mb-1">
                            <Mail size={14} className="inline mr-1" aria-hidden="true" />
                            Email
                        </label>
                        <Input id="func-email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} value={formEmployee.email} placeholder="email@exemplo.com" fullWidth required
                            onChange={e => setFormEmployee({ ...formEmployee, email: e.target.value })} />
                    </div>

                    <div>
                        <label htmlFor="func-senha" className="block text-sm text-brand-gray mb-1">
                            <Lock size={14} className="inline mr-1" aria-hidden="true" />
                            <span className="text-brand-gray">{editandoId ? 'Nova Senha (opcional)' : 'Senha'}</span>
                        </label>
                        <div className="relative">
                            <Input id="func-senha" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={formEmployee.password} placeholder='••••••••' fullWidth required={!editandoId}
                                className="pr-12" onChange={e => setFormEmployee({ ...formEmployee, password: e.target.value })} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex size-11 items-center justify-center rounded-lg text-brand-gray hover:text-white cursor-pointer" >
                                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                            </button>
                        </div>
                    </div>
                </ResponsiveModal>
            )}

            {modalTipo === 'agenda' && (
                <ResponsiveModal title={editandoAgendaId ? 'Editar Dia de Trabalho' : 'Adicionar Dia de Trabalho'} onClose={closeModal} onSubmit={handleSubmitAgenda}
                    footer={
                        <>
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>Cancelar</Button>
                            <Button type="submit" disabled={loading} fullWidth>{loading ? 'Salvando...' : editandoAgendaId ? 'Salvar' : 'Adicionar'}</Button>
                        </>
                    }>
                    <div>
                        <label htmlFor="func-agenda-dia" className="block text-sm text-brand-gray mb-1">Dia da Semana</label>
                        <Select id="func-agenda-dia" value={formAgenda.dayOfWeek} onChange={e => setFormAgenda({ ...formAgenda, dayOfWeek: parseInt(e.target.value) })}
                                variant="dark" fullWidth disabled={!!editandoAgendaId} >
                            {DIAS_SEMANA.map(dia => (
                                <option key={dia.value} value={dia.value}>{dia.label}</option>
                            ))}
                        </Select>
                        {editandoAgendaId && (
                            <p className="text-brand-gray text-xs mt-1">O dia da semana não pode ser alterado. Remova e adicione um novo se necessário.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label htmlFor="func-agenda-inicio" className="block text-sm text-brand-gray mb-1">Início</label>
                            <Input id="func-agenda-inicio" type="time" value={formAgenda.startTime} onChange={e => setFormAgenda({ ...formAgenda, startTime: e.target.value })} fullWidth required className="min-h-12 appearance-none" />
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="func-agenda-fim" className="block text-sm text-brand-gray mb-1">Fim</label>
                            <Input id="func-agenda-fim" type="time" value={formAgenda.endTime} onChange={e => setFormAgenda({ ...formAgenda, endTime: e.target.value })} fullWidth required className="min-h-12 appearance-none" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="func-agenda-intervalo" className="block text-sm text-brand-gray mb-1">Intervalo entre Horários</label>
                        <Select id="func-agenda-intervalo" value={formAgenda.slotDuration} onChange={e => setFormAgenda({ ...formAgenda, slotDuration: parseInt(e.target.value) })}
                                variant="dark" fullWidth >
                            {INTERVALO_OPCOES.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </Select>
                    </div>

                    <label className="flex min-h-11 items-center gap-3 text-white cursor-pointer">
                        <input type="checkbox" checked={formAgenda.hasLunch} className="size-5 rounded"
                            onChange={e => setFormAgenda({ ...formAgenda, hasLunch: e.target.checked })} />
                        Definir horário de almoço
                    </label>

                    {formAgenda.hasLunch && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="min-w-0">
                                <label htmlFor="func-almoco-inicio" className="block text-sm text-brand-gray mb-1">Início do Almoço</label>
                                <Input id="func-almoco-inicio" type="time" value={formAgenda.lunchStart} fullWidth required={formAgenda.hasLunch} className="min-h-12 appearance-none"
                                    onChange={e => setFormAgenda({ ...formAgenda, lunchStart: e.target.value })} />
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="func-almoco-fim" className="block text-sm text-brand-gray mb-1">Fim do Almoço</label>
                                <Input id="func-almoco-fim" type="time" value={formAgenda.lunchEnd} fullWidth required={formAgenda.hasLunch} className="min-h-12 appearance-none"
                                    onChange={e => setFormAgenda({ ...formAgenda, lunchEnd: e.target.value })} />
                            </div>
                        </div>
                    )}
                </ResponsiveModal>
            )}

            {modalTipo === 'services' && (
                <ResponsiveModal title="Gerenciar Serviços" onClose={closeModal}
                    footer={
                        <>
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>Cancelar</Button>
                            <Button type="button" onClick={handleSubmitServices} disabled={loading || services.length === 0} fullWidth>
                                {loading ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </>
                    }>
                    <p className="text-brand-gray text-sm">
                        Selecione os serviços que {selectedEmployee?.name} poderá realizar
                    </p>

                    {services.length > 0
                    ?
                    (
                        <div className="space-y-2">
                            {services.map(service => (
                                <OptionRow key={service.id} checked={selectedServices.includes(service.id)} onChange={() => toggleService(service.id)}>
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-white font-medium break-words">{service.name}</span>
                                        <span className="shrink-0 text-brand-purple font-bold text-sm">{formatarMoeda(service.value)}</span>
                                    </div>
                                    <p className="text-brand-gray text-sm mt-1 line-clamp-2">{service.description}</p>
                                    <span className="text-brand-gray text-xs">{service.duration} min</span>
                                </OptionRow>
                            ))}
                        </div>
                    )
                    :
                    (
                        <div className="text-center py-8">
                            <Scissors size={48} className="mx-auto text-brand-gray mb-4" aria-hidden="true" />
                            <p className="text-brand-gray">Nenhum serviço cadastrado</p>
                            <p className="text-brand-gray text-sm mt-1">
                                Cadastre serviços na página de Serviços primeiro.
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-brand-gray">
                        <span aria-live="polite">{selectedServices.length} serviço(s) selecionado(s)</span>
                        {selectedServices.length > 0 && (
                            <button type="button" onClick={() => setSelectedServices([])} className="inline-flex min-h-11 items-center px-2 text-red-400 hover:text-red-300 cursor-pointer">
                                Limpar seleção
                            </button>
                        )}
                    </div>
                </ResponsiveModal>
            )}

            {modalTipo === 'copiarAgenda' && (
                <ResponsiveModal title="Copiar Agenda do Responsável" onClose={closeModal}
                    footer={
                        <>
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>Cancelar</Button>
                            <Button type="button" onClick={handleConfirmarCopia} disabled={loading || diasSelecionadosCopia.length === 0} fullWidth>
                                {loading ? 'Copiando...' : `Copiar ${diasSelecionadosCopia.length > 0 ? `(${diasSelecionadosCopia.length})` : ''}`}
                            </Button>
                        </>
                    }>
                    <div className="text-sm">
                        <p className="text-brand-gray">Selecione os dias que deseja copiar para {selectedEmployee?.name}.</p>
                        <p className="font-bold">Dias já existentes serão substituídos.</p>
                    </div>

                    {loadingAgendasDono
                    ?
                    (
                        <div className="text-center py-10 text-brand-gray" role="status">
                            <div className="animate-spin w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full mx-auto mb-3" aria-hidden="true"></div>
                            Carregando agenda...
                        </div>
                    )
                    :
                    agendasDono.length > 0
                    ?
                    (
                        <div className="space-y-2">
                            {agendasDono.map(agenda => {
                                const jaExiste = (selectedEmployee?.agendas || []).filter(a => Boolean(a.isActive)).some(a => a.dayOfWeek === agenda.dayOfWeek);
                                return (
                                    <OptionRow key={agenda.dayOfWeek} checked={diasSelecionadosCopia.includes(agenda.dayOfWeek)} onChange={() => toggleDiaCopia(agenda.dayOfWeek)}>
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="text-white font-medium">{getDayName(agenda.dayOfWeek)}</span>
                                            {jaExiste && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400">Substituirá o existente</span>
                                            )}
                                        </div>
                                        <p className="text-brand-gray text-sm">
                                            {formatarHora(agenda.startTime)} - {formatarHora(agenda.endTime)} · {formatarIntervalo(agenda.slotDuration)}
                                        </p>
                                        {agenda.lunchStart && (
                                            <p className="text-brand-gray text-sm flex items-center gap-1">
                                                <Coffee size={13} aria-hidden="true" />
                                                {formatarHora(agenda.lunchStart)} - {formatarHora(agenda.lunchEnd)}
                                            </p>
                                        )}
                                    </OptionRow>
                                );
                            })}
                        </div>
                    )
                    :
                    (
                        <div className="text-center py-10">
                            <Calendar size={40} className="mx-auto text-brand-gray mb-3" aria-hidden="true" />
                            <p className="text-brand-gray text-sm">O responsável não possui agenda configurada.</p>
                        </div>
                    )}

                    {agendasDono.length > 0 && (
                        <div className="flex items-center justify-between text-sm text-brand-gray">
                            <span aria-live="polite">{diasSelecionadosCopia.length} dia(s) selecionado(s)</span>
                            <div className="flex">
                                {diasSelecionadosCopia.length < agendasDono.length && (
                                    <button type="button" onClick={() => setDiasSelecionadosCopia(agendasDono.map(a => a.dayOfWeek))}
                                            className="inline-flex min-h-11 items-center px-2 text-brand-purple hover:text-brand-purple/80" >
                                        Selecionar todos
                                    </button>
                                )}
                                {diasSelecionadosCopia.length > 0 && (
                                    <button type="button" onClick={() => setDiasSelecionadosCopia([])}
                                            className="inline-flex min-h-11 items-center px-2 text-red-400 hover:text-red-300" >
                                        Limpar
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </ResponsiveModal>
            )}
        </div>
    );
}