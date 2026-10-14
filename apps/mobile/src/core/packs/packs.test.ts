import { MANIFEST_FILE, PACK_FILE } from '@gbe/content-schema';

import {
  bundledPackJson,
  CDN,
  fakeCdn,
  memoryPackStorage,
  nodeSha256,
  publish,
} from '../../test-utils/packFixtures';
import { useContentStore } from '../content/contentStore';
import { decodeUtf8, sha256Hex } from './bytes';
import { installPack, type InstallDeps } from './installer';
import { choosePacks, loadInstalledPack } from './localPacks';
import { fetchCatalog, packsToDownload, packsUrl, updatePacks } from './packUpdater';

const encoder = new TextEncoder();

function setup(packs = [publish(bundledPackJson(2))]) {
  const cdn = fakeCdn(packs);
  const mem = memoryPackStorage();
  const deps: InstallDeps = {
    baseUrl: `${CDN}/`,
    fetchBytes: cdn.fetchBytes,
    sha256: nodeSha256,
    storage: mem.storage,
  };
  return { cdn, mem, deps, packs };
}

function first<T>(items: readonly T[]): T {
  const item = items[0];
  if (item === undefined) throw new Error('liste vide');
  return item;
}

describe('installation d’un pack téléchargé', () => {
  it('installe une version dont toutes les empreintes sont justes', async () => {
    // Préparer
    const { deps, mem, packs } = setup();
    const published = first(packs);
    // Agir
    const result = await installPack(published.entry, deps);
    // Vérifier
    expect(result).toEqual({ ok: true, ref: { id: 'u01-salutations', version: 2 } });
    const files = mem.installed.get('u01-salutations@2');
    expect(files?.size).toBe(published.files.size);
    expect(files?.has(MANIFEST_FILE)).toBe(true);
    expect(mem.staging.size).toBe(0);
  });

  it('refuse un manifeste dont l’empreinte ne correspond pas au catalogue', async () => {
    const { deps, mem, packs } = setup();
    const entry = { ...first(packs).entry, manifestSha256: 'f'.repeat(64) };

    const result = await installPack(entry, deps);

    expect(result).toMatchObject({ ok: false, reason: 'integrity' });
    expect(mem.installed.size).toBe(0);
  });

  it('refuse un audio altéré et n’installe rien', async () => {
    const { deps, mem, cdn, packs } = setup();
    const published = first(packs);
    cdn.urls.set(`${CDN}/${published.entry.path}audio/sin-n.m4a`, encoder.encode('piégé'));

    const result = await installPack(published.entry, deps);

    expect(result).toMatchObject({ ok: false, reason: 'integrity' });
    expect(mem.installed.size).toBe(0);
    expect(mem.staging.size).toBe(0);
  });

  it('signale une coupure réseau sans rien installer', async () => {
    const { deps, mem, cdn, packs } = setup();
    const published = first(packs);
    cdn.urls.delete(`${CDN}/${published.entry.path}audio/kwe-n.m4a`);

    const result = await installPack(published.entry, deps);

    expect(result).toMatchObject({ ok: false, reason: 'network' });
    expect(mem.installed.size).toBe(0);
  });

  it('refuse un manifeste qui décrit un autre pack', async () => {
    const { deps, packs } = setup();
    const entry = { ...first(packs).entry, version: 7 };

    expect(await installPack(entry, deps)).toMatchObject({ ok: false });
  });

  it('refuse un chemin de fichier qui sortirait du dossier du pack', async () => {
    const published = publish(bundledPackJson(2));
    const manifest = {
      ...published.manifest,
      files: [
        ...published.manifest.files,
        { path: '../evil.js', sha256: 'a'.repeat(64), bytes: 1 },
      ],
    };
    const manifestBytes = encoder.encode(JSON.stringify(manifest));
    published.files.set(MANIFEST_FILE, manifestBytes);
    const entry = { ...published.entry, manifestSha256: await nodeSha256(manifestBytes) };
    const { deps } = setup([{ ...published, entry }]);

    expect(await installPack(entry, deps)).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('refuse un pack.json qui ne respecte pas le format', async () => {
    const json = bundledPackJson(2);
    const published = publish(json);
    // pack.json cohérent avec le manifeste, mais invalide : le manifeste est recalculé.
    const broken = encoder.encode(JSON.stringify({ ...json, unit: { lessons: [] } }));
    published.files.set(PACK_FILE, broken);
    const manifest = {
      ...published.manifest,
      files: published.manifest.files.map((f) =>
        f.path === PACK_FILE ? { ...f, bytes: broken.length, sha256: '' } : f,
      ),
    };
    const packEntry = manifest.files.find((f) => f.path === PACK_FILE);
    if (packEntry !== undefined) packEntry.sha256 = await nodeSha256(broken);
    const manifestBytes = encoder.encode(JSON.stringify(manifest));
    published.files.set(MANIFEST_FILE, manifestBytes);
    const entry = { ...published.entry, manifestSha256: await nodeSha256(manifestBytes) };
    const { deps, mem } = setup([{ ...published, entry }]);

    expect(await installPack(entry, deps)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(mem.installed.size).toBe(0);
  });
});

describe('choix de la version utilisée', () => {
  async function installed(versions: number[]) {
    const { deps, mem } = setup(versions.map((v) => publish(bundledPackJson(v))));
    for (const v of versions) {
      const entry = publish(bundledPackJson(v)).entry;
      await installPack(entry, deps);
    }
    return { mem, local: { storage: mem.storage, sha256: nodeSha256 } };
  }

  it('relit une version installée et joue ses audios depuis le téléphone', async () => {
    const { local } = await installed([2]);

    const result = await loadInstalledPack({ id: 'u01-salutations', version: 2 }, local);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content.pack.version).toBe(2);
      expect([...result.content.audioSources.values()][0]).toMatch(/^file:\/\/\/packs\//);
    }
  });

  it('préfère la version téléchargée plus récente au pack embarqué', async () => {
    const { local } = await installed([2, 3]);
    const choice = await choosePacks([], local);
    expect(choice.contents.map((c) => c.pack.version)).toEqual([3]);
    expect(choice.obsolete).toEqual([{ id: 'u01-salutations', version: 2 }]);
  });

  it('écarte une version abîmée depuis son téléchargement', async () => {
    const { local, mem } = await installed([2]);
    mem.installed.get('u01-salutations@2')?.set(PACK_FILE, encoder.encode('{}'));

    const choice = await choosePacks([], local);

    expect(choice.contents).toEqual([]);
    expect(choice.obsolete).toEqual([{ id: 'u01-salutations', version: 2 }]);
  });

  it('écarte une version dont un audio a disparu', async () => {
    const { local, mem } = await installed([2]);
    mem.installed.get('u01-salutations@2')?.delete('audio/sin-n.m4a');

    expect((await choosePacks([], local)).contents).toEqual([]);
  });
});

describe('mise à jour depuis le catalogue', () => {
  it('ne télécharge que les versions plus récentes, dans un format connu', () => {
    const v2 = publish(bundledPackJson(2)).entry;
    const catalog = {
      catalogVersion: 1 as const,
      publishedAt: '2026-10-14T10:00:00.000Z',
      packs: [
        v2,
        { ...v2, id: 'u02-futur', unitOrder: 2, formatVersion: 99, path: 'packs/u02-futur/1/' },
      ],
    };

    expect(packsToDownload(catalog, [{ id: 'u01-salutations', version: 1 }])).toEqual([v2]);
    expect(packsToDownload(catalog, [{ id: 'u01-salutations', version: 2 }])).toEqual([]);
  });

  it('installe la nouvelle version et poursuit malgré un échec', async () => {
    const { deps, cdn } = setup([publish(bundledPackJson(2))]);
    const catalog = await fetchCatalog(CDN, cdn.fetchBytes);
    const broken = {
      ...first(catalog.packs),
      id: 'u02-absent',
      unitOrder: 2,
      path: 'packs/u02-absent/1/',
    };

    const report = await updatePacks({
      catalog: async () => ({ ...catalog, packs: [broken, ...catalog.packs] }),
      available: async () => [{ id: 'u01-salutations', version: 1 }],
      install: (entry) => installPack(entry, deps),
    });

    expect(report.installed).toEqual([{ id: 'u01-salutations', version: 2 }]);
    expect(report.failed).toEqual([{ ref: { id: 'u02-absent', version: 2 }, reason: 'network' }]);
  });

  it('ne retente pas une version refusée plus tôt', async () => {
    const { deps, cdn } = setup();
    const install = jest.fn((entry: Parameters<typeof installPack>[0]) => installPack(entry, deps));

    await updatePacks({
      catalog: () => fetchCatalog(CDN, cdn.fetchBytes),
      available: async () => [],
      skip: new Set(['u01-salutations@2']),
      install,
    });

    expect(install).not.toHaveBeenCalled();
  });

  it('refuse un catalogue mal formé', async () => {
    const cdn = fakeCdn([], { catalogVersion: 1, packs: 'rien' });
    await expect(fetchCatalog(CDN, cdn.fetchBytes)).rejects.toThrow();
  });

  it('reste désactivée sans adresse de catalogue', () => {
    expect(packsUrl(undefined)).toBeNull();
    expect(packsUrl(' ')).toBeNull();
    expect(packsUrl(' https://cdn.gbe.app/packs ')).toBe('https://cdn.gbe.app/packs');
  });
});

describe('magasin du contenu', () => {
  beforeEach(() => {
    useContentStore.setState({ status: 'idle', content: null, contents: [], pending: null });
  });

  it('démarre sur le pack embarqué quand rien n’est téléchargé', async () => {
    await useContentStore.getState().load(null);

    const state = useContentStore.getState();
    expect(state.status).toBe('ready');
    expect(state.content?.pack.id).toBe('u01-salutations');
    expect(state.content?.pack.version).toBe(1);
  });

  it('démarre sur la version téléchargée et efface les versions dépassées', async () => {
    const { deps, mem } = setup([publish(bundledPackJson(2)), publish(bundledPackJson(3))]);
    await installPack(publish(bundledPackJson(2)).entry, deps);
    await installPack(publish(bundledPackJson(3)).entry, deps);

    await useContentStore.getState().load({ storage: mem.storage, sha256: nodeSha256 });

    expect(useContentStore.getState().content?.pack.version).toBe(3);
    expect([...mem.installed.keys()]).toEqual(['u01-salutations@3']);
  });

  it('se rabat sur le pack embarqué si le stockage est illisible', async () => {
    const { mem } = setup();
    mem.storage.list = async () => {
      throw new Error('disque');
    };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await useContentStore.getState().load({ storage: mem.storage, sha256: nodeSha256 });

    expect(useContentStore.getState().content?.pack.version).toBe(1);
    warn.mockRestore();
  });

  it('garde une nouvelle version en attente jusqu’au moment sûr', async () => {
    const { deps, mem } = setup();
    const local = { storage: mem.storage, sha256: nodeSha256 };
    await useContentStore.getState().load(local);
    await installPack(publish(bundledPackJson(2)).entry, deps);

    await useContentStore.getState().refresh(local);
    expect(useContentStore.getState().content?.pack.version).toBe(1);
    expect(useContentStore.getState().pending?.[0]?.pack.version).toBe(2);

    useContentStore.getState().applyPending();
    expect(useContentStore.getState().content?.pack.version).toBe(2);
    expect(useContentStore.getState().pending).toBeNull();
  });

  it('ne prépare rien quand les versions n’ont pas changé', async () => {
    const { mem } = setup();
    const local = { storage: mem.storage, sha256: nodeSha256 };
    await useContentStore.getState().load(local);

    await useContentStore.getState().refresh(local);

    expect(useContentStore.getState().pending).toBeNull();
  });
});

describe('outils d’octets', () => {
  it('décode le fon en UTF-8, lettres spéciales et tons combinés compris', () => {
    const text = 'ɖɛ̀ɔ́ — Kwabɔ ! 😀';
    expect(decodeUtf8(encoder.encode(text))).toBe(text);
  });

  it('remplace une séquence invalide au lieu de planter', () => {
    const R = String.fromCodePoint(0xfffd);
    // Octet de tête sans suite valable, puis encodage trop long : chacun devient U+FFFD.
    expect(decodeUtf8(new Uint8Array([0x61, 0xc3, 0x28, 0xe0, 0x80, 0x80]))).toBe(`a${R}(${R}`);
  });

  it('calcule l’empreinte SHA-256 attendue', async () => {
    expect(await sha256Hex(encoder.encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
