import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { useAuth } from '@/contexts';

import Logo from '@/components/Logo';
import ReenviarConfirmacao from '@/components/ReenviarConfirmacao';
import WavesBackground from '@/components/ui/WavesBackground';
import SpecularButton from '@/components/ui/SpecularButton';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';

export default function Register()
{
    const { register, setError } = useAuth();

    const [loading, setLoading] = useState(false);
    // Set after a successful register: the account only signs in after confirming the email
    const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

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

            const created = await register(form);
            setRegisteredEmail(created.email);
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
            <WavesBackground color="#3F3F52" hoverColor="#7C3AED" backgroundColor="#0F0F14" cellSize={12} glow={0.4} fade={0.3} />

            <div className="relative z-10 w-full max-w-xl">

                <Logo variant="full" textVariant="gradient" size="xl" className="flex-col gap-0 mb-6" />

                {registeredEmail ? <ConfirmeSeuEmail email={registeredEmail} /> : (
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
                                    {loading ? 'Registrando...' : 'Registrar'}
                                </span>
                            </SpecularButton>
                        </form>
                    </CardContent>

                    <CardFooter className="justify-center">
                        <p className="text-sm text-brand-gray">
                            Já possui conta?{' '}
                            <a href="/login" className="inline-flex min-h-11 items-center px-1 gradient-text font-bold rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60">
                                Fazer login
                            </a>
                        </p>
                    </CardFooter>
                </Card>
                )}
            </div>
        </section>
    );
}

function ConfirmeSeuEmail({ email }: { email: string })
{
    return (
        <Card>
            <CardHeader className="text-center">
                <MailCheck className="mx-auto mb-2 size-10 text-brand-purple" aria-hidden="true" />
                <CardTitle>Confirme seu email</CardTitle>
                <CardDescription>Falta só um passo para acessar sua conta</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 text-center">
                <p role="status" className="text-sm text-white">
                    Enviamos um link de confirmação para <strong className="break-all">{email}</strong>. Abra o email e clique em <strong>Confirmar email</strong>.
                </p>
                <p className="text-sm text-brand-gray">O link vale por 24 horas. Se não encontrar, confira a caixa de spam ou lixo eletrônico.</p>

                <ReenviarConfirmacao email={email} startCoolingDown label="Reenviar email" />
            </CardContent>

            <CardFooter className="justify-center">
                <p className="text-sm text-brand-gray">
                    Já confirmou?{' '}
                    <Link to="/login" className="inline-flex min-h-11 items-center px-1 gradient-text font-bold rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60">
                        Fazer login
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}
