import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) 
{
    const [notifications, setNotifications] = useState([]);
    const addNotificationRef = useRef(null);

    const addNotification = useCallback((message, type = 'error', duration = 5000) => 
    {
        const id = Date.now() + Math.random();
        
        setNotifications(prev => [...prev, { id, message, type }]);

        if (duration > 0) 
        {
            setTimeout(() => 
            {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }, duration);
        }

        return id;
    }, []);

    addNotificationRef.current = addNotification;

    const removeNotification = useCallback((id) => 
    {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    useEffect(() => 
    {
        const handleNotification = (event) => 
        {
            const { message, type } = event.detail;
            addNotificationRef.current?.(message, type);
        };

        window.addEventListener('app:notification', handleNotification);
        
        return () => 
        {
            window.removeEventListener('app:notification', handleNotification);
        };
    }, []);

    const showError = useCallback((message) => addNotification(message, 'error'), [addNotification]);
    const showSuccess = useCallback((message) => addNotification(message, 'success'), [addNotification]);
    const showWarning = useCallback((message) => addNotification(message, 'warning'), [addNotification]);
    const showInfo = useCallback((message) => addNotification(message, 'info'), [addNotification]);

    const value = { notifications, addNotification, removeNotification, showError, showSuccess, showWarning, showInfo };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotification = () => 
{
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification deve ser usado dentro de NotificationProvider');
    return context;
};