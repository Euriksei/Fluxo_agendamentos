import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

import { useNotification } from '@/contexts';

const NOTIFICATION_STYLES = 
{
    error: 
    {
        bg: 'bg-red-500',
        text: 'text-white',
        icon: AlertCircle,
    },
    success: 
    {
        bg: 'bg-green-500',
        text: 'text-white',
        icon: CheckCircle,
    },
    warning: 
    {
        bg: 'bg-yellow-500',
        text: 'text-white',
        icon: AlertTriangle,
    },
    info: 
    {
        bg: 'bg-blue-500',
        text: 'text-white',
        icon: Info,
    },
};

export default function NotificationToast() 
{
    const { notifications, removeNotification } = useNotification();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-4 z-100 flex flex-col gap-3 w-full max-w-md px-4">
            {notifications.map(notification => 
            {
                const style = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.error;
                const Icon = style.icon;

                return (
                    <div key={notification.id} className={`${style.bg} rounded-lg p-4 shadow-lg animate-slide-in flex items-center justify-center gap-3`}>
                        <Icon size={20} className={`${style.text} shrink-0 mt-0.5`} />
                        
                        <p className={`${style.text} font-bold flex-1`}>
                            {notification.message}
                        </p>
                        
                        <button onClick={() => removeNotification(notification.id)} className={`${style.text} hover:opacity-70 transition-opacity shrink-0`}>
                            <X size={16} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}