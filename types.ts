import { Clock, Check, X, AlertCircle, User, Star, Zap, Crown } from 'lucide-react';

export const ROLE_LABELS = 
{
    ADMIN: 'Administrador',
    BARBER: 'Proprietário(a)',
    EMPLOYEE: 'Colaborador(a)',
};

export const DIAS_SEMANA =
[
    { value: 0, label: 'Domingo', short: 'Dom' },
    { value: 1, label: 'Segunda-feira', short: 'Seg' },
    { value: 2, label: 'Terça-feira', short: 'Ter' },
    { value: 3, label: 'Quarta-feira', short: 'Qua' },
    { value: 4, label: 'Quinta-feira', short: 'Qui' },
    { value: 5, label: 'Sexta-feira', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
];

export const DIAS_SEMANA_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// 0 = "Sem intervalo": the next slot starts when the service ends (step = service duration).
export const INTERVALO_OPCOES =
[
    { value: 0, label: 'Sem intervalo' },
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1h 30min' },
    { value: 120, label: '2 horas' },
];

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const STATUS_CONFIG = 
{
    PENDING: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-500', icon: Clock },
    CONFIRMED: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-500', icon: Check },
    COMPLETED: { label: 'Concluído', color: 'bg-green-500/20 text-green-500', icon: Check },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-400/20 text-red-400', icon: X },
    NO_SHOW: { label: 'Faltou', color: 'bg-red-600/20 text-red-600', icon: AlertCircle },
};

export const FLOW_TYPES = { ENTRADA: 'Entrada', SAIDA: 'Saída', OUTRO: 'Outro' };

export const FLOW_CATEGORIES = [ 'Sem Categoria', 'Agendamento', 'Água e Energia', 'Aluguel', 'Brindes', 'Comissão', 'Contabilidade', 'Cursos e Treinamentos', 'Despesas Bancárias', 
    'Equipamentos', 'Estoque', 'Eventos', 'Fornecedor', 'Higiene e Limpeza', 'Impostos', 'Internet', 'Investimento', 'Manutenção', 'Marketing', 'Material de Consumo', 'Mobiliário', 
    'Plataformas e Sistemas', 'Produto', 'Reformas', 'Salário', 'Seguro', 'Serviço', 'Software', 'Taxas de Cartão', 'Telefone', 'Transporte', 'Uniformes', 'Outro' ];

export const PLAN_ICONS = { free: User, basic: Star, professional: Zap, premium: Crown };
export const PLAN_FEATURE_LABELS = { services: 'Serviços', agendas: 'Horários', appointments: 'Agenda', employees: 'Funcionários', flows: 'Fluxo de Caixa' };
export const PLAN_ALL_FEATURES = ['services', 'agendas', 'appointments', 'employees', 'flows'];

export const SUBSCRIPTION_STATUS_COLORS = 
{
    ACTIVE: 'bg-green-500/20 text-green-500',
    TRIAL: 'bg-blue-500/20 text-blue-500',
    OVERDUE: 'bg-red-500/20 text-red-500',
    CANCELLED: 'bg-gray-500/20 text-gray-500',
    PENDING: 'bg-yellow-500/20 text-yellow-500'
};

export const SUBSCRIPTION_STATUS_CONFIG = 
{
    ACTIVE: { label: 'Ativo', color: 'bg-green-500/20 text-green-500', icon: Check },
    TRIAL: { label: 'Teste', color: 'bg-blue-500/20 text-blue-500', icon: Clock },
    OVERDUE: { label: 'Inadimplente', color: 'bg-orange-500/20 text-orange-500', icon: Clock },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-500/20 text-red-500', icon: X },
    PENDING: { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-500', icon: AlertCircle },
    NONE: { label: 'Sem Assinatura', color: 'bg-gray-500/20 text-gray-400', icon: X }
};