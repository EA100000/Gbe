import { fakeUnit, testContent } from '../../test-utils/fixtures';
import { mergeContents, qualify, splitQualified } from './practiceContent';

describe('contenu des séances d’entraînement', () => {
  it('préfixe chaque mot, dessin et audio par son unité', () => {
    // Préparer
    const u01 = testContent();
    // Agir
    const merged = mergeContents([u01, fakeUnit(2)]);
    // Vérifier
    const sin = merged?.itemsById.get('u01:sin');
    expect(sin).toMatchObject({ id: 'u01:sin', fon: 'sin', illustration: 'u01:ill-sin' });
    expect(sin?.audio?.normal).toBe('u01:sin-n');
    expect(merged?.illustrationsById.has('u01:ill-sin')).toBe(true);
    expect(merged?.audioSources.get('u01:sin-n')).toBe(u01.audioSources.get('sin-n'));
    expect(merged?.itemsById.has('u02:item-a')).toBe(true);
  });

  it('garde les deux voix d’un même texte sous leurs identifiants qualifiés', () => {
    const unit = fakeUnit(2);
    const merged = mergeContents([unit]);

    expect(merged?.audioTakes.get('u02:aud-a')).toEqual(
      unit.audioTakes.get('aud-a')?.map((id) => qualify('u02', id)),
    );
  });

  it('ne fusionne rien sans unité', () => {
    expect(mergeContents([])).toBeNull();
  });

  it('retrouve l’unité et l’élément d’un identifiant qualifié', () => {
    expect(splitQualified('u01:sin')).toEqual({ unitId: 'u01', itemId: 'sin' });
    expect(splitQualified('sin')).toBeNull();
    expect(splitQualified(':sin')).toBeNull();
  });
});
