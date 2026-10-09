import { useEffect, useState } from 'react';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

import { EmployeesProvider, useEmployees } from '@/contexts/EmployeesContext';
import { ServicesProvider, useServices } from '@/contexts/ServicesContext';
import { AgendasProvider, useAgendas } from '@/contexts/AgendasContext';
import { AppointmentsProvider, useAppointments } from '@/contexts/AppointmentsContext';
import { FlowsProvider, useFlows } from '@/contexts/FlowsContext';
import { BarberProvider } from '@/contexts/BarberContext';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';

import { NotificationProvider } from '@/contexts/NotificationContext';

function DataLoader({ children }) 
{
    const { user, isAuthenticated } = useAuth();
    const { getEmployees } = useEmployees();
    const { getServices } = useServices();
    const { getAgendas, getBlocks } = useAgendas();
    const { getBarberAppointments } = useAppointments();
    const { getFlows } = useFlows();
    const { subscription, subscriptionLoaded, hasFeature } = useSubscription();
    const [initialLoading, setInitialLoading] = useState(false);

    // Depend on stable primitives: `user` is a new object on every setUser (StrictMode double /me, login, profile update), which re-ran this load.
    const userId = user?.user?.id;
    const role = user?.user?.role;

    // Only load what the plan includes: calling a feature outside the plan returns 403 (and a toast) for nothing.
    const can = (feature) => !subscription || hasFeature(feature);
    const featureKey = ['employees', 'services', 'agendas', 'appointments', 'flows'].filter(can).join(',');

    useEffect(() => 
    {
        if (!isAuthenticated || !subscriptionLoaded) return;

        const loadInitialData = async () => 
        {
            setInitialLoading(true);

            try 
            {
                const loads = [];
                if (can('employees')) loads.push(getEmployees());
                if (can('services')) loads.push(getServices());
                if (can('agendas')) loads.push(getAgendas(), getBlocks());
                if (can('appointments')) loads.push(getBarberAppointments());
                if (role === 'BARBER' && can('flows')) loads.push(getFlows());
                if (role === 'BARBER' || role === 'EMPLOYEE') await Promise.allSettled(loads);
            } 
            catch (error) 
            {
                console.error('Erro ao carregar dados iniciais:', error);
            } 
            finally 
            {
                setInitialLoading(false);
            }
        };

        loadInitialData();
    }, [isAuthenticated, userId, role, subscriptionLoaded, featureKey]);

    return children;
}

function InnerProviders({ children }) 
{
    const { loading } = useAuth();

    if (loading) 
    {
        return null;
    }

    return (
        <BarberProvider>
            <SubscriptionProvider>
                <EmployeesProvider>
                    <ServicesProvider>
                        <AgendasProvider>
                            <AppointmentsProvider>
                                <FlowsProvider>
                                    <DataLoader>
                                        {children}
                                    </DataLoader>
                                </FlowsProvider>
                            </AppointmentsProvider>
                        </AgendasProvider>
                    </ServicesProvider>
                </EmployeesProvider>
            </SubscriptionProvider>
        </BarberProvider>
    );
}

export function AppProvider({ children }) 
{
    return (
        <NotificationProvider>
            <AuthProvider>
                <InnerProviders>
                    {children}
                </InnerProviders>
            </AuthProvider>
        </NotificationProvider>
    );
}

export { useAuth } from '@/contexts/AuthContext';
export { useEmployees } from '@/contexts/EmployeesContext';
export { useServices } from '@/contexts/ServicesContext';
export { useAgendas } from '@/contexts/AgendasContext';
export { useAppointments } from '@/contexts/AppointmentsContext';
export { useFlows } from '@/contexts/FlowsContext';
export { useBarber } from '@/contexts/BarberContext';
export { useSubscription } from '@/contexts/SubscriptionContext';

export { useNotification } from '@/contexts/NotificationContext';

export { useApi, notifyError, notifySuccess, notifyWarning, notifyInfo } from '@/hooks/useApi';