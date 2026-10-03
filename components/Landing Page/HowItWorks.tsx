import React from 'react';
import { UserPlus, QrCode, CalendarCheck } from 'lucide-react';

const HowItWorks: React.FC = () => 
{
    const steps = 
    [
        {
            id: 1,
            icon: <UserPlus size={32} />,
            title: "Cadastre sua Barbearia",
            text: "Crie sua conta em segundos. Adicione seus colaboradores, defina seus serviços e horários de funcionamento."
        },
        {
            id: 2,
            icon: <QrCode size={32} />,
            title: "Compartilhe seu Link",
            text: "Envie o link ou QR Code exclusivo da sua barbearia para seus clientes pelo WhatsApp ou outras redes sociais."
        },
        {
            id: 3,
            icon: <CalendarCheck size={32} />,
            title: "Receba Agendamentos",
            text: "Seus clientes agendam sozinhos. Você recebe a notificação e o horário é bloqueado automaticamente na agenda."
        }
    ];

    return (
        <section id="how-it-works" className="py-20 relative overflow-hidden">
            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Simples, Rápido e Eficiente</h2>
                    <p className="text-gray-400">Comece a usar o Fluxo hoje mesmo em 3 passos simples.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-brand-blue/30 via-brand-purple/30 to-brand-blue/30 z-0" />

                    {steps.map((step) => (
                        <div key={step.id} className="relative z-10 flex flex-col items-center text-center group">
                            <div className="w-24 h-24 rounded-full bg-brand-dark border-4 border-brand-black flex items-center justify-center mb-6 shadow-2xl 
                                    group-hover:border-brand-purple transition-colors duration-300">

                                <div className="text-brand-purple group-hover:scale-110 transition-transform duration-300">
                                    {step.icon}
                                </div>
                            </div>
                            
                            <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                            <p className="text-gray-400 text-sm max-w-xs">{step.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;