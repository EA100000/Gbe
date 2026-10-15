import { IdSchema } from '@gbe/content-schema';
import { z } from 'zod';

import { COLUMNS, QUESTION_FIELDS, SHEETS, UNIT_FIELDS } from './workbook';

/**
 * Bon de commande d'une unité : ce qui est prévu en français, avant que les experts
 * écrivent le fon. Aucun texte fon ici : c'est précisément ce qu'on leur demande.
 */
export const UnitPlanSchema = z
  .object({
    unit: z.object({
      id: IdSchema,
      pack: IdSchema,
      order: z.number().int().positive(),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      /** Notion de grammaire visée : une indication pour les experts, jamais affichée dans l'appli. */
      grammar: z.string().min(1).optional(),
    }),
    lessons: z
      .array(
        z.object({
          ref: IdSchema,
          type: z.enum(['leçon', 'révision', 'histoire']),
          title: z.string().min(1),
          summary: z.string().min(1).optional(),
        }),
      )
      .min(1),
    words: z
      .array(
        z.object({
          lesson: IdSchema,
          ref: IdSchema,
          fr: z.string().min(1),
          image: z.boolean().default(false),
          note: z.string().min(1).optional(),
        }),
      )
      .default([]),
    sentences: z
      .array(
        z.object({
          lesson: IdSchema,
          ref: IdSchema,
          fr: z.string().min(1),
          note: z.string().min(1).optional(),
        }),
      )
      .default([]),
    story: z
      .object({
        title: z.string().min(1),
        setting: z.string().min(1),
        prompt: z.string().min(1),
        success: z.string().min(1),
        lines: z
          .array(
            z.object({
              speaker: z.enum(['vendeuse', 'apprenant']),
              fr: z.string().min(1),
              audioOnly: z.boolean().default(false),
              hint: z.string().min(1).optional(),
            }),
          )
          .min(1),
        choices: z
          .array(z.object({ meaning: z.string().min(1), correct: z.boolean() }))
          .min(2)
          .max(4),
      })
      .optional(),
  })
  .strict();

export type UnitPlan = z.infer<typeof UnitPlanSchema>;

/** Rôle d'une cellule dans le modèle, traduit en mise en forme par l'outil qui écrit le fichier. */
export type CellStyle = 'title' | 'header' | 'todo' | 'given' | 'text';

export interface TemplateCell {
  value: string;
  style?: CellStyle;
}

export interface TemplateSheet {
  name: string;
  /** Largeur de chaque colonne, en caractères. */
  widths: number[];
  rows: TemplateCell[][];
}

/** Mode d'emploi, en tête du classeur. Les experts le lisent avant tout le reste. */
export const GUIDE: readonly string[] = [
  'Ce classeur décrit une unité de Gbè. Vous remplissez les cases jaunes (le fon) ; le reste est une proposition que vous pouvez modifier.',
  'Écrivez le fon avec tous ses tons, exactement comme il doit s’afficher dans l’application.',
  'Mots : un mot ou une expression courte par ligne. « Image : oui » signifie que l’application montre un dessin (nous le dessinons).',
  'Phrases : la phrase complète, avec sa ponctuation. L’apprenant la reconstruit mot par mot. Si plusieurs mots doivent rester ensemble, écrivez le découpage dans « Tuiles », séparé par des / (exemple : mot1 mot2 / mot3).',
  'Histoire : une réplique par ligne, dans l’ordre. « Écoute seule : oui » signifie que la réplique est seulement entendue, sans texte affiché (exercice d’écoute).',
  'Choix : 2 à 4 réponses possibles à la question de l’histoire, dont au moins une bonne. Dans « Explication », mettez les mots fon entre [crochets] ; si vous la laissez vide, l’application affiche le sens en français.',
  'Vous pouvez ajouter, retirer ou modifier des lignes. Ne changez pas les noms des feuilles ni les titres des colonnes. La colonne « Remarques » est pour vous : elle n’est pas importée.',
  'Quand vous avez fini et relu tous les deux, écrivez « oui » dans « Validé par les deux experts », feuille Unité.',
  'Ensuite, nous vous envoyons la liste des enregistrements : chaque mot et chaque phrase en vitesse normale et lente (voix A), les répliques de l’histoire (voix A pour l’apprenant, voix B pour la vendeuse).',
];

/** Ligne d'information de la feuille Unité, lue par les experts et ignorée à l'import. */
export const GRAMMAR_FIELD = 'Notion de grammaire visée (pour les experts, non importée)';

const header = (labels: readonly string[]): TemplateCell[] =>
  labels.map((value) => ({ value, style: 'header' }));
const given = (value: string | undefined): TemplateCell => ({ value: value ?? '', style: 'given' });
const todo: TemplateCell = { value: '', style: 'todo' };
const blank: TemplateCell = { value: '' };
const yesNo = (value: boolean) => given(value ? 'oui' : 'non');

/** Feuilles du classeur d'une unité, préremplies avec le bon de commande s'il y en a un. */
export function buildTemplate(plan?: UnitPlan): TemplateSheet[] {
  const unit = plan?.unit;
  const story = plan?.story;
  return [
    {
      name: SHEETS.guide,
      widths: [120],
      rows: [
        [
          {
            value: `Gbè · ${unit === undefined ? 'nouvelle unité' : `unité ${unit.order}, ${unit.title}`}`,
            style: 'title',
          },
        ],
        ...GUIDE.map((line) => [{ value: line, style: 'text' as const }]),
      ],
    },
    {
      name: SHEETS.unit,
      widths: [40, 50],
      rows: [
        header(['Champ', 'Valeur']),
        [given(UNIT_FIELDS.id), given(unit?.id)],
        [given(UNIT_FIELDS.pack), given(unit?.pack)],
        [given(UNIT_FIELDS.order), given(unit === undefined ? '' : String(unit.order))],
        [given(UNIT_FIELDS.title), given(unit?.title)],
        [given(UNIT_FIELDS.subtitle), given(unit?.subtitle)],
        [given(UNIT_FIELDS.validated), { value: 'non', style: 'todo' }],
        [given(GRAMMAR_FIELD), given(unit?.grammar)],
      ],
    },
    {
      name: SHEETS.lessons,
      widths: [10, 22, 32, 56],
      rows: [
        header(Object.values(COLUMNS.lessons)),
        ...(plan?.lessons ?? []).map((lesson) => [
          given(lesson.ref),
          given(lesson.type),
          given(lesson.title),
          given(lesson.summary),
        ]),
      ],
    },
    {
      name: SHEETS.words,
      widths: [10, 14, 28, 28, 30, 12, 30],
      rows: [
        header(Object.values(COLUMNS.words)),
        ...(plan?.words ?? []).map((word) => [
          given(word.lesson),
          given(word.ref),
          given(word.fr),
          todo,
          given(word.note),
          yesNo(word.image),
          blank,
        ]),
      ],
    },
    {
      name: SHEETS.sentences,
      widths: [10, 14, 34, 38, 30, 34, 30],
      rows: [
        header(Object.values(COLUMNS.sentences)),
        ...(plan?.sentences ?? []).map((sentence) => [
          given(sentence.lesson),
          given(sentence.ref),
          given(sentence.fr),
          todo,
          blank,
          given(sentence.note),
          blank,
        ]),
      ],
    },
    {
      name: SHEETS.story,
      widths: [8, 18, 40, 40, 14, 40, 30],
      rows: [
        header(Object.values(COLUMNS.story)),
        ...(story?.lines ?? []).map((line, index) => [
          given(String(index + 1)),
          given(line.speaker),
          given(line.fr),
          todo,
          yesNo(line.audioOnly),
          given(line.hint),
          blank,
        ]),
      ],
    },
    {
      name: SHEETS.question,
      widths: [40, 60],
      rows: [
        header(['Champ', 'Valeur']),
        [given(QUESTION_FIELDS.title), given(story?.title)],
        [given(QUESTION_FIELDS.setting), given(story?.setting)],
        [given(QUESTION_FIELDS.prompt), given(story?.prompt)],
        [given(QUESTION_FIELDS.success), given(story?.success)],
      ],
    },
    {
      name: SHEETS.choices,
      widths: [36, 36, 16, 50, 30],
      rows: [
        header(Object.values(COLUMNS.choices)),
        ...(story?.choices ?? []).map((choice) => [
          given(choice.meaning),
          todo,
          yesNo(choice.correct),
          blank,
          blank,
        ]),
      ],
    },
  ];
}
