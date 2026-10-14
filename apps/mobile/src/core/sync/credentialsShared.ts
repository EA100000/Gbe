import { z } from 'zod';

const GuestCredentialsSchema = z.object({ userId: z.string().min(1), secret: z.string().min(20) });

/** Identifiants du compte invité, créés au premier envoi au serveur. */
export type GuestCredentials = z.infer<typeof GuestCredentialsSchema>;

export interface CredentialStore {
  load(): Promise<GuestCredentials | null>;
  save(credentials: GuestCredentials): Promise<void>;
  clear(): Promise<void>;
}

/** Relit des identifiants stockés ; `null` s'ils sont absents ou abîmés. */
export function parseCredentials(raw: string | null): GuestCredentials | null {
  if (raw === null || raw.length === 0) return null;
  try {
    const parsed = GuestCredentialsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Petit texte gardé dans le coffre-fort du téléphone (code de récupération). */
export interface SecretTextStore {
  load(): Promise<string | null>;
  save(value: string): Promise<void>;
  clear(): Promise<void>;
}
