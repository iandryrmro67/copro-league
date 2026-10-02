# Match analysis implementation plan

**Goal:** Implement the improvements authorized from the 2026-10-02 audit.
**Spec:** docs/2026-10-02-audit-stats-match.md, approved by the user in chat.
**Execution:** Native implementation in this session, then independent review.
**Architecture:** Preserve official scores and historical records. Store optional analysis state in a nullable JSON text column; draft events are distinct from published statistics and events. Share projection and publication review rules between UI and server.
**Stack:** Next, React, TypeScript, Zod, PostgreSQL; Node tests and PGlite.

## Constraints
- Preserve legacy statistics until explicit migration into the new analysis workflow.
- Never infer full coverage, coordinates, playing time or xG from absent data.
- Every publication is validated on the server; concurrency version guards remain.
- Keep the existing Vercel checkout and do not touch production results.

## Review focus
- Partial annotations must preserve official scores and published statistics.
- Changes after publication must not expose draft events to visitors.
- Reloads, failed saves and concurrent revisions must keep recoverable drafts.
- Linked passes, shots and losses must not duplicate derived contributions.
- Coverage and time offsets must use match time and accept historical unknown duration.

## Task 1: projection and publication
- [x] Add regression tests for official 8–6 / one annotated goal, double assists, unknown failed-pass recipient, coverage and stale links.
- [x] Run tests and inspect expected failures.
- [x] Add optional MatchAnalysis model and shared review/project/publication helpers in lib/match-analysis.ts. Keep counts provisional; publish only explicitly covered keys and preserve manual baseline.
- [x] Canonical links derive key passes, assists and possession losses without duplication.
- [x] Verify existing engine tests with updated score-preservation expectations.

## Task 2: server persistence and public boundaries
- [x] Add a nullable matches.analysis column migration.
- [x] Test repositories using PGlite for draft saves, publication, re-edits, guest reads, backups and version conflicts.
- [x] Persist analysis with the guarded match transaction; validate publication server-side, preserve last published events on edits, and sanitize guest reads.
- [x] Persist optional participant playing time and role in the existing stats JSON envelope, outside raw statistics.

## Task 3: resumable analysis workspace
- [x] Test draft serialization, version mismatch, malformed recovery and storage failure.
- [x] Add versioned local recovery in lib/match-draft.ts; preserve session state between tabs with mounted content.
- [x] Add quick mode, explicit position confirmation, match/video offset, readable sequences, suggested links and carrier transition.
- [x] Add review UI with covered ranges, categories, score comparison and anomalies. Separate draft save from validation.
- [x] Restore saved editor after refresh; do not exit analysis on successful save.

## Task 4: restitution, ratings and verification
- [x] Test playing-time/role comparable ratings and publication provenance.
- [x] Show coverage and provenance publicly; use only published coordinates and events.
- [x] Add optional playing time and goalkeeper role controls; keep rating dynamic and explain comparison cohort.
- [x] Run the complete suite, TypeScript and production build.
- [x] Exercise preparation, analysis, review, recovery and responsive layout in the browser without modifying real match data.
- [x] Independent review, fix material findings, update documentation and report verified result.

## Résultat vérifié

- 90 tests sur 90 réussis (`npm test`) ; vrais repositories exercés avec PostgreSQL PGlite.
- Compilation de production réussie (`npm run build`) et vérification TypeScript réussie. La page temporaire de QA a été retirée et les anciens types générés ont été nettoyés avant le build final.
- Revue indépendante terminée sans constat matériel restant ; les cas historiques de tirs et de reprise d’édition ont été corrigés.
- Parcours navigateur : passe puis tir automatiquement lié, porteur suivant, conservation entre onglets, récupération des actions et du temps 0:23, conflit de version, contrôles de publication et publication simulée. Fixture indépendante, aucune écriture dans les matchs réels.
- Affichage à 390 px : largeur de page 390 px, tableaux défilants et aucune fuite horizontale. Aperçu conservé dans `outputs/match-analysis-review.jpg` à la racine du projet.
- Les nouveaux modules et l’analyseur n’introduisent aucune erreur ESLint. Les erreurs déjà présentes dans les autres fichiers empêchent encore un lint global vert ; elles ne sont pas présentées comme corrigées.
- Migration nullable prête et testée, mais non appliquée à Supabase en production. Aucun déploiement ni modification de résultat en production effectué.
- Sources conservées dans la branche existante `codex/vercel-supabase`.
