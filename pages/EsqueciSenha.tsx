import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

import Logo from '@/components/Logo';
import WavesBackground from '@/components/ui/WavesBackground';
import SpecularButton from '@/components/ui/SpecularButton';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';

// The API answers the same way whether or not the email exists, so the page does too.
const SENT_MESSAGE = 'Se o email estiver cadastrado, você receberá um link em instantes.';

export default function EsqueciSenha()
{
    const { publicRequest } = useApi();

    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [email, setEmail] = useState('');

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        setLoading(true);

        try
        {
            await publicRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
            setSent(true);
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

            <div className="relative z-10 w-full max-w-md">

                <Logo variant="full" textVariant="gradient" size="xl" className="flex-col gap-0 mb-8" />

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Esqueci minha senha</CardTitle>
                        <CardDescription>Informe o e-mail da sua conta para receber um link de redefinição</CardDescription>
                    </CardHeader>

                    <CardContent>
                        {sent ? (
                            <div role="status" className="flex flex-col items-center gap-3 text-center">
                                <MailCheck className="size-10 text-brand-purple" aria-hidden="true" />
                                <p className="text-sm text-white">{SENT_MESSAGE}</p>
                                <p className="text-sm text-brand-gray">O link vale por 1 hora. Confira também a caixa de spam.</p>
                                <button type="button" onClick={() => setSent(false)}
                                    className="inline-flex min-h-11 items-center px-2 text-sm text-brand-gray underline underline-offset-4 rounded-sm hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60">
                                    Enviar para outro e-mail
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input id="email" type="email" autoComplete="email" maxLength={100} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
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
                                        {loading ? 'Enviando...' : 'Enviar link'}
                                    </span>
                                </SpecularButton>
                            </form>
                        )}
                    </CardContent>

                    <CardFooter className="justify-center">
                        <p className="text-sm text-brand-gray">
                            Lembrou a senha?{' '}
                            <Link to="/login" className="inline-flex min-h-11 items-center px-1 gradient-text font-bold rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60">
                                Fazer login
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </section>
    );
}
