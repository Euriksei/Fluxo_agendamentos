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

    // options.silent: skip the global error toast (the caller renders its own error state). Not forwarded to fetch.
    const request = useCallback(async (fetchFn, endpoint, options = {}) => 
    {
        const { silent = false, ...fetchOptions } = options || {};

        setError(null);
        setLoading(true);

        try 
        {
            const response = await fetchFn(endpoint, fetchOptions);
            const data = await response.json();
            
            if (!response.ok) 
            {
                // Keep the HTTP status so callers can tell a 404 from a network failure (TypeError, no status).
                const httpError = new Error(data.error || 'Erro na requisição');
                httpError.status = response.status;
                throw httpError;
            }

            return data;
        } 
        catch (err) 
        {
            // fetch() rejects with a TypeError ("Failed to fetch") when the network is down; show it in PT-BR.
            if (!silent) setError(err instanceof TypeError ? 'Falha de conexão. Verifique sua internet e tente novamente.' : err.message);
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