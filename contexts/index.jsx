import { useEffect, useState } from 'react';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

import { EmployeesProvider, useEmployees } from '@/contexts/EmployeesContext';
import { ServicesProvider, useServices } from '@/contexts/ServicesContext';
import { AgendasProvider, useAgendas } from '@/contexts/AgendasContext';
import { AppointmentsProvider, useAppointments } from '@/contexts/AppointmentsContext';
import { FlowsProvider, useFlows } from '@/contexts/FlowsContext';
import { BarberProvider } from '@/contexts/BarberContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

import { NotificationProvider } from '@/contexts/NotificationContext';

function DataLoader({ children }) 
{
    const { user, isAuthenticated } = useAuth();
    const { getEmployees } = useEmployees();
    const { getServices } = useServices();
    const { getAgendas, getBlocks } = useAgendas();
    const { getBarberAppointments } = useAppointments();
    const { getFlows } = useFlows();
    const [initialLoading, setInitialLoading] = useState(false);

    useEffect(() => 
    {
        if (!isAuthenticated) return;

        const loadInitialData = async () => 
        {
            setInitialLoading(true);

            const role = user.user.role;

            try 
            {
                if (role === 'BARBER') await Promise.all([ getEmployees(), getServices(), getAgendas(), getBlocks(), getBarberAppointments(), getFlows() ]);
                else if (role === 'EMPLOYEE') await Promise.all([ getEmployees(), getServices(), getAgendas(), getBlocks(), getBarberAppointments() ]);
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
    }, [isAuthenticated, user]);

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