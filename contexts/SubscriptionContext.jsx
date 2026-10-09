import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts';

import { useApi } from '@/hooks/useApi';

const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) 
{
    const { user } = useAuth();
    const { authFetch, loading, setLoading } = useApi();

    const [subscription, setSubscription] = useState(null);
    const userId = user?.user?.id;
    const [plans, setPlans] = useState([]);
    const [payments, setPayments] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);
    // true once /api/subscriptions/me answered (or failed) for the current user: gates must not block before that
    const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);

    useEffect(() => 
    {
        const loadSubscription = async () => 
        {
            if (!userId) 
            {
                setSubscription(null);
                setSubscriptionLoaded(false);
                setLoading(false);
                return;
            }

            try 
            {
                const response = await authFetch('/api/subscriptions/me');
                if (response.ok) 
                {
                    const data = await response.json();
                    setSubscription(data);
                }
            } 
            catch (err) 
            {
                console.error('Erro ao carregar assinatura:', err);
            } 
            finally 
            {
                setLoading(false);
                setSubscriptionLoaded(true);
            }
        };

        loadSubscription();
    }, [userId]);

    const fetchPlans = async () => 
    {
        try 
        {
            const response = await authFetch('/api/plans');
            if (response.ok) 
            {
                const data = await response.json();
                setPlans(data);
                return { success: true, data };
            }
            const error = await response.json();
            return { success: false, error: error.error };
        } 
        catch (err) 
        {
            console.error('Erro ao buscar planos:', err);
            return { success: false, error: 'Erro ao buscar planos' };
        }
    };

    const refreshSubscription = async () => 
    {
        try 
        {
            const response = await authFetch('/api/subscriptions/me');
            if (response.ok) 
            {
                const data = await response.json();
                setSubscription(data);
                return { success: true, data };
            }
            const error = await response.json();
            return { success: false, error: error.error };
        } 
        catch (err) 
        {
            console.error('Erro ao atualizar assinatura:', err);
            return { success: false, error: 'Erro ao atualizar assinatura' };
        }
    };

    const syncSubscription = async () => 
    {

        try 
        {
            const response = await authFetch('/api/subscriptions/me/sync', { method: 'POST' });

            const data = await response.json();

            if (response.ok) 
            {
                if (data.subscription) setSubscription(data.subscription);
                
                if (data.hasChanges) await fetchPayments();
                
                return { success: true, synced: data.synced, hasChanges: data.hasChanges, previousStatus: data.previousStatus, data: data.subscription };
            }

            return { success: false, error: data.error || 'Erro ao sincronizar' };
        } 
        catch (err) 
        {
            console.error('Erro ao sincronizar assinatura:', err);
            return { success: false, error: 'Erro ao sincronizar assinatura' };
        }
    };

    const createSubscription = async (planId, billingType, customerData = {}) => 
    {
        setActionLoading(true);
        try 
        {
            const response = await authFetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, billingType, customerData })
            });

            const data = await response.json();

            if (response.ok) 
            {
                await refreshSubscription();
                return { success: true, data };
            }

            return { success: false, error: data.error };
        } 
        catch (err) 
        {
            console.error('Erro ao criar assinatura:', err);
            return { success: false, error: 'Erro ao criar assinatura' };
        } 
        finally 
        {
            setActionLoading(false);
        }
    };

    const createSubscriptionWithCreditCard = async (planId, creditCard, creditCardHolderInfo) => 
    {
        setActionLoading(true);
        try 
        {
            const response = await authFetch('/api/subscriptions/credit-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, creditCard, creditCardHolderInfo })
            });

            const data = await response.json();

            if (response.ok) 
            {
                await refreshSubscription();
                return { success: true, data };
            }

            return { success: false, error: data.error };
        } 
        catch (err) 
        {
            console.error('Erro ao criar assinatura com cartão:', err);
            return { success: false, error: 'Erro ao criar assinatura com cartão' };
        } 
        finally 
        {
            setActionLoading(false);
        }
    };

    // Trial length is fixed server-side (7 days); the client no longer sends it.
    const startTrial = async (planId) => 
    {
        setActionLoading(true);
        try 
        {
            const response = await authFetch('/api/subscriptions/trial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId })
            });

            const data = await response.json();

            if (response.ok) 
            {
                await refreshSubscription();
                return { success: true, data };
            }

            return { success: false, error: data.error };
        } 
        catch (err) 
        {
            console.error('Erro ao iniciar trial:', err);
            return { success: false, error: 'Erro ao iniciar período de teste' };
        } 
        finally 
        {
            setActionLoading(false);
        }
    };

    const convertTrial = async (billingType, creditCard = null, creditCardHolderInfo = null, customerData = null) => 
    {
        setActionLoading(true);
        try 
        {
            const response = await authFetch('/api/subscriptions/convert-trial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ billingType, creditCard, creditCardHolderInfo, customerData })
            });

            const data = await response.json();

            if (response.ok) 
            {
                await refreshSubscription();
                return { success: true, data };
            }

            return { success: false, error: data.error };
        } 
        catch (err) 
        {
            console.error('Erro ao converter trial:', err);
            return { success: false, error: 'Erro ao converter período de teste' };
        } 
        finally 
        {
            setActionLoading(false);
        }
    };

    const updateSubscription = async (planId, updatePendingPayments = false) => 
    {
        setActionLoading(true);
        try 
        {
            const response = await authFetch('/api/subscriptions/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId, updatePendingPayments })
            });

            const data = await response.json();

            if (response.ok) 
            {
                await refreshSubscription();
                return { success: true, data };
            }

            // keep code/current/max (e.g. 409 EMPLOYEE_LIMIT) so the page can explain what to do
            return { success: false, error: data.error, code: data.code, status: response.status, data };
        } 
        catch (err) 
        {
            console.error('Erro ao atualizar assinatura:', err);
            return { success: false, error: 'Erro ao atualizar assinatura' };
        } 
        finally 
        {
            setActionLoading(false);
        }
    };

    const updateCreditCard = async (creditCard, creditCardHolderInfo) => 
    {
        setActionLoading(true);
        try 
        {
            const response = await authFetch('/api/subscriptions/me/credit-card', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creditCard, creditCardHolderInfo })
            });

            const data = await response.json();

            if (response.ok) 
            {
                return { success: true, data };
            }

            return { success: false, error: data.error };
        } 
        catch (err) 
        {
            console.error('Erro ao atualizar cartão:', err);
            return { success: false, error: 'Erro ao atualizar cartão' };
        } 
        finally 
        {
            setActionLoading(false);
        }
    };

    const cancelSubscription = async () => 
    {
        setActionLoading(true);
        try 
        {
            const response = await authFetch('/api/subscriptions/me', {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) 
            {
                await refreshSubscription();
                return { success: true, data };
            }

            return { success: false, error: data.error };
        } 
        catch (err) 
        {
            console.error('Erro ao cancelar assinatura:', err);
            return { success: false, error: 'Erro ao cancelar assinatura' };
        } 
        finally 
        {
            setActionLoading(false);
        }
    };

    const fetchPayments = async (filters = {}) => 
    {
        try 
        {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.offset) params.append('offset', filters.offset);
            if (filters.limit) params.append('limit', filters.limit);

            const query = params.toString();
            const response = await authFetch(`/api/subscriptions/me/payments${query ? '?' + query : ''}`);

            if (response.ok) 
            {
                const data = await response.json();
                setPayments(data.data || []);
                return { success: true, data };
            }

            const error = await response.json();
            return { success: false, error: error.error };
        } 
        catch (err) 
        {
            console.error('Erro ao buscar cobranças:', err);
            return { success: false, error: 'Erro ao buscar cobranças' };
        }
    };

    const getPaymentDetails = async (paymentId) => 
    {
        try 
        {
            const response = await authFetch(`/api/subscriptions/payments/${paymentId}`);

            if (response.ok) 
            {
                const data = await response.json();
                return { success: true, data };
            }

            const error = await response.json();
            return { success: false, error: error.error };
        } 
        catch (err) 
        {
            console.error('Erro ao buscar detalhes da cobrança:', err);
            return { success: false, error: 'Erro ao buscar detalhes da cobrança' };
        }
    };

    // Same rule as the backend's requireFeature(): the plan's feature list must contain the slug.
    const parsePlanFeatures = (features) =>
    {
        if (Array.isArray(features)) return features;
        try { return JSON.parse(features || '[]'); } catch { return []; }
    };

    const hasFeature = (feature) => parsePlanFeatures(subscription?.plan?.features).includes(feature);

    // Upgrade waiting for payment: the plan only changes after the payment is confirmed.
    // GET /subscriptions/me and PUT 202 return pendingPlan {id,name,slug,price} (or null); PUT may add payment {id,status,billingType,invoiceUrl}.
    const getPendingPlanChange = (source = subscription) =>
    {
        if (!source?.pendingPlan) return null;
        return { plan: source.pendingPlan, name: source.pendingPlan.name, message: source.message || null, payment: source.payment || null };
    };

    const canAddEmployee = () => 
    {
        if (!subscription) return false;
        const max = subscription.plan?.maxEmployees || 0;
        return max > 0;
    };

    const isTrialExpired = () => 
    {
        if (subscription?.status !== 'TRIAL') return false;
        if (!subscription?.trialEndsAt) return false;
        
        const trialEnd = new Date(subscription.trialEndsAt);
        return new Date() > trialEnd;
    };

    const getTrialDaysRemaining = () => 
    {
        if (subscription?.status !== 'TRIAL') return 0;
        if (!subscription?.trialEndsAt) return 0;
        
        const trialEnd = new Date(subscription.trialEndsAt);
        const now = new Date();
        const diffTime = trialEnd - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 0 ? diffDays : 0;
    };

    const hasActiveSubscription = () => 
    {
        return subscription?.status === 'ACTIVE' || subscription?.status === 'TRIAL';
    };

    const isPendingPayment = () => 
    {
        return subscription?.status === 'PENDING';
    };

    const value = { 
        subscription, 
        plans,
        payments,
        loading, 
        actionLoading,

        isLimited: subscription?.isLimited || false, 
        isOverdue: subscription?.status === 'OVERDUE',
        isTrial: subscription?.status === 'TRIAL',
        isActive: subscription?.status === 'ACTIVE',
        isPending: subscription?.status === 'PENDING',
        isCancelled: subscription?.status === 'CANCELLED',
        isSuspended: subscription?.status === 'SUSPENDED',
        
        plan: subscription?.plan,
        planSlug: subscription?.plan?.slug,
        
        fetchPlans,
        refreshSubscription,
        syncSubscription,
        createSubscription,
        createSubscriptionWithCreditCard,
        startTrial,
        convertTrial,
        updateSubscription,
        updateCreditCard,
        cancelSubscription,
        
        fetchPayments,
        getPaymentDetails,
        
        subscriptionLoaded,
        hasFeature,
        getPendingPlanChange,
        canAddEmployee, 
        isTrialExpired,
        getTrialDaysRemaining,
        hasActiveSubscription,
        isPendingPayment
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export const useSubscription = () => useContext(SubscriptionContext);