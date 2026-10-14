/**
 * Envoie dist-packs/ sur un stockage compatible S3 (MinIO en local, ou le stockage de production).
 *
 * - Les fichiers de packs sont immuables : déjà présents à l'identique → ignorés ;
 *   présents avec un autre contenu → arrêt (il faut augmenter la version du pack).
 * - catalog.json est envoyé en dernier, pour ne jamais annoncer un pack incomplet.
 *
 * Variables : S3_ENDPOINT (vide = AWS), S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
 * Usage : npm run packs:upload [-- --dir dist-packs] [--dry-run]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import {
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { CATALOG_FILE, planUpload } from '@gbe/content-schema';

import { ROOT, sha256File, TEST_MARKER_FILE } from './lib/packs';

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: join(ROOT, 'dist-packs') },
    'dry-run': { type: 'boolean', default: false },
  },
});
const dir = resolve(values.dir);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) throw new Error(`Variable manquante : ${name}`);
  return value;
}

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.m4a': 'audio/mp4',
};
const IMMUTABLE = 'public, max-age=31536000, immutable';
const CATALOG_CACHE = 'public, max-age=300';

function listFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((path) => statSync(join(root, path)).isFile())
    .map((path) => path.split('\\').join('/'));
}

async function remoteSha256(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<string | null | undefined> {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return head.Metadata?.sha256 ?? null;
  } catch (error) {
    if (error instanceof NotFound) return undefined;
    if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404)
      return undefined;
    throw error;
  }
}

async function main(): Promise<void> {
  const files = listFiles(dir);
  if (!files.includes(CATALOG_FILE))
    throw new Error(`${CATALOG_FILE} absent : lance npm run packs:publish`);
  if (files.includes(TEST_MARKER_FILE)) {
    throw new Error('Ce dossier contient une version de test (--test-version) : envoi refusé.');
  }

  const bucket = requireEnv('S3_BUCKET');
  const client = new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
    },
  });

  const local = new Map(
    files.filter((f) => f !== CATALOG_FILE).map((f) => [f, sha256File(join(dir, f))] as const),
  );
  const remote = new Map<string, string | null>();
  for (const key of local.keys()) {
    const sha = await remoteSha256(client, bucket, key);
    if (sha !== undefined) remote.set(key, sha);
  }

  const plan = planUpload(local, remote);
  if (plan.conflicts.length > 0) {
    console.error(
      '✗ Ces fichiers sont déjà publiés avec un autre contenu (augmente la version du pack) :',
    );
    for (const key of plan.conflicts) console.error(`   - ${key}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${plan.upload.length} fichier(s) à envoyer, ${plan.skip.length} déjà en ligne.`);
  if (values['dry-run']) return;

  const put = async (key: string, cacheControl: string, sha256: string) => {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: readFileSync(join(dir, key)),
        ContentType: CONTENT_TYPES[extname(key)] ?? 'application/octet-stream',
        CacheControl: cacheControl,
        Metadata: { sha256 },
      }),
    );
    console.log(`  ↑ ${key}`);
  };
  for (const key of plan.upload) await put(key, IMMUTABLE, local.get(key) ?? '');
  await put(CATALOG_FILE, CATALOG_CACHE, sha256File(join(dir, CATALOG_FILE)));
  console.log(`✓ Catalogue publié dans ${bucket} (${relative(ROOT, dir)})`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
