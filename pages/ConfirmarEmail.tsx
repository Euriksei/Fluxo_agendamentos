import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleCheck, Loader2, TriangleAlert } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

import Logo from '@/components/Logo';
import ReenviarConfirmacao from '@/components/ReenviarConfirmacao';
import WavesBackground from '@/components/ui/WavesBackground';
import SpecularButton from '@/components/ui/SpecularButton';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';

const TOKEN_FORMAT = /^[a-f0-9]{64}$/;

type Status = 'loading' | 'done' | 'invalid' | 'error';

const linkClass = 'inline-flex min-h-11 items-center px-1 gradient-text font-bold rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60';

export default function ConfirmarEmail()
{
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const navigate = useNavigate();
    const { publicRequest } = useApi();

    const [status, setStatus] = useState<Status>(() => TOKEN_FORMAT.test(token) ? 'loading' : 'invalid');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');

    // StrictMode runs effects twice in dev: the token must be sent once (the second call would see it already used)
    const requested = useRef(false);

    useEffect(() =>
    {
        if (status !== 'loading' || requested.current) return;
        requested.current = true;

        publicRequest('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }), silent: true })
            .then((data) => { setMessage(data.message); setStatus('done'); })
            .catch((err) => setStatus(err?.data?.code === 'INVALID_VERIFY_TOKEN' ? 'invalid' : 'error'));
    }, [status, token, publicRequest]);

    const title = { loading: 'Confirmando email', done: 'Email confirmado', invalid: 'Link inválido ou expirado', error: 'Não foi possível confirmar' }[status];

    return (
        <section className="relative min-h-svh flex items-center justify-center bg-brand-black px-4 py-10 overflow-hidden">
            <WavesBackground color="#3F3F52" hoverColor="#7C3AED" backgroundColor="#0F0F14" cellSize={12} glow={0.4} fade={0.3} />

            <div className="relative z-10 w-full max-w-md">

                <Logo variant="full" textVariant="gradient" size="xl" className="flex-col gap-0 mb-8" />

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>{title}</CardTitle>
                    </CardHeader>

                    <CardContent>
                        {status === 'loading' && (
                            <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
                                <Loader2 className="size-8 animate-spin text-brand-purple motion-reduce:animate-none" aria-hidden="true" />
                                <p className="text-sm text-brand-gray">Aguarde um instante...</p>
                            </div>
                        )}

                        {status === 'done' && (
                            <div role="status" className="flex flex-col items-center gap-4 text-center">
                                <CircleCheck className="size-10 text-green-400" aria-hidden="true" />
                                <p className="text-sm text-white">{message}</p>
                                <SpecularButton type="button" onClick={() => navigate('/login', { replace: true })} size="md" radius={12} tint="#7C3AED" tintOpacity={1}
                                    lineColor="#E9D5FF" baseColor="#5B21B6" autoAnimate className="w-full min-h-12">
                                    <span className="text-sm font-semibold">Entrar</span>
                                </SpecularButton>
                            </div>
                        )}

                        {status === 'error' && (
                            <div role="alert" className="flex flex-col items-center gap-3 text-center">
                                <TriangleAlert className="size-10 text-amber-400" aria-hidden="true" />
                                <p className="text-sm text-white">Ocorreu um erro ao confirmar seu email. Verifique sua conexão e tente novamente.</p>
                                <button type="button" onClick={() => { requested.current = false; setStatus('loading'); }}
                                    className="inline-flex min-h-11 items-center px-2 text-sm text-brand-gray underline underline-offset-4 rounded-sm hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60">
                                    Tentar novamente
                                </button>
                            </div>
                        )}

                        {status === 'invalid' && (
                            <div className="flex flex-col gap-4">
                                <div role="alert" className="flex flex-col items-center gap-3 text-center">
                                    <TriangleAlert className="size-10 text-amber-400" aria-hidden="true" />
                                    <p className="text-sm text-white">Este link de confirmação é inválido ou expirou.</p>
                                    <p className="text-sm text-brand-gray">Os links valem por 24 horas. Informe seu e-mail para receber um novo.</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">E-mail</Label>
                                    <Input id="email" type="email" autoComplete="email" maxLength={100} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                                </div>

                                <ReenviarConfirmacao email={email.trim()} label="Enviar novo link" />
                            </div>
                        )}
                    </CardContent>

                    {status !== 'done' && status !== 'loading' && (
                        <CardFooter className="justify-center">
                            <p className="text-sm text-brand-gray">
                                Já confirmou?{' '}
                                <Link to="/login" className={linkClass}>Fazer login</Link>
                            </p>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </section>
    );
}
