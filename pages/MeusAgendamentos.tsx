import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppointments } from '@/contexts';

import { Calendar, Clock, Scissors, Search, X } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

import { formatarMoeda, formatarData } from '@/utils';

const STATUS_CONFIG = 
{
    PENDING: { label: 'Aguardando confirmação', color: 'bg-yellow-500/20 text-yellow-500' },
    CONFIRMED: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-500' },
    COMPLETED: { label: 'Concluído', color: 'bg-green-500/20 text-green-500' },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-500/20 text-red-500' },
    NO_SHOW: { label: 'Não compareceu', color: 'bg-gray-500/20 text-gray-500' },
};

export default function MeusAgendamentos() 
{
    const [searchParams] = useSearchParams();
    
    const { setError, getClientAppointments, cancelClientAppointment } = useAppointments();

    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => 
    {
        if (!email.trim()) 
        {
            setError('Digite seu email');
            return;
        }

        try 
        {
            setLoading(true);
            setError(null);
            const data = await getClientAppointments(email);
            setAppointments(data);
            setSearched(true);
        } 
        catch (err) 
        {
            console.error(err);
        } 
        finally 
        {
            setLoading(false);
        }
    };

    const handleCancel = async (appointmentId) => 
    {
        const reason = prompt('Motivo do cancelamento:');
        if (!reason || reason === '') return;
        
        try 
        {
            setLoading(true);
            await cancelClientAppointment(appointmentId, email, reason);
            setAppointments(prev => prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'CANCELLED', cancelReason: reason } : apt));
        } 
        catch (err) 
        {
            console.error(err);
        } 
        finally 
        {
            setLoading(false);
        }
    };

    const canCancel = (apt) => { return apt.status === 'PENDING' || apt.status === 'CONFIRMED'; };

    const upcomingAppointments = appointments.filter(apt => ['PENDING', 'CONFIRMED'].includes(apt.status) && new Date(apt.appointmentDate) >= new Date(new Date().toDateString()));
    const pastAppointments = appointments.filter(apt => !['PENDING', 'CONFIRMED'].includes(apt.status) || new Date(apt.appointmentDate) < new Date(new Date().toDateString()));

    return (
        <div className="min-h-screen bg-brand-darker">
            <div className="max-w-2xl mx-auto px-6 py-8">
                <h1 className="text-2xl font-bold text-white mb-2">Meus Agendamentos</h1>
                <p className="text-brand-gray mb-8">Digite seu email para ver seus agendamentos</p>

                <div className="flex gap-2 mb-8">
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" fullWidth
                        onKeyPress={e => e.key === 'Enter' && handleSearch()} />
                    <Button onClick={handleSearch} disabled={loading} className="flex items-center justify-center gap-2" >
                        <Search size={16} />
                        {loading ? 'Buscando...' : 'Buscar'}
                    </Button>
                </div>

                {searched && appointments.length === 0 && (
                    <div className="text-center py-12 bg-brand-dark rounded-lg">
                        <Calendar size={48} className="mx-auto text-brand-gray mb-4" />
                        <p className="text-brand-gray">Nenhum agendamento encontrado para este email</p>
                    </div>
                )}

                {upcomingAppointments.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4">Próximos Agendamentos</h2>
                        <div className="space-y-4">
                            {upcomingAppointments.map(apt => (
                                <div key={apt.id} className="bg-brand-dark rounded-lg p-4 border border-white/10">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-brand-purple/20 rounded-full flex items-center justify-center">
                                                <Scissors size={18} className="text-brand-purple" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{apt.barberName}</p>
                                                <p className="text-brand-gray text-sm">{apt.barberShop}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${STATUS_CONFIG[apt.status].color}`}>
                                            {STATUS_CONFIG[apt.status].label}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar size={14} className="text-brand-gray" />
                                            <span className="text-white capitalize">{formatarData(apt.appointmentDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock size={14} className="text-brand-gray" />
                                            <span className="text-white">
                                                {apt.startTime.slice(0, 5)} - {apt.endTime.slice(0, 5)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-3 border-t border-white/10">
                                        <div>
                                            <p className="text-brand-gray text-sm">{apt.serviceName}</p>
                                            <p className="text-brand-purple font-bold">{formatarMoeda(apt.price)}</p>
                                        </div>
                                        
                                        {canCancel(apt) && (
                                            <Button onClick={() => handleCancel(apt.id)} variant="outline" disabled={loading} className="flex items-center justify-center gap-2" >
                                                <X size={14}/>
                                                Cancelar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {pastAppointments.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-white mb-4">Histórico</h2>
                        <div className="space-y-3">
                            {pastAppointments.map(apt => (
                                <div key={apt.id} className="bg-brand-dark/50 rounded-lg p-4 border border-white/5">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-white text-sm">{apt.serviceName}</p>
                                            <p className="text-brand-gray text-xs">
                                                {formatarData(apt.appointmentDate)} às {apt.startTime.slice(0, 5)}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${STATUS_CONFIG[apt.status].color}`}>
                                            {STATUS_CONFIG[apt.status].label}
                                        </span>
                                    </div>
                                    
                                    {apt.cancelReason && (
                                        <p className="text-brand-gray text-xs mt-2 italic">
                                            Motivo: {apt.cancelReason}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}