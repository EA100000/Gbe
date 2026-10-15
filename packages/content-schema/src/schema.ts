import { z } from 'zod';

/** Versions du format de pack que ce code sait lire. */
export const SUPPORTED_FORMAT_VERSIONS = [1] as const;

/** Identifiant stable : minuscules, chiffres, tirets et soulignés. */
export const IdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]*$/, { error: 'Identifiant invalide (a-z, 0-9, _ et - uniquement)' });

const isNfc = (value: string): boolean => value === value.normalize('NFC');

/**
 * Texte en fon : non vide, déjà normalisé en Unicode NFC.
 * Sans NFC, deux mots identiques à l'écran peuvent être jugés différents.
 */
export const FonTextSchema = z
  .string()
  .trim()
  .min(1, { error: 'Texte fon vide' })
  .refine(isNfc, { error: 'Texte fon non normalisé en NFC' });

/** Texte français affiché à l'apprenant. */
export const FrTextSchema = z.string().trim().min(1, { error: 'Texte français vide' });

/**
 * Texte mixte : une suite de morceaux en français ou en fon.
 * Permet d'afficher « sɔ veut dire hier » avec la police et la langue du fon sur « sɔ ».
 */
export const RichTextSchema = z
  .array(
    z.union([
      z.object({ fr: z.string().min(1) }).strict(),
      z.object({ fon: FonTextSchema }).strict(),
    ]),
  )
  .min(1);

/** Les deux voix des experts : A, la voix d'homme ; B, la voix de femme (ADR 0016). */
export const VoiceSchema = z.enum(['A', 'B']);
export const SpeedSchema = z.enum(['normal', 'slow']);

export const AudioSchema = z.object({
  id: IdSchema,
  /** Chemin relatif au dossier du pack, par exemple `audio/sin_normal.m4a`. */
  file: z.string().regex(/^audio\/[a-z0-9_.-]+\.m4a$/, { error: 'Fichier audio invalide' }),
  voice: VoiceSchema,
  speed: SpeedSchema,
  durationMs: z.number().int().positive(),
  /**
   * Prises interchangeables du même texte, dites par l'autre voix : même groupe, même vitesse.
   * L'appli alterne entre elles. Absent : l'audio est seul (une seule voix).
   */
  group: IdSchema.optional(),
});

export const IllustrationSchema = z.object({
  id: IdSchema,
  /** Dessin SVG autonome, léger, sans script. */
  svg: z
    .string()
    .startsWith('<svg', { error: 'Illustration : doit commencer par <svg' })
    .max(20_000, { error: 'Illustration trop lourde (20 000 caractères au plus)' })
    .refine((s) => !/<script/i.test(s), { error: 'Illustration : script interdit' }),
});

export const AudioPairSchema = z
  .object({ normal: IdSchema.optional(), slow: IdSchema.optional() })
  .strict();

export const LexiconItemSchema = z.object({
  id: IdSchema,
  fon: FonTextSchema,
  fr: FrTextSchema,
  /** Précision affichée entre parenthèses, par exemple « les cauris servaient de monnaie ». */
  note: z.string().optional(),
  illustration: IdSchema.optional(),
  audio: AudioPairSchema.optional(),
});

/** Étiquette au-dessus de la consigne : « Nouveau mot », « Révision · les nombres ». */
export const ExerciseTagSchema = z.object({
  kind: z.enum(['new', 'review']),
  labelFr: FrTextSchema,
});

const exerciseBase = {
  id: IdSchema,
  tag: ExerciseTagSchema.optional(),
};

const ImageChoiceSchema = z.object({
  ...exerciseBase,
  type: z.literal('image_choice'),
  promptFr: FrTextSchema,
  /** Identifiants d'éléments du lexique, chacun avec une illustration. */
  choices: z.array(IdSchema).min(2).max(4),
  answer: IdSchema,
});

const BuildSentenceSchema = z.object({
  ...exerciseBase,
  type: z.literal('build_sentence'),
  promptFr: FrTextSchema,
  sentenceFr: FrTextSchema,
  /** Les tuiles de la bonne réponse, dans l'ordre. */
  solution: z.array(FonTextSchema).min(1),
  /** Phrase complète affichée après correction, ponctuation comprise. */
  answerFon: FonTextSchema.optional(),
  distractors: z.array(FonTextSchema),
  audio: IdSchema.optional(),
  /** Complément affiché quand la réponse est juste. */
  noteFr: FrTextSchema.optional(),
});

const MatchPairsSchema = z.object({
  ...exerciseBase,
  type: z.literal('match_pairs'),
  promptFr: FrTextSchema,
  pairs: z
    .array(z.object({ fon: FonTextSchema, fr: FrTextSchema, audio: IdSchema.optional() }))
    .min(3)
    .max(6),
  noteFr: FrTextSchema.optional(),
});

export const StoryLineSchema = z.object({
  speaker: z.enum(['vendor', 'learner']),
  fon: FonTextSchema.optional(),
  fr: FrTextSchema.optional(),
  audio: IdSchema.optional(),
  /** Réplique à écouter sans transcription (exercice d'écoute). */
  audioOnly: z.boolean().optional(),
  hintFr: z.string().optional(),
});

const StorySchema = z.object({
  ...exerciseBase,
  type: z.literal('story'),
  title: FrTextSchema,
  setting: FrTextSchema,
  lines: z.array(StoryLineSchema).min(1),
  question: z.object({
    promptFr: FrTextSchema,
    /** Titre affiché quand l'apprenant trouve la bonne réplique. */
    successFr: FrTextSchema,
    choices: z
      .array(z.object({ fon: FonTextSchema, correct: z.boolean(), explanation: RichTextSchema }))
      .min(2)
      .max(4),
  }),
});

const PronunciationSchema = z.object({
  ...exerciseBase,
  type: z.literal('pronunciation'),
  promptFr: FrTextSchema,
  item: IdSchema,
});

export const ExerciseSchema = z.discriminatedUnion('type', [
  ImageChoiceSchema,
  BuildSentenceSchema,
  MatchPairsSchema,
  StorySchema,
  PronunciationSchema,
]);

export const LessonSchema = z.object({
  id: IdSchema,
  kind: z.enum(['standard', 'story']),
  title: FrTextSchema,
  /** Phrase de l'écran « Leçon terminée » : ce que l'apprenant sait faire. */
  summaryFr: FrTextSchema.optional(),
  exercises: z.array(ExerciseSchema).min(1),
});

export const UnitSchema = z.object({
  id: IdSchema,
  order: z.number().int().positive(),
  title: FrTextSchema,
  subtitle: FrTextSchema,
  lessons: z.array(LessonSchema).min(1),
});

export const LetterCardSchema = z.object({
  symbol: FonTextSchema,
  exampleFon: FonTextSchema,
  exampleFr: FrTextSchema,
  audio: IdSchema.optional(),
});

export const SoundsGuideSchema = z.object({
  letters: z.array(LetterCardSchema),
  lettersTip: RichTextSchema.optional(),
  nasals: z.array(z.object({ symbol: FonTextSchema, audio: IdSchema.optional() })),
  nasalExamples: z.array(z.object({ fon: FonTextSchema, fr: FrTextSchema })),
  tones: z.array(
    z.object({
      mark: FonTextSchema,
      nameFr: FrTextSchema,
      contour: z.enum(['high', 'low', 'rising', 'falling']),
    }),
  ),
  funFact: RichTextSchema.optional(),
});

/** Petites expressions en fon utilisées par l'interface (accueil, félicitations). */
export const UiFonSchema = z
  .object({ greeting: FonTextSchema.optional(), approval: FonTextSchema.optional() })
  .strict();

export const PackSchema = z.object({
  formatVersion: z.number().int().positive(),
  id: IdSchema,
  version: z.number().int().positive(),
  /** `false` tant que les deux experts n'ont pas validé le contenu. */
  validated: z.boolean(),
  unit: UnitSchema,
  items: z.array(LexiconItemSchema),
  audios: z.array(AudioSchema),
  illustrations: z.array(IllustrationSchema),
  sounds: SoundsGuideSchema.optional(),
  uiFon: UiFonSchema.optional(),
});

export const ManifestSchema = z.object({
  formatVersion: z.number().int().positive(),
  packId: IdSchema,
  version: z.number().int().positive(),
  files: z
    .array(
      z.object({
        path: z.string().min(1),
        sha256: z.string().regex(/^[a-f0-9]{64}$/, { error: 'Empreinte SHA-256 invalide' }),
        bytes: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export type RichText = z.infer<typeof RichTextSchema>;
export type Audio = z.infer<typeof AudioSchema>;
export type Illustration = z.infer<typeof IllustrationSchema>;
export type LexiconItem = z.infer<typeof LexiconItemSchema>;
export type ExerciseTag = z.infer<typeof ExerciseTagSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseType = Exercise['type'];
export type ImageChoiceExercise = z.infer<typeof ImageChoiceSchema>;
export type BuildSentenceExercise = z.infer<typeof BuildSentenceSchema>;
export type MatchPairsExercise = z.infer<typeof MatchPairsSchema>;
export type StoryExercise = z.infer<typeof StorySchema>;
export type StoryLine = z.infer<typeof StoryLineSchema>;
export type PronunciationExercise = z.infer<typeof PronunciationSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type LetterCard = z.infer<typeof LetterCardSchema>;
export type SoundsGuide = z.infer<typeof SoundsGuideSchema>;
export type UiFon = z.infer<typeof UiFonSchema>;
export type Pack = z.infer<typeof PackSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
