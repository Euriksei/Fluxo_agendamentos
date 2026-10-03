import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts';

import Logo from '@/components/Logo';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function Login() 
{
    const { user, login } = useAuth();

    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => { if (user) window.location.href = '/dashboard'; }, [user]);

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        setLoading(true);

        try 
        {
            await login(email, password);
            window.location.href = '/dashboard';
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
            <div className="w-full max-w-md">
                
                <Logo variant="full" textVariant="gradient" size="xl" className="flex-col gap-0 mb-8" />

                <div className="bg-brand-dark border border-white/5 rounded-2xl p-8 shadow-2xl">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Acessar Plataforma
                        </h1>
                        <p className="text-brand-gray text-sm">
                            Entre com suas credenciais para continuar
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm text-brand-gray mb-2">
                                E-mail
                            </label>
                            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" fullWidth />
                        </div>

                        <div>
                            <label className="block text-sm text-brand-gray mb-2">
                                Senha
                            </label>
                            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" fullWidth />
                        </div>

                        <Button type="submit" disabled={loading} variant="primary" fullWidth >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-brand-gray">
                            Ainda não possui conta?{' '}
                            <a href="/registro" className="gradient-text font-bold" >
                                Criar conta
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}