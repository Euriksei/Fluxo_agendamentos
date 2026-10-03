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
    const baseClass = "flex items-center gap-1 md:gap-0 rounded transition-colors";
    const IconComponent = Icons[icon] as LucideIcon;

    return (
        <OrNavLink to={to} className={({ isActive }) => `${baseClass} ${collapsed && "justify-center"} 
                ${isActive ? "text-brand-blue gradient-text font-bold" : "hover:bg-gray-800"}`}>
                    
            {IconComponent && <IconComponent size={20} className={`${collapsed ? "mr-0" : "mr-4"}`} />}

            {!collapsed && <span className="hidden md:block">{label}</span>}
        </OrNavLink>
    );
}