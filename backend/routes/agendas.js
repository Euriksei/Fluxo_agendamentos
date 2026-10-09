import express from 'express';
import pool from '../config/database.js';

import { authenticateToken } from '../middlewares/authentication.js';
import { checkSubscription, requireFeature } from '../middlewares/subscription.js';

import { getOwnerId } from '../utils/user.js';
import { normalizeTime, timeToMinutes, minutesToTime, isTimeOverlap, isInLunchTime, DEFAULT_SLOT_DURATION, isValidSlotDuration } from '../utils/time.js';
import { toLocalDateString } from '../utils/date.js';

const router = express.Router();

router.get('/barber/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const [agendas] = await pool.query('SELECT * FROM agendas WHERE userId = ?', [id]);
        if (agendas.length === 0) return res.status(404).json({ error: 'Nenhuma agenda encontrada' });
        res.json(agendas);
    } 
    catch (error) 
    {
        console.error('Get agendas error:', error);
        res.status(500).json({ error: 'Erro ao buscar agenda' });
    }
});

router.get('/barber/blocks/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const [blocks] = await pool.query(`SELECT * FROM agenda_blocks WHERE userId = ? AND blockDate >= CURDATE() ORDER BY blockDate ASC, startTime ASC`, [id]);
        res.json(blocks);
    } 
    catch (error) 
    {
        console.error('Get blocks error:', error);
        res.status(500).json({ error: 'Erro ao buscar bloqueios' });
    }
});

router.get('/slots/:userId/:date', async (req, res) => 
{
    try 
    {
        const { userId, date } = req.params;
        const { serviceId } = req.query;

        const targetDate = new Date(date + 'T00:00:00');
        if (isNaN(targetDate.getTime())) return res.status(400).json({ error: 'Data inválida' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (targetDate < today) return res.json({ available: false, message: 'Data passada', slots: [] });

        const dayOfWeek = targetDate.getDay();

        const [agendas] = await pool.query(`SELECT * FROM agendas WHERE userId = ? AND dayOfWeek = ? AND isActive = TRUE`, [userId, dayOfWeek]);
        if (agendas.length === 0) return res.json({ available: false, message: 'Profissional não trabalha neste dia', slots: [] });

        const agenda = agendas[0];

        const [fullDayBlocks] = await pool.query(`SELECT * FROM agenda_blocks WHERE userId = ? AND blockDate = ? AND startTime IS NULL`, [userId, date]);
        if (fullDayBlocks.length > 0) return res.json({ available: false, message: fullDayBlocks[0].reason || 'Dia bloqueado', slots: [] });

        const [partialBlocks] = await pool.query(`SELECT startTime, endTime FROM agenda_blocks WHERE userId = ? AND blockDate = ? AND startTime IS NOT NULL`,
            [userId, date]);

        const [appointments] = await pool.query(`SELECT startTime, endTime FROM appointments WHERE barberId = ? AND appointmentDate = ? AND status NOT IN ('CANCELLED')`,
            [userId, date]);

        let serviceDuration = agenda.slotDuration || DEFAULT_SLOT_DURATION;
        if (serviceId)
        {
            const [services] = await pool.query('SELECT duration FROM services WHERE id = ?', [serviceId]);
            if (services.length > 0 && services[0].duration > 0) serviceDuration = services[0].duration;
        }

        const startMinutes = timeToMinutes(agenda.startTime);
        const endMinutes = timeToMinutes(agenda.endTime);
        // slotDuration 0 = sem intervalo fixo: o próximo horário começa quando o serviço termina
        const slotInterval = agenda.slotDuration > 0 ? agenda.slotDuration : serviceDuration;

        const lunchStart = agenda.lunchStart;
        const lunchEnd = agenda.lunchEnd;

        const now = new Date();
        const isToday = date === toLocalDateString(now);
        const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

        const slots = [];

        // Depois do almoço os horários recomeçam no fim do almoço, sem seguir o passo
        const lunchEndMinutes = lunchStart && lunchEnd ? timeToMinutes(lunchEnd) : null;
        const nextSlotTime = (time) =>
        {
            const next = time + slotInterval;
            if (lunchEndMinutes !== null && time < lunchEndMinutes && next > lunchEndMinutes) return lunchEndMinutes;
            return next;
        };

        for (let time = startMinutes; time + serviceDuration <= endMinutes; time = nextSlotTime(time))
        {
            const slotStart = minutesToTime(time);
            const slotEnd = minutesToTime(time + serviceDuration);

            if (isToday && time <= currentMinutes) continue;

            const isLunch = isInLunchTime(slotStart, slotEnd, lunchStart, lunchEnd);

            const isBlocked = partialBlocks.some(block => isTimeOverlap(slotStart, slotEnd, block.startTime, block.endTime));

            const isBooked = appointments.some(apt => isTimeOverlap(slotStart, slotEnd, apt.startTime, apt.endTime));

            slots.push({startTime: slotStart, endTime: slotEnd, available: !isBlocked && !isBooked && !isLunch, isLunch });
        }

        res.json({ available: true, date, slots });
    } 
    catch (error) 
    {
        console.error('Get slots error:', error);
        res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
    }
});

// ROTAS PROTEGIDAS

router.use(authenticateToken);
router.use(checkSubscription);

router.get('/', async (req, res) => 
{
    try 
    {
        const [agendas] = await pool.query(`SELECT * FROM agendas WHERE userId = ? ORDER BY dayOfWeek ASC`, [req.user.id]);
        res.json(agendas);
    } 
    catch (error) 
    {
        console.error('Get agendas error:', error);
        res.status(500).json({ error: 'Erro ao buscar agenda' });
    }
});

router.get('/blocks', async (req, res) => 
{
    try 
    {
        const [blocks] = await pool.query(`SELECT * FROM agenda_blocks WHERE userId = ? AND blockDate >= CURDATE() ORDER BY blockDate ASC, startTime ASC`, [req.user.id]);
        res.json(blocks);
    } 
    catch (error) 
    {
        console.error('Get blocks error:', error);
        res.status(500).json({ error: 'Erro ao buscar bloqueios' });
    }
});

router.delete('/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const userId = req.user.id;

        const [existing] = await pool.query('SELECT id FROM agendas WHERE id = ? AND userId = ?', [id, userId]);

        if (existing.length === 0) return res.status(404).json({ error: 'Agenda não encontrada' });

        await pool.query('UPDATE agendas SET isActive = FALSE WHERE id = ? AND userId = ?', [id, userId]);

        res.json({ message: 'Dia removido da agenda' });
    } 
    catch (error) 
    {
        console.error('Delete agenda error:', error);
        res.status(500).json({ error: 'Erro ao remover agenda' });
    }
});

router.delete('/blocks/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const userId = req.user.id;

        const [existing] = await pool.query('SELECT id FROM agenda_blocks WHERE id = ? AND userId = ?', [id, userId]);

        if (existing.length === 0) return res.status(404).json({ error: 'Bloqueio não encontrado' });

        await pool.query('DELETE FROM agenda_blocks WHERE id = ? AND userId = ?', [id, userId]);

        res.json({ message: 'Bloqueio removido' });
    } 
    catch (error) 
    {
        console.error('Delete block error:', error);
        res.status(500).json({ error: 'Erro ao remover bloqueio' });
    }
});

router.use(requireFeature('agendas'));

router.post('/', async (req, res) => 
{
    try 
    {
        const { dayOfWeek, daysOfWeek, startTime, endTime, slotDuration = DEFAULT_SLOT_DURATION, lunchStart, lunchEnd } = req.body;
        const userId = req.user.id;
        const ownerId = await getOwnerId(userId);

        const isMultiple = daysOfWeek !== undefined;
        if ((!isMultiple && dayOfWeek === undefined) || !startTime || !endTime) return res.status(400).json({ error: 'Dia da semana, horário de início e fim são obrigatórios' });

        if (isMultiple)
        {
            if (!Array.isArray(daysOfWeek) || daysOfWeek.length < 1 || daysOfWeek.length > 7) return res.status(400).json({ error: 'Informe de 1 a 7 dias da semana' });
            if (!daysOfWeek.every(day => Number.isInteger(day) && day >= 0 && day <= 6)) return res.status(400).json({ error: 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)' });
            if (new Set(daysOfWeek).size !== daysOfWeek.length) return res.status(400).json({ error: 'Dias da semana repetidos' });
        }
        else if (dayOfWeek < 0 || dayOfWeek > 6) return res.status(400).json({ error: 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)' });

        if (!isValidSlotDuration(slotDuration)) return res.status(400).json({ error: 'Duração do slot deve ser 0 (sem intervalo) ou entre 5 e 480 minutos' });
        if ((lunchStart && !lunchEnd) || (!lunchStart && lunchEnd)) return res.status(400).json({ error: 'Informe início e fim do horário de almoço' });

        if (lunchStart && lunchEnd) 
        {
            const lunchStartMin = timeToMinutes(lunchStart);
            const lunchEndMin = timeToMinutes(lunchEnd);
            const startMin = timeToMinutes(startTime);
            const endMin = timeToMinutes(endTime);

            if (lunchStartMin >= lunchEndMin) return res.status(400).json({ error: 'Horário de início do almoço deve ser antes do fim' });
            if (lunchStartMin < startMin || lunchEndMin > endMin) return res.status(400).json({ error: 'Horário de almoço deve estar dentro do expediente' });
        }

        const normalizedLunchStart = lunchStart ? normalizeTime(lunchStart) : null;
        const normalizedLunchEnd = lunchEnd ? normalizeTime(lunchEnd) : null;

        if (isMultiple)
        {
            const connection = await pool.getConnection();

            try
            {
                await connection.beginTransaction();

                const [existing] = await connection.query('SELECT dayOfWeek, isActive FROM agendas WHERE userId = ? AND dayOfWeek IN (?) FOR UPDATE', [userId, daysOfWeek]);

                // Só agenda ativa conflita; dia removido (isActive = FALSE) é reativado com os novos dados
                const conflictDays = existing.filter(agenda => agenda.isActive !== 0).map(agenda => agenda.dayOfWeek).sort((a, b) => a - b);
                if (conflictDays.length > 0) return res.status(409).json({ error: 'Já existe agenda para alguns dos dias selecionados', conflictDays });

                const inactiveDays = new Set(existing.map(agenda => agenda.dayOfWeek));

                for (const day of daysOfWeek)
                {
                    if (inactiveDays.has(day))
                    {
                        await connection.query(`UPDATE agendas SET startTime = ?, endTime = ?, slotDuration = ?, lunchStart = ?, lunchEnd = ?, isActive = TRUE WHERE userId = ? AND dayOfWeek = ?`,
                            [normalizeTime(startTime), normalizeTime(endTime), slotDuration, normalizedLunchStart, normalizedLunchEnd, userId, day]);
                    }
                    else
                    {
                        await connection.query(`INSERT INTO agendas (userId, ownerId, dayOfWeek, startTime, endTime, slotDuration, lunchStart, lunchEnd) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [userId, ownerId, day, normalizeTime(startTime), normalizeTime(endTime), slotDuration, normalizedLunchStart, normalizedLunchEnd]);
                    }
                }

                const [agendas] = await connection.query('SELECT * FROM agendas WHERE userId = ? AND dayOfWeek IN (?) ORDER BY dayOfWeek', [userId, daysOfWeek]);

                await connection.commit();

                return res.status(201).json(agendas);
            }
            finally
            {
                await connection.rollback().catch(() => {});
                connection.release();
            }
        }

        await pool.query(`INSERT INTO agendas (userId, ownerId, dayOfWeek, startTime, endTime, slotDuration, lunchStart, lunchEnd) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE startTime = VALUES(startTime), endTime = VALUES(endTime), slotDuration = VALUES(slotDuration), lunchStart = VALUES(lunchStart),
                lunchEnd = VALUES(lunchEnd), isActive = TRUE`,
                [userId, ownerId, dayOfWeek, normalizeTime(startTime), normalizeTime(endTime), slotDuration, normalizedLunchStart, normalizedLunchEnd]);

        const [agenda] = await pool.query('SELECT * FROM agendas WHERE userId = ? AND dayOfWeek = ?', [userId, dayOfWeek]);

        res.status(201).json(agenda[0]);
    } 
    catch (error) 
    {
        console.error('Create agenda error:', error);
        res.status(500).json({ error: 'Erro ao criar agenda' });
    }
});

router.put('/:id', async (req, res) => 
{
    try 
    {
        const { id } = req.params;
        const { startTime, endTime, lunchStart, lunchEnd, slotDuration, isActive } = req.body;
        const userId = req.user.id;

        if (slotDuration != null && !isValidSlotDuration(slotDuration)) return res.status(400).json({ error: 'Duração do slot deve ser 0 (sem intervalo) ou entre 5 e 480 minutos' });

        const [existing] = await pool.query('SELECT id FROM agendas WHERE id = ? AND userId = ?', [id, userId]);

        if (existing.length === 0) return res.status(404).json({ error: 'Agenda não encontrada' });

        if (lunchStart && lunchEnd) 
        {
            const lunchStartMin = timeToMinutes(lunchStart);
            const lunchEndMin = timeToMinutes(lunchEnd);
            if (lunchStartMin >= lunchEndMin) return res.status(400).json({ error: 'Horário de início do almoço deve ser antes do fim' });
        }

        await pool.query(`UPDATE agendas SET startTime = COALESCE(?, startTime), endTime = COALESCE(?, endTime), lunchStart = ?, lunchEnd = ?,
            slotDuration = COALESCE(?, slotDuration), isActive = COALESCE(?, isActive) WHERE id = ? AND userId = ?`,
                [ startTime ? normalizeTime(startTime) : null, endTime ? normalizeTime(endTime) : null, lunchStart ? normalizeTime(lunchStart) : null,
                    lunchEnd ? normalizeTime(lunchEnd) : null, slotDuration, isActive, id, userId ]
        );

        const [updated] = await pool.query('SELECT * FROM agendas WHERE id = ?', [id]);

        res.json(updated[0]);
    } 
    catch (error) 
    {
        console.error('Update agenda error:', error);
        res.status(500).json({ error: 'Erro ao atualizar agenda' });
    }
});

router.post('/blocks', async (req, res) => 
{
    try 
    {
        const { blockDate, blockDateEnd, startTime, endTime, reason } = req.body;
        const userId = req.user.id;

        if (!blockDate) return res.status(400).json({ error: 'Data do bloqueio é obrigatória' });
        if (blockDateEnd && blockDateEnd < blockDate) return res.status(400).json({ error: 'Data final não pode ser anterior à data inicial' });

        const startDate = new Date(blockDate + 'T00:00:00');
        const endDate = blockDateEnd ? new Date(blockDateEnd + 'T00:00:00') : startDate;
        
        const createdBlocks = [];
        const skippedDates = [];
        
        for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) 
        {
            const dateStr = toLocalDateString(currentDate);
            const dayOfWeek = currentDate.getDay();

            const [agenda] = await pool.query('SELECT id FROM agendas WHERE userId = ? AND dayOfWeek = ? AND isActive = TRUE', [userId, dayOfWeek]);
            if (agenda.length === 0) { skippedDates.push(dateStr); continue; }

            const [existingBlock] = await pool.query('SELECT id FROM agenda_blocks WHERE userId = ? AND blockDate = ?', [userId, dateStr]);
            if (existingBlock.length > 0) { skippedDates.push(dateStr); continue; }

            const [result] = await pool.query(`INSERT INTO agenda_blocks (agendaId, userId, blockDate, blockDateEnd, startTime, endTime, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [agenda[0].id, userId, dateStr, blockDateEnd || null, startTime ? normalizeTime(startTime) : null, endTime ? normalizeTime(endTime) : null, reason || null]);

            const [block] = await pool.query('SELECT * FROM agenda_blocks WHERE id = ?', [result.insertId]);
            createdBlocks.push(block[0]);
        }

        if (createdBlocks.length === 0) return res.status(400).json({ error: 'Nenhum bloqueio criado. Verifique se você tem uma agenda configurada.', skippedDates });

        res.status(201).json({ ...createdBlocks[0], _meta: { totalCreated: createdBlocks.length, skippedDates: skippedDates.length > 0 ? skippedDates : undefined }});
    } 
    catch (error) 
    {
        console.error('Create block error:', error);
        res.status(500).json({ error: 'Erro ao criar bloqueio' });
    }
});

export default router;