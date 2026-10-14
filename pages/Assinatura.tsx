import { useState, useEffect, useRef } from 'react';
import { useAuth, useSubscription } from '@/contexts';

import { CreditCard, Calendar, Clock, Check, X, AlertTriangle, Crown, Zap, Users, ChevronRight, RefreshCw, Trash2, Star, Shield } from 'lucide-react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ResponsiveModal from '@/components/ui/ResponsiveModal';

import { formatarMoeda, formatarReais, formatarData, formatarDia, validarCpfCnpj, formatarCpfCnpj } from '@/utils';
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
            hasActiveSubscription, getPendingPlanChange } = useSubscription();

    // Upgrade waiting for payment confirmation (plan only changes after the payment is confirmed)
    const trocaPendente = getPendingPlanChange();

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
    const [linkPagamento, setLinkPagamento] = useState<string | null>(null);

    const [formCartao, setFormCartao] = useState({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' });
    const [formTitular, setFormTitular] = useState({ name: '', email: '', cpfCnpj: '', phone: '', postalCode: '', addressNumber: '' });
    const [formCliente, setFormCliente] = useState({ name: '', email: '', cpfCnpj: '', phone: '', postalCode: '', address: '', addressNumber: '', province: '' });

    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    // Payer data errors shown under each field ({ name, cpfCnpj }); the review step only opens when there are none
    const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
    const [revisandoAtivacao, setRevisandoAtivacao] = useState(false);

    // Billing email is always the account email (the API ignores any other); shown locked in the forms and in the review
    const { user } = useAuth();
    const emailConta = user?.user?.email || '';

    // CPF/CNPJ saved on the account after the last successful charge: pre-fills the forms (editable, still reviewed before paying)
    const docConta = subscription?.accountCpfCnpj || user?.user?.cpfCnpj || '';

    // Payments list: 'idle' until first load; the section always answers the "Ver cobranças" click (loading, empty reason or error)
    const [cobrancasEstado, setCobrancasEstado] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
    const [cobrancasErro, setCobrancasErro] = useState('');
    const historicoRef = useRef<HTMLElement>(null);

    const carregarCobrancas = async ({ rolar = false } = {}) =>
    {
        setCobrancasEstado('loading');
        setCobrancasErro('');
        if (rolar) requestAnimationFrame(() => historicoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

        const result = await fetchPayments();
        if (result.success) setCobrancasEstado('loaded');
        else
        {
            setCobrancasErro(result.error || 'Não foi possível carregar as cobranças.');
            setCobrancasEstado('error');
        }

        if (rolar) historicoRef.current?.focus({ preventScroll: true });
    };

    const verCobrancas = () => carregarCobrancas({ rolar: true });

    useEffect(() => 
    {
        fetchPlans();
        if (subscription?.asaasSubscriptionId) carregarCobrancas();
    }, [subscription]);

    const limparFormularios = () => 
    {
        setFormCartao({ holderName: '', number: '', expiryMonth: '', expiryYear: '', ccv: '' });
        setFormTitular({ name: '', email: '', cpfCnpj: docConta, phone: '', postalCode: '', addressNumber: '' });
        setFormCliente({ name: '', email: '', cpfCnpj: docConta, phone: '', postalCode: '', address: '', addressNumber: '', province: '' });
        setPlanoSelecionado(null);
        setBillingType('CREDIT_CARD');
        setUsarTrial(false);
        setEtapa(1);
        setErro('');
        setErrosCampos({});
        setRevisandoAtivacao(false);
    };

    // Same rules as the API: name required (card: the holder's, may be someone else) and a real CPF/CNPJ
    const validarPagador = (dados, titular = false) =>
    {
        const erros: Record<string, string> = {};
        if (!dados.name?.trim()) erros.name = titular ? 'Informe o nome do titular do cartão' : 'Informe o nome completo';
        const doc = validarCpfCnpj(dados.cpfCnpj);
        if (!doc.valid) erros.cpfCnpj = doc.error;
        setErrosCampos(erros);
        return Object.keys(erros).length === 0;
    };

    const dadosCartaoCompletos = () => formCartao.holderName && formCartao.number && formCartao.expiryMonth && formCartao.expiryYear && formCartao.ccv;

    // Step 3 -> review: validates everything that can be checked here before anything is sent
    const handleRevisar = () =>
    {
        setErro('');
        if (billingType === 'CREDIT_CARD')
        {
            if (!dadosCartaoCompletos()) { setErro('Preencha todos os dados do cartão'); return; }
            if (!validarPagador(formTitular, true)) return;
            if (!formTitular.postalCode) { setErro('Informe o CEP do titular'); return; }
        }
        else if (!validarPagador(formCliente)) return;

        setEtapa(4);
    };

    // API rejected the document (our check or the payment provider's): back to the form with the message on the field
    const tratarErroPagador = (result, voltar) =>
    {
        if (result.code === 'INVALID_PAYER' || result.code === 'INVALID_CPF_CNPJ')
        {
            setErrosCampos(/nome/i.test(result.error) ? { name: result.error } : { cpfCnpj: result.error });
            voltar();
        }
        setErro(result.error);
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
                const result = await startTrial(planoSelecionado.id);
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

                if (!validarPagador(formTitular, true) || !formTitular.postalCode)
                {
                    setErro('Confira os dados do titular');
                    setEtapa(3);
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
                    tratarErroPagador(result, () => setEtapa(3));
                }
            }
            else
            {
                if (!validarPagador(formCliente))
                {
                    setEtapa(3);
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
                    tratarErroPagador(result, () => setEtapa(3));
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
                const result = await convertTrial(billingType, formCartao, formTitular);
                
                if (result.success) 
                {
                    setSucesso('Assinatura ativada com sucesso!');
                    setModalPagamento(false);
                    limparFormularios();
                }
                else
                {
                    tratarErroPagador(result, () => setRevisandoAtivacao(false));
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
                    tratarErroPagador(result, () => setRevisandoAtivacao(false));
                }
            }
        } 
        catch (err) 
        {
            setErro('Erro ao processar. Tente novamente.');
        }
    };

    // Activation modal: same validation, then a review before charging
    const handleRevisarAtivacao = () =>
    {
        setErro('');
        if (billingType === 'CREDIT_CARD')
        {
            if (!dadosCartaoCompletos()) { setErro('Preencha todos os dados do cartão'); return; }
            if (!validarPagador(formTitular, true)) return;
            if (!formTitular.postalCode) { setErro('Informe o CEP do titular'); return; }
        }
        else if (!validarPagador(formCliente)) return;

        setRevisandoAtivacao(true);
    };

    const handleTrocarPlano = async () =>
    {
        if (!planoSelecionado) return;

        setErro('');
        const result = await updateSubscription(planoSelecionado.id, true);

        if (result.success)
        {
            const pendente = getPendingPlanChange(result.data);
            setModalTrocarPlano(false);
            setPlanoSelecionado(null);

            if (pendente)
            {
                setSucesso(`Aguardando confirmação do pagamento para o plano ${pendente.name}. O plano muda assim que o pagamento for confirmado.`);
                setLinkPagamento(pendente.payment?.invoiceUrl || null);
            }
            else setSucesso('Plano alterado com sucesso!');
        }
        else if (result.code === 'EMPLOYEE_LIMIT')
        {
            const { current = 0, max = 0 } = result.data || {};
            const remover = Math.max(1, current - max);
            const plural = (n) => (n === 1 ? 'profissional' : 'profissionais');
            setErro(`Seu plano novo permite até ${max} ${plural(max)}. Remova ${remover} ${plural(remover)} antes de trocar.`);
        }
        else
        {
            setErro(result.error || 'Não foi possível trocar o plano.');
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

        if (!validarPagador(formTitular, true)) return;

        const result = await updateCreditCard(formCartao, formTitular);
        
        if (result.success) 
        {
            setSucesso('Cartão atualizado com sucesso!');
            setModalCartao(false);
            limparFormularios();
        }
        else
        {
            tratarErroPagador(result, () => {});
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

    // Contracted plan (what the user pays) vs plan (effective: features/limits in force). Falls back to plan until the API sends contractedPlan.
    const planoContratado = subscription?.contractedPlan ?? subscription?.plan;
    const planosFiltrados = plans.filter(p => p.slug !== 'free' && p.id !== planoContratado?.id);

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
            <div className="flex gap-4 justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Assinatura</h1>
                <Button onClick={syncSubscription} variant="outline" disabled={loading} aria-label="Atualizar status da assinatura" title="Atualizar status" className="px-4!">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
                </Button>
            </div>

            {sucesso && (
                <div role="status" className="bg-green-500/20 border border-green-500/50 text-green-400 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-2">
                    <Check size={20} aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0 flex-1">{sucesso}</span>
                    {linkPagamento && (
                        <a href={linkPagamento} target="_blank" rel="noopener noreferrer"
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-brand-blue to-brand-purple px-4 font-semibold text-white sm:w-auto">
                            Pagar agora
                        </a>
                    )}
                </div>
            )}

            {trocaPendente && !sucesso && (
                <div role="status" className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-3">
                    <Clock size={20} className="shrink-0 text-yellow-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                        <p className="text-white font-medium">Aguardando confirmação do pagamento</p>
                        <p className="text-yellow-400 text-sm">
                            A troca para o plano {trocaPendente.name} será aplicada assim que o pagamento for confirmado.
                        </p>
                    </div>
                    <Button onClick={verCobrancas} disabled={cobrancasEstado === 'loading'} aria-busy={cobrancasEstado === 'loading'} size="sm" variant="secondary" className="w-full sm:w-auto">
                        {cobrancasEstado === 'loading' ? 'Carregando...' : 'Ver cobranças'}
                    </Button>
                </div>
            )}

            {/* Card Principal da Assinatura */}
            <div className="bg-brand-dark rounded-lg p-4 sm:p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusConfig.color}`}>
                            <StatusIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-white text-xl font-bold">
                                {planoContratado?.name || 'Sem Plano'}
                            </h2>
                            <span className={`inline-block text-xs px-2 py-1 rounded mt-1 ${statusConfig.color}`}>
                                {statusConfig.label}
                            </span>
                        </div>
                    </div>

                    {planoContratado?.price > 0 && (
                        <div className="md:text-right">
                            <p className="text-brand-gray text-sm">Valor mensal</p>
                            <p className="text-brand-blue text-2xl font-bold">
                                {formatarMoeda(planoContratado.price)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Informações do Trial */}
                {subscription?.status === 'TRIAL' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
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
                            <Button onClick={() => { limparFormularios(); setModalPagamento(true); }} size="sm" className="w-full sm:w-auto">
                                Assinar Agora
                            </Button>
                        </div>
                    </div>
                )}

                {/* Plano concedido pelo admin (sem cobrança): mostra a validade; vencido, o dono assina um plano pago normalmente */}
                {subscription?.grantedByAdmin && subscription?.status === 'ACTIVE' && (
                    <div role="status" className="bg-brand-purple/10 border border-brand-purple/30 rounded-lg p-4 mb-6 flex items-center gap-3">
                        <Star size={20} className="shrink-0 text-brand-purple" aria-hidden="true" />
                        <p className="text-white text-sm">
                            {subscription.validUntil ? <>Plano concedido, válido até <strong>{formatarDia(subscription.validUntil)}</strong></> : 'Plano concedido, sem data de vencimento'}
                        </p>
                    </div>
                )}

                {subscription?.grantedByAdmin && subscription?.status === 'EXPIRED' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <AlertTriangle size={20} className="text-red-400" aria-hidden="true" />
                            <div className="flex-1">
                                <p className="text-white font-medium">Plano concedido vencido</p>
                                <p className="text-red-400 text-sm">
                                    {subscription.validUntil ? `Venceu em ${formatarDia(subscription.validUntil)}. ` : ''}Assine um plano para voltar a usar todos os recursos.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Aviso de Pagamento Pendente */}
                {subscription?.status === 'PENDING' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <AlertTriangle size={20} className="text-yellow-400" />
                            <div className="flex-1">
                                <p className="text-white font-medium">Pagamento Pendente</p>
                                <p className="text-yellow-400 text-sm">
                                    Realize o pagamento para ativar sua assinatura
                                </p>
                            </div>
                            <Button onClick={verCobrancas} disabled={cobrancasEstado === 'loading'} aria-busy={cobrancasEstado === 'loading'} size="sm" variant="secondary" className="w-full sm:w-auto">
                                {cobrancasEstado === 'loading' ? 'Carregando...' : 'Ver Cobranças'}
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
                                <p className="text-brand-gray text-sm mb-1">{subscription.grantedByAdmin ? 'Válido até' : 'Próximo Vencimento'}</p>
                                <p className="text-white font-medium">{subscription.grantedByAdmin ? formatarDia(subscription.validUntil) : formatarData(subscription.nextPaymentAt)}</p>
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
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {(!subscription || subscription.status === 'NONE' || subscription.status === 'CANCELLED' || (subscription.status === 'EXPIRED' && subscription.grantedByAdmin)) && (
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
            {(cobrancasEstado !== 'idle' || payments?.length > 0 || (subscription && subscription.status !== 'NONE')) && (
                <section ref={historicoRef} tabIndex={-1} aria-labelledby="historico-titulo" className="bg-brand-dark rounded-lg p-4 sm:p-6 outline-none scroll-mt-20">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 id="historico-titulo" className="text-white text-lg font-semibold">Histórico de Pagamentos</h3>
                        {subscription?.asaasSubscriptionId && cobrancasEstado !== 'loading' && (
                            <Button onClick={() => carregarCobrancas()} size="sm" variant="outline">Atualizar</Button>
                        )}
                    </div>

                    {cobrancasEstado === 'loading' && (
                        <p role="status" className="flex items-center gap-2 text-sm text-brand-gray">
                            <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Carregando cobranças...
                        </p>
                    )}

                    {cobrancasEstado === 'error' && (
                        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
                            <AlertTriangle size={18} className="shrink-0 text-yellow-400" aria-hidden="true" />
                            <p className="min-w-0 flex-1 text-yellow-300">{cobrancasErro}</p>
                            <Button onClick={() => carregarCobrancas()} size="sm" variant="secondary">Tentar novamente</Button>
                        </div>
                    )}

                    {cobrancasEstado !== 'loading' && cobrancasEstado !== 'error' && !(payments?.length > 0) && (
                        <p role="status" className="text-sm text-brand-gray">
                            {subscription?.grantedByAdmin ? 'Plano concedido pelo administrador: sem cobranças.'
                                : subscription?.asaasSubscriptionId ? 'Nenhuma cobrança ainda.' : 'Nenhuma cobrança ainda. As cobranças aparecem aqui depois que você assinar um plano.'}
                        </p>
                    )}

                    {cobrancasEstado !== 'loading' && payments?.length > 0 && (
                    <div className="space-y-3">
                        {payments.map(payment => (
                            <button type="button" key={payment.id} onClick={() => handleVerPagamento(payment)}
                                className="w-full text-left flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                        ${payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                                          payment.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                          payment.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        {payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' ? <Check size={20} /> :
                                         payment.status === 'PENDING' ? <Clock size={20} /> : <X size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{formatarReais(payment.value)}</p>
                                        <p className="text-brand-gray text-sm">
                                            Vencimento: {formatarData(payment.dueDate)}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight size={20} className="text-brand-gray" aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                    )}
                </section>
            )}

            {/* Modal Nova Assinatura */}
            {modalNovaAssinatura && (
                <ResponsiveModal title={etapa === 1 ? 'Escolha seu Plano' : etapa === 2 ? 'Forma de Pagamento' : etapa === 4 ? 'Confirme os dados' : billingType === 'CREDIT_CARD' ? 'Dados do Cartão' : 'Dados para Cobrança'}
                    onClose={closeModalNovaAssinatura}
                    footer={
                        etapa === 1 ? <Button onClick={closeModalNovaAssinatura} variant="outline" fullWidth>Cancelar</Button>
                        : etapa === 2 ? (
                            <>
                                <Button onClick={() => setEtapa(1)} variant="outline" fullWidth>Voltar</Button>
                                {usarTrial
                                    ? <Button onClick={handleCriarAssinatura} disabled={actionLoading} fullWidth>{actionLoading ? 'Processando...' : 'Iniciar Teste'}</Button>
                                    : <Button onClick={() => setEtapa(3)} fullWidth>Continuar</Button>}
                            </>
                        ) : etapa === 3 ? (
                            <>
                                <Button onClick={() => setEtapa(2)} variant="outline" fullWidth>Voltar</Button>
                                <Button onClick={handleRevisar} fullWidth>Revisar</Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={() => setEtapa(3)} variant="outline" fullWidth>Corrigir dados</Button>
                                <Button onClick={handleCriarAssinatura} disabled={actionLoading} fullWidth>{actionLoading ? 'Processando...' : 'Confirmar e pagar'}</Button>
                            </>
                        )
                    }>

                    {/* Etapa 1: Escolher Plano */}
                    {etapa === 1 && (
                        <div className="space-y-3">
                            {plans.filter(p => p.slug !== 'free').map(plan => (
                                <PlanOption key={plan.id} plan={plan} selected={planoSelecionado?.id === plan.id} onSelect={() => handleSelecionarPlano(plan)}
                                    detail={plan.maxEmployees === 999 ? 'Ilimitado' : `Até ${plan.maxEmployees} funcionários`} />
                            ))}
                        </div>
                    )}

                    {/* Etapa 2: Forma de Pagamento */}
                    {etapa === 2 && (
                        <>
                            <div className="bg-white/5 rounded-lg p-4">
                                <p className="text-brand-gray text-sm">Plano selecionado:</p>
                                <p className="text-white font-semibold">{planoSelecionado?.name} - {formatarMoeda(planoSelecionado?.price)}/mês</p>
                            </div>

                            {!subscription || subscription.status === 'NONE' ? (
                                <label className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-pointer">
                                    <input type="checkbox" checked={usarTrial} onChange={e => setUsarTrial(e.target.checked)}
                                        className="size-5 shrink-0 rounded border-white/20 bg-brand-darker text-brand-purple focus:ring-brand-purple" />
                                    <span>
                                        <span className="block text-white font-medium">Começar com 7 dias grátis</span>
                                        <span className="block text-blue-400 text-sm">Teste todas as funcionalidades sem compromisso</span>
                                    </span>
                                </label>
                            ) : null}

                            {!usarTrial && <BillingTypePicker value={billingType} onChange={setBillingType} />}

                            {erro && <p role="alert" className="text-red-400 text-sm text-center">{erro}</p>}
                        </>
                    )}

                    {/* Etapa 3: Dados de Pagamento */}
                    {etapa === 3 && (
                        <>
                            {billingType === 'CREDIT_CARD'
                                ? <CardFields idPrefix="nova" formCartao={formCartao} setFormCartao={setFormCartao} formTitular={formTitular} setFormTitular={setFormTitular}
                                    errors={errosCampos} setErrors={setErrosCampos} emailConta={emailConta} fullHolder />
                                : <CustomerFields idPrefix="nova" form={formCliente} setForm={setFormCliente} errors={errosCampos} setErrors={setErrosCampos} emailConta={emailConta} withPhone />}

                            {erro && <p role="alert" className="text-red-400 text-sm">{erro}</p>}

                            <div className="flex items-center justify-center gap-2 text-brand-gray text-xs">
                                <Shield size={14} aria-hidden="true" />
                                Pagamento seguro processado pela ASAAS
                            </div>
                        </>
                    )}

                    {/* Etapa 4: Revisão antes de cobrar */}
                    {etapa === 4 && (
                        <>
                            <ResumoPagamento dados={billingType === 'CREDIT_CARD' ? formTitular : formCliente} email={emailConta} plano={planoSelecionado}
                                billingType={billingType} cartaoFinal={billingType === 'CREDIT_CARD' ? formCartao.number.slice(-4) : null} />
                            {erro && <p role="alert" className="text-red-400 text-sm">{erro}</p>}
                        </>
                    )}
                </ResponsiveModal>
            )}

            {/* Modal Trocar Plano */}
            {modalTrocarPlano && (
                <ResponsiveModal title="Trocar Plano" onClose={() => setModalTrocarPlano(false)}
                    footer={
                        <>
                            <Button onClick={() => setModalTrocarPlano(false)} variant="outline" fullWidth>Cancelar</Button>
                            <Button onClick={handleTrocarPlano} disabled={!planoSelecionado || actionLoading} fullWidth>{actionLoading ? 'Alterando...' : 'Confirmar'}</Button>
                        </>
                    }>
                    <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-brand-gray text-sm">Plano atual:</p>
                        <p className="text-white font-semibold">{planoContratado?.name}</p>
                    </div>

                    <div className="space-y-3">
                        {planosFiltrados.map(plan => (
                            <PlanOption key={plan.id} plan={plan} selected={planoSelecionado?.id === plan.id} onSelect={() => setPlanoSelecionado(plan)}
                                detail={`${plan.maxEmployees} funcionários`} />
                        ))}
                    </div>

                    {planosFiltrados.length === 0 && (
                        <p className="text-brand-gray text-center py-4">Você já está no melhor plano disponível!</p>
                    )}

                    {erro && <p role="alert" className="text-red-400 text-sm">{erro}</p>}
                </ResponsiveModal>
            )}

            {/* Modal Converter Trial */}
            {modalPagamento && (
                <ResponsiveModal title={revisandoAtivacao ? 'Confirme os dados' : 'Ativar Assinatura'} onClose={() => { setModalPagamento(false); setRevisandoAtivacao(false); }}
                    footer={revisandoAtivacao ? (
                        <>
                            <Button onClick={() => setRevisandoAtivacao(false)} variant="outline" fullWidth>Corrigir dados</Button>
                            <Button onClick={handleConverterTrial} disabled={actionLoading} fullWidth>{actionLoading ? 'Processando...' : 'Confirmar e pagar'}</Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setModalPagamento(false)} variant="outline" fullWidth>Cancelar</Button>
                            <Button onClick={handleRevisarAtivacao} fullWidth>Revisar</Button>
                        </>
                    )}>
                    {revisandoAtivacao ? (
                        <ResumoPagamento dados={billingType === 'CREDIT_CARD' ? formTitular : formCliente} email={emailConta} plano={planoContratado}
                            billingType={billingType} cartaoFinal={billingType === 'CREDIT_CARD' ? formCartao.number.slice(-4) : null} />
                    ) : (
                        <>
                            <div className="bg-white/5 rounded-lg p-4">
                                <p className="text-brand-gray text-sm">Plano:</p>
                                <p className="text-white font-semibold">{planoContratado?.name} - {formatarMoeda(planoContratado?.price)}/mês</p>
                            </div>

                            <BillingTypePicker value={billingType} onChange={setBillingType} />

                            {billingType === 'CREDIT_CARD'
                                ? <CardFields idPrefix="ativar" formCartao={formCartao} setFormCartao={setFormCartao} formTitular={formTitular} setFormTitular={setFormTitular}
                                    errors={errosCampos} setErrors={setErrosCampos} emailConta={emailConta} />
                                : <CustomerFields idPrefix="ativar" form={formCliente} setForm={setFormCliente} errors={errosCampos} setErrors={setErrosCampos} emailConta={emailConta} />}
                        </>
                    )}

                    {erro && <p role="alert" className="text-red-400 text-sm">{erro}</p>}
                </ResponsiveModal>
            )}

            {/* Modal Atualizar Cartão */}
            {modalCartao && (
                <ResponsiveModal title="Atualizar Cartão" onClose={() => setModalCartao(false)}
                    footer={
                        <>
                            <Button onClick={() => setModalCartao(false)} variant="outline" fullWidth>Cancelar</Button>
                            <Button onClick={handleAtualizarCartao} disabled={actionLoading} fullWidth>{actionLoading ? 'Salvando...' : 'Salvar Cartão'}</Button>
                        </>
                    }>
                    <CardFields idPrefix="cartao" formCartao={formCartao} setFormCartao={setFormCartao} formTitular={formTitular} setFormTitular={setFormTitular}
                        errors={errosCampos} setErrors={setErrosCampos} emailConta={emailConta} />
                    {erro && <p role="alert" className="text-red-400 text-sm">{erro}</p>}
                </ResponsiveModal>
            )}

            {/* Modal Cancelar Assinatura */}
            {modalCancelar && (
                <ResponsiveModal title="Cancelar Assinatura" onClose={() => setModalCancelar(false)}
                    footer={
                        <>
                            <Button onClick={() => setModalCancelar(false)} variant="outline" fullWidth>Manter</Button>
                            <Button onClick={handleCancelarAssinatura} disabled={actionLoading} variant="destructive" fullWidth>{actionLoading ? 'Cancelando...' : 'Cancelar Assinatura'}</Button>
                        </>
                    }>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-red-400" aria-hidden="true" />
                        </div>
                        <p className="text-brand-gray">Tem certeza que deseja cancelar sua assinatura?</p>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <p className="text-red-400 text-sm">Ao cancelar, você perderá acesso a:</p>
                        <ul className="text-red-400 text-sm mt-2 space-y-1">
                            {parseFeatures(subscription?.plan?.features).map((feature, index) => (
                                <li key={index}>• {PLAN_FEATURE_LABELS[feature] || feature}</li>
                            ))}
                        </ul>
                    </div>

                    {erro && <p role="alert" className="text-red-400 text-sm">{erro}</p>}
                </ResponsiveModal>
            )}

            {/* Modal Detalhes do Pagamento */}
            {modalDetalhesPagamento && (detalhesPagamento || pagamentoSelecionado) && (
                <ResponsiveModal title="Detalhes do Pagamento" onClose={() => { setModalDetalhesPagamento(false); setDetalhesPagamento(null); setPagamentoSelecionado(null); }}
                    footer={
                        <Button onClick={() => { setModalDetalhesPagamento(false); setDetalhesPagamento(null); setPagamentoSelecionado(null); }} variant="outline" fullWidth>Fechar</Button>
                    }>
                    {/* QR Code PIX */}
                    {(detalhesPagamento?.pixQrCode || detalhesPagamento?.pixCopyPaste) && (
                        <div className="text-center">
                            <p className="text-brand-gray text-sm mb-4">Escaneie o QR Code ou copie o código PIX:</p>

                            {detalhesPagamento.pixQrCode && (
                                <img src={`data:image/png;base64,${detalhesPagamento.pixQrCode}`}
                                    alt="QR Code PIX" className="mx-auto mb-4 w-full max-w-60 rounded-lg" />
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
                        <div className="space-y-4">
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
                                <a href={detalhesPagamento.boletoUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex min-h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-brand-blue to-brand-purple px-6 py-3 font-semibold text-white">
                                    Abrir Boleto
                                </a>
                            )}
                        </div>
                    )}

                    {/* Informações do pagamento */}
                    {pagamentoSelecionado && (
                        <dl className="space-y-3">
                            <div className="flex justify-between">
                                <dt className="text-brand-gray">Valor:</dt>
                                <dd className="text-white font-medium">{formatarReais(pagamentoSelecionado.value)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-brand-gray">Vencimento:</dt>
                                <dd className="text-white">{formatarData(pagamentoSelecionado.dueDate)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-brand-gray">Status:</dt>
                                <dd className={`text-sm px-2 py-1 rounded
                                    ${pagamentoSelecionado.status === 'RECEIVED' || pagamentoSelecionado.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                                      pagamentoSelecionado.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {pagamentoSelecionado.status === 'RECEIVED' || pagamentoSelecionado.status === 'CONFIRMED' ? 'Pago' :
                                     pagamentoSelecionado.status === 'PENDING' ? 'Pendente' : 'Vencido'}
                                </dd>
                            </div>
                        </dl>
                    )}
                </ResponsiveModal>
            )}
        </div>
    );
}

// ---- Shared form pieces (module scope: stable identity, no remount while typing) ----

const LABEL = 'block text-sm text-brand-gray mb-1';

function Field({ id, label, className = '', ...inputProps })
{
    return (
        <div className={`min-w-0 ${className}`}>
            <label htmlFor={id} className={LABEL}>{label}</label>
            <Input id={id} fullWidth {...inputProps} />
        </div>
    );
}

function PlanOption({ plan, selected, onSelect, detail })
{
    return (
        <button type="button" onClick={onSelect} aria-pressed={selected}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selected ? 'border-brand-purple bg-brand-purple/10' : 'border-white/10 hover:border-white/30'}`}>
            <span className="flex justify-between items-center gap-3">
                <span className="min-w-0">
                    <span className="block text-white font-semibold">{plan.name}</span>
                    <span className="block text-brand-gray text-sm">{detail}</span>
                </span>
                <span className="shrink-0 text-brand-blue font-bold">{formatarMoeda(plan.price)}/mês</span>
            </span>
        </button>
    );
}

function BillingTypePicker({ value, onChange })
{
    return (
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Forma de pagamento">
            {Object.entries(BILLING_TYPES).map(([key, config]) => {
                const Icon = config.icon;
                const active = value === key;
                return (
                    <button key={key} type="button" onClick={() => onChange(key)} aria-pressed={active}
                        className={`min-h-20 p-3 rounded-lg border-2 text-center transition-all ${active ? 'border-brand-purple bg-brand-purple/10' : 'border-white/10 hover:border-white/30'}`}>
                        <Icon size={24} className={`mx-auto mb-1 ${active ? 'text-brand-purple' : 'text-brand-gray'}`} aria-hidden="true" />
                        <span className={`text-sm ${active ? 'text-white' : 'text-brand-gray'}`}>{config.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

const digits = (v, max?) => (max ? v.replace(/\D/g, '').slice(0, max) : v.replace(/\D/g, ''));

// Inline error under a field; the input points to it with aria-describedby
function FieldError({ id, error })
{
    return error ? <p id={id} role="alert" className="mt-1 text-xs text-red-400">{error}</p> : null;
}

// Required name with its own error (payer for PIX/boleto, card holder for card: may be another person)
function NameField({ id, label, value, onChange, error })
{
    return (
        <div className="min-w-0">
            <label htmlFor={id} className={LABEL}>{label} *</label>
            <Input id={id} fullWidth value={value} autoComplete="name" required onChange={onChange} placeholder="Nome completo"
                aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-erro` : undefined} />
            <FieldError id={`${id}-erro`} error={error} />
        </div>
    );
}

// CPF/CNPJ with the mask applied while typing (state keeps digits only) and the same check-digit validation as the API
function DocField({ id, label, value, onChange, error, className = '' })
{
    return (
        <div className={`min-w-0 ${className}`}>
            <label htmlFor={id} className={LABEL}>{label} *</label>
            <Input id={id} fullWidth value={formatarCpfCnpj(value)} inputMode="numeric" autoComplete="off" required maxLength={18}
                onChange={e => onChange(digits(e.target.value, 14))} placeholder="000.000.000-00"
                aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-erro` : undefined} />
            <FieldError id={`${id}-erro`} error={error} />
        </div>
    );
}

// Billing email is locked to the account email (the API ignores anything else)
function EmailContaField({ id, emailConta })
{
    return (
        <div className="min-w-0">
            <label htmlFor={id} className={LABEL}>Email da cobrança</label>
            <Input id={id} fullWidth type="email" value={emailConta} disabled readOnly className="cursor-not-allowed opacity-70" aria-describedby={`${id}-ajuda`} />
            <p id={`${id}-ajuda`} className="mt-1 text-xs text-brand-gray">É o email da sua conta. Para mudar, altere o email da conta.</p>
        </div>
    );
}

function CardFields({ idPrefix, formCartao, setFormCartao, formTitular, setFormTitular, errors = {} as Record<string, string | undefined>, setErrors = (e) => {}, emailConta = '', fullHolder = false })
{
    const p = (n) => `${idPrefix}-${n}`;
    const clearError = (field) => { if (errors[field]) setErrors({ ...errors, [field]: undefined }); };
    return (
        <div className="space-y-4">
            <Field id={p('cc-nome')} label="Nome no Cartão" value={formCartao.holderName} autoComplete="cc-name" autoCapitalize="characters"
                onChange={e => setFormCartao({ ...formCartao, holderName: e.target.value.toUpperCase() })} placeholder="NOME COMO NO CARTÃO" />

            <Field id={p('cc-numero')} label="Número do Cartão" value={formCartao.number} inputMode="numeric" autoComplete="cc-number"
                onChange={e => setFormCartao({ ...formCartao, number: digits(e.target.value, 16) })} placeholder="0000 0000 0000 0000" />

            <div className="grid grid-cols-3 gap-3">
                <Field id={p('cc-mes')} label="Mês" value={formCartao.expiryMonth} inputMode="numeric" autoComplete="cc-exp-month"
                    onChange={e => setFormCartao({ ...formCartao, expiryMonth: digits(e.target.value, 2) })} placeholder="MM" />
                <Field id={p('cc-ano')} label="Ano" value={formCartao.expiryYear} inputMode="numeric" autoComplete="cc-exp-year"
                    onChange={e => setFormCartao({ ...formCartao, expiryYear: digits(e.target.value, 4) })} placeholder="AAAA" />
                <Field id={p('cc-cvv')} label="CVV" type="password" value={formCartao.ccv} inputMode="numeric" autoComplete="cc-csc"
                    onChange={e => setFormCartao({ ...formCartao, ccv: digits(e.target.value, 4) })} placeholder="***" />
            </div>

            <hr className="border-white/10" />

            <h3 className="text-white font-medium">Dados do Titular do Cartão</h3>
            <p className="-mt-2 text-xs text-brand-gray">Pode ser outra pessoa: use o nome e o CPF/CNPJ de quem é o cartão.</p>

            <NameField id={p('tit-nome')} label="Nome do titular" value={formTitular.name} error={errors.name}
                onChange={e => { setFormTitular({ ...formTitular, name: e.target.value }); clearError('name'); }} />

            <div className="grid grid-cols-2 gap-3">
                <DocField id={p('tit-doc')} label="CPF/CNPJ do titular" value={formTitular.cpfCnpj} error={errors.cpfCnpj} className={fullHolder ? '' : 'col-span-2'}
                    onChange={v => { setFormTitular({ ...formTitular, cpfCnpj: v }); clearError('cpfCnpj'); }} />
                {fullHolder && (
                    <Field id={p('tit-tel')} label="Telefone" type="tel" value={formTitular.phone} inputMode="tel" autoComplete="tel"
                        onChange={e => setFormTitular({ ...formTitular, phone: digits(e.target.value) })} placeholder="(00) 00000-0000" />
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field id={p('tit-cep')} label="CEP" value={formTitular.postalCode} inputMode="numeric" autoComplete="postal-code"
                    onChange={e => setFormTitular({ ...formTitular, postalCode: digits(e.target.value, 8) })} placeholder="00000-000" />
                <Field id={p('tit-numero')} label="Número" value={formTitular.addressNumber} inputMode="numeric" autoComplete="off"
                    onChange={e => setFormTitular({ ...formTitular, addressNumber: e.target.value })} placeholder="Nº" />
            </div>

            <EmailContaField id={p('tit-email')} emailConta={emailConta} />
        </div>
    );
}

function CustomerFields({ idPrefix, form, setForm, errors = {} as Record<string, string | undefined>, setErrors = (e) => {}, emailConta = '', withPhone = false })
{
    const p = (n) => `${idPrefix}-${n}`;
    const clearError = (field) => { if (errors[field]) setErrors({ ...errors, [field]: undefined }); };
    return (
        <div className="space-y-4">
            <NameField id={p('cli-nome')} label="Nome completo" value={form.name} error={errors.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); clearError('name'); }} />
            <div className="grid grid-cols-2 gap-3">
                <DocField id={p('cli-doc')} label="CPF/CNPJ" value={form.cpfCnpj} error={errors.cpfCnpj} className={withPhone ? '' : 'col-span-2'}
                    onChange={v => { setForm({ ...form, cpfCnpj: v }); clearError('cpfCnpj'); }} />
                {withPhone && (
                    <Field id={p('cli-tel')} label="Telefone" type="tel" value={form.phone} inputMode="tel" autoComplete="tel"
                        onChange={e => setForm({ ...form, phone: digits(e.target.value) })} placeholder="(00) 00000-0000" />
                )}
            </div>
            <EmailContaField id={p('cli-email')} emailConta={emailConta} />
        </div>
    );
}

// Last step before charging: everything the payment provider will receive, so a wrong CPF or name is caught here
function ResumoPagamento({ dados, email, plano, billingType, cartaoFinal })
{
    const linhas = [
        [billingType === 'CREDIT_CARD' ? 'Titular do cartão' : 'Nome', dados.name],
        ['CPF/CNPJ', formatarCpfCnpj(dados.cpfCnpj)],
        ['Email da cobrança', email],
        ['Plano', plano?.name],
        ['Valor', `${formatarMoeda(plano?.price)}/mês`],
        ['Forma de pagamento', `${BILLING_TYPES[billingType]?.label}${cartaoFinal ? ` (final ${cartaoFinal})` : ''}`]
    ];

    return (
        <div className="space-y-3">
            <p className="text-sm text-brand-gray">Confira os dados antes de confirmar. A cobrança será feita com estas informações.</p>
            <dl className="divide-y divide-white/10 rounded-lg bg-white/5">
                {linhas.map(([rotulo, valor]) => (
                    <div key={rotulo} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                        <dt className="shrink-0 text-brand-gray">{rotulo}</dt>
                        <dd className="min-w-0 text-right font-medium text-white [overflow-wrap:anywhere]">{valor}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
