import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ResponsiveModalProps =
{
    title: string;
    onClose: () => void;
    onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
    footer?: React.ReactNode;
    children: React.ReactNode;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobile: full-height sheet (100dvh) with a scrollable body and a footer pinned above the keyboard / safe-area.
 * Desktop (sm+): centered dialog.
 *
 * Rendered in a portal on <body> with the backdrop as a *sibling* of the panel, so taps inside the form (or on a
 * native time/date picker) can never bubble up to the backdrop and close the modal. Body scroll is locked while open
 * so iOS doesn't scroll the page behind the fixed panel when an input gets focus.
 */
export default function ResponsiveModal({ title, onClose, onSubmit, footer, children }: ResponsiveModalProps)
{
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() =>
    {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';

        // Focus the panel itself, not the first input: auto-focusing an input would pop the keyboard on open.
        panelRef.current?.focus({ preventScroll: true });

        const onKeyDown = (e: KeyboardEvent) =>
        {
            if (e.key === 'Escape') { onCloseRef.current(); return; }
            if (e.key !== 'Tab' || !panelRef.current) return;

            const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };

        document.addEventListener('keydown', onKeyDown);

        return () =>
        {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = overflow;
            previouslyFocused?.focus?.({ preventScroll: true });
        };
    }, []);

    // Keep the focused field visible when the on-screen keyboard shrinks the viewport.
    // Only for fields that open the keyboard: time/date/select open a native picker dialog on Android, and scrolling
    // the sheet while that dialog is up can dismiss it before the value is committed.
    const onFocusCapture = (e: React.FocusEvent) =>
    {
        const el = e.target as HTMLElement;
        if (!el.matches('textarea, input:is([type=text], [type=email], [type=tel], [type=number], [type=password], [type=search], [type=url], :not([type]))')) return;
        window.setTimeout(() => { if (document.activeElement === el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300);
    };

    // Native validation must never fail silently inside the scrollable sheet: bring the first invalid field into view
    // so the browser bubble is visible.
    const onInvalidCapture = (e: React.FormEvent) =>
    {
        const el = e.target as HTMLElement;
        const form = el.closest('form');
        if (form && form.querySelector(':invalid') === el) el.scrollIntoView({ block: 'center' });
    };

    const content = (
        <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                {children}
            </div>

            {footer && (
                <div className="flex shrink-0 gap-3 border-t border-white/10 bg-brand-dark px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
                    {footer}
                </div>
            )}
        </>
    );

    return createPortal(
        <div className="fixed inset-0 z-[60]">
            <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/70" />

            <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
                <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onFocusCapture={onFocusCapture}
                    className="pointer-events-auto flex h-dvh w-full flex-col bg-brand-dark text-white outline-none
                        sm:h-auto sm:max-h-[min(90dvh,48rem)] sm:max-w-md sm:rounded-xl sm:border sm:border-white/10 sm:shadow-2xl">

                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 sm:px-6 sm:pt-4">
                        <h2 id={titleId} className="text-xl font-bold">{title}</h2>
                        <button type="button" onClick={onClose} aria-label="Fechar"
                            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-brand-gray hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                            <X size={22} aria-hidden="true" />
                        </button>
                    </div>

                    {onSubmit
                        ? <form onSubmit={onSubmit} onInvalidCapture={onInvalidCapture} className="flex min-h-0 flex-1 flex-col">{content}</form>
                        : <div className="flex min-h-0 flex-1 flex-col">{content}</div>}
                </div>
            </div>
        </div>,
        document.body
    );
}
