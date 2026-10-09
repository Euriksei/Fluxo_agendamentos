import { NavLink as OrNavLink } from 'react-router-dom';
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

type NavLinkProps = 
{
    to: string;
    label: string;
    icon: keyof typeof Icons;
    collapsed: boolean;
};

export function NavLink({ to, label, icon, collapsed }: NavLinkProps) 
{
    // min-h-11 keeps every item a >=44px touch target
    const baseClass = "flex min-h-11 items-center gap-4 rounded-lg px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple";
    const IconComponent = Icons[icon] as LucideIcon;

    return (
        <OrNavLink to={to} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} className={({ isActive }) => `${baseClass} ${collapsed ? "justify-center" : ""} 
                ${isActive ? "bg-white/5 text-brand-blue gradient-text font-bold" : "text-white hover:bg-white/5"}`}>
                    
            {IconComponent && <IconComponent size={20} aria-hidden="true" className="shrink-0" />}

            {!collapsed && <span className="truncate">{label}</span>}
        </OrNavLink>
    );
}
