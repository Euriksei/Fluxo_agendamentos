import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { useApi } from '@/hooks/useApi';

const FlowsContext = createContext(null);

export function FlowsProvider({ children }) 
{
    const [flows, setFlows] = useState([]);
    const { authRequest, loading, setLoading, error, setError } = useApi();

    useEffect(() => 
    {
        const handleLogout = () => setFlows([]);
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    const getFlows = useCallback(async (limit = null) => 
    {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit);

        const url = `/api/flows${params.toString() ? `?${params}` : ''}`;
        const data = await authRequest(url);
        setFlows(data);
        return data;
    }, [authRequest]);

    const getFlowById = useCallback(async (flowId) => 
    {
        return authRequest(`/api/flows/${flowId}`);
    }, [authRequest]);

    const createFlow = useCallback(async (flowData) => 
    {
        const data = await authRequest('/api/flows', 
        {
            method: 'POST',
            body: JSON.stringify(flowData),
        });
        setFlows(prev => [data, ...prev]);
        return data;
    }, [authRequest]);

    const updateFlow = useCallback(async (flowId, flowData) => 
    {
        const data = await authRequest(`/api/flows/${flowId}`, 
        {
            method: 'PUT',
            body: JSON.stringify(flowData),
        });
        setFlows(prev => prev.map(f => f.id === flowId ? data : f));
        return data;
    }, [authRequest]);

    const deleteFlow = useCallback(async (flowId) => 
    {
        const data = await authRequest(`/api/flows/${flowId}`, { method: 'DELETE' });
        setFlows(prev => prev.filter(f => f.id !== flowId));
        return data;
    }, [authRequest]);

    const value = { flows, loading, setLoading, error, setError, getFlows, getFlowById, createFlow, updateFlow, deleteFlow };

    return (
        <FlowsContext.Provider value={value}>
            {children}
        </FlowsContext.Provider>
    );
}

export const useFlows = () => 
{
    const context = useContext(FlowsContext);
    if (!context) throw new Error('useFlows deve ser usado dentro de FlowsProvider');
    return context;
};