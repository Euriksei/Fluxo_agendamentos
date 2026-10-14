export const formatarMoeda = (centavos) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Values coming from Asaas (payment.value, netValue, firstPayment.value) are already in REAIS (29.9); our database keeps CENTAVOS (2990).
export const formatarReais = (reais) => Number(reais ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

// DATE columns arrive as an ISO timestamp at the server's midnight: keep only YYYY-MM-DD and never shift the timezone.
export const diaISO = (value) => (value ? String(value).slice(0, 10) : '');
export const formatarDia = (value) => (value ? new Date(diaISO(value) + 'T00:00:00').toLocaleDateString('pt-BR') : '');

// Plan granted by the admin (no Asaas billing): nextPaymentAt is the validity date, valid through the end of that day.
export const validadeConcedida = (value) => (diaISO(value) < hojeLocal() ? 'Venceu em ' : 'Vence em ') + formatarDia(value);

export const formatarIntervalo = (minutos) => (Number(minutos) === 0 ? 'Sem intervalo' : `${minutos} min`);

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
// ---- CPF/CNPJ: same rule as the API (backend/utils/validations.js validateCpfCnpj) ----
const cpfCnpjCheckDigit = (digits: string, weights: number[]) =>
{
    const rest = weights.reduce((acc, weight, i) => acc + Number(digits[i]) * weight, 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
};

const cpfValido = (d: string) => d.length === 11 && !/^(\d)\1{10}$/.test(d)
    && cpfCnpjCheckDigit(d, [10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[9]) && cpfCnpjCheckDigit(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[10]);

const cnpjValido = (d: string) => d.length === 14 && !/^(\d)\1{13}$/.test(d)
    && cpfCnpjCheckDigit(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[12]) && cpfCnpjCheckDigit(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[13]);

export const validarCpfCnpj = (value): { valid: boolean; error: string | null } =>
{
    const d = String(value ?? '').replace(/\D/g, '');
    if (!d) return { valid: false, error: 'Informe o CPF ou CNPJ' };
    if (d.length === 11) return cpfValido(d) ? { valid: true, error: null } : { valid: false, error: 'CPF inválido' };
    if (d.length === 14) return cnpjValido(d) ? { valid: true, error: null } : { valid: false, error: 'CNPJ inválido' };
    return { valid: false, error: 'CPF ou CNPJ inválido: use 11 dígitos (CPF) ou 14 (CNPJ)' };
};

// Mask while typing: 000.000.000-00 up to 11 digits, 00.000.000/0000-00 from 12 to 14
export const formatarCpfCnpj = (value) =>
{
    const d = String(value ?? '').replace(/\D/g, '').slice(0, 14);
    if (d.length <= 11) return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};
