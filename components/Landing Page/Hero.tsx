import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

import Button from '../ui/Button';

const Hero: React.FC = () =>
{
    const [isOpen, setIsOpen] = useState(false);

    return (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-125 h-125 bg-brand-blue/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-125 h-125 bg-brand-purple/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                    <div className="w-full lg:w-1/2 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-brand-gray uppercase tracking-wider">O sistema nº 1 para Barbearias</span>
                        </div>
                        
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-6">
                            O <span className="gradient-text">Fluxo</span> que seu negócio precisava para crescer.
                        </h1>
                        
                        <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Elimine o caos da agenda de papel. Dê aos seus clientes a liberdade de agendar online e tenha o controle total do seu faturamento em uma única tela.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Button onClick={() => window.location.href = '/registro'} variant="primary" className="flex items-center justify-center gap-2">
                                Começar Teste Grátis
                                <ArrowRight size={20} />
                            </Button>
                            <Button variant="outline" onClick={() => setIsOpen(true)}>
                                Ver Demonstração
                            </Button>
                        </div>

                        <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-brand-purple" />
                                <span>Sem fidelidade</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-brand-purple" />
                                <span>Suporte humanizado</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-brand-purple" />
                                <span>Configuração em 2 min</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-1/2 relative">
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-brand-blue/20 bg-brand-dark aspect-4/3 group">
                            <div className="absolute inset-0 bg-linear-to-t from-brand-black via-transparent to-transparent z-10 opacity-60" />
                            <img src="/dashboard.gif" alt="Sistema Fluxo" className="w-full h-full object-fit group-hover:scale-105 transition-transform duration-700" />
                            
                            <div className="absolute bottom-6 left-6 right-6 z-20 space-y-3">
                                <div className="bg-brand-dark/90 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center justify-between shadow-lg transform translate-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                                            <img src="/default-profile.webp" alt="Foto Padrão de Cliente" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Novo Agendamento</p>
                                            <p className="text-xs text-gray-400">Corte + Barba • 14:00</p>
                                        </div>
                                    </div>
                                    <span className="text-green-400 font-bold text-sm">+ R$ 60,00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-6xl mx-4 bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                        <button onClick={() => setIsOpen(false)}
                            className="absolute top-3 right-3 z-10 text-white bg-black/60 hover:bg-black/80 rounded-full px-3 py-3" >
                            <X size={20} />
                        </button>

                        <video src="/demo.mp4" controls autoPlay className="w-full h-full" />
                    </div>
                </div>
            )}
        </section>
    );
};

export default Hero;