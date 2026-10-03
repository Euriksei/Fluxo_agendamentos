import React from 'react';
import { Star } from 'lucide-react';

const Testimonials: React.FC = () => 
{
    const testimonials = 
    [
        {
            name: "Carlos Eduardo",
            role: "Dono da Barbearia Real",
            image: "/default-profile.webp",
            text: "O Fluxo mudou meu trabalho. Antes eu passava o dia todo respondendo WhatsApp para marcar horário. Agora, meus clientes agendam sozinhos e eu só foco no corte."
        },
        {
            name: "André Silva",
            role: "Barbeiro Autônomo",
            image: "/default-profile.webp",
            text: "A interface é muito moderna e fácil de usar. Meus clientes elogiam muito a facilidade para agendar. O controle financeiro no fim do dia é essencial."
        },
        {
            name: "Fernanda Lima",
            role: "Gestora do Studio Belle",
            image: "/default-profile.webp",
            text: "Reduzimos as faltas em 40% graças aos lembretes automáticos. O sistema se paga sozinho apenas com essa funcionalidade. Recomendo demais!"
        }
    ];

    return (
        <section className="py-20 bg-brand-dark/30">
            <div className="container mx-auto px-4 md:px-6">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
                    Quem usa, <span className="gradient-text">recomenda</span>
                </h2>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <div key={i} className="bg-brand-black border border-white/5 p-8 rounded-2xl shadow-xl flex flex-col h-full">
                            <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, idx) => ( <Star key={idx} size={16} className="text-yellow-500 fill-yellow-500" /> ))}
                            </div>
                            <p className="text-gray-300 italic mb-6 flex-grow">"{t.text}"</p>
                            <div className="flex items-center gap-4 mt-auto">
                                <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-brand-purple" />
                                <div>
                                    <h4 className="font-bold text-white text-sm">{t.name}</h4>
                                    <p className="text-xs text-brand-gray">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;