const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validateEmail = (email) => emailRegex.test(email);

// CPF/CNPJ de verdade (tamanho + dígitos verificadores; sequências repetidas como 111.111.111-11 são recusadas).
// Retorna { valid, type: 'CPF' | 'CNPJ' | null, digits, error } com a mensagem pronta para o usuário.
const checkDigit = (digits, weights) =>
{
    const sum = weights.reduce((acc, weight, i) => acc + Number(digits[i]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
};

const isValidCpf = (d) =>
{
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const first = checkDigit(d, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = checkDigit(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return first === Number(d[9]) && second === Number(d[10]);
};

const isValidCnpj = (d) =>
{
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
    const first = checkDigit(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = checkDigit(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return first === Number(d[12]) && second === Number(d[13]);
};

export const validateCpfCnpj = (value) =>
{
    const digits = String(value ?? '').replace(/\D/g, '');

    if (!digits) return { valid: false, type: null, digits, error: 'Informe o CPF ou CNPJ' };
    if (digits.length === 11) return isValidCpf(digits) ? { valid: true, type: 'CPF', digits, error: null } : { valid: false, type: 'CPF', digits, error: 'CPF inválido' };
    if (digits.length === 14) return isValidCnpj(digits) ? { valid: true, type: 'CNPJ', digits, error: null } : { valid: false, type: 'CNPJ', digits, error: 'CNPJ inválido' };

    return { valid: false, type: null, digits, error: 'CPF ou CNPJ inválido: use 11 dígitos (CPF) ou 14 (CNPJ)' };
};

export const validateCPF = (cpf) => isValidCpf(String(cpf ?? '').replace(/\D/g, ''));

export const validatePhone = (phone) => /^\d{10,11}$/.test(phone.replace(/\D/g, ''));

// Regra única de senha (cadastro, redefinição por email e troca dentro do app)
export const PASSWORD_MIN_LENGTH = 8;
export const validatePassword = (password) => typeof password === 'string' && password.length >= PASSWORD_MIN_LENGTH;
