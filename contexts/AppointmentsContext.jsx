import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { useApi } from '@/hooks/useApi';

const AppointmentsContext = createContext(null);

export function AppointmentsProvider({ children }) 
{
    const [appointments, setAppointments] = useState([]);
    const { authRequest, publicRequest, loading, setLoading, error, setError } = useApi();

    useEffect(() => 
    {
        const handleLogout = () => setAppointments([]);
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    const getBarberAppointments = useCallback(async (date = null, status = null, barberId = null) =>
    {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (status) params.append('status', status);
        if (barberId) params.append('barberId', barberId);

        const url = `/api/appointments/barber${params.toString() ? `?${params}` : ''}`;
        const data = await authRequest(url);
        setAppointments(data);
        return data;
    }, [authRequest]);

    const getAppointmentById = useCallback(async (appointmentId) => 
    {
        return authRequest(`/api/appointments/${appointmentId}`);
    }, [authRequest]);

    const createAppointment = useCallback(async (appointmentData) => 
    {
        return publicRequest('/api/appointments', 
        {
            method: 'POST',
            body: JSON.stringify(appointmentData),
        });
    }, [publicRequest]);

    const updateAppointmentStatus = useCallback(async (appointmentId, status, cancelReason = null) => 
    {
        const data = await authRequest(`/api/appointments/${appointmentId}/status`, 
        {
            method: 'PATCH',
            body: JSON.stringify({ status, cancelReason }),
        });
        setAppointments(prev => prev.map(a => a.id === appointmentId ? data : a));
        return data;
    }, [authRequest]);

    const cancelAppointment = useCallback(async (appointmentId, reason = null) => 
    {
        const data = await authRequest(`/api/appointments/${appointmentId}`, 
        {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
        });
        setAppointments(prev => prev.map(a =>
            a.id === appointmentId ? { ...a, status: 'CANCELLED', cancelReason: reason } : a
        ));
        return data;
    }, [authRequest]);

    const rescheduleAppointment = useCallback(async (appointmentId, newDate, newStartTime) => 
    {
        return authRequest(`/api/appointments/${appointmentId}/reschedule`, 
        {
            method: 'PATCH',
            body: JSON.stringify({ appointmentDate: newDate, startTime: newStartTime }),
        });
    }, [authRequest]);

    // FUNÇÕES PÚBLICAS

    const getClientAppointments = useCallback(async (email) => 
    {
        return publicRequest(`/api/appointments/client/${encodeURIComponent(email)}`);
    }, [publicRequest]);

    const cancelClientAppointment = useCallback(async (appointmentId, email, reason = null) => 
    {
        return publicRequest(`/api/appointments/client/${appointmentId}`, 
        {
            method: 'DELETE',
            body: JSON.stringify({ email, reason }),
        });
    }, [publicRequest]);

    const value = { appointments, setAppointments, loading, setLoading, error, setError, getBarberAppointments, getAppointmentById, createAppointment, updateAppointmentStatus, 
        cancelAppointment, rescheduleAppointment, getClientAppointments, cancelClientAppointment };

    return (
        <AppointmentsContext.Provider value={value}>
            {children}
        </AppointmentsContext.Provider>
    );
}

export const useAppointments = () => 
{
    const context = useContext(AppointmentsContext);
    if (!context) throw new Error('useAppointments deve ser usado dentro de AppointmentsProvider');
    return context;
};