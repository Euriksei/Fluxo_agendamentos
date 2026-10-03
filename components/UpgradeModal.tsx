import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useSubscription } from '@/contexts/SubscriptionContext';

import { X, Check, Crown, Zap, Star } from 'lucide-react';

import Button from '@/components/ui/Button';

const formatarMoeda = (centavos) => ((centavos || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PLAN_ICONS = { basic: Star, professional: Zap, premium: Crown };

export default function UpgradeModal() 
{
    const { authRequest, loading, setLoading, error, setError } = useApi();

    const { showUpgradeModal, setShowUpgradeModal, plan: currentPlan } = useSubscription();

    const [plans, setPlans] = useState([]);

    useEffect(() => {
        const loadPlans = async () => {
            try {
                const response = await fetch('/api/plans');
                if (response.ok) {
                    const data = await response.json();
                    setPlans(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (showUpgradeModal) {
            loadPlans();
        }
    }, [showUpgradeModal]);

    if (!showUpgradeModal) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-brand-dark border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Atualize seu Plano</h2>
                        <p className="text-brand-gray mt-1">Desbloqueie mais funcionalidades para sua barbearia</p>
                    </div>
                    <button 
                        onClick={() => setShowUpgradeModal(false)}
                        className="text-brand-gray hover:text-white p-2"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Plans Grid */}
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12 text-brand-gray">Carregando planos...</div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-3">
                            {plans.map(plan => {
                                const Icon = PLAN_ICONS[plan.slug] || Star;
                                const isCurrent = currentPlan?.slug === plan.slug;
                                const isPopular = plan.slug === 'professional';

                                return (
                                    <div 
                                        key={plan.id}
                                        className={`
                                            relative rounded-xl p-6 border transition-all
                                            ${isCurrent 
                                                ? 'border-green-500/50 bg-green-500/10' 
                                                : isPopular 
                                                    ? 'border-brand-purple/50 bg-brand-purple/10' 
                                                    : 'border-white/10 bg-white/5'
                                            }
                                        `}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-purple text-white text-xs font-medium px-3 py-1 rounded-full">
                                                Mais Popular
                                            </div>
                                        )}

                                        {isCurrent && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                                                Plano Atual
                                            </div>
                                        )}

                                        <div className="text-center mb-6">
                                            <div className={`
                                                w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3
                                                ${plan.slug === 'premium' ? 'bg-yellow-500/20' : 
                                                  plan.slug === 'professional' ? 'bg-brand-purple/20' : 
                                                  'bg-white/10'}
                                            `}>
                                                <Icon size={24} className={
                                                    plan.slug === 'premium' ? 'text-yellow-500' :
                                                    plan.slug === 'professional' ? 'text-brand-purple' :
                                                    'text-brand-gray'
                                                } />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                            <p className="text-brand-gray text-sm mt-1">{plan.description}</p>
                                        </div>

                                        <div className="text-center mb-6">
                                            <span className="text-4xl font-bold text-white">
                                                {plan.price === 0 ? 'Grátis' : formatarMoeda(plan.price)}
                                            </span>
                                            {plan.price > 0 && (
                                                <span className="text-brand-gray text-sm">/mês</span>
                                            )}
                                        </div>

                                        <ul className="space-y-3 mb-6">
                                            <li className="flex items-center gap-2 text-sm">
                                                <Check size={16} className="text-green-500 shrink-0" />
                                                <span className="text-white">
                                                    {plan.maxEmployees === 0 
                                                        ? '1 profissional' 
                                                        : `Até ${plan.maxEmployees + 1} profissionais`
                                                    }
                                                </span>
                                            </li>
                                            {plan.features?.map((feature, index) => (
                                                <li key={index} className="flex items-center gap-2 text-sm">
                                                    <Check size={16} className="text-green-500 shrink-0" />
                                                    <span className="text-brand-gray">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {isCurrent ? (
                                            <Button variant="outline" fullWidth disabled>
                                                Plano Atual
                                            </Button>
                                        ) : (
                                            <Button 
                                                fullWidth
                                                variant={isPopular ? 'primary' : 'outline'}
                                            >
                                                {plan.price === 0 ? 'Selecionar' : 'Assinar'}
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 text-center">
                    <p className="text-brand-gray text-sm">
                        Dúvidas? Entre em contato pelo WhatsApp
                    </p>
                </div>
            </div>
        </div>
    );
}