import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';

type TimeFieldProps =
{
    id: string;
    /** 'HH:MM' or '' (same contract as <input type="time">) */
    value: string;
    onChange: (value: string) => void;
    /** Visible label text, used as the picker title */
    label: string;
    required?: boolean;
    disabled?: boolean;
    minuteStep?: number;
    className?: string;
};

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, h) => h);

const parse = (value: string) =>
{
    const m = /^(\d{1,2}):(\d{2})/.exec(value || '');
    return m ? { h: Math.min(23, Number(m[1])), m: Math.min(59, Number(m[2])) } : null;
};

/**
 * Time picker that replaces the native <input type="time">. On Android the native control only opened from its (dark,
 * low-contrast) clock icon and its dialog overflowed small screens. Here the whole 48px field opens a bottom sheet
 * (centered card on sm+) with two scrollable columns, Hora 00–23 and Minuto in `minuteStep` steps, capped in dvh.
 *
 * - The field is a <button> carrying `id`, so <label htmlFor> names it and a tap on the label opens the picker.
 * - A visually hidden input mirrors `value` so `required` keeps native form validation (the bubble anchors on the field).
 * - Arrow keys move within a column (roving tabindex), Enter/"Pronto" confirms, Esc or the backdrop closes; focus returns
 *   to the field. Esc is caught in the capture phase so a parent ResponsiveModal does not close too.
 */
export default function TimeField({ id, value, onChange, label, required = false, disabled = false, minuteStep = 5, className = '' }: TimeFieldProps)
{
    const [open, setOpen] = useState(false);
    const fieldRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();

    const parsed = parse(value);

    const close = () =>
    {
        setOpen(false);
        // Next frame: the sheet is gone, so focus is not stolen back by its unmount.
        requestAnimationFrame(() => fieldRef.current?.focus({ preventScroll: true }));
    };

    return (
        <div className={`relative min-w-0 ${className}`}>
            <button ref={fieldRef} id={id} type="button" disabled={disabled} onClick={() => setOpen(true)}
                aria-haspopup="dialog" aria-expanded={open}
                className="flex min-h-12 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-brand-black px-4 py-3 text-left text-base text-white
                    transition-colors hover:border-brand-purple/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
                <span className={`tabular-nums ${parsed ? '' : 'text-brand-gray'}`}>{parsed ? `${pad(parsed.h)}:${pad(parsed.m)}` : '--:--'}</span>
                <Clock size={20} className="shrink-0 text-white/85" aria-hidden="true" />
            </button>

            {/* Keeps native `required` validation; not focusable by Tab and hidden from assistive tech */}
            <input tabIndex={-1} aria-hidden="true" required={required} value={value || ''} onChange={() => {}}
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0" />

            {open && (
                <TimeSheet titleId={titleId} label={label} initial={parsed} minuteStep={minuteStep}
                    onCancel={close} onConfirm={(v) => { onChange(v); close(); }} />
            )}
        </div>
    );
}

type TimeSheetProps =
{
    titleId: string;
    label: string;
    initial: { h: number; m: number } | null;
    minuteStep: number;
    onCancel: () => void;
    onConfirm: (value: string) => void;
};

function TimeSheet({ titleId, label, initial, minuteStep, onCancel, onConfirm }: TimeSheetProps)
{
    const [h, setH] = useState(initial?.h ?? 9);
    const [m, setM] = useState(initial?.m ?? 0);

    // Step list, plus the current minute when it is off-step (e.g. 08:37 saved before) so it is never lost
    const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);
    if (!minutes.includes(m)) { minutes.push(m); minutes.sort((a, b) => a - b); }

    const hourCol = useRef<HTMLDivElement>(null);
    const minCol = useRef<HTMLDivElement>(null);
    const onCancelRef = useRef(onCancel);
    onCancelRef.current = onCancel;

    // Start with both selections centered and focus on the hour column
    useLayoutEffect(() =>
    {
        for (const col of [hourCol.current, minCol.current])
        {
            const sel = col?.querySelector<HTMLElement>('[aria-selected="true"]');
            if (col && sel) col.scrollTop = sel.offsetTop - col.clientHeight / 2 + sel.clientHeight / 2;
        }
        hourCol.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true });
    }, []);

    // Capture phase on window: runs before ResponsiveModal's document listener, so Esc only closes this sheet
    useEffect(() =>
    {
        const onKey = (e: KeyboardEvent) =>
        {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            onCancelRef.current();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, []);

    const confirm = () => onConfirm(`${pad(h)}:${pad(m)}`);

    const column = (name: string, items: number[], selected: number, select: (v: number) => void, ref: React.RefObject<HTMLDivElement>) =>
    {
        const onKeyDown = (e: React.KeyboardEvent) =>
        {
            const i = items.indexOf(selected);
            let next = i;
            if (e.key === 'ArrowDown') next = Math.min(items.length - 1, i + 1);
            else if (e.key === 'ArrowUp') next = Math.max(0, i - 1);
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = items.length - 1;
            else if (e.key === 'Enter') { e.preventDefault(); confirm(); return; }
            else return;
            e.preventDefault();
            select(items[next]);
            requestAnimationFrame(() =>
            {
                const el = ref.current?.querySelector<HTMLElement>(`[data-v="${items[next]}"]`);
                el?.focus({ preventScroll: true });
                el?.scrollIntoView({ block: 'nearest' });
            });
        };

        return (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <p className="pb-2 text-center text-xs font-semibold uppercase tracking-wide text-brand-gray" aria-hidden="true">{name}</p>
                <div ref={ref} role="listbox" aria-label={name} onKeyDown={onKeyDown}
                    className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg bg-brand-black/60 p-1 [scrollbar-width:thin]">
                    {items.map(v =>
                    {
                        const isSel = v === selected;
                        return (
                            <button key={v} type="button" role="option" aria-selected={isSel} tabIndex={isSel ? 0 : -1} data-v={v}
                                onClick={() => select(v)}
                                className={`flex min-h-11 w-full items-center justify-center rounded-md text-lg tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue
                                    ${isSel ? 'bg-brand-purple font-bold text-white' : 'text-white/90 hover:bg-white/10'}`}>
                                {pad(v)}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[70]">
            <div aria-hidden="true" onClick={onCancel} className="absolute inset-0 bg-black/60" />

            <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
                <div role="dialog" aria-modal="true" aria-labelledby={titleId}
                    className="pointer-events-auto flex max-h-[min(75dvh,30rem)] w-full flex-col rounded-t-2xl border border-white/10 bg-brand-dark text-white shadow-2xl
                        pb-[env(safe-area-inset-bottom)] sm:max-w-xs sm:rounded-2xl sm:pb-0">

                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
                        <h2 id={titleId} className="min-w-0 truncate text-base font-semibold">{label}</h2>
                        <span className="shrink-0 text-2xl font-bold tabular-nums text-brand-purple" aria-live="polite">{pad(h)}:{pad(m)}</span>
                    </div>

                    <div className="flex min-h-0 flex-1 gap-3 px-4 pt-3 pb-3" style={{ height: '16rem' }}>
                        {column('Hora', HOURS, h, setH, hourCol)}
                        {column('Minuto', minutes, m, setM, minCol)}
                    </div>

                    <div className="flex shrink-0 gap-3 border-t border-white/10 px-4 py-3">
                        <button type="button" onClick={onCancel}
                            className="min-h-11 flex-1 rounded-lg border border-brand-purple font-semibold text-brand-purple hover:bg-brand-purple/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                            Cancelar
                        </button>
                        <button type="button" onClick={confirm}
                            className="min-h-11 flex-1 rounded-lg bg-gradient-to-r from-brand-blue to-brand-purple font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark">
                            Pronto
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
