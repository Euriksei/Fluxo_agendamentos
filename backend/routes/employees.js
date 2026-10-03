import bcrypt from 'bcrypt';
import express from 'express';
import pool from '../config/database.js';

import { authenticateToken } from '../middlewares/authentication.js';
import { checkSubscription, requireFeature, requireCanAddEmployee } from '../middlewares/subscription.js';

import { validateEmail } from '../utils/validations.js';
import { normalizeTime  } from '../utils/time.js';

const router = express.Router();

router.get('/barber/:barberId', async (req, res) => 
{
    try 
    {
        const { barberId } = req.params;

        const [owner] = await pool.query(`SELECT id, name, userId FROM users WHERE id = ?`, [barberId]);
        if (owner.length === 0) return res.status(404).json({ error: 'Barbearia não encontrada' });

        const ownerId = owner[0].userId || owner[0].id;

        const [ownerData] = await pool.query(`SELECT id, name, 'owner' as type FROM users WHERE id = ?`, [ownerId]);

        const [employees] = await pool.query(`SELECT id, name, 'employee' as type FROM users WHERE userId = ?`, [ownerId]);

        const professionals = [...ownerData, ...employees];

        res.json(professionals);
    } 
    catch (error) 
    {
        console.error('Get professionals error:', error);
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
        const [users] = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE userId = ? ORDER BY name ASC', [req.user.id]);
        if (users.length === 0) return res.json({ error: 'Nenhum funcionário encontrado' });
        res.json(users);
    } 
    catch (error) 
    {
        console.error('Get employee error:', error);
        res.status(500).json({ error: 'Erro ao buscar funcionário' });
    }
});

router.get('/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;

        const [employees] = await pool.query(`SELECT id, name, email, role, created_at FROM users WHERE id = ? AND userId = ?`, [id, req.user.id]);
        if (employees.length === 0) return res.status(404).json({ error: 'Funcionário não encontrado' });
        const employee = employees[0];

        const [agendas] = await pool.query(`SELECT * FROM agendas WHERE userId = ? ORDER BY dayOfWeek ASC`, [id]);
        const [services] = await pool.query( `SELECT s.* FROM services s INNER JOIN user_services us ON s.id = us.serviceId WHERE us.userId = ? ORDER BY s.name ASC`, [id]);
        const [blocks] = await pool.query(`SELECT * FROM agenda_blocks WHERE userId = ? AND blockDate >= CURDATE() ORDER BY blockDate ASC`, [id]);

        const [appointments] = await pool.query(`SELECT a.*, s.name as serviceName FROM appointments a JOIN services s ON a.serviceId = s.id
            WHERE a.barberId = ? AND a.appointmentDate >= CURDATE() AND a.appointmentDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) ORDER BY a.appointmentDate ASC, a.startTime ASC`,
                [id]);

        res.json({ ...employee, agendas, services, blocks, appointments });
    } 
    catch (error) 
    {
        console.error('Get employee details error:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do funcionário' });
    }
});

router.use(requireFeature('employees'));

router.post('/', requireCanAddEmployee, async (req, res) => 
{
    try 
    {
        const { name, email, password } = req.body;
        const ownerId = req.user.id;

        if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        if (name.trim().length < 2) return res.status(400).json({ error: 'Nome deve ter no mínimo 2 caracteres' });
        if (!validateEmail(email)) return res.status(400).json({ error: 'Email inválido' });
        if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });

        const sanitizedEmail = email.toLowerCase().trim();

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [sanitizedEmail]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email já está em uso' });

        const [owner] = await pool.query('SELECT shop FROM users WHERE id = ?', [ownerId]);
        if (owner.length === 0) return res.status(400).json({ error: 'Erro ao buscar dados do proprietário' });

        const password_hash = await bcrypt.hash(password, 12);

        const [result] = await pool.query(`INSERT INTO users (userId, name, shop, email, password, role) VALUES (?, ?, ?, ?, ?, 'EMPLOYEE')`,
            [ownerId, name.trim(), owner[0].shop, sanitizedEmail, password_hash]);

        const newEmployee = { id: result.insertId, name: name.trim(), email: sanitizedEmail, role: 'EMPLOYEE', created_at: new Date() };

        res.status(201).json(newEmployee);
    } 
    catch (error) 
    {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Erro ao criar funcionário' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password } = req.body;
        const ownerId = req.user.id;

        // Verifica se o funcionário pertence ao dono
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE id = ? AND userId = ?',
            [id, ownerId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        // Validações
        if (!name || !email) {
            return res.status(400).json({ error: 'Nome e email são obrigatórios' });
        }

        if (name.trim().length < 2) {
            return res.status(400).json({ error: 'Nome deve ter no mínimo 2 caracteres' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        // Verifica se email já está em uso por outro usuário
        const [emailInUse] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND id <> ?',
            [email.toLowerCase().trim(), id]
        );

        if (emailInUse.length > 0) {
            return res.status(400).json({ error: 'Email já está em uso por outro usuário' });
        }

        // Atualiza com ou sem senha
        if (password && password.length >= 8) {
            const password_hash = await bcrypt.hash(password, 12);
            await pool.query(
                'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ? AND userId = ?',
                [name.trim(), email.toLowerCase().trim(), password_hash, id, ownerId]
            );
        } else if (password && password.length > 0 && password.length < 8) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
        } else {
            await pool.query(
                'UPDATE users SET name = ?, email = ? WHERE id = ? AND userId = ?',
                [name.trim(), email.toLowerCase().trim(), id, ownerId]
            );
        }

        const [updated] = await pool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [id]
        );

        res.json(updated[0]);

    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Erro ao atualizar funcionário' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user.id;

        // Verifica se o funcionário pertence ao dono
        const [existing] = await pool.query(
            'SELECT id, name FROM users WHERE id = ? AND userId = ?',
            [id, ownerId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        // Deleta o funcionário (cascade vai deletar agendas, serviços, etc)
        await pool.query('DELETE FROM users WHERE id = ? AND userId = ?', [id, ownerId]);

        res.json({ message: `Funcionário ${existing[0].name} removido com sucesso` });

    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Erro ao remover funcionário' });
    }
});

router.post('/:id/agendas', async (req, res) => {
    try {
        const { id } = req.params;
        const { dayOfWeek, startTime, endTime, slotDuration = 30, lunchStart, lunchEnd } = req.body;
        const ownerId = req.user.id;

        // Verifica se o funcionário pertence ao dono
        const [employee] = await pool.query(
            'SELECT id FROM users WHERE id = ? AND userId = ?',
            [id, ownerId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        // Validações
        if (dayOfWeek === undefined || !startTime || !endTime) {
            return res.status(400).json({ error: 'Dia da semana, horário de início e fim são obrigatórios' });
        }

        const normalizedLunchStart = lunchStart ? normalizeTime(lunchStart) : null;
        const normalizedLunchEnd = lunchEnd ? normalizeTime(lunchEnd) : null;

        // Upsert
        await pool.query(
            `INSERT INTO agendas (userId, ownerId, dayOfWeek, startTime, endTime, slotDuration, lunchStart, lunchEnd)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                startTime = VALUES(startTime),
                endTime = VALUES(endTime),
                slotDuration = VALUES(slotDuration),
                lunchStart = VALUES(lunchStart),
                lunchEnd = VALUES(lunchEnd),
                isActive = TRUE`,
            [id, ownerId, dayOfWeek, normalizeTime(startTime), normalizeTime(endTime), slotDuration, normalizedLunchStart, normalizedLunchEnd]
        );

        const [agenda] = await pool.query(
            'SELECT * FROM agendas WHERE userId = ? AND dayOfWeek = ?',
            [id, dayOfWeek]
        );

        res.status(201).json(agenda[0]);

    } catch (error) {
        console.error('Create employee agenda error:', error);
        res.status(500).json({ error: 'Erro ao criar agenda do funcionário' });
    }
});

router.put('/:employeeId/agendas/:agendaId', async (req, res) => 
{
    try 
    {
        const { employeeId, agendaId } = req.params;
        const { startTime, endTime, slotDuration, lunchStart, lunchEnd } = req.body;
        const ownerId = req.user.id;
 
        const [employee] = await pool.query('SELECT id FROM users WHERE id = ? AND userId = ?', [employeeId, ownerId]);
        if (employee.length === 0) return res.status(404).json({ error: 'Funcionário não encontrado' });
 
        const [existing] = await pool.query('SELECT id FROM agendas WHERE id = ? AND userId = ?', [agendaId, employeeId]);
        if (existing.length === 0) return res.status(404).json({ error: 'Agenda não encontrada' });
 
        if (!startTime || !endTime) return res.status(400).json({ error: 'Horário de início e fim são obrigatórios' });
        if ((lunchStart && !lunchEnd) || (!lunchStart && lunchEnd)) return res.status(400).json({ error: 'Informe início e fim do horário de almoço' });
 
        const normalizedLunchStart = lunchStart ? normalizeTime(lunchStart) : null;
        const normalizedLunchEnd = lunchEnd ? normalizeTime(lunchEnd) : null;
 
        await pool.query(`UPDATE agendas SET startTime = ?, endTime = ?, slotDuration = COALESCE(?, slotDuration), lunchStart = ?, lunchEnd = ?, isActive = TRUE
            WHERE id = ? AND userId = ?`, [normalizeTime(startTime), normalizeTime(endTime), slotDuration || null, normalizedLunchStart, normalizedLunchEnd, agendaId, employeeId]);
 
        const [updated] = await pool.query('SELECT * FROM agendas WHERE id = ?', [agendaId]);
        res.json(updated[0]);
    } 
    catch (error) 
    {
        console.error('Update employee agenda error:', error);
        res.status(500).json({ error: 'Erro ao atualizar agenda do funcionário' });
    }
});

router.delete('/:employeeId/agendas/:agendaId', async (req, res) => {
    try {
        const { employeeId, agendaId } = req.params;
        const ownerId = req.user.id;

        // Verifica se o funcionário pertence ao dono
        const [employee] = await pool.query(
            'SELECT id FROM users WHERE id = ? AND userId = ?',
            [employeeId, ownerId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        await pool.query(
            'UPDATE agendas SET isActive = FALSE WHERE id = ? AND userId = ?',
            [agendaId, employeeId]
        );

        res.json({ message: 'Agenda removida' });

    } catch (error) {
        console.error('Delete employee agenda error:', error);
        res.status(500).json({ error: 'Erro ao remover agenda' });
    }
});

router.get('/:id/services', async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user.id;

        // Verifica se o funcionário pertence ao dono
        const [employee] = await pool.query(
            'SELECT id FROM users WHERE id = ? AND userId = ?',
            [id, ownerId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        const [services] = await pool.query(
            `SELECT s.* 
             FROM services s
             INNER JOIN user_services us ON s.id = us.serviceId
             WHERE us.userId = ?
             ORDER BY s.name ASC`,
            [id]
        );

        res.json(services);

    } catch (error) {
        console.error('Get employee services error:', error);
        res.status(500).json({ error: 'Erro ao buscar serviços do funcionário' });
    }
});

router.put('/:id/services', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { serviceIds } = req.body; // Array de IDs de serviços
        const ownerId = req.user.id;

        // Verifica se o funcionário pertence ao dono
        const [employee] = await connection.query(
            'SELECT id FROM users WHERE id = ? AND userId = ?',
            [id, ownerId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        // Verifica se todos os serviços pertencem ao dono
        if (serviceIds && serviceIds.length > 0) {
            const [validServices] = await connection.query(
                `SELECT id FROM services WHERE id IN (?) AND userId = ?`,
                [serviceIds, ownerId]
            );

            if (validServices.length !== serviceIds.length) {
                return res.status(400).json({ error: 'Um ou mais serviços não pertencem a você' });
            }
        }

        // Remove todas as associações existentes
        await connection.query(
            'DELETE FROM user_services WHERE userId = ?',
            [id]
        );

        // Adiciona novas associações
        if (serviceIds && serviceIds.length > 0) {
            const values = serviceIds.map(serviceId => [parseInt(id), serviceId]);
            await connection.query(
                'INSERT INTO user_services (userId, serviceId) VALUES ?',
                [values]
            );
        }

        // Busca serviços atualizados
        const [services] = await connection.query(
            `SELECT s.* 
             FROM services s
             INNER JOIN user_services us ON s.id = us.serviceId
             WHERE us.userId = ?
             ORDER BY s.name ASC`,
            [id]
        );

        await connection.commit();
        res.json(services);

    } catch (error) {
        await connection.rollback();
        console.error('Update employee services error:', error);
        res.status(500).json({ error: 'Erro ao atualizar serviços' });
    } finally {
        connection.release();
    }
});

router.post('/:id/services', async (req, res) => {
    try {
        const { id } = req.params;
        const { serviceId } = req.body;
        const ownerId = req.user.id;

        // Verifica se o funcionário pertence ao dono
        const [employee] = await pool.query(
            'SELECT id FROM users WHERE id = ? AND userId = ?',
            [id, ownerId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        // Verifica se o serviço pertence ao dono
        const [service] = await pool.query(
            'SELECT * FROM services WHERE id = ? AND userId = ?',
            [serviceId, ownerId]
        );

        if (service.length === 0) {
            return res.status(400).json({ error: 'Serviço não encontrado' });
        }

        // Adiciona associação (ignora se já existir)
        await pool.query(
            'INSERT IGNORE INTO user_services (userId, serviceId) VALUES (?, ?)',
            [id, serviceId]
        );

        res.status(201).json(service[0]);

    } catch (error) {
        console.error('Add employee service error:', error);
        res.status(500).json({ error: 'Erro ao adicionar serviço' });
    }
});

router.delete('/:employeeId/services/:serviceId', async (req, res) => {
    try {
        const { employeeId, serviceId } = req.params;
        const ownerId = req.user.id;

        // Verifica se o funcionário pertence ao dono
        const [employee] = await pool.query(
            'SELECT id FROM users WHERE id = ? AND userId = ?',
            [employeeId, ownerId]
        );

        if (employee.length === 0) {
            return res.status(404).json({ error: 'Funcionário não encontrado' });
        }

        await pool.query(
            'DELETE FROM user_services WHERE userId = ? AND serviceId = ?',
            [employeeId, serviceId]
        );

        res.json({ message: 'Serviço removido do funcionário' });

    } catch (error) {
        console.error('Remove employee service error:', error);
        res.status(500).json({ error: 'Erro ao remover serviço' });
    }
});

export default router;