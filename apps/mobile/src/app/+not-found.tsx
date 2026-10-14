import { Redirect } from 'expo-router';

/** Adresse inconnue (lien ancien, page web hébergée ailleurs) : retour au chemin des leçons. */
export default function NotFound() {
  return <Redirect href="/" />;
}
