import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

// Catch-all route: any URL that matches no route lands here instead of an empty black screen
export default function NotFound()
{
    const { isAuthenticated, isAdmin, loading } = useAuth();
    const { pathname } = useLocation();

    const home = !loading && isAuthenticated ? (isAdmin ? '/admin/dashboard' : '/dashboard') : '/';
    const label = home === '/' ? 'Voltar para o início' : 'Voltar para o painel';

    return (
        <main className="flex min-h-svh items-center justify-center bg-brand-black px-4 py-10 text-white">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-brand-dark p-6 text-center shadow-2xl sm:p-8">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                    <Compass size={28} aria-hidden="true" />
                </div>

                <p className="text-sm font-semibold tracking-wide text-brand-purple">Erro 404</p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Página não encontrada</h1>
                <p className="mt-3 text-sm text-brand-gray">
                    O endereço <span className="break-all font-mono text-white/80">{pathname}</span> não existe ou foi movido.
                </p>

                <Link to={home} replace
                    className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple px-6 text-sm font-semibold text-white
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark">
                    {label}
                </Link>
            </div>
        </main>
    );
}
