# Migration Vercel et Supabase Implementation Plan

> Exécution dans cette session, avec tests aux frontières de chaque composant.

**Goal:** Exécuter Copro League sur Vercel avec sa base, ses comptes et ses médias privés dans Supabase.
**Architecture:** Next.js Node, adaptateur PostgreSQL transactionnel, Supabase SSR et envois Storage directs.
**Tech Stack:** Next.js, node-postgres (pg) pour le serveur, postgres.js pour les migrations, @supabase/ssr, @supabase/supabase-js, PGlite pour les tests PostgreSQL.
**Spec:** ../specs/2026-09-20-vercel-supabase-design.md

## Contraintes
- Préserver l’ancien site et tous les calculs métier.
- Refuser les sessions non vérifiées et les utilisateurs hors liste.
- Ne jamais stocker les secrets dans Git.
- Conserver les écritures atomiques et les conflits de version.

## Base
- [x] Tester le schéma PostgreSQL, les transactions annulées, les conflits et les palmarès immuables.
- [x] Ajouter lib/server/database.ts et lib/server/sql.ts ; adapter repository et recognition-repository.
- [x] Ajouter supabase/migrations et scripts de migration/import, avec refus d’une destination non vide.

## Authentification
- [x] Tester les adresses autorisées et les redirections locales.
- [x] Ajouter lib/server/auth.ts, lib/auth-policy.ts, proxy.ts et /connexion.
- [x] Protéger GET/POST/HEAD des API et supprimer le bootstrap public.

## Médias
- [x] Tester les signatures, limites et identifiants de médias.
- [x] Ajouter les tickets signés et la validation après upload, le stockage privé et les lectures temporaires.
- [x] Adapter les envois photos/vidéos avec progression et annulation.

## Vérification et livraison
- [x] Passer les tests métier, les tests migration/auth/médias, TypeScript et le build Next.
- [x] Tester /connexion, les redirections et le refus d’accès HTTP.
- [ ] Sauvegarder la branche GitHub, configurer Supabase puis Vercel avec les comptes du propriétaire.
- [ ] Vérifier la production connectée et le chargement des données avant d’annoncer le déploiement.
