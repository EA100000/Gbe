import { Controller, Get, Header, Inject } from '@nestjs/common';

import type { AppConfig } from '../config';
import { CONFIG } from '../tokens';

/** Chemins publics, hors du préfixe /v1 : leurs adresses sont déclarées dans la fiche Google Play. */
export const PUBLIC_PAGES = ['confidentialite', 'suppression-du-compte'] as const;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Gbè</title>
<style>
body{margin:0;background:#fff;color:#211D18;font:17px/1.6 system-ui,sans-serif}
main{max-width:680px;margin:0 auto;padding:32px 20px 48px}
h1{font-size:28px;line-height:1.2;margin:0 0 8px}
h2{font-size:19px;margin:28px 0 6px}
p,li{color:#3d362e}
.date{color:#5E554A;font-size:15px}
a{color:#2F5BB7}
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

/*
 * Textes à faire relire avant la publication sur Google Play (ils engagent l'éditeur de l'appli).
 * Ils décrivent fidèlement le fonctionnement actuel : comptes invités, journal d'apprentissage,
 * pseudo tiré au hasard, suppression dans l'appli et ménage des comptes inactifs.
 */
@Controller()
export class PagesController {
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  private contact(): string {
    const email = this.config.contactEmail;
    if (email === null) return '';
    const safe = escapeHtml(email);
    return `<h2>Nous contacter</h2><p>Écris-nous à <a href="mailto:${safe}">${safe}</a>.</p>`;
  }

  @Get('confidentialite')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy(): string {
    const days = this.config.inactiveAccountDays;
    return page(
      'Confidentialité',
      `<h1>Confidentialité</h1>
<p class="date">Dernière mise à jour : 14 octobre 2026</p>
<p>Gbè sert à apprendre le fongbè. L’application fonctionne sans inscription : nous ne te demandons ni nom, ni e-mail, ni numéro de téléphone.</p>
<h2>Ce que nous enregistrons</h2>
<ul>
<li>Un compte invité, créé automatiquement : un identifiant aléatoire et un secret, dont nous ne gardons qu’une empreinte (Argon2).</li>
<li>Ton journal d’apprentissage : leçons terminées, XP, précision, durée des leçons, vies perdues, cauris gagnés, avec leur date.</li>
<li>Ton pseudo, tiré au hasard dans une liste de mots (il est impossible d’en écrire un).</li>
<li>Si tu affiches ton code de récupération : une empreinte de ce code (HMAC), jamais le code lui-même. Il sert seulement à retrouver ta progression sur un autre téléphone.</li>
<li>Les dates de création du compte et de ta dernière connexion.</li>
</ul>
<p>Nous n’enregistrons ni ta position, ni tes contacts, ni tes photos, ni le son de ton micro. Il n’y a pas de publicité.</p>
<h2>Pourquoi</h2>
<ul>
<li>Sauvegarder ta progression.</li>
<li>Afficher la Ligue de la semaine : les apprenants de ton groupe voient ton pseudo et tes XP de la semaine.</li>
<li>Améliorer les leçons grâce à des statistiques d’ensemble.</li>
</ul>
<p>Si l’application plante, un rapport technique peut être envoyé à notre service de suivi des erreurs (Sentry) : modèle et système du téléphone, version de l’application, détail de l’erreur. Il ne contient ni ton identifiant de compte, ni ton pseudo.</p>
<p>Ton adresse IP sert seulement à limiter les abus (nombre de demandes par minute) ; l’application ne l’enregistre pas. Notre hébergeur peut garder des journaux techniques de connexion pendant une durée limitée.</p>
<h2>Partage</h2>
<p>Nous ne vendons ni ne partageons tes données. Elles sont stockées chez notre hébergeur et chiffrées pendant leur transport (HTTPS).</p>
<h2>Durée de conservation</h2>
<p>Tant que ton compte existe. Un compte sans connexion depuis ${days} jours est supprimé automatiquement, avec tout son journal.</p>
<h2>Supprimer ton compte</h2>
<p>À tout moment, dans l’application ou comme expliqué sur la page <a href="/suppression-du-compte">Suppression du compte</a>.</p>
${this.contact()}`,
    );
  }

  @Get('suppression-du-compte')
  @Header('Content-Type', 'text/html; charset=utf-8')
  deletion(): string {
    const days = this.config.inactiveAccountDays;
    return page(
      'Supprimer ton compte',
      `<h1>Supprimer ton compte Gbè</h1>
<h2>Dans l’application</h2>
<p>Ouvre l’onglet <strong>Profil</strong>, touche <strong>Supprimer mon compte</strong>, puis <strong>Supprimer définitivement</strong>. Ton compte et tout ton journal d’apprentissage sont effacés de nos serveurs et de ton téléphone. Si tu n’as pas de réseau à ce moment-là, l’effacement sur nos serveurs se fait dès que le téléphone se reconnecte.</p>
<h2>Si tu n’as plus l’application</h2>
<p>Ton compte n’est relié à aucun nom ni e-mail : nous ne pouvons pas le retrouver à partir d’une demande. Il est supprimé automatiquement, avec tout son journal, après ${days} jours sans connexion.</p>
<h2>Ce qui est supprimé</h2>
<p>L’identifiant du compte, le pseudo et tout le journal : leçons, XP, série, cauris et place dans la Ligue. Rien n’est conservé.</p>
${this.contact()}`,
    );
  }
}
