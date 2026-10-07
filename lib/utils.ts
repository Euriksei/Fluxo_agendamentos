type ClassValue = string | number | null | undefined | false | ClassValue[] | Record<string, unknown>;

// Lightweight cn() without clsx/tailwind-merge: joins truthy class names.
// It does not dedupe conflicting Tailwind utilities, so avoid passing overrides that clash with base classes.
export function cn(...inputs: ClassValue[]): string
{
    const out: string[] = [];

    const push = (value: ClassValue) =>
    {
        if (!value) return;
        if (typeof value === 'string' || typeof value === 'number') out.push(String(value));
        else if (Array.isArray(value)) value.forEach(push);
        else Object.entries(value).forEach(([key, on]) => { if (on) out.push(key); });
    };

    inputs.forEach(push);
    return out.join(' ');
}
