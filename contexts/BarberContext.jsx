import { createContext, useContext, useCallback } from 'react';

import { useApi } from '@/hooks/useApi';

const BarberContext = createContext(null);

export function BarberProvider({ children }) 
{
    const { publicRequest, loading, setLoading, error, setError } = useApi();

    const getBarberId = useCallback(async (slug) => 
    {
        return publicRequest(`/api/auth/barber/${slug}`);
    }, [publicRequest]);

    const getBarberData = useCallback(async (slug) => 
    {
        return publicRequest(`/api/auth/barber/${slug}/data`);
    }, [publicRequest]);

    const value = { loading, setLoading, error, setError, getBarberId, getBarberData };

    return (
        <BarberContext.Provider value={value}>
            {children}
        </BarberContext.Provider>
    );
}

export const useBarber = () => 
{
    const context = useContext(BarberContext);
    if (!context) throw new Error('useBarber deve ser usado dentro de BarberProvider');
    return context;
};