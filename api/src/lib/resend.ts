// Envío de correos vía Resend (API REST, sin SDK).
// Sin RESEND_API_KEY no rompe nada: registra en el log y devuelve sent:false.

export function defaultFrom(brandName?: string): string {
  // Override explícito si algún día lo necesitas; si no, se arma solo.
  if (process.env.RESEND_FROM) return process.env.RESEND_FROM;
  let host = 'hieyson.com';
  try {
    host = new URL(process.env.APP_URL || 'http://localhost:4321').hostname;
  } catch {
    /* usa el default */
  }
  return `${brandName || 'HieysoN'} <no-reply@${host}>`;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from?: string,
): Promise<{ sent: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[resend] sin RESEND_API_KEY — no enviado a ${to}. Asunto: ${subject}`);
    return { sent: false };
  }
  const sender = from || defaultFrom();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: sender, to: [to], subject, html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    console.error('[resend] error', res.status, t.slice(0, 200));
    return { sent: false };
  }
  const j = (await res.json()) as { id?: string };
  return { sent: true, id: j.id };
}

export function resetLink(token: string): string {
  const base = (process.env.APP_URL || 'http://localhost:4321').replace(/\/$/, '');
  return `${base}/admin/reset?token=${token}`;
}

export async function sendResetEmail(to: string, token: string, brandName?: string) {
  const link = resetLink(token);
  return sendEmail(
    to,
    'Recupera tu acceso — HieysoN Admin',
    `<p>Hola,</p><p>Pediste restablecer tu contraseña del panel HieysoN. Haz clic aquí (vence en 1 hora, un solo uso):</p><p><a href="${link}">${link}</a></p><p>Si no fuiste tú, ignora este correo.</p>`,
    defaultFrom(brandName),
  );
}
