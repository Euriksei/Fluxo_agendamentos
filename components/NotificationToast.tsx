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

/**
 * Toast stack, always horizontally centered.
 * - Phones (<sm): top, below the safe area. Modals there are full-screen sheets with "Salvar" at the bottom and the booking flow
 *   has a sticky "Continuar" bar, so a bottom toast would cover the main action.
 * - sm+: bottom center, above the safe area.
 * The live region stays mounted so screen readers announce new messages; errors use role="alert".
 */
export default function NotificationToast() 
{
    const { notifications, removeNotification } = useNotification();

    return (
        <div aria-live="polite"
            className="pointer-events-none fixed inset-x-4 z-100 mx-auto flex max-w-md flex-col gap-3
                top-[calc(0.75rem+env(safe-area-inset-top))] sm:top-auto sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
            {notifications.map(notification => 
            {
                const style = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.error;
                const Icon = style.icon;

                return (
                    <div key={notification.id} role={notification.type === 'error' ? 'alert' : 'status'}
                        className={`${style.bg} ${style.text} pointer-events-auto flex items-start gap-3 rounded-xl py-3 pl-4 pr-2 shadow-lg shadow-black/40 animate-toast-in`}>
                        <Icon size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
                        
                        <p className="min-w-0 flex-1 py-px text-left text-sm font-semibold leading-snug break-words sm:text-base">
                            {notification.message}
                        </p>
                        
                        <button type="button" onClick={() => removeNotification(notification.id)} aria-label="Fechar aviso"
                            className="-my-1.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
