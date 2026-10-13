import { afterEach, describe, expect, it } from 'vitest';
import { defaultFrom } from '../src/lib/resend';

const OLD = { RESEND_FROM: process.env.RESEND_FROM, APP_URL: process.env.APP_URL };

afterEach(() => {
  if (OLD.RESEND_FROM === undefined) delete process.env.RESEND_FROM;
  else process.env.RESEND_FROM = OLD.RESEND_FROM;
  if (OLD.APP_URL === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = OLD.APP_URL;
});

describe('defaultFrom', () => {
  it('arma remitente con marca y dominio de APP_URL', () => {
    delete process.env.RESEND_FROM;
    process.env.APP_URL = 'https://hieyson.com';
    expect(defaultFrom('HieysoN')).toBe('HieysoN <no-reply@hieyson.com>');
  });

  it('sanea nombre con caracteres raros', () => {
    delete process.env.RESEND_FROM;
    process.env.APP_URL = 'https://hieyson.com';
    expect(defaultFrom('Hiey<script>alert,son')).toBe('Hieyscriptalertson <no-reply@hieyson.com>');
    expect(defaultFrom('')).toBe('HieysoN <no-reply@hieyson.com>');
  });

  it('dominio inválido cae a hieyson.com', () => {
    delete process.env.RESEND_FROM;
    process.env.APP_URL = 'http://localhost:4321';
    expect(defaultFrom()).toBe('HieysoN <no-reply@hieyson.com>');
    process.env.APP_URL = 'no-es-url';
    expect(defaultFrom()).toBe('HieysoN <no-reply@hieyson.com>');
  });

  it('override válido se respeta, inválido se ignora', () => {
    process.env.APP_URL = 'https://hieyson.com';
    process.env.RESEND_FROM = 'Ventas <ventas@hieyson.com>';
    expect(defaultFrom('X')).toBe('Ventas <ventas@hieyson.com>');
    process.env.RESEND_FROM = 'cualquier-cosa-rara';
    expect(defaultFrom('X')).toBe('X <no-reply@hieyson.com>');
  });
});
