/** Une version précise d'un pack. */
export interface PackRef {
  id: string;
  version: number;
}

/** Installation en cours : les fichiers restent invisibles jusqu'à `commit`. */
export interface PackInstall {
  write(path: string, bytes: Uint8Array): Promise<void>;
  /** Rend la version disponible d'un seul coup (déplacement du dossier). */
  commit(): Promise<void>;
  /** Abandonne et efface les fichiers déjà écrits. */
  abort(): Promise<void>;
}

/**
 * Packs téléchargés, rangés par version : packs/<id>/<version>/.
 * Seules les versions entièrement vérifiées y entrent (voir installer.ts).
 */
export interface PackStorage {
  list(): Promise<PackRef[]>;
  /** Contenu d'un fichier, ou `null` s'il manque. */
  readBytes(ref: PackRef, path: string): Promise<Uint8Array | null>;
  /** Taille d'un fichier en octets, ou `null` s'il manque. */
  fileSize(ref: PackRef, path: string): Promise<number | null>;
  /** Adresse locale du fichier, jouable par le lecteur audio. */
  uri(ref: PackRef, path: string): string;
  beginInstall(ref: PackRef): Promise<PackInstall>;
  remove(ref: PackRef): Promise<void>;
}

/** Télécharge un fichier et rend ses octets. Échoue si le serveur ne répond pas 200. */
export type FetchBytes = (url: string) => Promise<Uint8Array>;

/** Empreinte SHA-256 en hexadécimal minuscule. */
export type Sha256 = (bytes: Uint8Array) => Promise<string>;
