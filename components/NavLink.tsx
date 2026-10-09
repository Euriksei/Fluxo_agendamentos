import { NavLink as OrNavLink } from 'react-router-dom';
import * as Icons from "lucide-react";
import { LucideIcon, Lock } from "lucide-react";

type NavLinkProps =
{
    to: string;
    label: string;
    icon: keyof typeof Icons;
    collapsed: boolean;
    locked?: boolean;
};

export function NavLink({ to, label, icon, collapsed, locked = false }: NavLinkProps)
{
    // min-h-11 keeps every item a >=44px touch target
    const baseClass = "relative flex min-h-11 items-center gap-4 rounded-lg px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple";
    const IconComponent = Icons[icon] as LucideIcon;
    const name = locked ? `${label} (disponível em planos pagos)` : label;

    return (
        <OrNavLink to={to} aria-label={collapsed || locked ? name : undefined} title={collapsed ? name : undefined} className={({ isActive }) => `${baseClass} ${collapsed ? "justify-center" : ""}
                ${isActive ? "bg-white/5 text-brand-blue gradient-text font-bold" : locked ? "text-brand-gray hover:bg-white/5" : "text-white hover:bg-white/5"}`}>

            {IconComponent && <IconComponent size={20} aria-hidden="true" className="shrink-0" />}

            {!collapsed && <span className="truncate">{label}</span>}

            {locked && (collapsed
                ? <Lock size={11} aria-hidden="true" className="absolute right-3 top-2 text-yellow-400" />
                : <Lock size={14} aria-hidden="true" className="ml-auto shrink-0 text-yellow-400" />)}
        </OrNavLink>
    );
}
