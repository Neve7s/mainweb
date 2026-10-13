import { app } from '../src/app';

// Login helper compartido por los tests de admin.
export async function adminCookie(): Promise<string> {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  if (res.status !== 200) throw new Error('login admin falló en tests');
  const setCookie = res.headers.get('set-cookie') ?? '';
  const token = setCookie.match(/token=([^;]+)/)?.[1] ?? '';
  return `token=${token}`;
}

export async function api(
  path: string,
  cookie: string,
  method = 'GET',
  body?: unknown,
) {
  const res = await app.request(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}
