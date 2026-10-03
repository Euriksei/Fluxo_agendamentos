import { useState } from 'react';
import { useEmployees, useAgendas, useServices } from '@/contexts';

import { Users, Plus, Edit, Trash2, Calendar, Clock, Scissors, ChevronRight, ChevronLeft, User, Mail, Lock, Coffee, Eye, EyeOff, X, Check } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

import { DIAS_SEMANA } from '@/types';
import { formatarMoeda, formatarHora } from '@/utils';

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
            slotDuration: agenda.slotDuration || 30,
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
            const ativas = (data || []).filter(a => a.isActive !== false);
            setAgendasDono(ativas);
 
            const diasDoFuncionario = (selectedEmployee?.agendas || []).filter(a => a.isActive !== false).map(a => a.dayOfWeek);
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
            <div className="flex flex-col gap-4 md:flex-row md:gap-0 justify-between items-center mb-8">
                {view === 'lista' 
                ? 
                (
                    <>
                        <h1 className="text-3xl font-bold">Equipe</h1>
                        <Button onClick={() => openModalEmployee()} className="flex items-center justify-center gap-2" >
                            <Plus size={16} /> Novo Integrante
                        </Button>
                    </>
                ) 
                : 
                (
                    <>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <button onClick={voltarParaLista} className="text-brand-gray hover:text-black cursor-pointer">
                                <ChevronLeft size={24} />
                            </button>
                            <h1 className="text-3xl font-bold">{selectedEmployee?.name}</h1>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => openModalEmployee(selectedEmployee)} className="flex items-center justify-center gap-2" >
                                <Edit size={16} /> Editar
                            </Button>
                            <Button onClick={() => handleDeleteEmployee(selectedEmployee.id)} variant="destructive" >
                                <Trash2 size={16} />
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
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {employees.map(employee => (
                                <div key={employee.id} onClick={() => selectEmployee(employee)} className="bg-brand-dark p-5 rounded-lg border border-white/10 shadow-lg
                                        hover:bg-brand-dark/90 transition-colors cursor-pointer" >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-brand-purple/20 rounded-full flex items-center justify-center">
                                                <User size={20} className="text-brand-purple" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-semibold">{employee.name}</h3>
                                                <p className="text-brand-gray text-sm">{employee.email}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className="text-brand-gray" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) 
                    : 
                    (
                        <div className="bg-brand-dark rounded-lg p-8 text-center">
                            <Users size={48} className="mx-auto text-brand-gray mb-4" />
                            <p className="text-brand-gray">Nenhum funcionário cadastrado.</p>
                            <p className="text-brand-gray text-sm mt-1">Adicione membros à sua equipe.</p>
                        </div>
                    )}
                </>
            )}

            {view === 'detalhes' && selectedEmployee && (
                <div className="space-y-8">
                    <div className="bg-brand-dark rounded-lg p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-brand-purple/20 rounded-full flex items-center justify-center">
                                <User size={28} className="text-brand-purple" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedEmployee.name}</h2>
                                <p className="text-brand-gray">{selectedEmployee.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-brand-dark rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Calendar size={20} className="text-brand-purple" />
                                Agenda
                            </h3>
                            <div className="flex items-center gap-2">
                                <Button onClick={openModalCopiarAgenda} variant="secondary" className="flex items-center justify-center gap-2 text-xs md:text-sm" >
                                    Copiar do Dono
                                </Button>
                                <Button onClick={openModalAgenda} variant="outline" className="flex items-center justify-center gap-2 text-xs md:text-sm" >
                                    <Plus size={14} />
                                    Adicionar Dia
                                </Button>
                            </div>
                        </div>

                        {selectedEmployee.agendas && selectedEmployee.agendas.length > 0 
                        ? 
                        (
                            <div className="grid md:grid-cols-2 gap-4">
                                {selectedEmployee.agendas.filter(a => a.isActive !== false).map(agenda => (
                                    <div key={agenda.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg">
                                        <div className="w-full flex items-center justify-between gap-4">
                                            <span className="text-white font-medium w-32">
                                                {getDayName(agenda.dayOfWeek)}
                                            </span>
                                            <div className="flex items-center justify-center gap-8">
                                                <span className="text-brand-gray text-sm">
                                                    {formatarHora(agenda.startTime)} - {formatarHora(agenda.endTime)}
                                                </span>
                                                {agenda.lunchStart && (
                                                    <span className="text-brand-gray text-sm flex items-center gap-1">
                                                        <Coffee size={14} />
                                                        {formatarHora(agenda.lunchStart)} - {formatarHora(agenda.lunchEnd)}
                                                    </span>
                                                )}
                                                <span className="text-brand-gray text-sm">
                                                    ({agenda.slotDuration} min)
                                                </span>
                                            </div>
                                            <div className="flex flex-col md:flex-row items-center gap-2">
                                                <button onClick={() => openModalEditarAgenda(agenda)} className="text-blue-500 hover:text-blue-400">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteAgenda(agenda.id)} className="text-red-500 hover:text-red-400">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>                                    
                                    </div>
                                ))}
                            </div>
                        ) 
                        : 
                        (
                            <p className="text-brand-gray text-sm text-center py-4">Nenhum horário configurado</p>
                        )}
                    </div>

                    <div className="bg-brand-dark rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Scissors size={20} className="text-brand-purple" /> Serviços
                            </h3>
                            <Button onClick={openModalServices} variant="outline" className="flex items-center justify-center gap-2 text-sm" >
                                <Edit size={14}/> Gerenciar
                            </Button>
                        </div>

                        {selectedEmployee.services && selectedEmployee.services.length > 0 
                        ? 
                        (
                            <div className="grid md:grid-cols-2 gap-4">
                                {selectedEmployee.services.map(service => (
                                    <div key={service.id} className="p-4 bg-white/5 rounded-lg">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-white font-medium">{service.name}</h4>
                                            <button onClick={() => handleRemoveService(service.id)} className="text-red-500 hover:text-red-400 cursor-pointer">
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <p className="text-brand-gray text-sm mb-2 line-clamp-2">{service.description}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-brand-purple font-bold">{formatarMoeda(service.value)}</span>
                                            <span className="text-brand-gray text-sm">{service.duration} min</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                        <div className="bg-brand-dark rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                                <Clock size={20} className="text-brand-purple" />
                                Próximos Agendamentos
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {selectedEmployee.appointments.slice(0, 5).map(apt => (
                                    <div key={apt.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                        <div>
                                            <p className="text-white text-sm">{apt.clientName}</p>
                                            <p className="text-brand-gray text-xs">{apt.serviceName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white text-sm">
                                                {new Date(apt.appointmentDate).toLocaleDateString('pt-BR')}
                                            </p>
                                            <p className="text-brand-gray text-xs">
                                                {apt.startTime?.slice(0, 5)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {modalTipo === 'employee' && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white text-xl font-bold mb-6">
                            {editandoId ? 'Editar Funcionário' : 'Novo Funcionário'}
                        </h2>

                        <form onSubmit={handleSubmitEmployee} className="space-y-4">
                            <div>
                                <label className="block text-sm text-brand-gray mb-1">
                                    <User size={14} className="inline mr-1" />
                                    Nome
                                </label>
                                <Input type="text" value={formEmployee.name} placeholder="Nome do funcionário" fullWidth required
                                    onChange={e => setFormEmployee({ ...formEmployee, name: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm text-brand-gray mb-1">
                                    <Mail size={14} className="inline mr-1" />
                                    Email
                                </label>
                                <Input type="email" value={formEmployee.email} placeholder="email@exemplo.com" fullWidth required
                                    onChange={e => setFormEmployee({ ...formEmployee, email: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm text-brand-gray mb-1">
                                    <Lock size={14} className="inline mr-1" />
                                    <span className="text-brand-gray">{editandoId ? 'Nova Senha (opcional)' : 'Senha'}</span>
                                </label>
                                <div className="relative">
                                    <Input type={showPassword ? 'text' : 'password'} value={formEmployee.password} placeholder='••••••••' fullWidth required={!editandoId}
                                        onChange={e => setFormEmployee({ ...formEmployee, password: e.target.value })} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-white cursor-pointer" >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading} fullWidth>
                                    {loading ? 'Salvando...' : 'Salvar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalTipo === 'agenda' && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white text-xl font-bold mb-6">
                            {editandoAgendaId ? 'Editar Dia de Trabalho' : 'Adicionar Dia de Trabalho'}
                        </h2>

                        <form onSubmit={handleSubmitAgenda} className="space-y-4">
                            <div>
                                <label className="block text-sm text-brand-gray mb-1">Dia da Semana</label>
                                <Select value={formAgenda.dayOfWeek} onChange={e => setFormAgenda({ ...formAgenda, dayOfWeek: parseInt(e.target.value) })}
                                        variant="dark" fullWidth disabled={!!editandoAgendaId} >
                                    {DIAS_SEMANA.map(dia => (
                                        <option key={dia.value} value={dia.value}>{dia.label}</option>
                                    ))}
                                </Select>
                                {editandoAgendaId && (
                                    <p className="text-brand-gray text-xs mt-1 mb-8">O dia da semana não pode ser alterado. Remova e adicione um novo se necessário.</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Início</label>
                                    <Input type="time" value={formAgenda.startTime} onChange={e => setFormAgenda({ ...formAgenda, startTime: e.target.value })} fullWidth required />
                                </div>
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Fim</label>
                                    <Input type="time" value={formAgenda.endTime} onChange={e => setFormAgenda({ ...formAgenda, endTime: e.target.value })} fullWidth required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-brand-gray mb-1">Intervalo entre Horários (minutos)</label>
                                <Select value={formAgenda.slotDuration} onChange={e => setFormAgenda({ ...formAgenda, slotDuration: parseInt(e.target.value) })}
                                        variant="dark" fullWidth >
                                    <option value={15}>15 minutos</option>
                                    <option value={30}>30 minutos</option>
                                    <option value={45}>45 minutos</option>
                                    <option value={60}>1 hora</option>
                                    <option value={90}>1h 30min</option>
                                    <option value={120}>2 horas</option>
                                </Select>
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

                            <div className="flex gap-3 pt-2">
                                <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading} fullWidth>
                                    {loading ? 'Salvando...' : editandoAgendaId ? 'Salvar Alterações' : 'Adicionar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalTipo === 'services' && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white text-xl font-bold mb-2">
                            Gerenciar Serviços
                        </h2>
                        <p className="text-brand-gray text-sm mb-6">
                            Selecione os serviços que {selectedEmployee?.name} poderá realizar
                        </p>

                        {services.length > 0 
                        ? 
                        (
                            <div className="space-y-2 mb-6">
                                {services.map(service => {
                                    const isSelected = selectedServices.includes(service.id);
                                    return (
                                        <div
                                            key={service.id}
                                            onClick={() => toggleService(service.id)}
                                            className={`
                                                p-4 rounded-lg cursor-pointer transition-all border
                                                ${isSelected 
                                                    ? 'bg-brand-purple/20 border-brand-purple/50' 
                                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`
                                                    w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5
                                                    ${isSelected 
                                                        ? 'bg-brand-purple border-brand-purple' 
                                                        : 'border-brand-gray'
                                                    }
                                                `}>
                                                    {isSelected && <Check size={14} className="text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="text-white font-medium">{service.name}</h4>
                                                        <span className="text-brand-purple font-bold text-sm">
                                                            {formatarMoeda(service.value)}
                                                        </span>
                                                    </div>
                                                    <p className="text-brand-gray text-sm mt-1 line-clamp-2">{service.description}</p>
                                                    <span className="text-brand-gray text-xs">{service.duration} min</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) 
                        : 
                        (
                            <div className="text-center py-8 mb-6">
                                <Scissors size={48} className="mx-auto text-brand-gray mb-4" />
                                <p className="text-brand-gray">Nenhum serviço cadastrado</p>
                                <p className="text-brand-gray text-sm mt-1">
                                    Cadastre serviços na página de Serviços primeiro.
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-brand-gray mb-4 pb-4 border-b border-white/10">
                            <span>{selectedServices.length} serviço(s) selecionado(s)</span>
                            {selectedServices.length > 0 && (
                                <button 
                                    onClick={() => setSelectedServices([])}
                                    className="text-red-400 hover:text-red-300 cursor-pointer"
                                >
                                    Limpar seleção
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                Cancelar
                            </Button>
                            <Button 
                                type="button" 
                                onClick={handleSubmitServices} 
                                disabled={loading || services.length === 0} 
                                fullWidth
                            >
                                {loading ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {modalTipo === 'copiarAgenda' && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white text-xl font-bold mb-3">
                            Copiar Agenda do Responsável
                        </h2>
                        <div className="mb-6 text-sm">       
                            <p className="text-brand-gray">
                                Selecione os dias que deseja copiar para {selectedEmployee?.name}.
                            </p>
                            <p className="font-bold">
                                Dias já existentes serão substituídos.
                            </p>
                        </div>
 
                        {loadingAgendasDono
                        ?
                        (
                            <div className="text-center py-10 text-brand-gray">
                                <div className="animate-spin w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full mx-auto mb-3"></div>
                                Carregando agenda...
                            </div>
                        )
                        : 
                        agendasDono.length > 0
                        ?
                        (
                            <div className="space-y-2 mb-6">
                                {agendasDono.map(agenda => {
                                    const isSelecionado = diasSelecionadosCopia.includes(agenda.dayOfWeek);
                                    const jaExiste = (selectedEmployee?.agendas || []).filter(a => a.isActive !== false).some(a => a.dayOfWeek === agenda.dayOfWeek);
 
                                    return (
                                        <div key={agenda.dayOfWeek} onClick={() => toggleDiaCopia(agenda.dayOfWeek)} className={`p-4 rounded-lg cursor-pointer transition-all border
                                            ${isSelecionado ? 'bg-brand-purple/20 border-brand-purple/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>

                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                                                        ${isSelecionado ? 'bg-brand-purple border-brand-purple' : 'border-brand-gray'}`}>
                                                    {isSelecionado && <Check size={14} className="text-white" />}
                                                </div>
                                                <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                                                    <span className="text-white font-medium w-28 shrink-0">
                                                        {getDayName(agenda.dayOfWeek)}
                                                    </span>
                                                    <div className="flex items-center gap-6 flex-wrap">
                                                        <span className="text-brand-gray text-sm">
                                                            {formatarHora(agenda.startTime)} - {formatarHora(agenda.endTime)}
                                                        </span>
                                                        {agenda.lunchStart && (
                                                            <span className="text-brand-gray text-sm flex items-center gap-1">
                                                                <Coffee size={13} />
                                                                {formatarHora(agenda.lunchStart)} - {formatarHora(agenda.lunchEnd)}
                                                            </span>
                                                        )}
                                                        <span className="text-brand-gray text-sm">
                                                            ({agenda.slotDuration} min)
                                                        </span>
                                                    </div>
                                                    {jaExiste && (
                                                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 shrink-0">
                                                            Substituirá o existente
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                        :
                        (
                            <div className="text-center py-10 mb-6">
                                <Calendar size={40} className="mx-auto text-brand-gray mb-3" />
                                <p className="text-brand-gray text-sm">O responsável não possui agenda configurada.</p>
                            </div>
                        )}
 
                        {agendasDono.length > 0 && (
                            <div className="flex items-center justify-between text-sm text-brand-gray mb-4 pb-4 border-b border-white/10">
                                <span>{diasSelecionadosCopia.length} dia(s) selecionado(s)</span>
                                <div className="flex gap-3">
                                    {diasSelecionadosCopia.length < agendasDono.length && (
                                        <button onClick={() => setDiasSelecionadosCopia(agendasDono.map(a => a.dayOfWeek))}
                                                className="text-brand-purple hover:text-brand-purple/80" >
                                            Selecionar todos
                                        </button>
                                    )}
                                    {diasSelecionadosCopia.length > 0 && (
                                        <button onClick={() => setDiasSelecionadosCopia([])}
                                                className="text-red-400 hover:text-red-300" >
                                            Limpar
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
 
                        <div className="flex gap-3">
                            <Button type="button" onClick={closeModal} variant="outline" fullWidth>
                                Cancelar
                            </Button>
                            <Button type="button" onClick={handleConfirmarCopia} disabled={loading || diasSelecionadosCopia.length === 0}
                                    fullWidth className="flex items-center justify-center gap-2" >
                                {loading ? 'Copiando...' : `Copiar ${diasSelecionadosCopia.length > 0 ? `(${diasSelecionadosCopia.length})` : ''}`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}