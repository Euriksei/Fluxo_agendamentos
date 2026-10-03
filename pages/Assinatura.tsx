import { useState, useEffect } from 'react';
import { useSubscription } from '@/contexts';

import { CreditCard, Calendar, Clock, Check, X, AlertTriangle, Crown, Zap, Users, ChevronRight, RefreshCw, Trash2, Star, Shield } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

import { formatarMoeda, formatarData } from '@/utils';
import { SUBSCRIPTION_STATUS_CONFIG, PLAN_FEATURE_LABELS } from '@/types';

const BILLING_TYPES = 
{
    CREDIT_CARD: { label: 'Cartão de Crédito', icon: CreditCard },
    BOLETO: { label: 'Boleto', icon: Calendar },
    PIX: { label: 'PIX', icon: Zap }
};

export default function Assinatura() 
{
    const { subscription, plans, payments, loading, actionLoading, fetchPlans, fetchPayments, getPaymentDetails, syncSubscription, createSubscription, 
        createSubscriptionWithCreditCard, startTrial, convertTrial, updateSubscription, updateCreditCard, cancelSubscription, isTrialExpired, getTrialDaysRemaining, 
            hasActiveSubscription } = useSubscription();

    const [modalNovaAssinatura, setModalNovaAssinatura] = useState(false);
    const [modalTrocarPlano, setModalTrocarPlano] = useState(false);
    const [modalCancelar, setModalCancelar] = useState(false);
    const [modalPagamento, setModalPagamento] = useState(false);
    const [modalCartao, setModalCartao] = useState(false);
    const [modalDetalhesPagamento, setModalDetalhesPagamento] = useState(false);

    const [etapa, setEtapa] = useState(1);
    const [planoSelecionado, setPlanoSelecionado] = useState(null);
    const [billingType, setBillingType] = useState('CREDIT_CARD');
    const [usarTrial, setUsarTrial] = useState(false);

    const [pagamentoSelecionado, setPagamentoSelecionado] = useState(null);
    const [detalhesPagamento, setDetalhesPagamento] = useState(null);

    const [formCartao, setFormCartao] = useState({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' });
    const [formTitular, setFormTitular] = useState({ name: '', email: '', cpfCnpj: '', phone: '', postalCode: '', addressNumber: '' });
    const [formCliente, setFormCliente] = useState({ name: '', email: '', cpfCnpj: '', phone: '', postalCode: '', address: '', addressNumber: '', province: '' });

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    useEffect(() => 
    {
        fetchPlans();
        if (subscription?.asaasSubscriptionId) fetchPayments();
    }, [subscription]);

    const limparFormularios = () => 
    {
        setFormCartao({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' });
        setFormTitular({ name: '', email: '', cpfCnpj: '', phone: '', postalCode: '', addressNumber: '' });
        setFormCliente({ name: '', email: '', cpfCnpj: '', phone: '', postalCode: '', address: '', addressNumber: '', province: '' });
        setPlanoSelecionado(null);
        setBillingType('CREDIT_CARD');
        setUsarTrial(false);
        setEtapa(1);
        setErro('');
    };

    const openModalNovaAssinatura  = () => { limparFormularios(); setModalNovaAssinatura(true); };
    const closeModalNovaAssinatura = () => { setModalNovaAssinatura(false); limparFormularios(); };

    const handleSelecionarPlano = (plan) => { setPlanoSelecionado(plan); setEtapa(2); };

    const handleCriarAssinatura = async () => 
    {
        setErro('');

        try 
        {
            if (usarTrial) 
            {
                const result = await startTrial(planoSelecionado.id, 7);
                if (result.success) 
                {
                    setSucesso('Período de teste iniciado com sucesso!');
                    closeModalNovaAssinatura();
                } 
                else 
                {
                    setErro(result.error);
                }
                return;
            }

            if (billingType === 'CREDIT_CARD') 
            {
                if (!formCartao.holderName || !formCartao.number || !formCartao.expiryMonth || !formCartao.expiryYear || !formCartao.ccv) 
                {
                    setErro('Preencha todos os dados do cartão');
                    return;
                }

                if (!formTitular.name || !formTitular.cpfCnpj || !formTitular.postalCode) 
                {
                    setErro('Preencha os dados do titular');
                    return;
                }

                const result = await createSubscriptionWithCreditCard(planoSelecionado.id, formCartao, formTitular);
                
                if (result.success) 
                {
                    setSucesso('Assinatura criada com sucesso!');
                    closeModalNovaAssinatura();
                } 
                else 
                {
                    setErro(result.error);
                }
            } 
            else 
            {
                if (!formCliente.cpfCnpj) 
                {
                    setErro('CPF/CNPJ é obrigatório');
                    return;
                }

                const result = await createSubscription(planoSelecionado.id, billingType, formCliente);
                
                if (result.success) 
                {
                    setSucesso('Assinatura criada! Realize o pagamento para ativar.');
                    setDetalhesPagamento(result.data.payment);
                    closeModalNovaAssinatura();
                    setModalDetalhesPagamento(true);
                } 
                else 
                {
                    setErro(result.error);
                }
            }
        } 
        catch (err) 
        {
            setErro('Erro ao processar. Tente novamente.');
        }
    };

    const handleConverterTrial = async () => 
    {
        setErro('');

        try 
        {
            if (billingType === 'CREDIT_CARD') 
            {
                if (!formCartao.holderName || !formCartao.number) 
                {
                    setErro('Preencha os dados do cartão');
                    return;
                }

                const result = await convertTrial(billingType, formCartao, formTitular);
                
                if (result.success) 
                {
                    setSucesso('Assinatura ativada com sucesso!');
                    setModalPagamento(false);
                    limparFormularios();
                } 
                else 
                {
                    setErro(result.error);
                }
            } 
            else 
            {
                const result = await convertTrial(billingType, null, null, formCliente);
                
                if (result.success) 
                {
                    setDetalhesPagamento(result.data.payment);
                    setModalPagamento(false);
                    setModalDetalhesPagamento(true);
                } 
                else 
                {
                    setErro(result.error);
                }
            }
        } 
        catch (err) 
        {
            setErro('Erro ao processar. Tente novamente.');
        }
    };

    const handleTrocarPlano = async () => 
    {
        if (!planoSelecionado) return;

        const result = await updateSubscription(planoSelecionado.id, true);
        
        if (result.success) 
        {
            setSucesso('Plano alterado com sucesso!');
            setModalTrocarPlano(false);
            setPlanoSelecionado(null);
        } 
        else 
        {
            setErro(result.error);
        }
    };

    const handleAtualizarCartao = async () => 
    {
        setErro('');

        if (!formCartao.holderName || !formCartao.number || !formCartao.expiryMonth || !formCartao.expiryYear || !formCartao.ccv) 
        {
            setErro('Preencha todos os dados do cartão');
            return;
        }

        const result = await updateCreditCard(formCartao, formTitular);
        
        if (result.success) 
        {
            setSucesso('Cartão atualizado com sucesso!');
            setModalCartao(false);
            limparFormularios();
        } 
        else 
        {
            setErro(result.error);
        }
    };

    const handleCancelarAssinatura = async () => 
    {
        const result = await cancelSubscription();
        
        if (result.success) 
        {
            setSucesso('Assinatura cancelada.');
            setModalCancelar(false);
        } 
        else 
        {
            setErro(result.error);
        }
    };

    const handleVerPagamento = async (payment) => 
    {
        setPagamentoSelecionado(payment);
        
        if (payment.status === 'PENDING') 
        {
            const result = await getPaymentDetails(payment.id);
            if (result.success) setDetalhesPagamento(result.data);
        }
        
        setModalDetalhesPagamento(true);
    };

    const copiarParaClipboard = (texto) => 
    {
        navigator.clipboard.writeText(texto);
        setSucesso('Copiado para a área de transferência!');
        setTimeout(() => setSucesso(''), 3000);
    };

    const statusConfig = SUBSCRIPTION_STATUS_CONFIG[subscription?.status] || SUBSCRIPTION_STATUS_CONFIG.NONE;
    const StatusIcon = statusConfig.icon;

    const planosFiltrados = plans.filter(p => p.slug !== 'free' && p.id !== subscription?.plan?.id);

    const parseFeatures = (features) => 
    {
        if (!features) return [];
        if (Array.isArray(features)) return features;
        
        try 
        {
            const parsed = JSON.parse(features);
            return Array.isArray(parsed) ? parsed : [];
        } 
        catch 
        {
            return [];
        }
    };

    return (
        <div>
            <div className="flex flex-col gap-4 md:flex-row md:gap-0 justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Assinatura</h1>
                <Button onClick={syncSubscription} variant="outline" disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
            </div>

            {sucesso && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-lg mb-6 flex items-center gap-2">
                    <Check size={20} />
                    {sucesso}
                </div>
            )}

            {/* Card Principal da Assinatura */}
            <div className="bg-brand-dark rounded-lg p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusConfig.color}`}>
                            <StatusIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-white text-xl font-bold">
                                {subscription?.plan?.name || 'Sem Plano'}
                            </h2>
                            <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${statusConfig.color}`}>
                                {statusConfig.label}
                            </span>
                        </div>
                    </div>

                    {subscription?.plan?.price > 0 && (
                        <div className="text-right">
                            <p className="text-brand-gray text-sm">Valor mensal</p>
                            <p className="text-brand-blue text-2xl font-bold">
                                {formatarMoeda(subscription.plan.price)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Informações do Trial */}
                {subscription?.status === 'TRIAL' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <Clock size={20} className="text-blue-400" />
                            <div className="flex-1">
                                <p className="text-white font-medium">Período de Teste</p>
                                <p className="text-blue-400 text-sm">
                                    {isTrialExpired() 
                                        ? 'Seu período de teste expirou' 
                                        : `${getTrialDaysRemaining()} dias restantes (até ${formatarData(subscription.trialEndsAt)})`
                                    }
                                </p>
                            </div>
                            <Button onClick={() => { limparFormularios(); setModalPagamento(true); }} size="sm">
                                Assinar Agora
                            </Button>
                        </div>
                    </div>
                )}

                {/* Aviso de Pagamento Pendente */}
                {subscription?.status === 'PENDING' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={20} className="text-yellow-400" />
                            <div className="flex-1">
                                <p className="text-white font-medium">Pagamento Pendente</p>
                                <p className="text-yellow-400 text-sm">
                                    Realize o pagamento para ativar sua assinatura
                                </p>
                            </div>
                            <Button onClick={() => fetchPayments()} size="sm" variant="secondary">
                                Ver Cobranças
                            </Button>
                        </div>
                    </div>
                )}

                {/* Aviso de Assinatura Vencida */}
                {subscription?.status === 'OVERDUE' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={20} className="text-red-400" />
                            <div className="flex-1">
                                <p className="text-white font-medium">Assinatura Vencida</p>
                                <p className="text-red-400 text-sm">
                                    Regularize o pagamento para continuar usando os recursos premium
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Detalhes da Assinatura */}
                {subscription?.status !== 'NONE' && (
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        {subscription?.nextPaymentAt && (
                            <div className="bg-white/5 rounded-lg p-4">
                                <p className="text-brand-gray text-sm mb-1">Próximo Vencimento</p>
                                <p className="text-white font-medium">{formatarData(subscription.nextPaymentAt)}</p>
                            </div>
                        )}

                        {subscription?.lastPaymentAt && (
                            <div className="bg-white/5 rounded-lg p-4">
                                <p className="text-brand-gray text-sm mb-1">Último Pagamento</p>
                                <p className="text-white font-medium">{formatarData(subscription.lastPaymentAt)}</p>
                            </div>
                        )}

                        {subscription?.plan?.maxEmployees > 0 && (
                            <div className="bg-white/5 rounded-lg p-4">
                                <p className="text-brand-gray text-sm mb-1">Limite de Funcionários</p>
                                <p className="text-white font-medium">
                                    {subscription.plan.maxEmployees === 999 ? 'Ilimitado' : subscription.plan.maxEmployees}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Features do Plano */}
                {subscription?.plan?.features && (
                    <div className="mb-6">
                        <p className="text-brand-gray text-sm mb-3">Recursos inclusos:</p>
                        <div className="flex flex-wrap gap-2">
                            {parseFeatures(subscription.plan.features).map((feature, index) => (
                                <span key={index} className="bg-brand-purple/20 text-brand-purple text-xs px-3 py-1 rounded-full">
                                    {PLAN_FEATURE_LABELS[feature] || feature}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Ações */}
                <div className="flex flex-wrap gap-3">
                    {(!subscription || subscription.status === 'NONE' || subscription.status === 'CANCELLED') && (
                        <Button onClick={openModalNovaAssinatura} className="flex items-center justify-center gap-2" >
                            <Crown size={16}/> Assinar Plano
                        </Button>
                    )}

                    {hasActiveSubscription() && (
                        <>
                            <Button onClick={() => { setPlanoSelecionado(null); setModalTrocarPlano(true); }} variant="secondary"
                                    className="flex items-center justify-center gap-2" >
                                <RefreshCw size={16} /> Trocar Plano
                            </Button>

                            {subscription?.asaasSubscriptionId && (
                                <Button onClick={() => { limparFormularios(); setModalCartao(true); }} variant="outline"
                                        className="flex items-center justify-center gap-2" >
                                    <CreditCard size={16} /> Atualizar Cartão
                                </Button>
                            )}

                            <Button onClick={() => setModalCancelar(true)} variant="outline" 
                                    className="flex items-center justify-center gap-2 text-red-400 border-red-400/50 hover:bg-red-400/10">
                                <X size={16} /> Cancelar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Histórico de Pagamentos */}
            {payments && payments.length > 0 && (
                <div className="bg-brand-dark rounded-lg p-6">
                    <h3 className="text-white text-lg font-semibold mb-4">Histórico de Pagamentos</h3>
                    
                    <div className="space-y-3">
                        {payments.map(payment => (
                            <div key={payment.id} onClick={() => handleVerPagamento(payment)}
                                className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                        ${payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                                          payment.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                          payment.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        {payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? <Check size={20} /> :
                                         payment.status === 'PENDING' ? <Clock size={20} /> : <X size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{formatarMoeda(payment.value)}</p>
                                        <p className="text-brand-gray text-sm">
                                            Vencimento: {formatarData(payment.dueDate)}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-brand-gray" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal Nova Assinatura */}
            {modalNovaAssinatura && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={closeModalNovaAssinatura}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        
                        {/* Etapa 1: Escolher Plano */}
                        {etapa === 1 && (
                            <>
                                <h2 className="text-white text-xl font-bold mb-6">Escolha seu Plano</h2>
                                
                                <div className="space-y-4 mb-6">
                                    {plans.filter(p => p.slug !== 'free').map(plan => (
                                        <div key={plan.id} onClick={() => handleSelecionarPlano(plan)}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all
                                                ${planoSelecionado?.id === plan.id 
                                                    ? 'border-brand-purple bg-brand-purple/10' 
                                                    : 'border-white/10 hover:border-white/30'}`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-white font-semibold">{plan.name}</h4>
                                                    <p className="text-brand-gray text-sm">
                                                        {plan.maxEmployees === 999 ? 'Ilimitado' : `Até ${plan.maxEmployees} funcionários`}
                                                    </p>
                                                </div>
                                                <p className="text-brand-blue font-bold">{formatarMoeda(plan.price)}/mês</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button onClick={closeModalNovaAssinatura} variant="outline" fullWidth>
                                    Cancelar
                                </Button>
                            </>
                        )}

                        {/* Etapa 2: Forma de Pagamento */}
                        {etapa === 2 && (
                            <>
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setEtapa(1)} className="text-brand-gray hover:text-white">
                                        ← Voltar
                                    </button>
                                    <h2 className="text-white text-xl font-bold">Forma de Pagamento</h2>
                                </div>

                                <div className="bg-white/5 rounded-lg p-4 mb-6">
                                    <p className="text-brand-gray text-sm">Plano selecionado:</p>
                                    <p className="text-white font-semibold">{planoSelecionado?.name} - {formatarMoeda(planoSelecionado?.price)}/mês</p>
                                </div>

                                {/* Opção Trial */}
                                {!subscription || subscription.status === 'NONE' ? (
                                    <label className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-6 cursor-pointer">
                                        <input type="checkbox" checked={usarTrial} onChange={e => setUsarTrial(e.target.checked)}
                                            className="w-5 h-5 rounded border-white/20 bg-brand-darker text-brand-purple focus:ring-brand-purple" />
                                        <div>
                                            <span className="text-white font-medium">Começar com 7 dias grátis</span>
                                            <p className="text-blue-400 text-sm">Teste todas as funcionalidades sem compromisso</p>
                                        </div>
                                    </label>
                                ) : null}

                                {!usarTrial && (
                                    <>
                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            {Object.entries(BILLING_TYPES).map(([key, config]) => {
                                                const Icon = config.icon;
                                                return (
                                                    <button key={key} onClick={() => setBillingType(key)}
                                                        className={`p-4 rounded-lg border-2 text-center transition-all
                                                            ${billingType === key 
                                                                ? 'border-brand-purple bg-brand-purple/10' 
                                                                : 'border-white/10 hover:border-white/30'}`}>
                                                        <Icon size={24} className={`mx-auto mb-2 ${billingType === key ? 'text-brand-purple' : 'text-brand-gray'}`} />
                                                        <span className={`text-sm ${billingType === key ? 'text-white' : 'text-brand-gray'}`}>
                                                            {config.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <Button onClick={() => setEtapa(3)} fullWidth>
                                            Continuar
                                        </Button>
                                    </>
                                )}

                                {usarTrial && (
                                    <Button onClick={handleCriarAssinatura} disabled={actionLoading} fullWidth>
                                        {actionLoading ? 'Processando...' : 'Iniciar Período de Teste'}
                                    </Button>
                                )}

                                {erro && (
                                    <p className="text-red-400 text-sm mt-4 text-center">{erro}</p>
                                )}
                            </>
                        )}

                        {/* Etapa 3: Dados de Pagamento */}
                        {etapa === 3 && (
                            <>
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setEtapa(2)} className="text-brand-gray hover:text-white">
                                        ← Voltar
                                    </button>
                                    <h2 className="text-white text-xl font-bold">
                                        {billingType === 'CREDIT_CARD' ? 'Dados do Cartão' : 'Dados para Cobrança'}
                                    </h2>
                                </div>

                                {billingType === 'CREDIT_CARD' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Nome no Cartão</label>
                                            <Input value={formCartao.holderName} onChange={e => setFormCartao({...formCartao, holderName: e.target.value.toUpperCase()})}
                                                placeholder="NOME COMO NO CARTÃO" fullWidth />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Número do Cartão</label>
                                            <Input value={formCartao.number} onChange={e => setFormCartao({...formCartao, number: e.target.value.replace(/\D/g, '').slice(0, 16)})}
                                                placeholder="0000 0000 0000 0000" fullWidth />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">Mês</label>
                                                <Input value={formCartao.expiryMonth} onChange={e => setFormCartao({...formCartao, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2)})}
                                                    placeholder="MM" fullWidth />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">Ano</label>
                                                <Input value={formCartao.expiryYear} onChange={e => setFormCartao({...formCartao, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                                                    placeholder="AAAA" fullWidth />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">CVV</label>
                                                <Input type="password" value={formCartao.ccv} onChange={e => setFormCartao({...formCartao, ccv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                                                    placeholder="***" fullWidth />
                                            </div>
                                        </div>

                                        <hr className="border-white/10 my-4" />

                                        <h4 className="text-white font-medium">Dados do Titular</h4>

                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Nome Completo</label>
                                            <Input value={formTitular.name} onChange={e => setFormTitular({...formTitular, name: e.target.value})}
                                                placeholder="Nome completo" fullWidth />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">CPF/CNPJ</label>
                                                <Input value={formTitular.cpfCnpj} onChange={e => setFormTitular({...formTitular, cpfCnpj: e.target.value.replace(/\D/g, '')})}
                                                    placeholder="Apenas números" fullWidth />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">Telefone</label>
                                                <Input value={formTitular.phone} onChange={e => setFormTitular({...formTitular, phone: e.target.value.replace(/\D/g, '')})}
                                                    placeholder="(00) 00000-0000" fullWidth />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">CEP</label>
                                                <Input value={formTitular.postalCode} onChange={e => setFormTitular({...formTitular, postalCode: e.target.value.replace(/\D/g, '').slice(0, 8)})}
                                                    placeholder="00000-000" fullWidth />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">Número</label>
                                                <Input value={formTitular.addressNumber} onChange={e => setFormTitular({...formTitular, addressNumber: e.target.value})}
                                                    placeholder="Nº" fullWidth />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Email</label>
                                            <Input type="email" value={formTitular.email} onChange={e => setFormTitular({...formTitular, email: e.target.value})}
                                                placeholder="email@exemplo.com" fullWidth />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Nome Completo</label>
                                            <Input value={formCliente.name} onChange={e => setFormCliente({...formCliente, name: e.target.value})}
                                                placeholder="Nome completo" fullWidth />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-brand-gray mb-1">Email</label>
                                            <Input type="email" value={formCliente.email} onChange={e => setFormCliente({...formCliente, email: e.target.value})}
                                                placeholder="email@exemplo.com" fullWidth />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">CPF/CNPJ *</label>
                                                <Input value={formCliente.cpfCnpj} onChange={e => setFormCliente({...formCliente, cpfCnpj: e.target.value.replace(/\D/g, '')})}
                                                    placeholder="Apenas números" fullWidth required />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-brand-gray mb-1">Telefone</label>
                                                <Input value={formCliente.phone} onChange={e => setFormCliente({...formCliente, phone: e.target.value.replace(/\D/g, '')})}
                                                    placeholder="(00) 00000-0000" fullWidth />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {erro && (
                                    <p className="text-red-400 text-sm mt-4">{erro}</p>
                                )}

                                <div className="flex gap-3 mt-6">
                                    <Button onClick={closeModalNovaAssinatura} variant="outline" fullWidth>
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleCriarAssinatura} disabled={actionLoading} fullWidth>
                                        {actionLoading ? 'Processando...' : 'Finalizar'}
                                    </Button>
                                </div>

                                <div className="flex items-center justify-center gap-2 mt-4 text-brand-gray text-xs">
                                    <Shield size={14} />
                                    Pagamento seguro processado pela ASAAS
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Trocar Plano */}
            {modalTrocarPlano && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setModalTrocarPlano(false)}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white text-xl font-bold mb-6">Trocar Plano</h2>

                        <div className="bg-white/5 rounded-lg p-4 mb-6">
                            <p className="text-brand-gray text-sm">Plano atual:</p>
                            <p className="text-white font-semibold">{subscription?.plan?.name}</p>
                        </div>

                        <div className="space-y-3 mb-6">
                            {planosFiltrados.map(plan => (
                                <div key={plan.id} onClick={() => setPlanoSelecionado(plan)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all
                                        ${planoSelecionado?.id === plan.id 
                                            ? 'border-brand-purple bg-brand-purple/10' 
                                            : 'border-white/10 hover:border-white/30'}`}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-white font-semibold">{plan.name}</h4>
                                            <p className="text-brand-gray text-sm">{plan.maxEmployees} funcionários</p>
                                        </div>
                                        <p className="text-brand-blue font-bold">{formatarMoeda(plan.price)}/mês</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {planosFiltrados.length === 0 && (
                            <p className="text-brand-gray text-center py-4">Você já está no melhor plano disponível!</p>
                        )}

                        {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}

                        <div className="flex gap-3">
                            <Button onClick={() => setModalTrocarPlano(false)} variant="outline" fullWidth>
                                Cancelar
                            </Button>
                            <Button onClick={handleTrocarPlano} disabled={!planoSelecionado || actionLoading} fullWidth>
                                {actionLoading ? 'Alterando...' : 'Confirmar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Converter Trial */}
            {modalPagamento && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setModalPagamento(false)}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white text-xl font-bold mb-6">Ativar Assinatura</h2>

                        <div className="bg-white/5 rounded-lg p-4 mb-6">
                            <p className="text-brand-gray text-sm">Plano:</p>
                            <p className="text-white font-semibold">{subscription?.plan?.name} - {formatarMoeda(subscription?.plan?.price)}/mês</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {Object.entries(BILLING_TYPES).map(([key, config]) => {
                                const Icon = config.icon;
                                return (
                                    <button key={key} onClick={() => setBillingType(key)}
                                        className={`p-4 rounded-lg border-2 text-center transition-all
                                            ${billingType === key 
                                                ? 'border-brand-purple bg-brand-purple/10' 
                                                : 'border-white/10 hover:border-white/30'}`}>
                                        <Icon size={24} className={`mx-auto mb-2 ${billingType === key ? 'text-brand-purple' : 'text-brand-gray'}`} />
                                        <span className={`text-sm ${billingType === key ? 'text-white' : 'text-brand-gray'}`}>
                                            {config.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {billingType === 'CREDIT_CARD' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Nome no Cartão</label>
                                    <Input value={formCartao.holderName} onChange={e => setFormCartao({...formCartao, holderName: e.target.value.toUpperCase()})}
                                        placeholder="NOME COMO NO CARTÃO" fullWidth />
                                </div>

                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Número do Cartão</label>
                                    <Input value={formCartao.number} onChange={e => setFormCartao({...formCartao, number: e.target.value.replace(/\D/g, '').slice(0, 16)})}
                                        placeholder="0000 0000 0000 0000" fullWidth />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Mês</label>
                                        <Input value={formCartao.expiryMonth} onChange={e => setFormCartao({...formCartao, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2)})}
                                            placeholder="MM" fullWidth />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Ano</label>
                                        <Input value={formCartao.expiryYear} onChange={e => setFormCartao({...formCartao, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                                            placeholder="AAAA" fullWidth />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">CVV</label>
                                        <Input type="password" value={formCartao.ccv} onChange={e => setFormCartao({...formCartao, ccv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                                            placeholder="***" fullWidth />
                                    </div>
                                </div>

                                <hr className="border-white/10" />

                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">CPF/CNPJ do Titular</label>
                                    <Input value={formTitular.cpfCnpj} onChange={e => setFormTitular({...formTitular, cpfCnpj: e.target.value.replace(/\D/g, '')})}
                                        placeholder="Apenas números" fullWidth />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">CEP</label>
                                        <Input value={formTitular.postalCode} onChange={e => setFormTitular({...formTitular, postalCode: e.target.value.replace(/\D/g, '').slice(0, 8)})}
                                            placeholder="00000-000" fullWidth />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-brand-gray mb-1">Número</label>
                                        <Input value={formTitular.addressNumber} onChange={e => setFormTitular({...formTitular, addressNumber: e.target.value})}
                                            placeholder="Nº" fullWidth />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">CPF/CNPJ *</label>
                                    <Input value={formCliente.cpfCnpj} onChange={e => setFormCliente({...formCliente, cpfCnpj: e.target.value.replace(/\D/g, '')})}
                                        placeholder="Apenas números" fullWidth required />
                                </div>

                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Email</label>
                                    <Input type="email" value={formCliente.email} onChange={e => setFormCliente({...formCliente, email: e.target.value})}
                                        placeholder="email@exemplo.com" fullWidth />
                                </div>
                            </div>
                        )}

                        {erro && <p className="text-red-400 text-sm mt-4">{erro}</p>}

                        <div className="flex gap-3 mt-6">
                            <Button onClick={() => setModalPagamento(false)} variant="outline" fullWidth>
                                Cancelar
                            </Button>
                            <Button onClick={handleConverterTrial} disabled={actionLoading} fullWidth>
                                {actionLoading ? 'Processando...' : 'Ativar Assinatura'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Atualizar Cartão */}
            {modalCartao && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setModalCartao(false)}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white text-xl font-bold mb-6">Atualizar Cartão</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-brand-gray mb-1">Nome no Cartão</label>
                                <Input value={formCartao.holderName} onChange={e => setFormCartao({...formCartao, holderName: e.target.value.toUpperCase()})}
                                    placeholder="NOME COMO NO CARTÃO" fullWidth />
                            </div>

                            <div>
                                <label className="block text-sm text-brand-gray mb-1">Número do Cartão</label>
                                <Input value={formCartao.number} onChange={e => setFormCartao({...formCartao, number: e.target.value.replace(/\D/g, '').slice(0, 16)})}
                                    placeholder="0000 0000 0000 0000" fullWidth />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Mês</label>
                                    <Input value={formCartao.expiryMonth} onChange={e => setFormCartao({...formCartao, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2)})}
                                        placeholder="MM" fullWidth />
                                </div>
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Ano</label>
                                    <Input value={formCartao.expiryYear} onChange={e => setFormCartao({...formCartao, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                                        placeholder="AAAA" fullWidth />
                                </div>
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">CVV</label>
                                    <Input type="password" value={formCartao.ccv} onChange={e => setFormCartao({...formCartao, ccv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                                        placeholder="***" fullWidth />
                                </div>
                            </div>

                            <hr className="border-white/10" />

                            <div>
                                <label className="block text-sm text-brand-gray mb-1">CPF/CNPJ do Titular</label>
                                <Input value={formTitular.cpfCnpj} onChange={e => setFormTitular({...formTitular, cpfCnpj: e.target.value.replace(/\D/g, '')})}
                                    placeholder="Apenas números" fullWidth />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">CEP</label>
                                    <Input value={formTitular.postalCode} onChange={e => setFormTitular({...formTitular, postalCode: e.target.value.replace(/\D/g, '').slice(0, 8)})}
                                        placeholder="00000-000" fullWidth />
                                </div>
                                <div>
                                    <label className="block text-sm text-brand-gray mb-1">Número</label>
                                    <Input value={formTitular.addressNumber} onChange={e => setFormTitular({...formTitular, addressNumber: e.target.value})}
                                        placeholder="Nº" fullWidth />
                                </div>
                            </div>
                        </div>

                        {erro && <p className="text-red-400 text-sm mt-4">{erro}</p>}

                        <div className="flex gap-3 mt-6">
                            <Button onClick={() => setModalCartao(false)} variant="outline" fullWidth>
                                Cancelar
                            </Button>
                            <Button onClick={handleAtualizarCartao} disabled={actionLoading} fullWidth>
                                {actionLoading ? 'Salvando...' : 'Salvar Cartão'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cancelar Assinatura */}
            {modalCancelar && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setModalCancelar(false)}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} className="text-red-400" />
                            </div>
                            <h2 className="text-white text-xl font-bold">Cancelar Assinatura</h2>
                            <p className="text-brand-gray mt-2">
                                Tem certeza que deseja cancelar sua assinatura?
                            </p>
                        </div>

                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                            <p className="text-red-400 text-sm">
                                Ao cancelar, você perderá acesso a:
                            </p>
                            <ul className="text-red-400 text-sm mt-2 space-y-1">
                                {parseFeatures(subscription?.plan?.features).map((feature, index) => (
                                    <li key={index}>• {PLAN_FEATURE_LABELS[feature] || feature}</li>
                                ))}
                            </ul>
                        </div>

                        {erro && <p className="text-red-400 text-sm mb-4">{erro}</p>}

                        <div className="flex gap-3">
                            <Button onClick={() => setModalCancelar(false)} variant="outline" fullWidth>
                                Manter Assinatura
                            </Button>
                            <Button onClick={handleCancelarAssinatura} disabled={actionLoading} variant="destructive" fullWidth>
                                {actionLoading ? 'Cancelando...' : 'Cancelar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalhes do Pagamento */}
            {modalDetalhesPagamento && (detalhesPagamento || pagamentoSelecionado) && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => { setModalDetalhesPagamento(false); setDetalhesPagamento(null); setPagamentoSelecionado(null); }}>
                    <div className="bg-brand-dark border border-white/10 rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-white text-xl font-bold mb-6">Detalhes do Pagamento</h2>

                        {/* QR Code PIX */}
                        {(detalhesPagamento?.pixQrCode || detalhesPagamento?.pixCopyPaste) && (
                            <div className="text-center mb-6">
                                <p className="text-brand-gray text-sm mb-4">Escaneie o QR Code ou copie o código PIX:</p>
                                
                                {detalhesPagamento.pixQrCode && (
                                    <img src={`data:image/png;base64,${detalhesPagamento.pixQrCode}`} 
                                        alt="QR Code PIX" className="mx-auto mb-4 rounded-lg" />
                                )}

                                {detalhesPagamento.pixCopyPaste && (
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <p className="text-white text-xs break-all mb-2">{detalhesPagamento.pixCopyPaste}</p>
                                        <Button onClick={() => copiarParaClipboard(detalhesPagamento.pixCopyPaste)} size="sm" fullWidth>
                                            Copiar Código PIX
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Boleto */}
                        {(detalhesPagamento?.boletoUrl || detalhesPagamento?.boletoBarcode) && (
                            <div className="space-y-4 mb-6">
                                {detalhesPagamento.boletoBarcode && (
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <p className="text-brand-gray text-xs mb-2">Linha digitável:</p>
                                        <p className="text-white text-sm break-all mb-2">{detalhesPagamento.boletoBarcode}</p>
                                        <Button onClick={() => copiarParaClipboard(detalhesPagamento.boletoBarcode)} size="sm" fullWidth variant="outline">
                                            Copiar Código
                                        </Button>
                                    </div>
                                )}

                                {detalhesPagamento.boletoUrl && (
                                    <a href={detalhesPagamento.boletoUrl} target="_blank" rel="noopener noreferrer">
                                        <Button fullWidth>
                                            Abrir Boleto
                                        </Button>
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Informações do pagamento */}
                        {pagamentoSelecionado && (
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between">
                                    <span className="text-brand-gray">Valor:</span>
                                    <span className="text-white font-medium">{formatarMoeda(pagamentoSelecionado.value)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-gray">Vencimento:</span>
                                    <span className="text-white">{formatarData(pagamentoSelecionado.dueDate)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-gray">Status:</span>
                                    <span className={`text-sm px-2 py-1 rounded
                                        ${pagamentoSelecionado.status === 'RECEIVED' || pagamentoSelecionado.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                                          pagamentoSelecionado.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {pagamentoSelecionado.status === 'RECEIVED' || pagamentoSelecionado.status === 'CONFIRMED' ? 'Pago' :
                                         pagamentoSelecionado.status === 'PENDING' ? 'Pendente' : 'Vencido'}
                                    </span>
                                </div>
                            </div>
                        )}

                        <Button onClick={() => { setModalDetalhesPagamento(false); setDetalhesPagamento(null); setPagamentoSelecionado(null); }} 
                            variant="outline" fullWidth>
                            Fechar
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}