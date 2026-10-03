import { useState, useEffect } from 'react';
import { useAuth, useAgendas, useAppointments, useEmployees } from '@/contexts';

import { Calendar, List, Clock, User, ChevronLeft, ChevronRight, Check, X, Scissors, Move, GripVertical } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

import { formatarMoeda, formatarData, formatarDataCompleta, formatDateLocal, formatarTelefone, isAppointmentDone } from '@/utils';
import { DIAS_SEMANA_SHORT, MESES, STATUS_CONFIG } from '@/types';

export default function Agenda() 
{
    const { user } = useAuth();
    const { employees } = useEmployees();
    const { loading, setLoading, appointments, setAppointments, getBarberAppointments, updateAppointmentStatus, cancelAppointment, rescheduleAppointment } = useAppointments();
    const { getAvailableSlots } = useAgendas();

    const [view, setView] = useState('lista');

    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroData, setFiltroData] = useState('');
    const [filtroBarbeiro, setFiltroBarbeiro] = useState('');

    const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
    
    const [mesAtual, setMesAtual] = useState(new Date());

    const [modalAberto, setModalAberto] = useState(false);
    const [appointmentSelecionado, setAppointmentSelecionado] = useState(null);

    const [modalReagendar, setModalReagendar] = useState(false);
    const [reagendarData, setReagendarData] = useState('');
    const [reagendarSlots, setReagendarSlots] = useState([]);
    const [reagendarSlotSelecionado, setReagendarSlotSelecionado] = useState(null);
    const [loadingSlots, setLoadingSlots] = useState(false);

    const [draggingAppointment, setDraggingAppointment] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);

    useEffect(() => 
    {
        const load = async () => 
        {
            if (view === 'lista') await getBarberAppointments(filtroData || null, filtroStatus || null, filtroBarbeiro || null);
            else await getBarberAppointments(null, null, null);
        };
        load();
    }, [filtroData, filtroStatus, filtroBarbeiro, view]);

    const openModal = (appointment) => { setAppointmentSelecionado(appointment); setModalAberto(true); };
    const closeModal = () => { setModalAberto(false); setAppointmentSelecionado(null); };

    const handleChangeStatus = async (id, status) => 
    {
        try 
        {
            setLoading(true);

            if (status === 'CANCELLED')
            {
                const reason = prompt('Motivo do cancelamento (obrigatório):');
                if (!reason || reason === '') return;
                await cancelAppointment(id, reason);
            }
            else
            {
                await updateAppointmentStatus(id, status);
            }
            
            closeModal();
        } 
        catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const limparFiltros = () => { setFiltroStatus(''); setFiltroData(''); setFiltroBarbeiro(''); };

    const openModalReagendar = (appointment) => 
    {
        setAppointmentSelecionado(appointment);
        const currentDate = typeof appointment.appointmentDate === 'string' ? appointment.appointmentDate.split('T')[0] : appointment.appointmentDate.toISOString().split('T')[0];
        setReagendarData(currentDate);
        setReagendarSlots([]);
        setReagendarSlotSelecionado(null);
        setModalReagendar(true);
        setModalAberto(false);
    };

    const closeModalReagendar = () => 
    {
        setModalReagendar(false);
        setAppointmentSelecionado(null);
        setReagendarData('');
        setReagendarSlots([]);
        setReagendarSlotSelecionado(null);
    };

    const carregarSlotsReagendamento = async (date) => 
    {
        if (!appointmentSelecionado || !date) return;

        try 
        {
            setLoadingSlots(true);
            console.log(appointmentSelecionado);
            const data = await getAvailableSlots(appointmentSelecionado.barberId, date, appointmentSelecionado.serviceId);
            if (data.available) setReagendarSlots(data.slots || []);
            else setReagendarSlots([]);
        } 
        catch (err) 
        {
            console.error(err);
            setReagendarSlots([]);
        } 
        finally { setLoadingSlots(false); }
    };

    useEffect(() => { if (modalReagendar && reagendarData) carregarSlotsReagendamento(reagendarData); }, [reagendarData, modalReagendar]);

    const handleReagendar = async () => 
    {
        if (!appointmentSelecionado || !reagendarSlotSelecionado) return;

        try 
        {
            setLoading(true);
            const updated = await rescheduleAppointment(appointmentSelecionado.id, reagendarData, reagendarSlotSelecionado);
            setAppointments(prev => prev.map(a => a.id === appointmentSelecionado.id ? { ...a, ...updated } : a));
            closeModalReagendar();
        } 
        catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const handleDragStart = (e, appointment) => 
    {
        if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') 
        {
            e.preventDefault();
            return;
        }
        setDraggingAppointment(appointment);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', appointment.id);
    };

    const handleDragEnd = () => { setDraggingAppointment(null); setDropTarget(null); };
    const handleDragOver = (e, date, slot = null) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget({ date, slot }); };
    const handleDragLeave = () => { setDropTarget(null); };

    const handleDrop = async (e, targetDate, targetSlot = null) => 
    {
        e.preventDefault();
        setDropTarget(null);

        if (!draggingAppointment) return;

        if (!targetSlot) 
        {
            setAppointmentSelecionado(draggingAppointment);
            setReagendarData(targetDate);
            setReagendarSlots([]);
            setReagendarSlotSelecionado(null);
            setModalReagendar(true);
            setDraggingAppointment(null);
            return;
        }

        try 
        {
            setLoading(true);
            const updated = await rescheduleAppointment(draggingAppointment.id, targetDate, targetSlot);
            setAppointments(prev => prev.map(a => a.id === draggingAppointment.id ? { ...a, ...updated } : a));
            setDraggingAppointment(null);
        } 
        catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const getDiasDoMes = () => 
    {
        const ano = mesAtual.getFullYear();
        const mes = mesAtual.getMonth();
        
        const primeiroDia = new Date(ano, mes, 1);
        const ultimoDia = new Date(ano, mes + 1, 0);
        
        const dias = [];
        
        const diaSemanaInicio = primeiroDia.getDay();
        for (let i = diaSemanaInicio - 1; i >= 0; i--) 
        {
            const dia = new Date(ano, mes, -i);
            dias.push({ date: dia, isCurrentMonth: false });
        }
        
        for (let i = 1; i <= ultimoDia.getDate(); i++) 
        {
            const dia = new Date(ano, mes, i);
            dias.push({ date: dia, isCurrentMonth: true });
        }
        
        const diasRestantes = 42 - dias.length;
        for (let i = 1; i <= diasRestantes; i++) 
        {
            const dia = new Date(ano, mes + 1, i);
            dias.push({ date: dia, isCurrentMonth: false });
        }
        
        return dias;
    };

    const getAppointmentsDoData = (dateStr) => 
    {
        return appointments.filter(apt => 
        {
            const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
            return aptDate === dateStr;
        });
    };

    const mesAnterior = () => { setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1)); };
    const proximoMes = () => { setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1)); };
    const selecionarDia = (date) => { const dateStr = formatDateLocal(date); setDataSelecionada(dateStr); };

    const hoje = formatDateLocal(new Date());

    const stats = 
    { 
        total: appointments.length, 
        pendentes: appointments.filter(a => a.status === 'PENDING').length, 
        confirmados: appointments.filter(a => a.status === 'CONFIRMED').length, 
        concluidos: appointments.filter(a => a.status === 'COMPLETED').length,
        cancelados: appointments.filter(a => a.status === 'CANCELLED').length,
        faltas: appointments.filter(a => a.status === 'NO_SHOW').length
    };

    return (
        <div>
            <div className="flex flex-col gap-4 md:flex-row md:gap-0 justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Agenda</h1>
                <div className="flex gap-2">
                    <Button onClick={() => setView('lista')} variant={view === 'lista' ? 'primary' : 'outline'}>
                        <List size={24} />
                    </Button>
                    <Button onClick={() => setView('calendario')} variant={view === 'calendario' ? 'primary' : 'outline'}>
                        <Calendar size={24} />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-6 mb-8">
                <div className="bg-brand-dark p-4 rounded-lg">
                    <p className="text-sm text-brand-gray">Total</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-brand-dark p-4 rounded-lg">
                    <p className="text-sm text-yellow-500">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-500">{stats.pendentes}</p>
                </div>
                <div className="bg-brand-dark p-4 rounded-lg">
                    <p className="text-sm text-blue-500">Confirmados</p>
                    <p className="text-2xl font-bold text-blue-500">{stats.confirmados}</p>
                </div>
                <div className="bg-brand-dark p-4 rounded-lg">
                    <p className="text-sm text-green-500">Concluídos</p>
                    <p className="text-2xl font-bold text-green-500">{stats.concluidos}</p>
                </div>
                <div className="bg-brand-dark p-4 rounded-lg">
                    <p className="text-sm text-red-400">Cancelados</p>
                    <p className="text-2xl font-bold text-red-400">{stats.cancelados}</p>
                </div>
                <div className="bg-brand-dark p-4 rounded-lg">
                    <p className="text-sm text-red-600">Faltas</p>
                    <p className="text-2xl font-bold text-red-600">{stats.faltas}</p>
                </div>
            </div>

            {view === 'lista' && (
                <>
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="w-48">
                            <Select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} variant="dark" fullWidth>
                                <option value="">Todos os status</option>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <Input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)} />
                        </div>
                        {user?.user?.role === 'BARBER' && employees.length > 0 && (
                            <div className="w-56">
                                <Select value={filtroBarbeiro} onChange={e => setFiltroBarbeiro(e.target.value)} variant="dark" fullWidth >
                                    <option value="">Todos os profissionais</option>
                                    <option value={user?.user?.id}>{user?.user?.name}</option>
                                    {employees?.map(employee => (
                                        <option key={employee.id} value={employee.id}>
                                            {employee.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        )}
                        {(filtroStatus || filtroData) && (
                            <Button onClick={limparFiltros} variant="outline">
                                Limpar Filtros
                            </Button>
                        )}
                    </div>

                    {appointments && appointments.length > 0 
                    ? 
                    (
                        <div className="bg-brand-dark rounded-lg overflow-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10 text-left text-sm text-brand-gray font-medium ">
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4">Serviço</th>
                                        <th className="p-4">Responsável</th>
                                        <th className="p-4">Data</th>
                                        <th className="p-4">Horário</th>
                                        <th className="p-4">Valor</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments?.map(apt => 
                                    {
                                        const statusConfig = STATUS_CONFIG[apt.status];
                                        return (
                                            <tr key={apt.id} onClick={() => openModal(apt)}
                                                className="text-white border-b border-white/5 hover:bg-white/5 cursor-pointer" >
                                                <td className="p-4">
                                                    <div>
                                                        <p className="text-sm font-medium">{apt.clientName}</p>
                                                        <p className="text-xs text-brand-gray">{apt.clientEmail}</p>
                                                        <p className="text-xs text-brand-gray">{formatarTelefone(apt.clientPhone)}</p>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm">{apt.serviceName}</td>
                                                <td className="p-4 text-sm">{apt.barberName}</td>
                                                <td className="p-4 text-sm">{formatarData(apt.appointmentDate)}</td>
                                                <td className="p-4 text-sm">
                                                    {apt.startTime.slice(0, 5)} - {apt.endTime.slice(0, 5)}
                                                </td>
                                                <td className="p-4 text-sm font-medium">
                                                    {formatarMoeda(apt.price)}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-xs px-2 py-1 rounded ${statusConfig.color}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) 
                    : 
                    (
                        <div className="bg-brand-dark rounded-lg p-8 text-center">
                            <Calendar size={48} className="mx-auto text-brand-gray mb-4" />
                            <p className="text-brand-gray">Nenhum agendamento encontrado.</p>
                        </div>
                    )}
                </>
            )}

            {view === 'calendario' && (
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 bg-brand-dark rounded-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={mesAnterior} className="p-2 hover:bg-white/10 rounded cursor-pointer">
                                <ChevronLeft size={20} className="text-white" />
                            </button>
                            <h2 className="text-lg font-semibold text-white">
                                {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
                            </h2>
                            <button onClick={proximoMes} className="p-2 hover:bg-white/10 rounded cursor-pointer">
                                <ChevronRight size={20} className="text-white" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {DIAS_SEMANA_SHORT.map(dia => (
                                <div key={dia} className="text-center text-sm text-brand-gray py-2">
                                    {dia}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {getDiasDoMes().map((item, index) => 
                            {
                                const dateStr = formatDateLocal(item.date);                          
                                const isHoje = dateStr === hoje;

                                const hojeDate = new Date();
                                hojeDate.setHours(0,0,0,0);

                                const itemDate = new Date(item.date);
                                itemDate.setHours(0,0,0,0);

                                const isPast = itemDate < hojeDate;

                                const isSelecionado = dateStr === dataSelecionada;
                                const isDropTarget = dropTarget?.date === dateStr;
                                const aptsDoDia = getAppointmentsDoData(dateStr);

                                const baseBg = !item.isCurrentMonth ? 'text-brand-gray/30! bg-transparent' : 
                                    isSelecionado ? 'bg-brand-purple/30 hover:bg-brand-purple/40' : 'bg-white/10 hover:bg-white/20';

                                const aptsValidos = aptsDoDia.filter(apt => apt.status !== 'CANCELLED');
                                const temPendencia = aptsValidos.some(apt => apt.status === 'PENDING');
                                const todosConcluidos = aptsValidos.length > 0 && aptsValidos.every(apt => apt.status === 'COMPLETED');

                                let corIndicador = null;

                                if (temPendencia) corIndicador = 'bg-yellow-500';
                                else if (todosConcluidos) corIndicador = 'bg-green-500';
                                else if (aptsValidos.length > 0) corIndicador = 'bg-blue-500';

                                return (
                                    <button key={index} onClick={() => selecionarDia(item.date)} onDragOver={(e) => !isPast && item.isCurrentMonth && handleDragOver(e, dateStr)} 
                                        onDragLeave={handleDragLeave} onDrop={(e) => !isPast && item.isCurrentMonth && handleDrop(e, dateStr)}
                                            className={`relative p-2 min-h-17.5 rounded-lg text-sm text-white transition-all ${baseBg}
                                                ${isHoje ? 'ring-2 ring-brand-purple' : ''}
                                                ${isDropTarget && draggingAppointment ? 'ring-2 ring-green-500 bg-green-500/20' : ''}
                                                ${isPast && item.isCurrentMonth ? 'opacity-50' : ''}`}>

                                        <span className={isHoje ? 'font-bold' : ''}>
                                            {item.date.getDate()}
                                        </span>
                                        
                                        {corIndicador && (
                                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${corIndicador}`} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-brand-dark rounded-lg p-6">
                        <h3 className="text-white font-semibold mb-4 capitalize">
                            {formatarDataCompleta(dataSelecionada)}
                        </h3>

                        {getAppointmentsDoData(dataSelecionada).length > 0 
                        ? 
                        (
                            <div className="space-y-3">
                                {getAppointmentsDoData(dataSelecionada).map(apt => 
                                {
                                    const statusConfig = STATUS_CONFIG[apt.status] || { label: apt.status, color: 'bg-gray-500' };
                                    const isDraggable = apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED';
                                    
                                    return (
                                        <div key={apt.id} onClick={() => openModal(apt)} draggable={isDraggable} onDragStart={(e) => handleDragStart(e, apt)} onDragEnd={handleDragEnd}
                                            className={` p-3 bg-white/5 rounded-lg transition-all ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:bg-white/10' 
                                                : 'cursor-pointer'} ${draggingAppointment?.id === apt.id ? 'opacity-50 scale-95' : ''} `} >

                                            <div className="flex items-start gap-2">
                                                {isDraggable && (
                                                    <GripVertical size={16} className="text-brand-gray mt-1 shrink-0" />
                                                )}
                                                <div className="flex-1" onClick={() => openModal(apt)}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-white font-medium text-sm">
                                                            {apt.startTime?.toString().slice(0, 5)}
                                                        </span>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${statusConfig?.color}`}>
                                                            {statusConfig?.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-white text-sm">{apt.clientName}</p>
                                                    <p className="text-brand-gray text-xs">{apt.serviceName}</p>
                                                    {apt.barberName && (
                                                        <p className="text-brand-gray text-xs mt-1">
                                                            <User size={10} className="inline mr-1" />
                                                            {apt.barberName}
                                                        </p>
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
                            <p className="text-brand-gray text-sm text-center py-8">
                                Nenhum agendamento neste dia
                            </p>
                        )}
                    </div>
                </div>
            )}

            {modalAberto && appointmentSelecionado && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModal}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-white text-xl font-bold">Detalhes do Agendamento</h2>
                            <span className={`text-xs px-2 py-1 rounded ${STATUS_CONFIG[appointmentSelecionado.status].color}`}>
                                {STATUS_CONFIG[appointmentSelecionado.status].label}
                            </span>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-3">
                                <User size={20} className="text-brand-gray" />
                                <div>
                                    <p className="text-white font-medium">{appointmentSelecionado.clientName}</p>
                                    <p className="text-brand-gray text-sm">{appointmentSelecionado.clientEmail}</p>
                                    <p className="text-brand-gray text-sm">{formatarTelefone(appointmentSelecionado.clientPhone)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Calendar size={20} className="text-brand-gray" />
                                <p className="text-white">{formatarData(appointmentSelecionado.appointmentDate)}</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <Clock size={20} className="text-brand-gray" />
                                <p className="text-white">
                                    {appointmentSelecionado.startTime.slice(0, 5)} - {appointmentSelecionado.endTime.slice(0, 5)}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <Scissors size={20} className="text-brand-gray" />
                                <p className="text-white">{appointmentSelecionado.barberName}</p>
                            </div>

                            <div className="bg-white/5 rounded-lg p-4">
                                <p className="text-white font-medium">{appointmentSelecionado.serviceName}</p>
                                <p className="text-brand-blue font-bold">{formatarMoeda(appointmentSelecionado.price)}</p>
                            </div>

                            {appointmentSelecionado.notes && (
                                <div className="bg-white/5 rounded-lg p-4">
                                    <p className="text-brand-gray text-sm mb-1">Observações</p>
                                    <p className="text-white text-sm italic">"{appointmentSelecionado.notes}"</p>
                                </div>
                            )}

                            {appointmentSelecionado.cancelReason && (
                                <div className="bg-red-500/10 rounded-lg p-4">
                                    <p className="text-red-400 text-sm mb-1">Motivo do cancelamento</p>
                                    <p className="text-white text-sm">{appointmentSelecionado.cancelReason}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {(appointmentSelecionado.status === 'PENDING' || appointmentSelecionado.status === 'CONFIRMED') && (
                                <Button onClick={() => openModalReagendar(appointmentSelecionado)} variant="secondary" fullWidth
                                            className="flex items-center justify-center gap-2" >
                                    <Move size={16} /> 
                                    Reagendar
                                </Button>
                            )}

                            {appointmentSelecionado.status === 'PENDING' && (
                                <div className="flex gap-2">
                                    <Button onClick={() => handleChangeStatus(appointmentSelecionado.id, 'CANCELLED')} variant="secondary" fullWidth disabled={loading}
                                            className="flex items-center justify-center gap-2 text-black bg-red-400!">
                                        <X size={16} />
                                        Cancelar
                                    </Button>
                                    <Button onClick={() => handleChangeStatus(appointmentSelecionado.id, 'CONFIRMED')} fullWidth disabled={loading} 
                                            className="flex items-center justify-center gap-2">
                                        <Check size={16} />
                                        Confirmar
                                    </Button>
                                </div>
                            )}

                            {appointmentSelecionado.status === 'CONFIRMED' && (
                                <>
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleChangeStatus(appointmentSelecionado.id, 'NO_SHOW')} variant="secondary" fullWidth disabled={loading}
                                                className="flex items-center justify-center gap-2 text-black bg-orange-400!">
                                            Não Compareceu
                                        </Button>
                                        {isAppointmentDone(appointmentSelecionado) && (
                                            <Button onClick={() => handleChangeStatus(appointmentSelecionado.id, 'COMPLETED')} fullWidth disabled={loading}
                                                    className="flex items-center justify-center gap-2">
                                                <Check size={16} />
                                                Concluir
                                            </Button>
                                        )}                      
                                    </div>
                                    <Button onClick={() => handleChangeStatus(appointmentSelecionado.id, 'CANCELLED')} variant="secondary" fullWidth disabled={loading}
                                            className="flex items-center justify-center gap-2 text-black bg-red-400!">
                                        <X size={16} />
                                        Cancelar Agendamento
                                    </Button>
                                </>
                            )}

                            <Button onClick={closeModal} variant="outline" fullWidth>
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {modalReagendar && appointmentSelecionado && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModalReagendar}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white text-xl font-bold mb-2">
                            Reagendar
                        </h2>
                        <p className="text-brand-gray text-sm mb-6">
                            {appointmentSelecionado.clientName} - {appointmentSelecionado.serviceName}
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm text-brand-gray mb-2">Nova Data</label>
                            <Input type="date" value={reagendarData} onChange={e => { setReagendarData(e.target.value); setReagendarSlotSelecionado(null); }}
                                min={hoje} fullWidth />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm text-brand-gray mb-2">Novo Horário</label>
                            
                            {loadingSlots 
                            ? 
                            (
                                <div className="text-center py-8 text-brand-gray">
                                    <div className="animate-spin w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full mx-auto mb-2"></div>
                                    Carregando horários...
                                </div>
                            ) 
                            : 
                            reagendarSlots.length > 0 
                            ? 
                            (
                                <div className="grid grid-cols-4 gap-2">
                                    {reagendarSlots.map((slot, index) => (
                                        <button key={index} onClick={() => slot.available && setReagendarSlotSelecionado(slot.startTime)} disabled={!slot.available}
                                            className={`p-2 rounded text-sm font-medium transition-colors ${slot.isLunch 
                                                ? 'bg-orange-500/10 text-orange-400/50 cursor-not-allowed' : !slot.available 
                                                        ? 'bg-white/5 text-brand-gray/50 cursor-not-allowed line-through' : reagendarSlotSelecionado === slot.startTime
                                                            ? 'bg-brand-purple text-white' : 'bg-white/10 text-white hover:bg-brand-purple/30'}`}>
                                            {slot.startTime.slice(0, 5)}
                                        </button>
                                    ))}
                                </div>
                            ) 
                            : 
                            reagendarData 
                            ? 
                            (
                                <p className="text-center py-8 text-brand-gray">
                                    Nenhum horário disponível nesta data
                                </p>
                            ) 
                            : 
                            (
                                <p className="text-center py-8 text-brand-gray">
                                    Selecione uma data
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button onClick={closeModalReagendar} variant="outline" fullWidth>
                                Cancelar
                            </Button>
                            <Button onClick={handleReagendar} disabled={!reagendarSlotSelecionado || loading} fullWidth >
                                {loading ? 'Reagendando...' : 'Confirmar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}