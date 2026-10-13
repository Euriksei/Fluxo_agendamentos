const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validateEmail = (email) => emailRegex.test(email);

const cpfRegex = /^\d{11}$/;
export const validateCPF = (cpf) => cpfRegex.test(cpf?.replace(/\D/g, ''));

export const validatePhone = (phone) => /^\d{10,11}$/.test(phone.replace(/\D/g, ''));

// Regra única de senha (cadastro, redefinição por email e troca dentro do app)
export const PASSWORD_MIN_LENGTH = 8;
export const validatePassword = (password) => typeof password === 'string' && password.length >= PASSWORD_MIN_LENGTH;
