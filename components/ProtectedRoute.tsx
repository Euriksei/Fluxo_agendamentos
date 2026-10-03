import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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