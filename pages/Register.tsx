import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts';

import Logo from '@/components/Logo';
import ShapeWaves from '@/components/ui/ShapeWaves';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function Register()
{
    const { login, register, setError } = useAuth();

    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({ name: '', shop: '', email: '', password: '', confPassword: '', role: 'BARBER' });

    const passwordMismatch = form.confPassword.length > 0 && form.password !== form.confPassword;

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
        <section className="relative min-h-svh flex items-center justify-center bg-brand-black px-4 py-10 overflow-hidden">
            <div className="absolute inset-0" aria-hidden="true">
                <ShapeWaves color="#3F3F52" hoverColor="#7C3AED" backgroundColor="#0F0F14" cellSize={12} glow={0.4} fade={0.3} />
            </div>

            <div className="relative z-10 w-full max-w-xl">

                <Logo variant="full" textVariant="gradient" size="xl" className="flex-col gap-0 mb-6" />

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Criar Conta</CardTitle>
                        <CardDescription>Registre-se para gerenciar seus dados</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Seu Nome</Label>
                                <Input id="name" name="name" type="text" autoComplete="name" maxLength={50} required value={form.name} onChange={handleChange} placeholder="João da Silva" />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="shop">Nome do Negócio</Label>
                                <Input id="shop" name="shop" type="text" autoComplete="organization" maxLength={30} required value={form.shop} onChange={handleChange} placeholder="Barber Shop" />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" name="email" type="email" autoComplete="email" maxLength={100} required value={form.email} onChange={handleChange} placeholder="seu@email.com" />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Senha</Label>
                                    <Input id="password" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={handleChange} placeholder="••••••••" />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="confPassword">Confirmar Senha</Label>
                                    <Input id="confPassword" name="confPassword" type="password" autoComplete="new-password" required value={form.confPassword} onChange={handleChange} placeholder="••••••••" aria-invalid={passwordMismatch || undefined} aria-describedby={passwordMismatch ? 'confPassword-error' : undefined} />
                                </div>
                            </div>

                            {passwordMismatch && (
                                <p id="confPassword-error" role="alert" className="-mt-1 text-sm text-red-400">
                                    As senhas não coincidem
                                </p>
                            )}

                            <Button type="submit" size="lg" disabled={loading} aria-busy={loading} className="w-full mt-2">
                                {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
                                {loading ? 'Registrando...' : 'Registrar'}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="justify-center">
                        <p className="text-sm text-brand-gray">
                            Já possui conta?{' '}
                            <a href="/login" className="gradient-text font-bold rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60">
                                Fazer login
                            </a>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </section>
    );
}
