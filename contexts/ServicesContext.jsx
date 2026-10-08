import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { useApi } from '@/hooks/useApi';

const ServicesContext = createContext(null);

export function ServicesProvider({ children }) 
{
    const [services, setServices] = useState([]);
    const { authRequest, publicRequest, loading, setLoading, error, setError } = useApi();

    useEffect(() => 
    {
        const handleLogout = () => setServices([]);
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    const getServices = useCallback(async () => 
    {
        const data = await authRequest('/api/services');
        setServices(data);
        return data;
    }, [authRequest]);

    const getServiceById = useCallback(async (serviceId) => 
    {
        return authRequest(`/api/services/${serviceId}`);
    }, [authRequest]);

    const createService = useCallback(async (serviceData) => 
    {
        const data = await authRequest('/api/services', { method: 'POST', body: JSON.stringify(serviceData) });
        setServices(prev => [data, ...prev]);
        return data;
    }, [authRequest]);

    const updateService = useCallback(async (serviceId, serviceData) => 
    {
        const data = await authRequest(`/api/services/${serviceId}`, 
        {
            method: 'PUT',
            body: JSON.stringify(serviceData),
        });
        setServices(prev => prev.map(s => s.id === serviceId ? data : s));
        return data;
    }, [authRequest]);

    const offerService = useCallback(async (serviceId) => 
    {
        const data = await authRequest(`/api/services/${serviceId}/offer`, { method: 'POST' });
        setServices(prev => prev.map(s => s.id === serviceId ? { ...s, userOffersService: data.userOffersService } : s));
        return data;
    }, [authRequest]);

    const deleteService = useCallback(async (serviceId) => 
    {
        const data = await authRequest(`/api/services/${serviceId}`, { method: 'DELETE' });
        setServices(prev => prev.filter(s => s.id !== serviceId));
        return data;
    }, [authRequest]);

    const getBarberServices = useCallback(async (barberId, options) => 
    {
        return publicRequest(`/api/services/barber/${barberId}`, options);
    }, [publicRequest]);

    const getBarberEmployeesServices = useCallback(async (serviceId) => 
    {
        return publicRequest(`/api/services/${serviceId}/employees`);
    }, [publicRequest]);

    const value = { services, loading, setLoading, error, setError, getServices, getServiceById, createService, updateService, offerService, deleteService, getBarberServices, 
        getBarberEmployeesServices };

    return (
        <ServicesContext.Provider value={value}>
            {children}
        </ServicesContext.Provider>
    );
}

export const useServices = () => 
{
    const context = useContext(ServicesContext);
    if (!context) throw new Error('useServices deve ser usado dentro de ServicesProvider');
    return context;
};