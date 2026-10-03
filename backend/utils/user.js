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