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

  await expect(page.getByText('Combien de temps par jour ?')).toBeVisible();
  expect(errors).toEqual([]);
});

test('le guide des sons s’ouvre depuis la barre du bas', async ({ page }) => {
  await startAsNewLearner(page);

  await page.getByTestId('tab-sons').first().click();

  await expect(page.getByText('Les sons du fon')).toBeVisible();
});
