import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

import { useSubscription } from '@/contexts';

import { formatarMoeda } from '@/utils';

import Button from '../ui/Button';

const parseAbout = (about: string | null): string[] => 
{
    if (!about) return [];
    return about.split('\n').map((line) => line.replace(/^-\s*/, '').trim()).filter(Boolean);
};

const POPULAR_SLUG = 'professional';
const EXCLUDED_SLUGS = ['free'];

const Pricing: React.FC = () => 
{
    const { loading, plans, fetchPlans } = useSubscription();

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const visiblePlans = (plans ?? []).filter((p) => p.isActive && !EXCLUDED_SLUGS.includes(p.slug));

    return (
        <section id="pricing" className="py-20">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Planos que cabem no seu bolso</h2>
                    <p className="text-gray-400">Escolha a melhor opção para o tamanho do seu negócio.</p>
                </div>

                {loading 
                ? 
                (
                    <div className="flex justify-center items-center py-20 text-gray-400">
                        Carregando planos...
                    </div>
                ) 
                : 
                (
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {visiblePlans.map((plan) => 
                        {
                            const isPopular = plan.slug === POPULAR_SLUG;
                            const isFree = plan.price === 0;
                            const bullets = parseAbout(plan.about);
 
                            return (
                                <div key={plan.id} className={`flex flex-col rounded-2xl p-8 transition-colors relative
                                    ${isPopular? 'bg-brand-dark border-2 border-brand-purple shadow-2xl shadow-brand-purple/20 transform md:-translate-y-2'
                                        : 'bg-brand-black border border-white/20 hover:border-brand-blue/30'}`}>

                                    {isPopular && 
                                    (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-purple text-white px-4 py-1 rounded-full text-xs 
                                                font-bold uppercase tracking-wider whitespace-nowrap">
                                            Mais Popular
                                        </div>
                                    )}
 
                                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                    <p className="text-sm text-gray-400 mb-6">{plan.description}</p>
 
                                    <div className="text-4xl font-bold text-white mb-6">
                                        {isFree 
                                        ? 
                                        (
                                            <span>Grátis</span>
                                        ) 
                                        : 
                                        (
                                            <>
                                                {formatarMoeda(plan.price)}
                                                <span className="text-lg text-gray-500 font-normal">/mês</span>
                                            </>
                                        )}
                                    </div>
 
                                    <ul className="space-y-4 mb-8 grow">
                                        {bullets.map((item, i) => (
                                            <li key={i} className={`flex items-center gap-3 text-sm ${isPopular ? 'text-white' : 'text-gray-300'}`}>
                                                <Check
                                                    size={18}
                                                    className={isPopular ? 'text-green-400' : 'text-brand-blue'}
                                                />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
 
                                    <Button onClick={() => window.location.href = '/registro'} variant={isPopular ? 'primary' : 'outline'} fullWidth>
                                        {isFree ? 'Usar Grátis' : isPopular ? 'Testar Grátis' : 'Começar Agora'}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Pricing;