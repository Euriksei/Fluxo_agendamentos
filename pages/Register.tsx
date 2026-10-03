import { useState } from 'react';
import { useAuth } from '@/contexts';

import Logo from '@/components/Logo';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function Register() 
{
    const { login, register, setError } = useAuth();

    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({ name: '', shop: '', email: '', password: '', confPassword: '', role: 'BARBER' });

    const handleChange = (e) => { const { name, value } = e.target; setForm((prev) => ({ ...prev, [name]: value })); };

    const handleSubmit = async (e) =>
    {
        e.preventDefault();

        setError(null);
        setLoading(true);

        try 
        {
            if (form.password !== form.confPassword)
            {
                setError("As senhas não coincidem");
                return;
            }

            await register(form);

            const user = await login(form.email, form.password);
            if (user) window.location.href = '/dashboard';
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

    return (
        <section className="min-h-screen flex items-center justify-center bg-brand-black px-4">
            <div className="w-full max-w-xl">
                
                <Logo variant="full" textVariant="gradient" size="xl" className="flex-col gap-0 mb-6" />

                <div className="bg-brand-dark border border-white/5 rounded-2xl p-8 shadow-2xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Criar Conta
                        </h1>
                        <p className="text-brand-gray text-sm">
                            Registre-se para gerenciar seus dados
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-brand-gray mb-1">
                                Seu Nome
                            </label>
                            <Input name="name" type="text" maxLength={50} required value={form.name} onChange={handleChange} placeholder="João da Silva" fullWidth />
                        </div>

                        <div>
                            <label className="block text-sm text-brand-gray mb-1">
                                Nome do Negócio
                            </label>
                            <Input name="shop" type="text" maxLength={30} required value={form.shop} onChange={handleChange} placeholder="Barber Shop" fullWidth />
                        </div>

                        <div>
                            <label className="block text-sm text-brand-gray mb-1">
                                E-mail
                            </label>
                            <Input name="email" type="email" maxLength={100} required value={form.email} onChange={handleChange} placeholder="seu@email.com" fullWidth />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm text-brand-gray mb-1">
                                    Senha
                                </label>
                                <Input name="password" type="password" required value={form.password} onChange={handleChange} placeholder="••••••••" fullWidth />
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm text-brand-gray mb-1">
                                    Confirmar Senha
                                </label>
                                <Input name="confPassword" type="password" required value={form.confPassword} onChange={handleChange} placeholder="••••••••" fullWidth />
                            </div>
                        </div>

                        <Button type="submit" disabled={loading} variant="primary" fullWidth >
                            {loading ? 'Registrando...' : 'Registrar'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-brand-gray">
                            Já possui conta?{' '}
                            <a href="/login" className="gradient-text font-bold" >
                                Fazer login
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}