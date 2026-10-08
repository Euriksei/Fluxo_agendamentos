export const formatarMoeda = (centavos) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const parseMoeda = (valor) => parseInt(valor.replace(/\D/g, '')) || 0;

export const formatarData = (data) => new Date(data).toLocaleDateString('pt-BR');

export const formatarDataCurta = (dateStr) => 
{
    if (!dateStr) return '';
    const d = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export const formatarDataCompleta = (dateStr) => 
{
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export const formatDateLocal = (date) => 
{
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Today's date (YYYY-MM-DD) in the user's local timezone; toISOString() would use UTC and roll over early in the evening.
export const hojeLocal = () => formatDateLocal(new Date());

export const formatarHora = (time) => 
{
    if (!time) return '-';
    return time.toString().slice(0, 5);
};

export const formatarTelefone = (value) => 
{
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
};

export const isAppointmentDone = (appointment) =>
{
    const aptDate = typeof appointment.appointmentDate === 'string' ? appointment.appointmentDate.split('T')[0] : appointment.appointmentDate.toISOString().split('T')[0];
 
    const endTime = appointment.endTime?.slice(0, 5) || '23:59';
 
    const now = new Date();
    const todayStr = formatDateLocal(now);
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
 
    if (aptDate < todayStr) return true;
    if (aptDate === todayStr && endTime <= currentTime) return true;
    return false;
};