import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) 
{
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { authRequest, publicRequest, error, setError } = useApi();

    useEffect(() => 
    {
        const handleLogout = () => setUser(null);
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    const verifyToken = async () => 
    {
        const token = localStorage.getItem('token');

        if (!token) 
        {
            setLoading(false);
            return;
        }

        try 
        {
            const userData = await authRequest('/api/auth/me');
            setUser(userData);
        } 
        catch 
        {
            localStorage.removeItem('token');
        } 
        finally 
        {
            setLoading(false);
        }
    };

    useEffect(() => { verifyToken(); }, [authRequest]);

    const login = useCallback(async (email, password) => 
    {
        const data = await publicRequest('/api/auth/login', 
        {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        localStorage.setItem('token', data.token);

        // /api/auth/me returns { user, subscription }, the shape the rest of the app reads (user.user.*)
        const me = await authRequest('/api/auth/me');
        setUser(me);
        return me;
    }, [publicRequest, authRequest]);

    const logout = useCallback(() => 
    {
        localStorage.removeItem('token');
        setUser(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
    }, []);

    const register = useCallback(async (userData) => 
    {
        return publicRequest('/api/auth/register', 
        {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }, [publicRequest]);

    const updateProfile = useCallback(async (profileData) => 
    {
        const data = await authRequest('/api/auth/me', 
        {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
        setUser(data);
        return data;
    }, [authRequest]);

    const value = { user, loading, error, setError, isAuthenticated: !!user, isAdmin: user?.user.role === 'ADMIN', login, logout, register, updateProfile };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => 
{
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
    return context;
};