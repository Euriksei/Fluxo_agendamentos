import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { useApi, notifySuccess } from '@/hooks/useApi';

import Button from '@/components/ui/Button';
import ResponsiveModal from '@/components/ui/ResponsiveModal';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';

// Same rule as the register form and the API (backend/utils/validations.js)
const PASSWORD_MIN_LENGTH = 8;

const EMPTY_FORM = { currentPassword: '', newPassword: '', confPassword: '' };

/** "Alterar senha" for any logged-in profile (owner, employee, admin). Opened from the sidebar. */
export default function AlterarSenhaModal({ onClose }: { onClose: () => void })
{
    const { authRequest } = useApi();

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setForm((prev) => ({ ...prev, [name]: value })); };

    const newTooShort = form.newPassword.length > 0 && form.newPassword.length < PASSWORD_MIN_LENGTH;
    const sameAsCurrent = form.newPassword.length > 0 && form.newPassword === form.currentPassword;
    const mismatch = form.confPassword.length > 0 && form.newPassword !== form.confPassword;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) =>
    {
        e.preventDefault();
        setFormError(null);

        if (newTooShort || sameAsCurrent || mismatch) return;

        setSaving(true);

        try
        {
            const data = await authRequest('/api/auth/password', { method: 'PUT', body: JSON.stringify(form), silent: true });
            // The change ends every other session (tokens issued before it); this one keeps going with the new token
            if (data.token) localStorage.setItem('token', data.token);
            notifySuccess('Senha alterada com sucesso');
            onClose();
        }
        catch (err)
        {
            setFormError(err instanceof TypeError ? 'Falha de conexão. Verifique sua internet e tente novamente.' : err.message);
        }
        finally
        {
            setSaving(false);
        }
    };

    const newHint = sameAsCurrent ? 'A nova senha deve ser diferente da atual' : `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`;

    return (
        <ResponsiveModal title="Alterar senha" onClose={onClose} onSubmit={handleSubmit}
            footer={
                <>
                    <Button type="button" variant="outline" onClick={onClose} fullWidth>Cancelar</Button>
                    <Button type="submit" disabled={saving} aria-busy={saving} fullWidth>
                        {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                        {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                </>
            }
        >
            <div className="grid gap-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required
                    value={form.currentPassword} onChange={handleChange} placeholder="••••••••" />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH}
                    value={form.newPassword} onChange={handleChange} placeholder="••••••••"
                    aria-invalid={newTooShort || sameAsCurrent || undefined} aria-describedby="newPassword-hint" />
                <p id="newPassword-hint" className={`text-xs ${newTooShort || sameAsCurrent ? 'text-red-400' : 'text-brand-gray'}`}>{newHint}</p>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="confPassword">Confirmar nova senha</Label>
                <Input id="confPassword" name="confPassword" type="password" autoComplete="new-password" required
                    value={form.confPassword} onChange={handleChange} placeholder="••••••••"
                    aria-invalid={mismatch || undefined} aria-describedby={mismatch ? 'confPassword-error' : undefined} />
                {mismatch && <p id="confPassword-error" role="alert" className="text-sm text-red-400">As senhas não coincidem</p>}
            </div>

            {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
        </ResponsiveModal>
    );
}
