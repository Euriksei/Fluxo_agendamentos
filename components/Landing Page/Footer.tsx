import React from 'react';
import { Instagram, Facebook, Twitter, Mail } from 'lucide-react';

import Logo from '../Logo';

const Footer: React.FC = () => 
{
    return (
        <footer className="bg-brand-black border-t border-white/10 pt-16 pb-8">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid md:grid-cols-3 gap-12 mb-12">
                    
                    <div className="col-span-1 md:col-span-1">
                        <Logo variant="full" className="mb-4" />

                        <p className="text-gray-500 text-sm mb-4">
                            A plataforma completa para gestão inteligente de barbearias e salões de beleza.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="text-gray-400 hover:text-brand-purple transition-colors"><Instagram size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-brand-blue transition-colors"><Facebook size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-brand-blue transition-colors"><Twitter size={20} /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Produto</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><a href="#features" className="hover:text-brand-blue transition-colors">Funcionalidades</a></li>
                            <li><a href="#pricing" className="hover:text-brand-blue transition-colors">Preços</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-4">Contato</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-center gap-2"><Mail size={16} /> suporte@fluxo</li>
                            <li>WhatsApp: (11) 99999-9999</li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 text-center text-gray-600 text-sm">
                    <p>&copy; {new Date().getFullYear()} Fluxo. Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;