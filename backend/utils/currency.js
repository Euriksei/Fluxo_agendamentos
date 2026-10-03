export const centavosParaReais = (centavos) => 
{
    if (!centavos || isNaN(centavos)) return 0;
    return Number((centavos / 100).toFixed(2));
};

export const reaisParaCentavos = (reais) => 
{
    if (!reais || isNaN(reais)) return 0;
    return Math.round(reais * 100);
};