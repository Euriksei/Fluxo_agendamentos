import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { useApi } from '@/hooks/useApi';

const AgendasContext = createContext(null);

export function AgendasProvider({ children }) 
{
    const [agendas, setAgendas] = useState([]);
    const [blocks, setBlocks] = useState([]);
    const { authRequest, publicRequest, loading, setLoading, error, setError } = useApi();

    useEffect(() => 
    {
        const handleLogout = () => 
        {
            setAgendas([]);
            setBlocks([]);
        };
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    // AGENDAS

    const getAgendas = useCallback(async () => 
    {
        const data = await authRequest('/api/agendas');
        setAgendas(data);
        return data;
    }, [authRequest]);

    const createAgenda = useCallback(async (agendaData) => 
    {
        const data = await authRequest('/api/agendas', 
        {
            method: 'POST',
            body: JSON.stringify(agendaData),
        });

        // Upsert: substitui se já existe o dia
        setAgendas(prev => 
        {
            const existingIndex = prev.findIndex(a => a.dayOfWeek === data.dayOfWeek);
            if (existingIndex >= 0) 
            {
                const updated = [...prev];
                updated[existingIndex] = data;
                return updated;
            }
            return [...prev, data].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
        });

        return data;
    }, [authRequest]);

    const updateAgenda = useCallback(async (agendaId, agendaData) => 
    {
        const data = await authRequest(`/api/agendas/${agendaId}`, 
        {
            method: 'PUT',
            body: JSON.stringify(agendaData),
        });
        setAgendas(prev => prev.map(a => a.id === agendaId ? data : a));
        return data;
    }, [authRequest]);

    const deleteAgenda = useCallback(async (agendaId) => 
    {
        const data = await authRequest(`/api/agendas/${agendaId}`, { method: 'DELETE' });
        setAgendas(prev => prev.filter(a => a.id !== agendaId));
        return data;
    }, [authRequest]);

    // BLOQUEIOS

    const getBlocks = useCallback(async () => 
    {
        const data = await authRequest('/api/agendas/blocks');
        setBlocks(data);
        return data;
    }, [authRequest]);

    const createBlock = useCallback(async (blockData) => 
    {
        const data = await authRequest('/api/agendas/blocks', { method: 'POST', body: JSON.stringify(blockData)});
        await getBlocks();
        return data;
    }, [authRequest, getBlocks]);

    const deleteBlock = useCallback(async (blockId) => 
    {
        const data = await authRequest(`/api/agendas/blocks/${blockId}`, 
        {
            method: 'DELETE',
        });
        setBlocks(prev => prev.filter(b => b.id !== blockId));
        return data;
    }, [authRequest]);

    const getBarberAgenda = useCallback(async (barberId) => { return publicRequest(`/api/agendas/barber/${barberId}`); }, [publicRequest]);

    const getBarberBlocks = useCallback(async (barberId) => 
    {
        const data = await publicRequest(`/api/agendas/barber/blocks/${barberId}`);
        setBlocks(data);
        return data;
    }, [publicRequest]);

    const getAvailableSlots = useCallback(async (barberId, date, serviceId = null) => 
    {
        let url = `/api/agendas/slots/${barberId}/${date}`;
        if (serviceId) url += `?serviceId=${serviceId}`;
        return publicRequest(url);
    }, [publicRequest]);

    const value = { agendas, blocks, loading, setLoading, error, setError, getAgendas, createAgenda, updateAgenda, deleteAgenda, getBlocks, createBlock, deleteBlock, 
        getBarberAgenda, getBarberBlocks, getAvailableSlots };

    return (
        <AgendasContext.Provider value={value}>
            {children}
        </AgendasContext.Provider>
    );
}

export const useAgendas = () => 
{
    const context = useContext(AgendasContext);
    if (!context) throw new Error('useAgendas deve ser usado dentro de AgendasProvider');
    return context;
};