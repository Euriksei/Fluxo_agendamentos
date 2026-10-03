import express from 'express';
import pool from '../config/database.js';

import { authenticateToken } from '../middlewares/authentication.js';
import { checkSubscription, requireFeature } from '../middlewares/subscription.js';

import { getOwnerId } from '../utils/user.js';

const router = express.Router();

router.use(authenticateToken);
router.use(checkSubscription);

router.get('/', async (req, res) => 
{
    try 
    {
        const { limit } = req.query;
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        let query;
        let params;

        query = 'SELECT f.*, u.name as userName FROM flows f JOIN users u ON f.userId = u.id WHERE u.id = ? OR u.userId = ?';
        params = [ownerId, ownerId];

        query += ' ORDER BY f.created_at DESC';

        if (limit) 
        {
            const parsedLimit = parseInt(limit, 10);
            if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) return res.status(400).json({ error: 'Limit inválido' });
            query += ' LIMIT ?';
            params.push(parsedLimit);
        }
        
        const [flows] = await pool.query(query, params);

        res.json(flows);
    } 
    catch (error) 
    {
        console.error('Get flows error:', error);
        res.status(500).json({ error: 'Erro ao buscar fluxos de caixa' });
    }
});

router.get('/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;

        const [flows] = await pool.query('SELECT * FROM flows WHERE id = ? AND userId = ?', [id, req.user.id]);
        if (flows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });

        res.json(flows[0]);
    } 
    catch (error) 
    {
        console.error('Get flow error:', error);
        res.status(500).json({ error: 'Erro ao buscar fluxo de caixa' });
    }
});

router.delete('/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;

        const [existing] = await pool.query('SELECT id FROM flows WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Fluxo de caixa não encontrado' });

        await pool.query('DELETE FROM flows WHERE id = ?', [id]);

        res.json({ message: 'Fluxo de caixa deletado com sucesso' });
    } 
    catch (error) 
    {
        console.error('Delete flow error:', error);
        res.status(500).json({ error: 'Erro ao deletar fluxo de caixa' });
    }
});

router.use(requireFeature('flows'));

router.post('/', async (req, res) => 
{
    try 
    {
        const { serviceId = null, value, date, type = 'Outro', category = 'Sem Categoria' } = req.body;
        const userId = req.user.id;

        if (value === undefined || !type || !category) return res.status(400).json({ error: 'Todos os campos são obrigatórios' });

        const parsedValue = parseInt(value, 10);

        if (isNaN(parsedValue) || parsedValue < 0) return res.status(400).json({ error: 'Valor deve ser um número válido' });

        const [result] = await pool.query('INSERT INTO flows (userId, serviceId, value, date, type, category) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, serviceId, parsedValue, date, type, category]);

        const newFlow = { id: result.insertId, userId, serviceId, value: parsedValue, date, type, category };

        res.status(201).json(newFlow);
    } 
    catch (error) 
    {
        console.error('Create flow error:', error);
        res.status(500).json({ error: 'Erro ao criar fluxo de caixa' });
    }
});

router.put('/:id', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const { id } = req.params;
        const { serviceId = null, value, date, type = 'Outro', category = 'Sem Categoria' } = req.body;

        const [existing] = await connection.query('SELECT id FROM flows WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Fluxo de caixa não encontrado' });
        if (existing[0].category === 'SYSTEM') return res.status(403).json({ error: 'Lançamentos gerados automaticamente pelo sistema não podem ser editados' });

        if (value === undefined || !type || !category) return res.status(400).json({ error: 'Todos os campos são obrigatórios' });

        const parsedValue = parseInt(value, 10);

        if (isNaN(parsedValue) || parsedValue < 0) return res.status(400).json({ error: 'Valor deve ser um número válido' });

        await connection.query('UPDATE flows SET serviceId = ?, value = ?, date = ?, type = ?, category = ? WHERE id = ?',
            [serviceId, parsedValue, date, type, category, id]);

        const [updated] = await connection.query('SELECT * FROM flows WHERE id = ?', [id]);

        await connection.commit();

        res.json(updated[0]);
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Update flow error:', error);
        res.status(500).json({ error: 'Erro ao atualizar fluxo de caixa' });
    } 
    finally 
    {
        connection.release();
    }
});

export default router;