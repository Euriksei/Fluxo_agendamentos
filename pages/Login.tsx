import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, MailWarning } from 'lucide-react';
import { useAuth, notifyError } from '@/contexts';

import Logo from '@/components/Logo';
import ReenviarConfirmacao from '@/components/ReenviarConfirmacao';
import WavesBackground from '@/components/ui/WavesBackground';
import SpecularButton from '@/components/ui/SpecularButton';
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
    // Correct password but the email was never confirmed: the API answers 403 EMAIL_NOT_VERIFIED with the account email
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

    useEffect(() => { if (user) navigate('/dashboard', { replace: true }); }, [user, navigate]);

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        setLoading(true);
        setUnverifiedEmail(null);

        try
        {
            await login(email, password, { silent: true });
            navigate('/dashboard', { replace: true });
        }
        catch (err)
        {
            if (err?.data?.code === 'EMAIL_NOT_VERIFIED') setUnverifiedEmail(err.data.email || email.trim());
            else notifyError(err instanceof TypeError ? 'Falha de conexão. Verifique sua internet e tente novamente.' : err.message);
        }
        finally
        {
            setLoading(false);
        }
    };

    return (
        <section className="relative min-h-svh flex items-center justify-center bg-brand-black px-4 py-10 overflow-hidden">
            <WavesBackground color="#3F3F52" hoverColor="#7C3AED" backgroundColor="#0F0F14" cellSize={12} glow={0.4} fade={0.3} />

            <div className="relative z-10 w-full max-w-md">

                <Logo variant="full" textVariant="gradient" size="xl" className="flex-col gap-0 mb-8" />

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Acessar Plataforma</CardTitle>
                        <CardDescription>Entre com suas credenciais para continuar</CardDescription>
                    </CardHeader>

                    <CardContent>
                        {unverifiedEmail && (
                            <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
                                <div className="flex items-start gap-3">
                                    <MailWarning className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden="true" />
                                    <div className="grid gap-1 text-sm">
                                        <p className="font-semibold text-white">Confirme seu email para entrar</p>
                                        <p className="text-brand-gray">
                                            Enviamos um link de confirmação para <span className="break-all text-white">{unverifiedEmail}</span>. Confira também a caixa de spam.
                                        </p>
                                    </div>
                                </div>
                                <ReenviarConfirmacao email={unverifiedEmail} />
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="password">Senha</Label>
                                    <Link to="/esqueci-senha" className="-my-3 inline-flex min-h-11 items-center px-1 text-sm text-brand-gray underline-offset-4 rounded-sm hover:text-white hover:underline outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60">
                                        Esqueci minha senha
                                    </Link>
                                </div>
                                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                            </div>

                            <SpecularButton
                                type="submit"
                                size="md"
                                radius={12}
                                tint="#7C3AED"
                                tintOpacity={1}
                                lineColor="#E9D5FF"
                                baseColor="#5B21B6"
                                autoAnimate
                                disabled={loading}
                                aria-busy={loading}
                                className="w-full mt-2 min-h-12"
                            >
                                <span className="inline-flex items-center justify-center gap-2 text-sm font-semibold">
                                    {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                                    {loading ? 'Entrando...' : 'Entrar'}
                                </span>
                            </SpecularButton>
                        </form>
                    </CardContent>

                    <CardFooter className="justify-center">
                        <p className="text-sm text-brand-gray">
                            Ainda não possui conta?{' '}
                            <a href="/registro" className="inline-flex min-h-11 items-center px-1 gradient-text font-bold rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60">
                                Criar conta
                            </a>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </section>
    );
}
