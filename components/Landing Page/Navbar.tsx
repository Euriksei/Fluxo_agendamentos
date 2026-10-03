import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

import Button from '../ui/Button';
import Logo from '../Logo';

const Navbar: React.FC = () => 
{
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => 
    {
        const handleScroll = () => { setIsScrolled(window.scrollY > 20); };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed w-full z-50 transition-all duration-300 ${ isScrolled ? 'bg-brand-black/90 backdrop-blur-md border-b border-white/10 py-4' : 'bg-transparent py-6'}`}>
            <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
                <Logo variant="full" className='gap-2' />

                <div className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Funcionalidades</a>
                    <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Como Funciona</a>
                    <a href="#pricing" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">Planos</a>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={(() => window.location.href = '/login')} className="py-2! px-4! text-sm">
                            Login
                        </Button>
                        <Button variant="primary" onClick={(() => window.location.href = '/registro')} className="py-2! px-4! text-sm">
                            Teste Grátis
                        </Button>
                    </div>
                </div>

                <button className="md:hidden text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} >
                    {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {isMobileMenuOpen && (
                <div className="absolute top-full left-0 w-full bg-brand-black border-b border-white/10 p-4 flex flex-col gap-4 md:hidden shadow-2xl">
                    <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-white py-2">Funcionalidades</a>
                    <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-white py-2">Como Funciona</a>
                    <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-300 hover:text-white py-2">Planos</a>
                    <div className="flex flex-col gap-3 mt-4">
                        <Button variant="outline" fullWidth onClick={(() => window.location.href = '/login')} > Login </Button>
                        <Button variant="primary" fullWidth onClick={(() => window.location.href = '/registro')} > Começar Agora </Button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;