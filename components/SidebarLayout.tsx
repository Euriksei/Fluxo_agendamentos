import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LogOut, Menu, X } from 'lucide-react';

import { NavLink } from '@/components/NavLink';
import { useSubscription } from '@/contexts/SubscriptionContext';

// feature: plan feature slug; when the plan lacks it the item shows a lock (the page itself shows the upgrade screen)
export type SidebarItem = { to: string; label: string; icon: Parameters<typeof NavLink>[0]['icon']; feature?: string };

type SidebarLayoutProps =
{
    title: string;
    subtitle: string;
    items: SidebarItem[];
    onLogout: () => void;
    storageKey: string;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const readExpanded = (key: string) =>
{
    try { return localStorage.getItem(key) === '1'; }
    catch { return false; }
};

/**
 * App shell shared by the barber and admin layouts.
 * - Mobile (<md): fixed top bar with a hamburger that opens an off-canvas drawer (transform animation, overlay,
 *   Esc / overlay / X / swipe / navigation close it, body scroll locked, focus trapped and restored).
 * - Desktop (md+): fixed icon rail that expands to show labels; expanded state persists in localStorage.
 */
export default function SidebarLayout({ title, subtitle, items, onLogout, storageKey }: SidebarLayoutProps)
{
    const location = useLocation();
    const { subscription, subscriptionLoaded, hasFeature } = useSubscription();
    const drawerId = useId();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [expanded, setExpanded] = useState(() => readExpanded(storageKey));

    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);

    const closeDrawer = useCallback(() => setDrawerOpen(false), []);

    const toggleExpanded = () =>
    {
        setExpanded(prev =>
        {
            const next = !prev;
            try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch { /* storage unavailable: keep in memory */ }
            return next;
        });
    };

    // Close the drawer on navigation.
    useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

    // While open: lock body scroll, trap focus, close on Esc. On close: return focus to the hamburger.
    useEffect(() =>
    {
        if (!drawerOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const drawer = drawerRef.current;
        drawer?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

        const onKeyDown = (e: KeyboardEvent) =>
        {
            if (e.key === 'Escape') { e.preventDefault(); setDrawerOpen(false); return; }
            if (e.key !== 'Tab' || !drawer) return;

            const focusables = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE));
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };

        document.addEventListener('keydown', onKeyDown);

        return () =>
        {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
            menuButtonRef.current?.focus();
        };
    }, [drawerOpen]);

    // Close if the viewport grows to desktop while the drawer is open.
    useEffect(() =>
    {
        const mq = window.matchMedia('(min-width: 768px)');
        const onChange = () => { if (mq.matches) setDrawerOpen(false); };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd = (e: React.TouchEvent) =>
    {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx < -60) closeDrawer();
    };

    const navList = (collapsed: boolean) => items.map(item => (
        <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} collapsed={collapsed}
            locked={Boolean(item.feature) && subscriptionLoaded && Boolean(subscription) && !hasFeature(item.feature)} />
    ));

    return (
        <div className="min-h-screen">

            {/* ---------- Mobile top bar ---------- */}
            <header className="md:hidden fixed inset-x-0 top-0 z-40 bg-brand-black/95 backdrop-blur border-b border-white/10 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
                <div className="flex h-14 items-center gap-2 px-2">
                    <button ref={menuButtonRef} type="button" onClick={() => setDrawerOpen(true)}
                        aria-label="Abrir menu" aria-expanded={drawerOpen} aria-controls={drawerId}
                        className="inline-flex size-11 items-center justify-center rounded-lg text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                        <Menu size={24} aria-hidden="true" />
                    </button>
                    <span className="truncate font-bebas text-xl text-white">{title}</span>
                </div>
            </header>

            {/* ---------- Mobile drawer ---------- */}
            <div className="md:hidden">
                <div aria-hidden="true" onClick={closeDrawer}
                    className={`fixed inset-0 z-50 bg-black/70 transition-opacity duration-300 motion-reduce:transition-none ${drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />

                <div ref={drawerRef} id={drawerId} role={drawerOpen ? "dialog" : undefined} aria-modal={drawerOpen || undefined} aria-label="Menu de navegação"
                    inert={!drawerOpen} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
                    className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-brand-black text-white shadow-2xl
                        pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]
                        transition-transform duration-300 ease-out motion-reduce:transition-none ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                    <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
                        <div className="min-w-0">
                            <p className="truncate text-lg font-bold">{title}</p>
                            <p className="text-sm text-brand-gray">{subtitle}</p>
                        </div>
                        <button type="button" onClick={closeDrawer} aria-label="Fechar menu"
                            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-brand-gray hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                            <X size={22} aria-hidden="true" />
                        </button>
                    </div>

                    <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                        {navList(false)}
                    </nav>

                    <div className="border-t border-white/10 p-3">
                        <button type="button" onClick={onLogout}
                            className="flex min-h-11 w-full items-center gap-4 rounded-lg px-3 text-red-400 hover:bg-white/5 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                            <LogOut size={20} aria-hidden="true" /> Sair
                        </button>
                    </div>
                </div>
            </div>

            {/* ---------- Desktop rail ---------- */}
            <aside aria-label="Menu lateral"
                className={`hidden md:flex fixed inset-y-0 left-0 z-40 flex-col justify-between bg-brand-black text-white border-r border-white/5 ${expanded ? 'w-56' : 'w-20'}`}>
                <div>
                    <div className={`flex items-center border-b border-gray-700 p-4 ${expanded ? 'justify-between' : 'justify-center'}`}>
                        {expanded && (
                            <div className="min-w-0">
                                <h2 className="truncate text-lg font-bold">{title}</h2>
                                <p className="text-sm text-gray-400">{subtitle}</p>
                            </div>
                        )}
                        <button type="button" onClick={toggleExpanded} aria-expanded={expanded}
                            aria-label={expanded ? 'Recolher menu' : 'Expandir menu'} title={expanded ? 'Recolher menu' : 'Expandir menu'}
                            className="inline-flex size-10 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                            {expanded ? <ChevronsLeft size={20} aria-hidden="true" /> : <ChevronsRight size={20} aria-hidden="true" />}
                        </button>
                    </div>

                    <nav aria-label="Principal" className="flex flex-col gap-1 p-3">
                        {navList(!expanded)}
                    </nav>
                </div>

                <div className="border-t border-gray-700 p-3">
                    <button type="button" onClick={onLogout} aria-label="Sair" title="Sair"
                        className={`flex min-h-11 w-full items-center gap-4 rounded-lg px-3 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple ${expanded ? '' : 'justify-center'}`}>
                        <LogOut size={18} aria-hidden="true" />
                        {expanded && 'Sair'}
                    </button>
                </div>
            </aside>

            <main className={`min-h-screen min-w-0 bg-linear-to-br from-brand-black via-brand-dark to-brand-black text-white
                px-4 pt-[calc(3.5rem+env(safe-area-inset-top)+1.5rem)] pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-6
                md:px-10 md:py-12 xl:px-12 ${expanded ? 'md:ml-56' : 'md:ml-20'}`}>
                <div className="mx-auto w-full max-w-[1760px]">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
