import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppointments } from '@/contexts';

import { Calendar, Clock, Scissors, Search, X } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import ResponsiveModal from '@/components/ui/ResponsiveModal';

import { formatarMoeda, formatarData, formatarTelefone } from '@/utils';

const STATUS_CONFIG =
{
    PENDING: { label: 'Aguardando confirmação', color: 'bg-yellow-500/20 text-yellow-500' },
    CONFIRMED: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-500' },
    COMPLETED: { label: 'Concluído', color: 'bg-green-500/20 text-green-500' },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-500/20 text-red-500' },
    NO_SHOW: { label: 'Não compareceu', color: 'bg-gray-500/20 text-gray-500' },
};

const statusOf = (status) => STATUS_CONFIG[status] || { label: status, color: 'bg-gray-500/20 text-gray-400' };

export default function MeusAgendamentos()
{
    const [searchParams] = useSearchParams();

    const { setError, getClientAppointments, cancelClientAppointment } = useAppointments();

    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [telefone, setTelefone] = useState(formatarTelefone(searchParams.get('phone') || ''));
    const [buscaErro, setBuscaErro] = useState<string | null>(null);
    const [cancelErro, setCancelErro] = useState<string | null>(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Cancel sheet (replaces window.prompt, which is clumsy on phones)
    const [cancelando, setCancelando] = useState(null);
    const [motivo, setMotivo] = useState('');

    const handleSearch = async (e?: React.FormEvent) =>
    {
        e?.preventDefault();

        const digitos = telefone.replace(/\D/g, '');
        if (!email.trim() || digitos.length < 10)
        {
            setBuscaErro('Informe o email e o telefone (com DDD) usados no agendamento.');
            return;
        }

        try
        {
            setLoading(true);
            setError(null);
            setBuscaErro(null);
            const data = await getClientAppointments(email.trim(), digitos, { silent: true });
            setAppointments(data);
            setSearched(true);
        }
        catch (err)
        {
            console.error(err);
            setAppointments([]);
            // 404 = no booking matches this email + phone: shown as the empty state below
            if (err?.status === 404) setSearched(true);
            else setBuscaErro(err?.status ? (err.message || 'Não foi possível buscar.') : 'Falha de conexão. Verifique sua internet e tente novamente.');
        }
        finally
        {
            setLoading(false);
        }
    };

    // Coming from the booking confirmation (?email=...): search right away.
    useEffect(() => { if (searchParams.get('email') && searchParams.get('phone')) handleSearch(); }, []);

    const handleCancel = async (e: React.FormEvent) =>
    {
        e.preventDefault();
        if (!cancelando || !motivo.trim()) return;

        try
        {
            setLoading(true);
            setCancelErro(null);
            await cancelClientAppointment(cancelando.id, email.trim(), telefone, motivo.trim(), { silent: true });
            setAppointments(prev => prev.map(apt => apt.id === cancelando.id ? { ...apt, status: 'CANCELLED', cancelReason: motivo.trim() } : apt));
            setCancelando(null);
            setMotivo('');
        }
        catch (err)
        {
            console.error(err);
            setCancelErro(err?.status === 404 ? 'Nenhum agendamento encontrado com esses dados.' : err?.status ? (err.message || 'Não foi possível cancelar.') : 'Falha de conexão. Verifique sua internet e tente novamente.');
        }
        finally
        {
            setLoading(false);
        }
    };

    const canCancel= (apt) => { return apt.status === 'PENDING' || apt.status === 'CONFIRMED'; };

    const upcomingAppointments = appointments.filter(apt => ['PENDING', 'CONFIRMED'].includes(apt.status) && new Date(apt.appointmentDate) >= new Date(new Date().toDateString()));
    const pastAppointments = appointments.filter(apt => !['PENDING', 'CONFIRMED'].includes(apt.status) || new Date(apt.appointmentDate) < new Date(new Date().toDateString()));

    return (
        <div className="min-h-svh bg-brand-darker">
            <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
                <h1 className="text-2xl font-bold text-white mb-2">Meus Agendamentos</h1>
                <p className="text-brand-gray mb-6 sm:mb-8">Informe o email e o telefone usados no agendamento</p>

                <form onSubmit={handleSearch} role="search" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end mb-8">
                    <div className="min-w-0">
                        <label htmlFor="busca-email" className="block text-sm text-brand-gray mb-1">Email</label>
                        <Input id="busca-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="next"
                            value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" fullWidth required />
                    </div>
                    <div className="min-w-0">
                        <label htmlFor="busca-telefone" className="block text-sm text-brand-gray mb-1">Telefone/WhatsApp</label>
                        <Input id="busca-telefone" type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="search" maxLength={15}
                            value={telefone} onChange={e => setTelefone(formatarTelefone(e.target.value))} placeholder="(00) 00000-0000" fullWidth required />
                    </div>
                    <Button type="submit" disabled={loading} className="sm:shrink-0" >
                        <Search size={16} aria-hidden="true" />
                        {loading ? 'Buscando...' : 'Buscar'}
                    </Button>
                    {buscaErro && <p role="alert" className="sm:col-span-3 text-sm text-red-400">{buscaErro}</p>}
                </form>

                {searched && appointments.length === 0 && (
                    <div className="text-center py-12 bg-brand-dark rounded-lg">
                        <Calendar size={48} className="mx-auto text-brand-gray mb-4" aria-hidden="true" />
                        <p className="text-brand-gray">Nenhum agendamento encontrado com esses dados</p>
                    </div>
                )}

                {upcomingAppointments.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4">Próximos Agendamentos</h2>
                        <ul className="space-y-4">
                            {upcomingAppointments.map(apt => (
                                <li key={apt.id} className="bg-brand-dark rounded-lg p-4 border border-white/10">
                                    <div className="flex justify-between items-start gap-3 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 shrink-0 bg-brand-purple/20 rounded-full flex items-center justify-center">
                                                <Scissors size={18} className="text-brand-purple" aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white font-medium truncate">{apt.barberName}</p>
                                                <p className="text-brand-gray text-sm truncate">{apt.barberShop}</p>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 text-xs px-2 py-1 rounded ${statusOf(apt.status).color}`}>
                                            {statusOf(apt.status).label}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar size={14} className="text-brand-gray" aria-hidden="true" />
                                            <span className="text-white">{formatarData(apt.appointmentDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock size={14} className="text-brand-gray" aria-hidden="true" />
                                            <span className="text-white">
                                                {apt.startTime.slice(0, 5)} - {apt.endTime.slice(0, 5)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center gap-3 pt-3 border-t border-white/10">
                                        <div className="min-w-0">
                                            <p className="text-brand-gray text-sm break-words">{apt.serviceName}</p>
                                            <p className="text-brand-purple font-bold">{formatarMoeda(apt.price)}</p>
                                        </div>

                                        {canCancel(apt) && (
                                            <Button onClick={() => { setMotivo(''); setCancelErro(null); setCancelando(apt); }}variant="outline" disabled={loading} className="shrink-0 px-4!" >
                                                <X size={14} aria-hidden="true" />
                                                Cancelar
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {pastAppointments.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-4">Histórico</h2>
                        <ul className="space-y-3">
                            {pastAppointments.map(apt => (
                                <li key={apt.id} className="bg-brand-dark/50 rounded-lg p-4 border border-white/5">
                                    <div className="flex justify-between items-center gap-3">
                                        <div className="min-w-0">
                                            <p className="text-white text-sm break-words">{apt.serviceName}</p>
                                            <p className="text-brand-gray text-xs">
                                                {formatarData(apt.appointmentDate)} às {apt.startTime.slice(0, 5)}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 text-xs px-2 py-1 rounded ${statusOf(apt.status).color}`}>
                                            {statusOf(apt.status).label}
                                        </span>
                                    </div>

                                    {apt.cancelReason && (
                                        <p className="text-brand-gray text-xs mt-2 italic break-words">
                                            Motivo: {apt.cancelReason}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>

            {cancelando && (
                <ResponsiveModal title="Cancelar agendamento" onClose={() => setCancelando(null)} onSubmit={handleCancel}
                    footer={
                        <>
                            <Button type="button" onClick={() => setCancelando(null)} variant="outline" fullWidth>Voltar</Button>
                            <Button type="submit" variant="destructive" disabled={loading || !motivo.trim()} fullWidth>{loading ? 'Cancelando...' : 'Cancelar'}</Button>
                        </>
                    }>
                    <p className="text-brand-gray text-sm">
                        {cancelando.serviceName} · {formatarData(cancelando.appointmentDate)} às {cancelando.startTime.slice(0, 5)}
                    </p>
                    <div>
                        <label htmlFor="motivo-cancelamento" className="block text-sm text-brand-gray mb-1">Motivo do cancelamento</label>
                        <TextArea id="motivo-cancelamento" value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} maxLength={255} required fullWidth
                            placeholder="Ex: imprevisto no trabalho" />
                    </div>
                    {cancelErro && <p role="alert" className="text-sm text-red-400">{cancelErro}</p>}
                </ResponsiveModal>
            )}
        </div>
    );
}
