import express from 'express';
import pool from '../config/database.js';

import { authenticateToken } from '../middlewares/authentication.js';
import { checkSubscription, requireFeature } from '../middlewares/subscription.js';

import { getOwnerId } from '../utils/user.js';

const router = express.Router();

router.get('/barber/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;

        const [user] = await pool.query('SELECT id, userId FROM users WHERE id = ?', [id]);
        if (user.length === 0) return res.status(404).json({ error: 'Profissional não encontrado' });

        const ownerId = user[0].userId || user[0].id;
        const [services] = await pool.query( 'SELECT * FROM services WHERE userId = ? ORDER BY name ASC', [ownerId] );
        res.json(services);
    } 
    catch (error) 
    {
        console.error('Get barber services error:', error);
        res.status(500).json({ error: 'Erro ao buscar serviços' });
    }
});

router.get('/:id/employees', async (req, res) => 
{
    try 
    {
        const { id } = req.params;

        const [service] = await pool.query('SELECT id, userId FROM services WHERE id = ?', [id]);
        if (service.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });

        const ownerId = service[0].userId;

        const [professionals] = await pool.query( `SELECT u.id, u.name, CASE WHEN u.userId IS NULL THEN 'owner' ELSE 'employee' END as type FROM users u 
            INNER JOIN user_services us ON u.id = us.userId WHERE us.serviceId = ? AND (u.id = ? OR u.userId = ?) ORDER BY u.name ASC`, [id, ownerId, ownerId] );

        res.json(professionals);
    } 
    catch (error) 
    {
        console.error('Get professionals by service error:', error);
        res.status(500).json({ error: 'Erro ao buscar profissionais' });
    }
});

// ROTAS PROTEGIDAS

router.use(authenticateToken);
router.use(checkSubscription);

router.get('/', async (req, res) => 
{
    try 
    {
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const [services] = await pool.query(`SELECT s.*, CASE WHEN us.id IS NOT NULL THEN TRUE ELSE FALSE END as userOffersService FROM services s 
            LEFT JOIN user_services us ON s.id = us.serviceId AND us.userId = ? WHERE s.userId = ? ORDER BY s.name ASC`, [userId, ownerId]);

        res.json(services);
    } 
    catch (error) 
    {
        console.error('Get services error:', error);
        res.status(500).json({ error: 'Erro ao buscar serviços' });
    }
});

router.get('/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const [services] = await pool.query( `SELECT s.*, CASE WHEN us.id IS NOT NULL THEN TRUE ELSE FALSE END as userOffersService FROM services s 
            LEFT JOIN user_services us ON s.id = us.serviceId AND us.userId = ? WHERE s.id = ? AND s.userId = ?`, [userId, id, ownerId] );
        if (services.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });

        res.json(services[0]);
    } 
    catch (error) 
    {
        console.error('Get service error:', error);
        res.status(500).json({ error: 'Erro ao buscar serviço' });
    }
});

router.delete('/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const userId = req.user.id;

        const [existing] = await pool.query('SELECT id FROM services WHERE id = ? AND userId = ?', [id, userId]);
        if (existing.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });

        await pool.query('DELETE FROM services WHERE id = ? AND userId = ?', [id, userId]);

        res.json({ message: 'Serviço deletado com sucesso' });
    } 
    catch (error) 
    {
        console.error('Delete service error:', error);
        res.status(500).json({ error: 'Erro ao deletar serviço' });
    }
});

router.use(requireFeature('services'));

router.post('/', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const { name, description, value, duration, offerService } = req.body;
        const userId = req.user.id;

        const ownerId = await getOwnerId(userId, connection);
        if (!ownerId) return res.status(400).json({ error: 'Usuário não encontrado' });

        if (!name || !description || value === undefined || duration === undefined) return res.status(400).json({ error: 'Todos os campos são obrigatórios' });

        if (typeof name !== 'string' || name.trim().length < 2) return res.status(400).json({ error: 'Nome deve ter no mínimo 2 caracteres' });
        if (typeof description !== 'string' || description.trim().length < 5) return res.status(400).json({ error: 'Descrição deve ter no mínimo 5 caracteres' });

        const parsedValue = parseInt(value, 10);
        const parsedDuration = parseInt(duration, 10);

        if (isNaN(parsedValue) || parsedValue < 0) return res.status(400).json({ error: 'Valor deve ser um número válido' });
        if (isNaN(parsedDuration) || parsedDuration < 1) return res.status(400).json({ error: 'Duração deve ser no mínimo 1 minuto' });

        const [result] = await connection.query('INSERT INTO services (userId, name, description, value, duration) VALUES (?, ?, ?, ?, ?)',
            [userId, name.trim(), description.trim(), parsedValue, parsedDuration]);

        const serviceId = result.insertId;

        if (offerService) await connection.query('INSERT IGNORE INTO user_services (userId, serviceId) VALUES (?, ?)', [userId, serviceId]);
        else await connection.query('DELETE FROM user_services WHERE userId = ? AND serviceId = ?', [userId, serviceId]);

        const [updated] = await connection.query(`SELECT s.*, CASE WHEN us.id IS NOT NULL THEN TRUE ELSE FALSE END as userOffersService FROM services s 
            LEFT JOIN user_services us ON s.id = us.serviceId AND us.userId = ? WHERE s.id = ?`, [userId, serviceId]);

        await connection.commit();

        res.status(201).json(updated[0]);
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Create service error:', error);
        res.status(500).json({ error: 'Erro ao criar serviço' });
    }
    finally 
    {
        connection.release();
    }
});

router.post('/:id/offer', async (req, res) =>
{
    try 
    {
        const { id } = req.params;
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const [service] = await pool.query('SELECT id FROM services WHERE id = ? AND userId = ?', [id, ownerId]);
        if (service.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });

        const [existing] = await pool.query('SELECT id FROM user_services WHERE userId = ? AND serviceId = ?', [userId, id]);

        let offers;

        if (existing.length > 0) 
        {
            await pool.query('DELETE FROM user_services WHERE userId = ? AND serviceId = ?', [userId, id]);
            offers = false;
        } 
        else 
        {
            await pool.query('INSERT INTO user_services (userId, serviceId) VALUES (?, ?)',[userId, id]);
            offers = true;
        }

        res.json({ serviceId: parseInt(id), userOffersService: offers });
    } 
    catch (error) 
    {
        console.error('Toggle offer service error:', error);
        res.status(500).json({ error: 'Erro ao atualizar serviço' });
    }
});

router.put('/:id', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const { id } = req.params;
        const { name, description, value, duration, offerService } = req.body;
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId, connection);

        const [existing] = await connection.query('SELECT id FROM services WHERE id = ? AND userId = ?', [id, ownerId]);
        if (existing.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });

        if (!name || !description || value === undefined || duration === undefined) return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        if (typeof name !== 'string' || name.trim().length < 2) return res.status(400).json({ error: 'Nome deve ter no mínimo 2 caracteres' });
        if (typeof description !== 'string' || description.trim().length < 5) return res.status(400).json({ error: 'Descrição deve ter no mínimo 5 caracteres' });

        const parsedValue = parseInt(value, 10);
        const parsedDuration = parseInt(duration, 10);

        if (isNaN(parsedValue) || parsedValue < 0) return res.status(400).json({ error: 'Valor deve ser um número válido' });
        if (isNaN(parsedDuration) || parsedDuration < 1) return res.status(400).json({ error: 'Duração deve ser no mínimo 1 minuto' });

        await connection.query('UPDATE services SET name = ?, description = ?, value = ?, duration = ? WHERE id = ? AND userId = ?',
            [name.trim(), description.trim(), parsedValue, parsedDuration, id, userId]);

        if (offerService !== undefined) 
        {
            if (offerService) await connection.query('INSERT IGNORE INTO user_services (userId, serviceId) VALUES (?, ?)', [userId, id]);
            else await connection.query('DELETE FROM user_services WHERE userId = ? AND serviceId = ?', [userId, id]);
        }

        const [updated] = await connection.query(`SELECT s.*, CASE WHEN us.id IS NOT NULL THEN TRUE ELSE FALSE END as userOffersService FROM services s 
            LEFT JOIN user_services us ON s.id = us.serviceId AND us.userId = ? WHERE s.id = ?`, [userId, id]);

        await connection.commit();

        res.json(updated[0]);
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Update service error:', error);
        res.status(500).json({ error: 'Erro ao atualizar serviço' });
    } 
    finally 
    {
        connection.release();
    }
});

export default router;