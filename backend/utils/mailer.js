import nodemailer from 'nodemailer';

// Envio de email por SMTP (pensado para Gmail com senha de app: smtp.gmail.com, 465, SMTP_SECURE=true).
// As variáveis são lidas na hora do envio (não no import): o dotenv do app.js roda depois dos imports.

let transporter = null;
let transporterKey = null;

const getConfig = () =>
{
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

    return {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || (secure ? 465 : 587),
        secure,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.MAIL_FROM || process.env.SMTP_USER
    };
};

const getTransporter = (config) =>
{
    const key = `${config.host}|${config.port}|${config.secure}|${config.user}`;
    if (transporter && transporterKey === key) return transporter;

    transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        ...(config.user && { auth: { user: config.user, pass: config.pass } }),
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000
    });
    transporterKey = key;

    return transporter;
};

export const isMailConfigured = () => Boolean(getConfig().host);

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatValidity = (minutes) => minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} hora${minutes > 60 ? 's' : ''}` : `${minutes} minutos`;

// Email transacional com um botão de ação: mesmo layout para redefinição de senha e confirmação de cadastro
const renderActionEmail = ({ title, greeting, intro, action, actionLabel, link, validity, ignoreNote }) =>
{
    const safeLink = escapeHtml(link);

    const text = [
        `${greeting}, ${intro}`,
        '',
        `${action} acesse o link abaixo:`,
        link,
        '',
        `O link vale por ${validity} e só pode ser usado uma vez.`,
        ignoreNote,
        '',
        'Equipe Fluxo'
    ].join('\n');

    const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:#0F0F14;font-family:Arial,Helvetica,sans-serif;color:#E5E7EB;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#1A1A24;border-radius:12px;">
        <tr><td style="padding:32px 28px;">
            <h1 style="margin:0 0 16px;font-size:22px;color:#FFFFFF;">${escapeHtml(title)}</h1>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(greeting)}, ${escapeHtml(intro)}</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">Clique no botão abaixo.</p>
            <p style="margin:0 0 24px;text-align:center;">
                <a href="${safeLink}" style="display:inline-block;padding:14px 28px;background:#7C3AED;color:#FFFFFF;text-decoration:none;font-weight:bold;border-radius:10px;font-size:15px;">${escapeHtml(actionLabel)}</a>
            </p>
            <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#9CA3AF;">O link vale por ${validity} e só pode ser usado uma vez. Se o botão não funcionar, copie e cole este endereço no navegador:</p>
            <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${safeLink}" style="color:#A78BFA;">${safeLink}</a></p>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#9CA3AF;">${escapeHtml(ignoreNote)}</p>
        </td></tr>
    </table>
</body>
</html>`;

    return { text, html };
};

const firstNameOf = (name) => String(name || '').trim().split(/\s+/)[0] || 'Olá';

// Retorna true se o email saiu. Sem SMTP: em dev loga o link no console; em produção loga erro (a API responde igual).
async function sendActionEmail({ to, subject, kind, link, content })
{
    const config = getConfig();

    if (!config.host)
    {
        if (process.env.NODE_ENV === 'production') console.error(`[mailer] SMTP não configurado (SMTP_HOST vazio): email de ${kind} não enviado.`);
        else console.log(`[mailer] SMTP não configurado. Link de ${kind} para ${to}: ${link}`);
        return false;
    }

    try
    {
        await getTransporter(config).sendMail({ from: config.from, to, subject, ...content });
        return true;
    }
    catch (error)
    {
        // Só a mensagem: o objeto de erro do nodemailer pode carregar a configuração de autenticação
        console.error(`[mailer] Falha ao enviar email de ${kind}:`, error.message);
        return false;
    }
}

export const sendPasswordResetEmail = ({ to, name, link, expiresInMinutes = 60 }) => sendActionEmail({
    to, link, kind: 'redefinição de senha', subject: 'Redefinição de senha - Fluxo',
    content: renderActionEmail({
        title: 'Redefinição de senha',
        greeting: firstNameOf(name),
        intro: 'recebemos um pedido para redefinir a senha da sua conta no Fluxo.',
        action: 'Para criar uma nova senha,',
        actionLabel: 'Redefinir senha',
        link,
        validity: formatValidity(expiresInMinutes),
        ignoreNote: 'Se você não pediu a redefinição, ignore este email: sua senha continua a mesma.'
    })
});

export const sendEmailVerificationEmail = ({ to, name, link, expiresInMinutes = 24 * 60 }) => sendActionEmail({
    to, link, kind: 'confirmação de email', subject: 'Confirme seu email - Fluxo',
    content: renderActionEmail({
        title: 'Confirme seu email',
        greeting: firstNameOf(name),
        intro: 'falta só um passo para começar a usar o Fluxo: confirmar que este email é seu.',
        action: 'Para confirmar,',
        actionLabel: 'Confirmar email',
        link,
        validity: formatValidity(expiresInMinutes),
        ignoreNote: 'Se você não criou uma conta no Fluxo, ignore este email.'
    })
});
