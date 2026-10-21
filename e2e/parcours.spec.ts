import { expect, test, type Page } from '@playwright/test';

/**
 * Parcours d'un apprenant sur l'appli web, sans serveur (synchronisation désactivée).
 * Le Chromium de test ne lit pas toujours l'AAC : les erreurs de lecture audio sont ignorées,
 * toute autre erreur de page fait échouer le test.
 */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    if (!/supported source|play\(\)|NotAllowedError/i.test(error.message)) {
      errors.push(error.message);
    }
  });
  return errors;
}

async function startAsNewLearner(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Pourquoi apprends-tu le fon ?')).toBeVisible();
  await page.getByTestId('reason-famille').click();
  await page.getByTestId('reason-continue').click();
  await page.getByTestId('level-decouverte').click();
  await page.getByTestId('level-continue').click();
  await expect(page.getByText('Combien de temps par jour ?')).toBeVisible();
  await page.getByTestId('goal-serious').click();
  await page.getByTestId('welcome-start').click();
  await expect(page.getByLabel('Leçon 1 : commencer')).toBeVisible();
}

async function playFirstLesson(page: Page) {
  await page.getByLabel('Leçon 1 : commencer').click();
  // Exercices « images » : la bonne réponse de chacun, dans l'ordre du pack de test.
  for (const answer of ['sin', 'hwe', 'xwe', 'kwe']) {
    await page.getByTestId(`choice-${answer}`).click();
    await page.getByTestId('check-button').click();
    await page.getByTestId('feedback-button').click();
  }
  // Exercice « paires ».
  for (let i = 0; i < 4; i += 1) {
    await page.getByTestId(`pair-left-${i}`).click();
    await page.getByTestId(`pair-right-${i}`).click();
  }
  await page.getByTestId('feedback-button').click();
}

test('un nouvel apprenant termine sa première leçon', async ({ page }) => {
  const errors = watchErrors(page);
  await startAsNewLearner(page);

  await playFirstLesson(page);

  await expect(page.getByText('Leçon terminée !')).toBeVisible();
  await page.getByTestId('end-continue').click();
  await expect(page.getByLabel('Leçon 1, terminée : la refaire')).toBeVisible();
  expect(errors).toEqual([]);
});

test('la progression reste après un rechargement de la page', async ({ page }) => {
  await startAsNewLearner(page);
  await playFirstLesson(page);
  await page.getByTestId('end-continue').click();

  await page.reload();

  await expect(page.getByLabel('Leçon 1, terminée : la refaire')).toBeVisible();
  await expect(page.getByLabel('Leçon 2 : commencer')).toBeVisible();
});

test('le profil affiche un pseudo et permet de supprimer son compte', async ({ page }) => {
  const errors = watchErrors(page);
  await startAsNewLearner(page);

  await page.getByTestId('tab-profil').first().click();
  const pseudo = page.getByTestId('profile-pseudo');
  await expect(pseudo).toHaveText(/\S+ \S+/);
  const first = await pseudo.textContent();
  await page.getByTestId('profile-reroll').click();
  await expect(pseudo).not.toHaveText(first ?? '');

  await page.getByTestId('profile-delete').click();
  await expect(page.getByText('Supprimer ton compte ?')).toBeVisible();
  await page.getByTestId('delete-confirm').click();

  // Retour au tout premier écran du démarrage.
  await expect(page.getByText('Pourquoi apprends-tu le fon ?')).toBeVisible();
  expect(errors).toEqual([]);
});

test('le guide des sons s’ouvre depuis la barre du bas', async ({ page }) => {
  await startAsNewLearner(page);

  await page.getByTestId('tab-sons').first().click();

  await expect(page.getByText('Les sons du fon')).toBeVisible();
});

test('une erreur de la leçon se révise depuis l’onglet Réviser', async ({ page }) => {
  const errors = watchErrors(page);
  await startAsNewLearner(page);
  await page.getByLabel('Leçon 1 : commencer').click();

  // Première image ratée, puis réussie : « sin » part dans « Mes erreurs ».
  await page.getByTestId('choice-hwe').click();
  await page.getByTestId('check-button').click();
  await page.getByTestId('feedback-button').click();
  await page.getByTestId('choice-sin').click();
  await page.getByTestId('check-button').click();
  await page.getByTestId('feedback-button').click();
  for (const answer of ['hwe', 'xwe', 'kwe']) {
    await page.getByTestId(`choice-${answer}`).click();
    await page.getByTestId('check-button').click();
    await page.getByTestId('feedback-button').click();
  }
  for (let i = 0; i < 4; i += 1) {
    await page.getByTestId(`pair-left-${i}`).click();
    await page.getByTestId(`pair-right-${i}`).click();
  }
  await page.getByTestId('feedback-button').click();
  await page.getByTestId('end-continue').click();

  await page.getByTestId('tab-reviser').first().click();
  await expect(page.getByText('1 erreur récente à revoir')).toBeVisible();
  await page.getByTestId('review-start').click();
  await expect(page.getByText('Entraînement')).toBeVisible();
  // La séance commence par l'erreur, puis les mots à consolider : on répond juste à chaque image.
  const ids: Record<string, string> = { eau: 'sin', soleil: 'hwe', maison: 'xwe', argent: 'kwe' };
  const done = page.getByText('Révision terminée !').first();
  for (let turn = 0; turn < 10 && !(await done.isVisible()); turn += 1) {
    const prompt = (await page.getByText(/^Lequel veut dire « .+ » \?$/).textContent()) ?? '';
    const fr = /« (.+) »/.exec(prompt)?.[1] ?? '';
    await page.getByTestId(`choice-u01:${ids[fr] ?? ''}`).click();
    await page.getByTestId('check-button').click();
    await page.getByTestId('feedback-button').click();
    await page.waitForTimeout(200);
  }

  await expect(done).toBeVisible();
  await page.getByTestId('end-continue').click();
  await expect(page.getByText('Aucune erreur à revoir pour le moment.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('une séance d’écoute se joue jusqu’au bout, sans perdre de vie', async ({ page }) => {
  const errors = watchErrors(page);
  await startAsNewLearner(page);
  await playFirstLesson(page);
  await page.getByTestId('end-continue').click();

  await page.getByTestId('tab-reviser').first().click();
  await page.getByTestId('listen-start').click();
  await expect(page.getByText('Qu’as-tu entendu ?')).toBeVisible();
  // Sur le web, rien ne se joue sans geste : on touche « Réécouter ».
  await page.getByTestId('listen-play').click();
  const done = page.getByText('Écoute terminée !').first();
  for (let turn = 0; turn < 20 && !(await done.isVisible()); turn += 1) {
    await page
      .getByTestId(/^listen-choice-/)
      .first()
      .click();
    await page.getByTestId('check-button').click();
    await page.getByTestId('feedback-button').click();
    await page.waitForTimeout(150);
  }
  await expect(done).toBeVisible();
  expect(errors).toEqual([]);
});
