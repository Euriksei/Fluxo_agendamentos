import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { useApi } from '@/hooks/useApi';

const EmployeesContext = createContext(null);

export function EmployeesProvider({ children }) 
{
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const { authRequest, loading, setLoading, error, setError } = useApi();

    useEffect(() => 
    {
        const handleLogout = () => 
        {
            setEmployees([]);
            setSelectedEmployee(null);
        };
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    const getEmployees = useCallback(async () => 
    {
        const data = await authRequest('/api/employees');
        setEmployees(data);
        return data;
    }, [authRequest]);

    const getEmployeeById = useCallback(async (employeeId) => 
    {
        const data = await authRequest(`/api/employees/${employeeId}`);
        setSelectedEmployee(data);
        return data;
    }, [authRequest]);

    const createEmployee = useCallback(async (employeeData) => 
    {
        const data = await authRequest('/api/employees', 
        {
            method: 'POST',
            body: JSON.stringify(employeeData),
        });
        setEmployees(prev => [...prev, data]);
        return data;
    }, [authRequest]);

    const updateEmployee = useCallback(async (employeeId, employeeData) => 
    {
        const data = await authRequest(`/api/employees/${employeeId}`, 
        {
            method: 'PUT',
            body: JSON.stringify(employeeData),
        });
        setEmployees(prev => prev.map(e => e.id === employeeId ? data : e));
        return data;
    }, [authRequest]);

    const deleteEmployee = useCallback(async (employeeId) => 
    {
        const data = await authRequest(`/api/employees/${employeeId}`, 
        {
            method: 'DELETE',
        });
        setEmployees(prev => prev.filter(e => e.id !== employeeId));
        setSelectedEmployee(null);
        return data;
    }, [authRequest]);

    const createEmployeeAgenda = useCallback(async (employeeId, agendaData) => 
    {
        const data = await authRequest(`/api/employees/${employeeId}/agendas`, 
        {
            method: 'POST',
            body: JSON.stringify(agendaData),
        });

        if (selectedEmployee?.id === parseInt(employeeId)) 
        {
            setSelectedEmployee(prev => ({
                ...prev,
                agendas: [...(prev.agendas || []).filter(a => a.dayOfWeek !== data.dayOfWeek), data].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
            }));
        }

        return data;
    }, [authRequest, selectedEmployee]);

    const updateEmployeeAgenda = useCallback(async (employeeId, agendaId, agendaData) => 
    {
        const data = await authRequest(`/api/employees/${employeeId}/agendas/${agendaId}`, { method: 'PUT', body: JSON.stringify(agendaData) });
 
        if (selectedEmployee?.id === parseInt(employeeId)) setSelectedEmployee(prev => ({ ...prev, agendas: prev.agendas.map(a => a.id === parseInt(agendaId) ? data : a) }));
 
        return data;
    }, [authRequest, selectedEmployee]);

    const deleteEmployeeAgenda = useCallback(async (employeeId, agendaId) => 
    {
        const data = await authRequest(`/api/employees/${employeeId}/agendas/${agendaId}`, 
        {
            method: 'DELETE',
        });

        if (selectedEmployee?.id === parseInt(employeeId)) 
        {
            setSelectedEmployee(prev => ({
                ...prev,
                agendas: prev.agendas.filter(a => a.id !== parseInt(agendaId)),
            }));
        }

        return data;
    }, [authRequest, selectedEmployee]);

    const addEmployeeService = useCallback(async (employeeId, serviceId) => 
    {
        const data = await authRequest(`/api/employees/${employeeId}/services`, 
        {
            method: 'POST',
            body: JSON.stringify({ serviceId }),
        });

        if (selectedEmployee?.id === parseInt(employeeId)) 
        {
            setSelectedEmployee(prev => ({
                ...prev,
                services: [...(prev.services || []), data],
            }));
        }

        return data;
    }, [authRequest, selectedEmployee]);

    const updateEmployeeServices = useCallback(async (employeeId, serviceIds) => 
    {
        const data = await authRequest(`/api/employees/${employeeId}/services`, 
        {
            method: 'PUT',
            body: JSON.stringify({ serviceIds }),
        });

        if (selectedEmployee?.id === parseInt(employeeId)) 
        {
            setSelectedEmployee(prev => ({ ...prev, services: data }));
        }

        return data;
    }, [authRequest, selectedEmployee]);

    const removeEmployeeService = useCallback(async (employeeId, serviceId) => 
    {
        const data = await authRequest(`/api/employees/${employeeId}/services/${serviceId}`, 
        {
            method: 'DELETE',
        });

        if (selectedEmployee?.id === parseInt(employeeId)) 
        {
            setSelectedEmployee(prev => ({
                ...prev,
                services: prev.services.filter(s => s.id !== parseInt(serviceId)),
            }));
        }

        return data;
    }, [authRequest, selectedEmployee]);

    const value = { employees, selectedEmployee, setSelectedEmployee, loading, setLoading, error, setError, getEmployees, getEmployeeById, createEmployee, updateEmployee, 
        deleteEmployee, createEmployeeAgenda, updateEmployeeAgenda, deleteEmployeeAgenda, addEmployeeService, updateEmployeeServices, removeEmployeeService };

    return (
        <EmployeesContext.Provider value={value}>
            {children}
        </EmployeesContext.Provider>
    );
}

export const useEmployees = () => 
{
    const context = useContext(EmployeesContext);
    if (!context) throw new Error('useEmployees deve ser usado dentro de EmployeesProvider');
    return context;
};