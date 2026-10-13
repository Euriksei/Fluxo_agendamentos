import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleCheck, Loader2, TriangleAlert } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

import Logo from '@/components/Logo';
import WavesBackground from '@/components/ui/WavesBackground';
import SpecularButton from '@/components/ui/SpecularButton';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';

// Same rule as the register form and the API (backend/utils/validations.js)
const PASSWORD_MIN_LENGTH = 8;
const TOKEN_FORMAT = /^[a-f0-9]{64}$/;

type Status = 'form' | 'done' | 'invalid';

const linkClass = 'inline-flex min-h-11 items-center px-1 gradient-text font-bold rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60';

export default function RedefinirSenha()
{
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const navigate = useNavigate();
    const { publicRequest } = useApi();

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<Status>(() => TOKEN_FORMAT.test(token) ? 'form' : 'invalid');
    const [formError, setFormError] = useState<string | null>(null);

    const [password, setPassword] = useState('');
    const [confPassword, setConfPassword] = useState('');

    const passwordTooShort = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
    const passwordMismatch = confPassword.length > 0 && password !== confPassword;

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        setFormError(null);

        if (password.length < PASSWORD_MIN_LENGTH || password !== confPassword) return;

        setLoading(true);

        try
        {
            await publicRequest('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password, confPassword }), silent: true });
            setStatus('done');
        }
        catch (err)
        {
            if (err?.data?.code === 'INVALID_RESET_TOKEN') setStatus('invalid');
            else setFormError(err instanceof TypeError ? 'Falha de conexão. Verifique sua internet e tente novamente.' : err.message);
        }
        finally
        {
            setLoading(false);
        }
    };

    const title = status === 'done' ? 'Senha redefinida' : status === 'invalid' ? 'Link inválido' : 'Redefinir senha';
    const description = status === 'form' ? 'Crie uma nova senha para acessar sua conta' : undefined;

    return (
        <section className="relative min-h-svh flex items-center justify-center bg-brand-black px-4 py-10 overflow-hidden">
            <WavesBackground color="#3F3F52" hoverColor="#7C3AED" backgroundColor="#0F0F14" cellSize={12} glow={0.4} fade={0.3} />

            <div className="relative z-10 w-full max-w-md">

                <Logo variant="full" textVariant="gradient" size="xl" className="flex-col gap-0 mb-8" />

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>{title}</CardTitle>
                        {description && <CardDescription>{description}</CardDescription>}
                    </CardHeader>

                    <CardContent>
                        {status === 'done' && (
                            <div role="status" className="flex flex-col items-center gap-4 text-center">
                                <CircleCheck className="size-10 text-green-400" aria-hidden="true" />
                                <p className="text-sm text-white">Sua senha foi alterada. Entre com a nova senha.</p>
                                <SpecularButton type="button" onClick={() => navigate('/login', { replace: true })} size="md" radius={12} tint="#7C3AED" tintOpacity={1}
                                    lineColor="#E9D5FF" baseColor="#5B21B6" autoAnimate className="w-full min-h-12">
                                    <span className="text-sm font-semibold">Ir para o login</span>
                                </SpecularButton>
                            </div>
                        )}

                        {status === 'invalid' && (
                            <div role="alert" className="flex flex-col items-center gap-3 text-center">
                                <TriangleAlert className="size-10 text-amber-400" aria-hidden="true" />
                                <p className="text-sm text-white">Este link de redefinição é inválido, já foi usado ou expirou.</p>
                                <p className="text-sm text-brand-gray">Os links valem por 1 hora e só podem ser usados uma vez.</p>
                                <Link to="/esqueci-senha" className={linkClass}>Pedir um novo link</Link>
                            </div>
                        )}

                        {status === 'form' && (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Nova senha</Label>
                                    <Input id="password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={password}
                                        onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                                        aria-invalid={passwordTooShort || undefined} aria-describedby="password-hint" />
                                    <p id="password-hint" className={`text-xs ${passwordTooShort ? 'text-red-400' : 'text-brand-gray'}`}>
                                        Mínimo de {PASSWORD_MIN_LENGTH} caracteres
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="confPassword">Confirmar nova senha</Label>
                                    <Input id="confPassword" type="password" autoComplete="new-password" required value={confPassword}
                                        onChange={(e) => setConfPassword(e.target.value)} placeholder="••••••••"
                                        aria-invalid={passwordMismatch || undefined} aria-describedby={passwordMismatch ? 'confPassword-error' : undefined} />
                                </div>

                                {passwordMismatch && (
                                    <p id="confPassword-error" role="alert" className="-mt-1 text-sm text-red-400">
                                        As senhas não coincidem
                                    </p>
                                )}

                                {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}

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
                                        {loading ? 'Salvando...' : 'Salvar nova senha'}
                                    </span>
                                </SpecularButton>
                            </form>
                        )}
                    </CardContent>

                    {status !== 'done' && (
                        <CardFooter className="justify-center">
                            <p className="text-sm text-brand-gray">
                                Lembrou a senha?{' '}
                                <Link to="/login" className={linkClass}>Fazer login</Link>
                            </p>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </section>
    );
}
