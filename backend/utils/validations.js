const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validateEmail = (email) => emailRegex.test(email);

const cpfRegex = /^\d{11}$/;
export const validateCPF = (cpf) => cpfRegex.test(cpf?.replace(/\D/g, ''));

export const validatePhone = (phone) => /^\d{10,11}$/.test(phone.replace(/\D/g, ''));