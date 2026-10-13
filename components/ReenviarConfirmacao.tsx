import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { useApi, notifySuccess } from '@/hooks/useApi';

// Same interval the API enforces per account (backend/routes/auth.js RESEND_VERIFICATION_COOLDOWN_SECONDS)
const COOLDOWN_SECONDS = 60;

type ReenviarConfirmacaoProps =
{
    email: string;
    /** Start counting down right away (the register screen: the first email was just sent) */
    startCoolingDown?: boolean;
    label?: string;
    className?: string;
};

/** "Reenviar" button for the email-confirmation link, with a visible 60s cooldown. */
export default function ReenviarConfirmacao({ email, startCoolingDown = false, label = 'Reenviar email de confirmação', className = '' }: ReenviarConfirmacaoProps)
{
    const { publicRequest } = useApi();

    const [sending, setSending] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(startCoolingDown ? COOLDOWN_SECONDS : 0);

    useEffect(() =>
    {
        if (secondsLeft <= 0) return;
        const timer = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [secondsLeft]);

    const handleResend = async () =>
    {
        if (!email || sending || secondsLeft > 0) return;
        setSending(true);

        try
        {
            const data = await publicRequest('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
            notifySuccess(data.message);
            setSecondsLeft(COOLDOWN_SECONDS);
        }
        catch (err)
        {
            console.error(err);
        }
        finally
        {
            setSending(false);
        }
    };

    const coolingDown = secondsLeft > 0;

    return (
        <button type="button" onClick={handleResend} disabled={!email || sending || coolingDown} aria-busy={sending}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-purple/60 px-4 text-sm font-semibold text-white
                hover:bg-brand-purple/10 disabled:cursor-not-allowed disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60 ${className}`}>
            {sending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            <span>{sending ? 'Enviando...' : coolingDown ? `${label} (${secondsLeft}s)` : label}</span>
        </button>
    );
}
