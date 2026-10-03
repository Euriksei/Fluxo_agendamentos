import React from 'react';
import { Calendar, DollarSign, Users, Smartphone, Clock, BarChart3, ShieldCheck, Scissors } from 'lucide-react';

const Features: React.FC = () =>
{
    const adminFeatures = 
    [
        {
            icon: <Calendar className="text-white" size={24} />,
            title: "Agenda Drag-and-Drop",
            description: "Interface visual intuitiva. Arraste, solte e remarque horários em segundos."
        },
        {
            icon: <DollarSign className="text-white" size={24} />,
            title: "Fluxo de Caixa",
            description: "Controle financeiro automatizado. Saiba exatamente quanto entrou no dia, na semana e no mês."
        },
        {
            icon: <Users className="text-white" size={24} />,
            title: "Gestão de Equipe",
            description: "Defina permissões, gerencie comissões e veja a agenda individual de cada colaborador."
        },
        {
            icon: <BarChart3 className="text-white" size={24} />,
            title: "Relatórios Detalhados",
            description: "Tome decisões baseadas em dados. Entenda quais serviços são mais lucrativos e quais clientes retornam mais."
        }
    ];

    const clientFeatures = 
    [
        {
            icon: <Smartphone className="text-white" size={24} />,
            title: "Agendamento 24/7",
            description: "Seu cliente agenda o horário pelo celular, a qualquer hora, sem precisar te chamar no WhatsApp."
        },
        {
            icon: <Clock className="text-white" size={24} />,
            title: "Disponibilidade Real",
            description: "O sistema mostra apenas os horários livres, evitando conflitos e agendamentos duplos."
        },
        {
            icon: <Scissors className="text-white" size={24} />,
            title: "Menu de Serviços",
            description: "O cliente vê o preço, a duração e escolhe o profissional de sua preferência."
        },
        {
            icon: <ShieldCheck className="text-white" size={24} />,
            title: "Lembretes Automáticos",
            description: "Reduza o número de faltas com lembretes automáticos para seus clientes."
        }
    ];

    return (
        <section id="features" className="py-20 bg-brand-dark/50 border-y border-white/5">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Uma plataforma, <span className="gradient-text">múltiplas soluções</span>
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        O Fluxo conecta a gestão profissional da sua barbearia com a comodidade que seu cliente exige.
                    </p>
                </div>

                <div className="mb-20">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-white/10 flex-1" />
                        <h3 className="text-xl font-bold text-brand-purple uppercase tracking-widest">Para o Dono & Equipe</h3>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {adminFeatures.map((feature, idx) => (
                        <div key={idx} className="bg-brand-black p-6 rounded-2xl border border-white/5 hover:border-brand-blue/50 transition-colors group">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                                {feature.icon}
                            </div>
                            <h4 className="text-xl font-semibold mb-2 text-white">{feature.title}</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                        </div>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-white/10 flex-1" />
                        <h3 className="text-xl font-bold text-brand-blue uppercase tracking-widest">Para o seu Cliente</h3>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {clientFeatures.map((feature, idx) => (
                            <div key={idx} className="bg-brand-black p-6 rounded-2xl border border-white/5 hover:border-brand-purple/50 transition-colors group">
                                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
                                    {feature.icon}
                                </div>
                                <h4 className="text-xl font-semibold mb-2 text-white">{feature.title}</h4>
                                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;