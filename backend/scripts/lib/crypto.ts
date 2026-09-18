import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Chiffrement des sauvegardes (ENF-02 : un dump contient TOUTES les données personnelles).
 * AES-256-GCM, authentifié : un fichier altéré est refusé à la restauration.
 *
 * Format : « AFB1 » (4 octets) · IV (12) · données chiffrées · étiquette GCM (16).
 */
const MAGIC = Buffer.from('AFB1');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function parseKey(raw: string): Buffer {
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('BACKUP_ENCRYPTION_KEY doit être une clé de 32 octets encodée en base64 (openssl rand -base64 32)');
  }
  return key;
}

export async function encryptStreamToFile(source: Readable, target: string, key: Buffer): Promise<void> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const out = createWriteStream(target);
  out.write(Buffer.concat([MAGIC, iv]));
  await pipeline(source, cipher, out, { end: false });
  await new Promise<void>((resolve, reject) => {
    out.end(cipher.getAuthTag(), () => resolve());
    out.on('error', reject);
  });
}

/** Déchiffre vers un fichier en clair ; l'étiquette GCM est vérifiée AVANT tout usage du résultat. */
export async function decryptFileToFile(source: string, target: string, key: Buffer): Promise<void> {
  const { size } = await stat(source);
  const header = MAGIC.length + IV_LENGTH;
  if (size < header + TAG_LENGTH) throw new Error('Fichier de sauvegarde tronqué');

  const handle = await open(source, 'r');
  const head = Buffer.alloc(header);
  const tag = Buffer.alloc(TAG_LENGTH);
  await handle.read(head, 0, header, 0);
  await handle.read(tag, 0, TAG_LENGTH, size - TAG_LENGTH);
  await handle.close();
  if (!head.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Ce fichier n’est pas une sauvegarde ArchiFlow');

  const decipher = createDecipheriv('aes-256-gcm', key, head.subarray(MAGIC.length));
  decipher.setAuthTag(tag);
  await pipeline(
    createReadStream(source, { start: header, end: size - TAG_LENGTH - 1 }),
    decipher,
    new Transform({ transform: (chunk, _enc, cb) => cb(null, chunk) }),
    createWriteStream(target),
  );
}
