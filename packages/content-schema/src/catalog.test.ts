import { buildPack } from './__fixtures__/pack';
import {
  buildCatalog,
  catalogEntry,
  CatalogSchema,
  packPath,
  planUpload,
  type CatalogEntry,
} from './catalog';
import type { Manifest } from './schema';

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function manifestFor(bytes: number[]): Manifest {
  return {
    formatVersion: 1,
    packId: 'test-unit-01',
    version: 1,
    files: bytes.map((b, i) => ({ path: `audio/f${i}.m4a`, sha256: HASH_A, bytes: b })),
  };
}

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return { ...catalogEntry(buildPack(), manifestFor([10]), HASH_A), ...overrides };
}

describe('catalogue des packs', () => {
  it('décrit un pack publié : dossier versionné, empreinte du manifeste et taille totale', () => {
    // Préparer
    const pack = buildPack({ version: 3 });
    // Agir
    const result = catalogEntry(pack, manifestFor([100, 250]), HASH_B);
    // Vérifier
    expect(result).toEqual({
      id: 'test-unit-01',
      version: 3,
      formatVersion: 1,
      unitOrder: 1,
      title: 'Unité test',
      validated: false,
      path: 'packs/test-unit-01/3/',
      manifestSha256: HASH_B,
      bytes: 350,
    });
  });

  it('range les unités dans l’ordre du parcours', () => {
    const catalog = buildCatalog(
      [entry({ id: 'deux', unitOrder: 2, path: packPath('deux', 1) }), entry()],
      new Date(Date.UTC(2026, 9, 14, 10, 0)),
    );
    expect(catalog.packs.map((p) => p.id)).toEqual(['test-unit-01', 'deux']);
    expect(catalog.publishedAt).toBe('2026-10-14T10:00:00.000Z');
  });

  it('refuse un catalogue où un pack apparaît deux fois', () => {
    expect(() => buildCatalog([entry(), entry({ version: 2 })], new Date(0))).toThrow();
  });

  it('refuse un chemin qui sort du dossier des packs', () => {
    const catalog = { catalogVersion: 1, publishedAt: new Date(0).toISOString() };
    const bad = { ...catalog, packs: [entry({ path: '../secrets/' })] };
    expect(CatalogSchema.safeParse(bad).success).toBe(false);
    expect(CatalogSchema.safeParse({ ...catalog, packs: [entry()] }).success).toBe(true);
  });
});

describe('envoi au stockage', () => {
  it('n’envoie que les fichiers absents et laisse ceux déjà publiés à l’identique', () => {
    const local = new Map([
      ['packs/u01/1/pack.json', HASH_A],
      ['packs/u01/2/pack.json', HASH_B],
    ]);
    const remote = new Map([['packs/u01/1/pack.json', HASH_A]]);

    expect(planUpload(local, remote)).toEqual({
      upload: ['packs/u01/2/pack.json'],
      skip: ['packs/u01/1/pack.json'],
      conflicts: [],
    });
  });

  it('signale un conflit quand une version publiée changerait de contenu', () => {
    const local = new Map([['packs/u01/1/pack.json', HASH_B]]);
    const remote = new Map<string, string | null>([['packs/u01/1/pack.json', HASH_A]]);

    expect(planUpload(local, remote).conflicts).toEqual(['packs/u01/1/pack.json']);
  });

  it('traite un fichier distant sans empreinte connue comme un conflit', () => {
    const local = new Map([['packs/u01/1/pack.json', HASH_A]]);
    const remote = new Map<string, string | null>([['packs/u01/1/pack.json', null]]);

    expect(planUpload(local, remote).conflicts).toEqual(['packs/u01/1/pack.json']);
  });
});
