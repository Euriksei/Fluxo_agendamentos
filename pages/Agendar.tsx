import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBarber, useServices, useAgendas, useAppointments } from '@/contexts';

import { Calendar, Clock, Check, ChevronLeft, ChevronRight, Scissors, User, Users, Mail, Phone, SearchX, WifiOff, RotateCw } from 'lucide-react';

import Logo from '@/components/Logo';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';

import { formatarDataCompleta, formatarMoeda, formatarTelefone, formatDateLocal } from '@/utils';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Agendar() 
{
    const { slug } = useParams();
    const navigate = useNavigate();

    const { getBarberId, getBarberData } = useBarber();
    const { getBarberServices, getBarberEmployeesServices } = useServices();
    const { setError, getBarberAgenda, getBarberBlocks, getAvailableSlots } = useAgendas();
    const { createAppointment } = useAppointments();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null); // null | 'not-found' | 'network'
    const [reloadKey, setReloadKey] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    
    const [barber, setBarber] = useState(null);
    const [services, setServices] = useState([]);
    const [professionals, setProfessionals] = useState([]);
    const [loadingProfessionals, setLoadingProfessionals] = useState(false);
    const [barberAgenda, setBarberAgenda] = useState([]);
    const [blockedDates, setBlockedDates] = useState([]);
    
    const [step, setStep] = useState(1);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedProfessional, setSelectedProfessional] = useState(null); 
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    
    const [clientData, setClientData] = useState({ name: '', email: '', phone: '', notes: '' });
    
    const [slots, setSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    const [mesAtual, setMesAtual] = useState(new Date());

    useEffect(() => 
    {
        const loadBarber = async () => 
        {
            setLoading(true);
            setLoadError(null);

            try 
            {
                // silent: this page shows its own not-found / network screen, so skip the global toast
                const id = await getBarberId(slug, { silent: true });

                const barberData = await getBarberData(slug, { silent: true });
                setBarber(barberData);

                const servicesData = await getBarberServices(id, { silent: true });
                setServices(servicesData);
            } 
            catch (err) 
            {
                console.error(err);
                setLoadError(err?.status === 404 ? 'not-found' : 'network');
            } 
            finally 
            {
                setLoading(false);
            }
        };

        loadBarber();
    }, [slug, reloadKey]);

    useEffect(() => 
    {
        if (!selectedService) return;

        const loadProfessionals = async () => 
        {
            setLoadingProfessionals(true);

            try 
            {
                const employeesData = await getBarberEmployeesServices(selectedService.id);
                setProfessionals(employeesData);
            } 
            catch (err) 
            {
                console.error(err);
            }
            finally 
            {
                setLoadingProfessionals(false);
            }
        };

        loadProfessionals();
    }, [selectedService]);

    useEffect(() => 
    {
        if (!selectedProfessional) return;

        const loadProfessionalData = async () => 
        {
            setSlotsLoading(true);
            
            try 
            {
                const agendasData = await getBarberAgenda(selectedProfessional.id);
                setBarberAgenda(agendasData);
                
                const blocksData = await getBarberBlocks(selectedProfessional.id);
                const fullDayBlocks = blocksData.filter(block => !block.startTime).map(block => block.blockDate.split('T')[0]);
                setBlockedDates(fullDayBlocks);
            } 
            catch (err) 
            {
                console.error(err);
            } 
            finally 
            {
                setSlotsLoading(false);
            }
        };

        loadProfessionalData();
    }, [selectedProfessional]);

    useEffect(() => 
    {
        if (!selectedDate || !selectedService || !selectedProfessional) return;

        const loadSlots = async () => 
        {
            setSlotsLoading(true);
            setSlots([]);
            
            try 
            {
                const data = await getAvailableSlots(selectedProfessional.id, selectedDate, selectedService.id);
                setSlots(data.slots || []);
            } 
            catch (err) 
            {
                console.error(err);
            } 
            finally 
            {
                setSlotsLoading(false);
            }
        };

        loadSlots();
    }, [selectedDate, selectedService, selectedProfessional, getAvailableSlots]);

    const barberWorksOnDay = (dayOfWeek) => { return barberAgenda.some(a => a.dayOfWeek === dayOfWeek && a.isActive); };
    const isDateBlocked = (date) => { const dateStr = formatDateLocal(date); return blockedDates.includes(dateStr); };

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

    const mesAnterior = () => { setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1)); };
    const proximoMes = () => { setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1)); };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const isDataPassada = (date) => 
    {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d < hoje;
    };

    const isDateAvailable = (date, isCurrentMonth) =>
    {
        if (!isCurrentMonth) return false;
        if (isDataPassada(date)) return false;
        if (isDateBlocked(date)) return false;
        const dayOfWeek = date.getDay();
        return barberWorksOnDay(dayOfWeek);
    };

    const selectService = (service) => 
    {
        setSelectedService(service);
        setSelectedProfessional(null);
        setProfessionals([]);
        setBarberAgenda([]);
        setBlockedDates([]);
        setStep(2);
    };

    const selectProfessional = (professional) => 
    {
        setSelectedProfessional(professional);
        setSelectedDate(null);
        setSelectedSlot(null);
        setStep(3);
    };

    const selectDate = (date) => 
    {
        const dateStr = formatDateLocal(date);
        setSelectedDate(dateStr);
        setSelectedSlot(null);
        setStep(4);
    };

    const selectSlot = (slot) => 
    {
        setSelectedSlot(slot);
        setStep(5);
    };

    const goBack = () => 
    {
        if (step > 1) 
        {
            const newStep = step - 1;
            setStep(newStep);
            
            if (newStep === 1) 
            {
                setSelectedService(null);
                setProfessionals([]);
            }
            if (newStep === 2) 
            {
                setSelectedProfessional(null);
                setBarberAgenda([]);
                setBlockedDates([]);
            }
            if (newStep === 3) 
            { 
                setSelectedDate(null); 
                setSlots([]); 
            }
            if (newStep === 4) setSelectedSlot(null);
        }
    };

    const handleClientDataChange = (field, value) => 
    {
        if (field === 'phone') setClientData({ ...clientData, phone: formatarTelefone(value) });
        else setClientData({ ...clientData, [field]: value });
    };

    const validateClientData = () =>
    {
        if (!clientData.name.trim() || clientData.name.trim().length < 2) 
        {
            setError('Nome deve ter no mínimo 2 caracteres');
            return false;
        }

        if (!clientData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) 
        {
            setError('Email inválido');
            return false;
        }

        const phoneNumbers = clientData.phone.replace(/\D/g, '');
        if (phoneNumbers.length < 10 || phoneNumbers.length > 11) 
        {
            setError('Telefone inválido');
            return false;
        }

        return true;
    };

    const goToConfirmation = () => 
    {
        setError(null);
        if (validateClientData()) setStep(6);
    };

    const handleSubmit = async () => 
    {
        try 
        {
            setSubmitting(true);

            await createAppointment({ clientName: clientData.name.trim(), clientEmail: clientData.email.toLowerCase().trim(), clientPhone: clientData.phone.replace(/\D/g, ''),
                barberId: selectedProfessional.id, serviceId: selectedService.id, appointmentDate: selectedDate, startTime: selectedSlot, notes: clientData.notes || null });

            setStep(7);
        } 
        catch (err) 
        {
            console.error(err);
        } 
        finally 
        {
            setSubmitting(false);
        }
    };

    if (loadError) 
    {
        const notFound = loadError === 'not-found';
        const Icon = notFound ? SearchX : WifiOff;

        return (
            <main className="min-h-svh bg-brand-black flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-md text-center">
                    <Logo variant="full" textVariant="gradient" size="lg" className="flex-col gap-0 mb-8" />

                    <section role="alert" className="bg-brand-dark border border-white/10 rounded-2xl p-8 shadow-2xl">
                        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                            <Icon size={28} aria-hidden="true" />
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">
                            {notFound ? 'Barbearia não encontrada' : 'Não foi possível carregar'}
                        </h1>
                        <p className="text-brand-gray text-sm mb-8">
                            {notFound 
                                ? 'O link de agendamento que você acessou não existe ou foi desativado. Confira o endereço com a barbearia.' 
                                : 'Verifique sua conexão com a internet e tente novamente.'}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {!notFound && (
                                <Button onClick={() => setReloadKey(k => k + 1)} size="sm" className="inline-flex items-center justify-center gap-2">
                                    <RotateCw size={16} aria-hidden="true" /> Tentar de novo
                                </Button>
                            )}
                            <Link to="/" className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold border border-brand-purple text-brand-purple hover:bg-brand-purple/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                                Ir para o início
                            </Link>
                        </div>
                    </section>
                </div>
            </main>
        );
    }

    if (loading && !barber) 
    {
        return (
            <div className="min-h-screen bg-brand-darker flex items-center justify-center">
                <div className="text-white">Carregando...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-darker">
            <div className="bg-brand-dark border-b border-white/10 p-6">
                <div className="max-w-2xl mx-auto">
                    {barber && (
                        <div className="flex items-center justify-center">
                            <h1 className="text-2xl font-bold text-white">
                                {barber.shop}
                            </h1>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-4">
                <div className="flex items-center justify-center mb-8">
                    {['Serviço', 'Profissional', 'Data', 'Horário', 'Dados', 'Confirmar'].map((label, index) =>
                    {
                        const stepNum = index + 1;
                        const isActive = step === stepNum;
                        const isCompleted = step > stepNum;
                        
                        return (
                            <div key={label} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                        ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-brand-purple text-white' : 'bg-white/10 text-brand-gray'}`}>
                                    {isCompleted ? <Check size={16} /> : stepNum}
                                </div>
                                <span className={`ml-2 text-sm hidden sm:block ${isActive ? 'text-white' : 'text-brand-gray'}`}>
                                    {label}
                                </span>
                                {index < 5 && (
                                    <div className={`w-4 sm:w-8 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-white/10'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {step === 1 && (
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Escolha o Serviço</h2>
                        
                        {services.length > 0 
                        ? 
                        (
                            <div className="space-y-3">
                                {services.map(service => (
                                    <button key={service.id} onClick={() => selectService(service)} className="cursor-pointer w-full p-4 bg-brand-dark border border-white/10 
                                            rounded-lg text-left hover:border-brand-purple/50 transition-colors" >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-white font-medium">{service.name}</h3>
                                                <p className="text-brand-gray text-sm mt-1">{service.description}</p>
                                                <p className="text-brand-gray text-sm mt-2">
                                                    <Clock size={14} className="inline mr-1" />
                                                    {service.duration} min
                                                </p>
                                            </div>
                                            <span className="text-brand-purple font-bold text-lg">
                                                {formatarMoeda(service.value)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) 
                        : 
                        (
                            <div className="text-center py-12 text-brand-gray">
                                Nenhum serviço disponível
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <button onClick={goBack} className="text-brand-gray hover:text-white mb-4 flex items-center gap-1 cursor-pointer">
                            <ChevronLeft size={16} /> Voltar
                        </button>

                        <div className="flex items-center gap-3 mb-6 p-3 bg-brand-purple/10 rounded-lg border border-brand-purple/20">
                            <Scissors size={18} className="text-brand-purple" />
                            <div className="flex-1">
                                <p className="text-white font-medium">{selectedService?.name}</p>
                                <p className="text-brand-gray text-sm">{selectedService?.duration} min • {formatarMoeda(selectedService?.value)}</p>
                            </div>
                        </div>
                        
                        <h2 className="text-xl font-semibold text-white mb-4">Escolha o Profissional</h2>
                        
                        {professionals.length > 0 
                        ? 
                        (
                            <div className="space-y-3">
                                {professionals.map(professional => (
                                    <button key={professional.id} onClick={() => selectProfessional(professional)} className="w-full p-4 bg-brand-dark border border-white/10 
                                            rounded-lg text-left hover:border-brand-purple/50 transition-colors flex items-center gap-4 cursor-pointer">
                                        <div className="w-14 h-14 bg-brand-purple/20 rounded-full flex items-center justify-center shrink-0">
                                            <User size={24} className="text-brand-purple" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-medium">
                                                {professional.name} {""}
                                                {professional.type === 'owner' && ( <span className="text-brand-gray text-sm">(Proprietário)</span> )}
                                            </h3>
                                        </div>
                                        <ChevronRight size={20} className="text-brand-gray" />
                                    </button>
                                ))}
                            </div>
                        ) 
                        : 
                        (
                            <div className="text-center py-12 bg-brand-dark rounded-lg">
                                <Users size={48} className="mx-auto text-brand-gray mb-4" />
                                <p className="text-brand-gray" role="status">
                                    {loadingProfessionals ? 'Carregando profissionais...' : 'Nenhum profissional disponível para este serviço.'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <button onClick={goBack} className="text-brand-gray hover:text-white mb-4 flex items-center gap-1 cursor-pointer">
                            <ChevronLeft size={16} /> Voltar
                        </button>
                        
                        <h2 className="text-xl font-semibold text-white mb-4">Escolha a Data</h2>
                        
                        <div className="bg-brand-dark rounded-lg p-6">
                            <div className="flex justify-between items-center mb-6">
                                <button onClick={mesAnterior} aria-label="Mês anterior" title="Mês anterior" className="p-2 hover:bg-white/10 rounded cursor-pointer">
                                    <ChevronLeft size={20} className="text-white" />
                                </button>
                                <h3 className="text-lg font-semibold text-white">
                                    {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
                                </h3>
                                <button onClick={proximoMes} aria-label="Próximo mês" title="Próximo mês" className="p-2 hover:bg-white/10 rounded cursor-pointer">
                                    <ChevronRight size={20} className="text-white" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {DIAS_SEMANA.map((dia, index) => (
                                    <div key={dia} className={`text-center text-sm py-2 ${barberWorksOnDay(index) ? 'text-brand-purple font-medium' : 'text-brand-gray'}`} >
                                        {dia}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {getDiasDoMes().map((item, index) => 
                                {
                                    const isAvailable = isDateAvailable(item.date, item.isCurrentMonth);
                                    const isToday = item.date.toDateString() === hoje.toDateString();
                                    
                                    return (
                                        <button key={index} onClick={() => isAvailable && selectDate(item.date)} disabled={!isAvailable}
                                            className={`cursor-pointer p-3 rounded-lg text-sm transition-colors ${!item.isCurrentMonth ? 'text-brand-gray/20' : ''}
                                                ${item.isCurrentMonth && !isAvailable ? 'text-brand-gray/40 cursor-not-allowed' : ''}
                                                    ${isAvailable ? 'text-white hover:bg-brand-purple/30 cursor-pointer bg-brand-purple/10' : ''}
                                                        ${isToday && isAvailable ? 'ring-2 ring-brand-purple' : ''}`}>
                                            {item.date.getDate()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div>
                        <button onClick={goBack} className="text-brand-gray hover:text-white mb-4 flex items-center gap-1 cursor-pointer">
                            <ChevronLeft size={16} /> Voltar
                        </button>
                        
                        <h2 className="text-xl font-semibold text-white mb-2">Escolha o Horário</h2>
                        <p className="text-brand-gray mb-4 first-letter:uppercase">{formatarDataCompleta(selectedDate)}</p>
                        
                        {slotsLoading 
                        ? 
                        (
                            <div className="text-center py-12 text-brand-gray">
                                Carregando horários...
                            </div>
                        ) 
                        : 
                        slots.length > 0 
                        ? (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {slots.map((slot, index) => (
                                    <button key={index} onClick={() => slot.available && selectSlot(slot.startTime)} disabled={!slot.available}
                                        className={`cursor-pointer p-3 rounded-lg text-sm font-medium transition-colors
                                            ${!slot.available ? 'bg-white/5 text-brand-gray/50 cursor-not-allowed line-through' 
                                                : 'bg-brand-dark border border-white/10 text-white hover:border-brand-purple hover:bg-brand-purple/20'}`}>
                                        {slot.startTime.slice(0, 5)}
                                    </button>
                                ))}
                            </div>
                        ) 
                        : 
                        (
                            <div className="text-center py-12 bg-brand-dark rounded-lg">
                                <Calendar size={48} className="mx-auto text-brand-gray mb-4" />
                                <p className="text-brand-gray">Nenhum horário disponível nesta data</p>
                                <Button onClick={goBack} variant="outline" className="mt-4">
                                    Escolher outra data
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {step === 5 && (
                    <div>
                        <button onClick={goBack} className="text-brand-gray hover:text-white mb-4 flex items-center gap-1 cursor-pointer">
                            <ChevronLeft size={16} /> Voltar
                        </button>
                        
                        <h2 className="text-xl font-semibold text-white mb-4">Seus Dados</h2>
                        <p className="text-brand-gray mb-6">Preencha seus dados para confirmar o agendamento</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="cliente-nome" className="block text-sm text-brand-gray mb-2">
                                    <User size={14} aria-hidden="true" className="inline mr-1" />
                                    Nome completo *
                                </label>
                                <Input id="cliente-nome" type="text" autoComplete="name" value={clientData.name} placeholder="Seu nome" fullWidth required
                                    onChange={e => handleClientDataChange('name', e.target.value)} />
                            </div>

                            <div>
                                <label htmlFor="cliente-email" className="block text-sm text-brand-gray mb-2">
                                    <Mail size={14} aria-hidden="true" className="inline mr-1" />
                                    Email *
                                </label>
                                <Input id="cliente-email" type="email" autoComplete="email" value={clientData.email} placeholder="seu@email.com" fullWidth required
                                    onChange={e => handleClientDataChange('email', e.target.value)} />
                            </div>

                            <div>
                                <label htmlFor="cliente-telefone" className="block text-sm text-brand-gray mb-2">
                                    <Phone size={14} aria-hidden="true" className="inline mr-1" />
                                    Telefone/WhatsApp *
                                </label>
                                <Input id="cliente-telefone" type="tel" autoComplete="tel" value={clientData.phone} placeholder="(00) 00000-0000" fullWidth required
                                    onChange={e => handleClientDataChange('phone', e.target.value)} />
                            </div>

                            <div>
                                <label htmlFor="cliente-obs" className="block text-sm text-brand-gray mb-2">
                                    Observações (opcional)
                                </label>
                                <TextArea id="cliente-obs" value={clientData.notes} placeholder="Alguma observação para o profissional?" fullWidth rows={3}
                                    onChange={e => handleClientDataChange('notes', e.target.value)} />
                            </div>

                            <Button onClick={goToConfirmation} fullWidth>
                                Continuar
                            </Button>
                        </div>
                    </div>
                )}

                {step === 6 && (
                    <div>
                        <button onClick={goBack} className="text-brand-gray hover:text-white mb-4 flex items-center gap-1 cursor-pointer">
                            <ChevronLeft size={16} /> Voltar
                        </button>
                        
                        <h2 className="text-xl font-semibold text-white mb-4">Confirme seu Agendamento</h2>
                        
                        <div className="bg-brand-dark rounded-lg p-6 space-y-4 mb-6">
                            <div className="pb-4 border-b border-white/10">
                                <p className="text-brand-gray text-sm mb-1">Cliente</p>
                                <p className="text-white font-medium">{clientData.name}</p>
                                <p className="text-brand-gray text-sm">{clientData.email}</p>
                                <p className="text-brand-gray text-sm">{clientData.phone}</p>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-brand-gray">Serviço</span>
                                <span className="text-white font-medium">{selectedService.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Data</span>
                                <span className="inline-block text-white first-letter:uppercase">{formatarDataCompleta(selectedDate)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Horário</span>
                                <span className="text-white">{selectedSlot.slice(0, 5)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Duração</span>
                                <span className="text-white">{selectedService.duration} min</span>
                            </div>
                            
                            {clientData.notes && (
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-brand-gray text-sm mb-1">Observações</p>
                                    <p className="text-white text-sm italic">"{clientData.notes}"</p>
                                </div>
                            )}

                            <hr className="border-white/10" />
                            <div className="flex justify-between">
                                <span className="text-brand-gray">Valor</span>
                                <span className="text-brand-purple font-bold text-lg">{formatarMoeda(selectedService.value)}</span>
                            </div>
                        </div>

                        <Button onClick={handleSubmit} disabled={submitting} fullWidth>
                            {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
                        </Button>
                    </div>
                )}

                {step === 7 && (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check size={40} className="text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Agendamento Confirmado!</h2>
                        <p className="text-brand-gray mb-8">
                            Enviamos os detalhes para o seu email. Aguarde a confirmação do profissional.
                        </p>
                        
                        <div className="bg-brand-dark rounded-lg p-6 text-left mb-6">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-brand-gray">Serviço</span>
                                    <span className="text-white">{selectedService.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-gray">Data</span>
                                    <span className="inline-block text-white first-letter:uppercase">{formatarDataCompleta(selectedDate)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-gray">Horário</span>
                                    <span className="text-white">{selectedSlot.slice(0, 5)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-gray">Valor</span>
                                    <span className="text-brand-purple font-bold">{formatarMoeda(selectedService.value)}</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-brand-gray text-sm mb-4">
                            Para ver ou cancelar seus agendamentos, acesse usando seu email:
                        </p>

                        <Button onClick={() => navigate(`/meus-agendamentos?email=${clientData.email}`)} variant="outline" fullWidth>
                            Ver Meus Agendamentos
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}