import { Link } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';

import { useSubscription } from '@/contexts';
import { PLAN_FEATURE_LABELS } from '@/types';

type FeatureGateProps =
{
    feature: keyof typeof PLAN_FEATURE_LABELS;
    children: React.ReactNode;
};

/**
 * Renders the page only when the current plan includes `feature` (same rule as the backend's requireFeature).
 * Otherwise shows a friendly upgrade screen instead of letting the page hit the API and get a raw 403.
 */
export default function FeatureGate({ feature, children }: FeatureGateProps)
{
    const { subscriptionLoaded, subscription, hasFeature } = useSubscription();

    // Do not mount the page (and fire its requests) before we know the plan.
    if (!subscriptionLoaded) return <div className="text-brand-gray" role="status">Carregando...</div>;

    // If the subscription could not be loaded, let the page decide (it will show its own error).
    if (!subscription || hasFeature(feature)) return <>{children}</>;

    const nome = PLAN_FEATURE_LABELS[feature] || 'Este recurso';

    return (
        <section className="mx-auto flex max-w-md flex-col items-center py-10 text-center" aria-labelledby="feature-gate-title">
            <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
                <Lock size={30} aria-hidden="true" />
            </div>
            <h1 id="feature-gate-title" className="text-2xl font-bold text-white mb-2">Recurso fora do seu plano</h1>
            <p className="text-brand-gray mb-8">
                <strong className="text-white">{nome}</strong> faz parte dos planos pagos. Faça upgrade para liberar e continuar crescendo sua barbearia.
            </p>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
                <Link to="/assinatura" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-blue to-brand-purple px-6 py-3 font-semibold text-white shadow-lg shadow-brand-blue/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-brand-black">
                    <Crown size={16} aria-hidden="true" /> Ver planos
                </Link>
                <Link to="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-purple px-6 py-3 font-semibold text-brand-purple hover:bg-brand-purple/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                    Voltar ao painel
                </Link>
            </div>
        </section>
    );
}
