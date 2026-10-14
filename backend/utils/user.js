import pool from '../config/database.js';

export async function getOwnerId(userId, connection = pool) 
{
    const [users] = await connection.query('SELECT id, userId FROM users WHERE id = ?', [userId]);
    if (users.length === 0) return null;
    return users[0].userId || users[0].id;
}

export function generateSlug(shop) 
{
    const base = shop.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    return `${base}-${randomId}`;
}
// CPF/CNPJ guardado na conta (migration 007). Leitura e gravação nunca derrubam a rota: sem a coluna, só loga e segue sem o dado.
export async function getAccountDocument(userId, db = pool)
{
    try
    {
        const [rows] = await db.query('SELECT cpfCnpj FROM users WHERE id = ?', [userId]);
        return rows[0]?.cpfCnpj || null;
    }
    catch (error)
    {
        console.error('[user] Falha ao ler o CPF/CNPJ da conta (migration 007 aplicada?):', error.message);
        return null;
    }
}

export async function saveAccountDocument(userId, digits, db = pool)
{
    try
    {
        await db.query('UPDATE users SET cpfCnpj = ? WHERE id = ?', [digits, userId]);
    }
    catch (error)
    {
        console.error('[user] Falha ao guardar o CPF/CNPJ da conta (migration 007 aplicada?):', error.message);
    }
}

// Para o admin: ***.456.789-** (CPF) / **.345.678/****-** (CNPJ)
export const maskDocument = (digits) =>
{
    const d = String(digits || '');
    if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
    if (d.length === 14) return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/****-**`;
    return null;
};
