import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type Props = { children: ReactNode; /** When it changes (e.g. the route), a shown error is cleared and children render again */ resetKey?: unknown };
type State = { error: Error | null };

/**
 * Last line of defense: a render error (or a lazy chunk that failed to download, e.g. right after a deploy) used to unmount the
 * whole tree and leave only the black body. This shows what happened and how to recover instead.
 */
export default class ErrorBoundary extends Component<Props, State>
{
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State
    {
        return { error };
    }

    componentDidUpdate(prev: Props)
    {
        if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
    }

    componentDidCatch(error: Error, info: ErrorInfo)
    {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    render()
    {
        if (!this.state.error) return this.props.children;

        return (
            <main role="alert" className="flex min-h-svh items-center justify-center bg-brand-black px-4 py-10 text-white">
                <div className="w-full max-w-md rounded-2xl border border-white/10 bg-brand-dark p-6 text-center shadow-2xl sm:p-8">
                    <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-red-500/15 text-red-400">
                        <AlertTriangle size={28} aria-hidden="true" />
                    </div>

                    <h1 className="text-2xl font-bold">Algo deu errado</h1>
                    <p className="mt-3 text-sm text-brand-gray">
                        Ocorreu um erro inesperado ao exibir esta página. Recarregue para tentar de novo; se continuar, volte ao início.
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <button type="button" onClick={() => window.location.reload()}
                            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple px-6 text-sm font-semibold text-white
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark">
                            Recarregar
                        </button>
                        <a href="/"
                            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-brand-purple px-6 text-sm font-semibold text-brand-purple hover:bg-brand-purple/10
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                            Ir para o início
                        </a>
                    </div>
                </div>
            </main>
        );
    }
}
