import pool from '../config/database.js';

let plansCache = null;
let plansCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const getPlans = async () => 
{
    // Retorna cache se válido
    if (plansCache && plansCacheTime && (Date.now() - plansCacheTime) < CACHE_DURATION) 
    {
        return plansCache;
    }

    const [plans] = await pool.query('SELECT * FROM plans WHERE isActive = TRUE');
    
    const plansMap = {};
    
    for (const plan of plans) 
    {
        let features = plan.features;
        
        // Parse features se for string JSON
        if (typeof features === 'string') 
        {
            try { features = JSON.parse(features); } 
            catch (e) { features = []; }
        }
        
        plansMap[plan.slug] = {
            id: plan.id,
            name: plan.name,
            slug: plan.slug,
            price: plan.price,
            maxEmployees: plan.maxEmployees,
            features: features || []
        };
    }

    // Garante que sempre tenha um plano free
    if (!plansMap.free) 
    {
        plansMap.free = {
            id: 0,
            name: 'Free',
            slug: 'free',
            price: 0,
            maxEmployees: 0,
            features: ['services', 'agendas']
        };
    }

    plansCache = plansMap;
    plansCacheTime = Date.now();

    return plansMap;
};

export const clearPlansCache = () => 
{
    plansCache = null;
    plansCacheTime = null;
};