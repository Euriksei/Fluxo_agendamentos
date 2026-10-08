import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts';

import Logo from '@/components/Logo';
import ShapeWaves from '@/components/ui/ShapeWaves';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function Login()
{
    const { user, login } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        setLoading(true);

        try
        {
            await login(email, password);
            navigate('/dashboard', { replace: true });
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

            <div className="relative z-10 w-full max-w-md">

                <Logo variant="full" textVariant="gradient" size="xl" className="flex-col gap-0 mb-8" />

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Acessar Plataforma</CardTitle>
                        <CardDescription>Entre com suas credenciais para continuar</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                            </div>

                            <Button type="submit" size="lg" disabled={loading} aria-busy={loading} className="w-full mt-2">
                                {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
                                {loading ? 'Entrando...' : 'Entrar'}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="justify-center">
                        <p className="text-sm text-brand-gray">
                            Ainda não possui conta?{' '}
                            <a href="/registro" className="gradient-text font-bold rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60">
                                Criar conta
                            </a>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </section>
    );
}
