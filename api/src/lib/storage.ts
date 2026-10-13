import * as fs from 'fs/promises';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';

export interface StoredFile {
  url: string;
  public_id: string | null;
}

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MAX_BYTES = 8 * 1024 * 1024;
export const UPLOAD_TIPOS = ['servicios', 'proyectos', 'blog', 'noticias', 'brand', 'misc'] as const;

export function driver(): 'local' | 'cloudinary' {
  return process.env.STORAGE_DRIVER === 'cloudinary' ? 'cloudinary' : 'local';
}

function extOf(name: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_EXT.has(ext) ? ext : null;
}

export function validateUpload(
  tipoRaw: unknown,
  filename: string,
  size: number,
): { tipo: string; ext: string } | { error: string } {
  const tipo =
    typeof tipoRaw === 'string' &&
    (UPLOAD_TIPOS as readonly string[]).includes(tipoRaw)
      ? tipoRaw
      : 'misc';
  const ext = extOf(filename);
  if (!ext) return { error: 'Tipo de archivo no permitido (solo jpg, png, webp)' };
  if (size === 0) return { error: 'Archivo vacío' };
  if (size > MAX_BYTES) return { error: 'Archivo mayor a 8MB' };
  return { tipo, ext };
}

export async function saveUpload(
  tipo: string,
  ext: string,
  bytes: Uint8Array,
): Promise<StoredFile> {
  if (driver() === 'cloudinary') return saveCloudinary(tipo, bytes);
  // Local: UPLOAD_DIR relativo al cwd del api (api/uploads en dev).
  const dir = process.env.UPLOAD_DIR || 'uploads';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const rel = `${tipo}/${name}`;
  await fs.mkdir(path.join(dir, tipo), { recursive: true });
  await fs.writeFile(path.join(dir, rel), bytes);
  return { url: `/uploads/${rel}`, public_id: null };
}

function cloudinaryCfg() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function saveCloudinary(tipo: string, bytes: Uint8Array): Promise<StoredFile> {
  cloudinaryCfg();
  const folder = `${process.env.CLOUDINARY_FOLDER || 'hieyson'}/${tipo}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ width: 1600, crop: 'limit', fetch_format: 'auto', quality: 'auto' }],
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Cloudinary sin respuesta'));
        resolve({ url: result.secure_url, public_id: result.public_id });
      },
    );
    stream.end(Buffer.from(bytes));
  });
}

export async function removeUpload(publicId: string | null, url: string): Promise<void> {
  if (publicId) {
    cloudinaryCfg();
    await cloudinary.uploader.destroy(publicId);
    return;
  }
  if (url.startsWith('/uploads/')) {
    const dir = process.env.UPLOAD_DIR || 'uploads';
    const rel = url.replace('/uploads/', '');
    if (!rel.includes('..')) {
      await fs.unlink(path.join(dir, rel)).catch(() => undefined);
    }
  }
}
