# 0001 — Monorepo npm, Expo SDK 57 et outillage

- **Date** : 2026-10-13
- **Statut** : accepté
- **Écart au cahier technique** : non

## Contexte

Le cahier prévoit une seule base de code (Android, iOS, web), des règles du jeu pures et testées,
et des schémas partagés entre l'appli, le back-office et le générateur de packs.

## Décision

- Monorepo **npm workspaces** : `apps/mobile`, `packages/domain`, `packages/content-schema`, `packages/ui`.
  Pas de Turborepo ni pnpm pour l'instant : Expo gère les workspaces npm sans configuration.
- **Expo SDK 57** (React Native 0.86, React 19.2), Expo Router (routes dans `src/app`),
  React Compiler activé.
- **TypeScript ~6.0** strict avec `noUncheckedIndexedAccess`.
- **Jest 29** partout (aligné sur `jest-expo` 57), **fast-check** pour les tests de propriétés,
  **React Native Testing Library 14** pour les écrans.
- **ESLint 9** (configuration unique à la racine, règles des hooks et du React Compiler) et **Prettier**.
- Les paquets partagés sont livrés en TypeScript source : Metro et Jest les transpilent.

## Conséquences

- Une seule commande `npm run check` reproduit la CI en local.
- Les versions des modules Expo sont celles de `expo/bundledNativeModules.json` ;
  toute mise à jour du SDK se fait en une fois (`npx expo install --fix`).
