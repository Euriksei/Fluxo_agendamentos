import express from 'express';
import pool from '../config/database.js';

import { authenticateToken } from '../middlewares/authentication.js';
import { checkSubscription, requireFeature, requireBookingAvailable } from '../middlewares/subscription.js';

import { validateEmail, validatePhone } from '../utils/validations.js';
import { normalizeTime, timeToMinutes, addMinutesToTime } from '../utils/time.js';
import { toLocalDateString } from '../utils/date.js';

const router = express.Router();

// Só dígitos, sem o DDI 55 (o telefone é gravado como DDD + número)
const onlyDigits = (value) =>
{
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
};
const CLIENT_NOT_FOUND = { error: 'Nenhum agendamento encontrado para este email e telefone' };

router.get('/client/:email', async (req, res) => 
{
    try 
    {
        const { email } = req.params;
        const phone = onlyDigits(req.query.phone);

        if (!validateEmail(email)) return res.status(400).json({ error: 'Email inválido' });
        if (!phone) return res.status(400).json({ error: 'Telefone é obrigatório' });

        const [appointments] = await pool.query(`SELECT a.*, u.name as barberName, u.shop as barberShop, s.name as serviceName FROM appointments a
            JOIN users u ON a.barberId = u.id JOIN services s ON a.serviceId = s.id WHERE a.clientEmail = ? ORDER BY a.appointmentDate DESC, a.startTime DESC`,
                [email.toLowerCase().trim()]);

        // Email e telefone precisam bater; sem correspondência a resposta é a mesma (não revela se o email existe)
        const owned = appointments.filter(apt => onlyDigits(apt.clientPhone) === phone);
        if (owned.length === 0) return res.status(404).json(CLIENT_NOT_FOUND);

        res.json(owned);

    } 
    catch (error) 
    {
        console.error('Get client appointments error:', error);
        res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

router.post('/', requireBookingAvailable(req => req.body?.barberId ?? null), async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const { clientName, clientEmail, clientPhone, barberId, serviceId, appointmentDate, startTime, notes } = req.body;

        if (!clientName || !clientEmail || !clientPhone) return res.status(400).json({ error: 'Nome, email e telefone são obrigatórios' });
        if (!barberId || !serviceId || !appointmentDate || !startTime) return res.status(400).json({ error: 'Profissional, serviço, data e horário são obrigatórios' });
        if (clientName.trim().length < 2) return res.status(400).json({ error: 'Nome deve ter no mínimo 2 caracteres' });
        if (!validateEmail(clientEmail)) return res.status(400).json({ error: 'Email inválido' });
        if (!validatePhone(clientPhone)) return res.status(400).json({ error: 'Telefone inválido' });

        const targetDate = new Date(appointmentDate + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (targetDate < today) return res.status(400).json({ error: 'Não é possível agendar em datas passadas' });

        const [professional] = await connection.query( 'SELECT id, userId FROM users WHERE id = ?', [barberId]);
        if (professional.length === 0) return res.status(404).json({ error: 'Profissional não encontrado' });

        const isOwner = !professional[0].userId;
        const ownerId = professional[0].userId || professional[0].id;

        const [services] = await connection.query('SELECT * FROM services WHERE id = ? AND userId = ?', [serviceId, ownerId]);
        if (services.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
        const service = services[0];

        const [userService] = await connection.query('SELECT id FROM user_services WHERE userId = ? AND serviceId = ?', [barberId, serviceId]);
        if (userService.length === 0) return res.status(400).json({ error: 'Este profissional não realiza o serviço selecionado' });

        const normalizedStartTime = normalizeTime(startTime);
        const endTime = addMinutesToTime(startTime, service.duration);
        const dayOfWeek = targetDate.getDay();

        const [agendas] = await connection.query('SELECT * FROM agendas WHERE userId = ? AND dayOfWeek = ? AND isActive = TRUE', [barberId, dayOfWeek]);
        if (agendas.length === 0) return res.status(400).json({ error: 'Profissional não trabalha neste dia' });
        const agenda = agendas[0];

        const agendaStart = normalizeTime(agenda.startTime);
        const agendaEnd = normalizeTime(agenda.endTime);

        const startMinutes = timeToMinutes(normalizedStartTime);
        const endMinutes = timeToMinutes(endTime);
        const agendaStartMinutes = timeToMinutes(agendaStart);
        const agendaEndMinutes = timeToMinutes(agendaEnd);

        if (startMinutes < agendaStartMinutes || endMinutes > agendaEndMinutes) return res.status(400).json({ error: 'Horário fora do expediente do profissional' });

        if (agenda.lunchStart && agenda.lunchEnd) 
        {
            const lunchStartMin = timeToMinutes(agenda.lunchStart);
            const lunchEndMin = timeToMinutes(agenda.lunchEnd);
            
            if (startMinutes < lunchEndMin && endMinutes > lunchStartMin) return res.status(400).json({ error: 'Horário conflita com o intervalo de almoço do profissional' });
        }

        const [blocks] = await connection.query(`SELECT * FROM agenda_blocks WHERE userId = ? AND blockDate = ? AND (startTime IS NULL OR (startTime < ? AND endTime > ?))`,
            [barberId, appointmentDate, endTime, startTime]);

        if (blocks.length > 0) return res.status(400).json({ error: 'Horário bloqueado pelo profissional' });

        const [conflicts] = await connection.query(`SELECT id FROM appointments WHERE barberId = ? AND appointmentDate = ? AND status NOT IN ('CANCELLED')
            AND ((startTime < ? AND endTime > ?) OR (startTime >= ? AND startTime < ?))`, [barberId, appointmentDate, endTime, startTime, startTime, endTime]);
        if (conflicts.length > 0) return res.status(400).json({ error: 'Horário já reservado' });

        const sanitizedName = clientName.trim();
        const sanitizedEmail = clientEmail.toLowerCase().trim();
        const sanitizedPhone = clientPhone.replace(/\D/g, '');

        const [result] = await connection.query(`INSERT INTO appointments (clientName, clientEmail, clientPhone, barberId, serviceId, appointmentDate, startTime, 
            endTime, price, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
                [sanitizedName, sanitizedEmail, sanitizedPhone, barberId, serviceId, appointmentDate, startTime, endTime, service.value, notes]);

        const [appointment] = await connection.query(`SELECT a.*, s.name as serviceName, s.duration as serviceDuration FROM appointments a JOIN services s ON a.serviceId = s.id
            WHERE a.id = ?`, [result.insertId]);

        await connection.commit();

        res.status(201).json(appointment[0]);

    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Create appointment error:', error);
        res.status(500).json({ error: 'Erro ao criar agendamento' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.delete('/client/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const { email, phone, reason } = req.body;
        if (!email || !onlyDigits(phone)) return res.status(400).json({ error: 'Email e telefone são obrigatórios para cancelar' });

        const [appointments] = await pool.query('SELECT * FROM appointments WHERE id = ? AND clientEmail = ?', [id, String(email).toLowerCase().trim()]);
        if (appointments.length === 0 || onlyDigits(appointments[0].clientPhone) !== onlyDigits(phone)) return res.status(404).json(CLIENT_NOT_FOUND);

        const appointment = appointments[0];
        if (appointment.status === 'COMPLETED') return res.status(400).json({ error: 'Não é possível cancelar um agendamento já concluído' });
        if (appointment.status === 'CANCELLED') return res.status(400).json({ error: 'Agendamento já está cancelado' });

        await pool.query(`UPDATE appointments SET status = 'CANCELLED', cancelReason = ?, cancelledBy = 'CLIENT' WHERE id = ?`, [reason || null, id]);

        res.json({ message: 'Agendamento cancelado com sucesso' });
    } 
    catch (error) 
    {
        console.error('Cancel client appointment error:', error);
        res.status(500).json({ error: 'Erro ao cancelar agendamento' });
    }
});

// ROTAS PROTEGIDAS

router.use(authenticateToken);
router.use(checkSubscription);

router.get('/barber', async (req, res) => 
{
    try 
    {
        const { date, status, barberId } = req.query;
        const odore = req.user.id;

        const [user] = await pool.query('SELECT id, userId FROM users WHERE id = ?', [odore]);
        if (user.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        const isOwner = !user[0].userId;

        let query;
        let params;

        if (isOwner)
        {
            query = `SELECT a.*, s.name as serviceName, s.duration as serviceDuration, u.name as barberName FROM appointments a JOIN services s ON a.serviceId = s.id 
                JOIN users u ON a.barberId = u.id WHERE (a.barberId = ? OR u.userId = ?)`;
            params = [odore, odore];
        }
        else
        {
            query = `SELECT a.*, s.name as serviceName, s.duration as serviceDuration, u.name as barberName FROM appointments a JOIN services s ON a.serviceId = s.id 
                JOIN users u ON a.barberId = u.id WHERE a.barberId = ?`;
            params = [odore];
        }

        if (date) 
        {
            query += ' AND a.appointmentDate = ?';
            params.push(date);
        }

        if (status) 
        {
            query += ' AND a.status = ?';
            params.push(status);
        }

        if (barberId)
        {
            query += ' AND a.barberId = ?';
            params.push(barberId);
        }

        query += ' ORDER BY a.appointmentDate ASC, a.startTime ASC';

        const [appointments] = await pool.query(query, params);

        res.json(appointments);
    } 
    catch (error) 
    {
        console.error('Get barber appointments error:', error);
        res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

router.use(requireFeature('appointments'));

router.get('/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const odore = req.user.id;

        const [user] = await pool.query('SELECT id, userId FROM users WHERE id = ?', [odore]);
        if (user.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        const isOwner = !user[0].userId;

        let query;
        let params;

        if (isOwner)
        {
            query = `SELECT a.*, s.name as serviceName, s.description as serviceDescription, s.duration as serviceDuration, u.name as barberName FROM appointments a 
                JOIN services s ON a.serviceId = s.id JOIN users u ON a.barberId = u.id WHERE a.id = ? AND (a.barberId = ? OR u.userId = ?)`;
            params = [id, odore, odore];
        }
        else
        {
            query = `SELECT a.*, s.name as serviceName, s.description as serviceDescription, s.duration as serviceDuration, u.name as barberName FROM appointments a 
                JOIN services s ON a.serviceId = s.id JOIN users u ON a.barberId = u.id WHERE a.id = ? AND a.barberId = ? `;
            params = [id, odore];
        }

        const [appointments] = await pool.query(query, params);
        if (appointments.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

        res.json(appointments[0]);
    } 
    catch (error)
    {
        console.error('Get appointment error:', error);
        res.status(500).json({ error: 'Erro ao buscar agendamento' });
    }
});

router.patch('/:id/status', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const { id } = req.params;
        const { status, cancelReason } = req.body;
        const odore = req.user.id;

        const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Status inválido' });

        const [user] = await connection.query('SELECT id, userId FROM users WHERE id = ?', [odore]);

        const isOwner = !user[0]?.userId;

        let query;
        let params;

        if (isOwner) 
        {
            query = `SELECT a.* FROM appointments a JOIN users u ON a.barberId = u.id WHERE a.id = ? AND (a.barberId = ? OR u.userId = ?)`;
            params = [id, odore, odore];
        } 
        else 
        {
            query = 'SELECT * FROM appointments WHERE id = ? AND barberId = ?';
            params = [id, odore];
        }

        const [appointments] = await connection.query(query, params);
        if (appointments.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

        const appointment = appointments[0];
        if (appointment.status === 'COMPLETED' && status !== 'COMPLETED') return res.status(400).json({ error: 'Não é possível alterar um agendamento já concluído' });

        if (status === 'CANCELLED') 
        {
            await connection.query(`UPDATE appointments SET status = 'CANCELLED', cancelReason = ?, cancelledBy = 'PROFESSIONAL' WHERE id = ?`, [cancelReason || null, id]);
        } 
        else 
        {
            await connection.query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
        }

        if (status === 'COMPLETED')
        {
            const aptDate = toLocalDateString(appointment.appointmentDate);
            const aptEndTime = appointment.endTime.slice(0, 5);

            const now = new Date();
            const todayStr = toLocalDateString(now);
            const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

            const isFutureDate = aptDate > todayStr;
            const isTodayButNotStarted = aptDate === todayStr && aptEndTime > currentTime;

            if (isFutureDate || isTodayButNotStarted) return res.status(400).json({ error: 'Não é possível concluir um agendamento que ainda não foi realizado' });

            await connection.query(`INSERT INTO flows (userId, serviceId, value, date, type, category) VALUES (?, ?, ?, ?, 'Entrada', 'SYSTEM')`,
                [appointment.barberId, appointment.serviceId, appointment.price, aptDate]);
        }

        const [updated] = await connection.query(`SELECT a.*, s.name as serviceName, u.name as barberName FROM appointments a JOIN services s ON a.serviceId = s.id 
            JOIN users u ON a.barberId = u.id WHERE a.id = ?`, [id]);

        await connection.commit();

        res.json(updated[0]);
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Update appointment status error:', error);
        res.status(500).json({ error: 'Erro ao atualizar agendamento' });
    }
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.patch('/:id/reschedule', async (req, res) => 
{
    const connection = await pool.getConnection();

    try 
    {
        await connection.beginTransaction();

        const { id } = req.params;
        const { appointmentDate, startTime } = req.body;
        const odore = req.user.id;

        if (!appointmentDate && !startTime) return res.status(400).json({ error: 'Informe a nova data ou horário' });

        const [user] = await connection.query('SELECT id, userId FROM users WHERE id = ?', [odore]);

        const isOwner = !user[0]?.userId;

        let query;
        let params;

        if (isOwner) 
        {
            query = ` SELECT a.*, s.duration as serviceDuration FROM appointments a JOIN services s ON a.serviceId = s.id JOIN users u ON a.barberId = u.id 
                WHERE a.id = ? AND (a.barberId = ? OR u.userId = ?) `;
            params = [id, odore, odore];
        } 
        else 
        {
            query = ` SELECT a.*, s.duration as serviceDuration FROM appointments a JOIN services s ON a.serviceId = s.id WHERE a.id = ? AND a.barberId = ? `;
            params = [id, odore];
        }

        const [appointments] = await connection.query(query, params);
        if (appointments.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

        const appointment = appointments[0];
        if (appointment.status === 'COMPLETED') return res.status(400).json({ error: 'Não é possível reagendar um agendamento concluído' });
        if (appointment.status === 'CANCELLED') return res.status(400).json({ error: 'Não é possível reagendar um agendamento cancelado' });

        const newDate = appointmentDate || toLocalDateString(appointment.appointmentDate);
        const newStartTime = startTime || appointment.startTime;
        const normalizedStartTime = normalizeTime(newStartTime);
        const newEndTime = addMinutesToTime(newStartTime, appointment.serviceDuration);

        const targetDate = new Date(newDate + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (targetDate < today) return res.status(400).json({ error: 'Não é possível reagendar para datas passadas' });

        const todayStr = toLocalDateString();
        if (appointmentDate === todayStr)
        {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const slotMinutes = timeToMinutes(normalizeTime(startTime));
            if (slotMinutes <= currentMinutes) return res.status(400).json({ error: 'Não é possível agendar em horários que já passaram' });
        }

        const dayOfWeek = targetDate.getDay();

        const [agendas] = await connection.query('SELECT * FROM agendas WHERE userId = ? AND dayOfWeek = ? AND (isActive = TRUE OR isActive IS NULL)',
            [appointment.barberId, dayOfWeek]);

        if (agendas.length === 0) return res.status(400).json({ error: 'Profissional não trabalha neste dia' });

        const agenda = agendas[0];

        const startMinutes = timeToMinutes(normalizedStartTime);
        const endMinutes = timeToMinutes(newEndTime);
        const agendaStartMinutes = timeToMinutes(agenda.startTime);
        const agendaEndMinutes = timeToMinutes(agenda.endTime);

        if (startMinutes < agendaStartMinutes || endMinutes > agendaEndMinutes) return res.status(400).json({ error: 'Horário fora do expediente do profissional' });

        if (agenda.lunchStart && agenda.lunchEnd) 
        {
            const lunchStartMin = timeToMinutes(agenda.lunchStart);
            const lunchEndMin = timeToMinutes(agenda.lunchEnd);
            if (startMinutes < lunchEndMin && endMinutes > lunchStartMin) return res.status(400).json({ error: 'Horário conflita com o intervalo de almoço' });
        }

        const [blocks] = await connection.query( `SELECT * FROM agenda_blocks WHERE userId = ? AND blockDate = ? 
            AND (startTime IS NULL OR (startTime < ? AND endTime > ?))`, [appointment.barberId, newDate, newEndTime, normalizedStartTime] );

        if (blocks.length > 0) return res.status(400).json({ error: 'Horário bloqueado pelo profissional' });

        const [conflicts] = await connection.query( `SELECT id FROM appointments WHERE barberId = ? AND appointmentDate = ? AND id != ? AND status NOT IN ('CANCELLED') 
            AND ((startTime < ? AND endTime > ?) OR (startTime >= ? AND startTime < ?))`, 
                [appointment.barberId, newDate, id, newEndTime, normalizedStartTime, normalizedStartTime, newEndTime] );

        if (conflicts.length > 0) return res.status(400).json({ error: 'Já existe outro agendamento neste horário' });

        await connection.query( `UPDATE appointments SET appointmentDate = ?, startTime = ?, endTime = ? WHERE id = ?`, [newDate, normalizedStartTime, newEndTime, id] );

        const [updated] = await connection.query( `SELECT a.*, s.name as serviceName, s.duration as serviceDuration, u.name as barberName FROM appointments a 
            JOIN services s ON a.serviceId = s.id JOIN users u ON a.barberId = u.id WHERE a.id = ?`, [id] );

        await connection.commit();

        res.json(updated[0]);
    } 
    catch (error) 
    {
        await connection.rollback();
        console.error('Reschedule appointment error:', error);
        res.status(500).json({ error: 'Erro ao reagendar' });
    } 
    finally 
    {
        await connection.rollback().catch(() => {});
        connection.release();
    }
});

router.delete('/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const { reason } = req.body;
        const odore = req.user.id;

        const [user] = await pool.query('SELECT id, userId FROM users WHERE id = ?', [odore]);

        const isOwner = !user[0]?.userId;

        let query;
        let params;

        if (isOwner) 
        {
            query = `SELECT a.* FROM appointments a JOIN users u ON a.barberId = u.id WHERE a.id = ? AND (a.barberId = ? OR u.userId = ?)`;
            params = [id, odore, odore];
        } 
        else 
            {
            query = 'SELECT * FROM appointments WHERE id = ? AND barberId = ?';
            params = [id, odore];
        }

        const [appointments] = await pool.query(query, params);
        if (appointments.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

        const appointment = appointments[0];
        if (appointment.status === 'COMPLETED') return res.status(400).json({ error: 'Não é possível cancelar um agendamento já concluído' });
        if (appointment.status === 'CANCELLED') return res.status(400).json({ error: 'Agendamento já está cancelado' });

        await pool.query(`UPDATE appointments SET status = 'CANCELLED', cancelReason = ?, cancelledBy = 'PROFESSIONAL' WHERE id = ?`, [reason || null, id]);

        res.json({ message: 'Agendamento cancelado com sucesso' });
    } 
    catch (error) 
    {
        console.error('Cancel appointment error:', error);
        res.status(500).json({ error: 'Erro ao cancelar agendamento' });
    }
});

export default router;