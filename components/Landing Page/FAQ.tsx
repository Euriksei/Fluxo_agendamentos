import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) =>
{
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-white/10 last:border-none">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-6 text-left focus:outline-none" >
                <span className="text-lg font-medium text-white">{question}</span>
                {isOpen ? <ChevronUp className="text-brand-purple" /> : <ChevronDown className="text-gray-500" />}
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${ isOpen ? 'max-h-48 opacity-100 mb-6' : 'max-h-0 opacity-0' }`}>
                <p className="text-gray-400 leading-relaxed">
                    {answer}
                </p>
            </div>
        </div>
    );
};

const FAQ: React.FC = () => 
{
    const faqs = 
    [
        {
            question: "O cliente precisa baixar algum aplicativo?",
            answer: "Não! O cliente acessa através de um link ou QR Code exclusivo direto no navegador do celular ou computador, sem precisar ocupar memória instalando nada."
        },
        {
            question: "Consigo bloquear horários na minha agenda?",
            answer: "Sim, como dono ou funcionário, você tem total controle para bloquear horários de almoço, folgas ou atendimentos especiais."
        },
        {
            question: "Como funciona o pagamento?",
            answer: "Você pode aceitar pagamentos presencialmente como sempre fez. O sistema ajuda a registrar essas entradas para seu controle financeiro. Planos futuros incluirão pagamento online."
        },
        {
            question: "Posso cancelar a qualquer momento?",
            answer: "Sim! Não temos contrato de fidelidade. Você usa enquanto fizer sentido para o seu negócio."
        }
    ];

    return (
        <section className="py-20 bg-brand-dark/20">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
                <div className="bg-brand-black border border-white/5 rounded-2xl px-8">
                    {faqs.map((faq, idx) => ( <FAQItem key={idx} question={faq.question} answer={faq.answer} /> ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;