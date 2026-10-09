export function normalizeTime(time) 
{
    if (!time) return '00:00:00';
    const str = time.toString();
    if (str.match(/^\d{2}:\d{2}:\d{2}$/)) return str;
    if (str.match(/^\d{2}:\d{2}$/)) return str + ':00';
    if (str.match(/^\d{1}:\d{2}$/)) return '0' + str + ':00';
    return str;
}

export function timeToMinutes(time) 
{
    if (!time) return 0;
    const str = normalizeTime(time.toString());
    const parts = str.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function minutesToTime(minutes) 
{
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

export function addMinutesToTime(time, minutesToAdd) 
{
    const totalMinutes = timeToMinutes(time) + minutesToAdd;
    return minutesToTime(totalMinutes);
}

export function isTimeOverlap(start1, end1, start2, end2) 
{
    const s1 = timeToMinutes(start1);
    const e1 = timeToMinutes(end1);
    const s2 = timeToMinutes(start2);
    const e2 = timeToMinutes(end2);
    return s1 < e2 && e1 > s2;
}

export function isInLunchTime(slotStart, slotEnd, lunchStart, lunchEnd) 
{
    if (!lunchStart || !lunchEnd) return false;
    return isTimeOverlap(slotStart, slotEnd, lunchStart, lunchEnd);
}

export const DEFAULT_SLOT_DURATION = 30;

// 0 = sem intervalo fixo: o passo passa a ser a duração do serviço
export function isValidSlotDuration(value)
{
    return Number.isInteger(value) && (value === 0 || (value >= 5 && value <= 480));
}