import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notifyInfo } from '../hooks/useApi';

export const OWNER_ONLY_MESSAGE = 'Apenas o responsável pelo negócio pode acessar assinatura, equipe, caixa e serviços.';

let lastOwnerNotice = 0;

// Owner-only pages (assinatura, equipe, caixa, serviços): an EMPLOYEE opening the URL directly goes back to the dashboard instead of
// loading a page whose API calls answer 403 OWNER_ONLY.
export function OwnerRoute({ children })
{
    const { isEmployee } = useAuth();

    useEffect(() =>
    {
        if (!isEmployee) return;
        // One toast per redirect, even when StrictMode runs the effect twice
        const now = Date.now();
        if (now - lastOwnerNotice < 2000) return;
        lastOwnerNotice = now;
        notifyInfo(OWNER_ONLY_MESSAGE);
    }, [isEmployee]);

    if (isEmployee) return <Navigate to="/dashboard" replace />;

    return children;
}

export function ProtectedRoute({ children, requireAdmin = false }) 
{
    const { isAuthenticated, isAdmin, loading } = useAuth();
    const location = useLocation();

    if (loading) 
    {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

    if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

    return children;
}