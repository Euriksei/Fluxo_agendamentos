import { useCallback, useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3001';

export const notifyError = (message) => { window.dispatchEvent(new CustomEvent('app:notification', { detail: { message, type: 'error' } })); };
export const notifySuccess = (message) => { window.dispatchEvent(new CustomEvent('app:notification', { detail: { message, type: 'success' } })); };
export const notifyWarning = (message) => { window.dispatchEvent(new CustomEvent('app:notification', { detail: { message, type: 'warning' } })); };
export const notifyInfo = (message) => { window.dispatchEvent(new CustomEvent('app:notification', { detail: { message, type: 'info' } })); };

export function useApi() 
{
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState(null);
    useEffect(() => { if (error) notifyError(error); }, [error]);

    const authFetch = useCallback(async (endpoint, options = {}) => 
    {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}${endpoint}`, 
        {
            ...options,
            headers: 
            {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        });

        if (response.status === 401) 
        {
            localStorage.removeItem('token');
            window.dispatchEvent(new CustomEvent('auth:logout'));
            throw new Error('Sessão expirada. Faça login novamente.');
        }

        return response;
    }, []);

    const publicFetch = useCallback(async (endpoint, options = {}) => 
    {
        return fetch(`${API_URL}${endpoint}`, 
        {
            ...options,
            headers: 
            {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
    }, []);

    const request = useCallback(async (fetchFn, endpoint, options = {}) => 
    {
        setError(null);
        setLoading(true);

        try 
        {
            const response = await fetchFn(endpoint, options);
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || 'Erro na requisição');

            return data;
        } 
        catch (err) 
        {
            setError(err.message);
            throw err;
        } 
        finally 
        {
            setLoading(false);
        }
    }, []);

    const authRequest = useCallback((endpoint, options) => { return request(authFetch, endpoint, options); }, [request, authFetch]);

    const publicRequest = useCallback((endpoint, options) => { return request(publicFetch, endpoint, options); }, [request, publicFetch]);

    return { loading, setLoading, error, setError, API_URL, authFetch, publicFetch, authRequest, publicRequest };
}