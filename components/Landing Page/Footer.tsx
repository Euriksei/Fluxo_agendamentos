import React from 'react';
import { Instagram, Mail, MessageCircle } from 'lucide-react';

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
                            <a href="https://www.instagram.com/fluxo_1000/" target="_blank" rel="noopener noreferrer" aria-label="Instagram do Fluxo"
                                className="-m-3 inline-flex size-11 items-center justify-center rounded-lg text-gray-400 hover:text-brand-purple transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                                <Instagram size={20} aria-hidden="true" />
                            </a>
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
                        <ul className="space-y-1 text-sm text-gray-400">
                            <li>
                                <a href="mailto:fluxoagendamentos@gmail.com"
                                    className="inline-flex min-h-11 items-center gap-2 break-all rounded-sm hover:text-brand-blue transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                                    <Mail size={16} aria-hidden="true" className="shrink-0" /> fluxoagendamentos@gmail.com
                                </a>
                            </li>
                            <li>
                                <a href="https://wa.me/5531999264985" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp (31) 99926-4985 (abre em nova aba)"
                                    className="inline-flex min-h-11 items-center gap-2 rounded-sm hover:text-brand-blue transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
                                    <MessageCircle size={16} aria-hidden="true" className="shrink-0" /> WhatsApp: (31) 99926-4985
                                </a>
                            </li>
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