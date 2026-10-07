export function AnnotationWorkflow(){
 return <details className="panel"><summary>Workflow : que saisir, que déduire ?</summary><ol>
 <li>Choisir l’auteur dans son équipe, par ordre alphabétique.</li>
 <li>Passe : résultat → type obligatoire → receveur ou intercepteur → position de départ. Réception puis tir directement créé : passe clé ; but : assist. Deux passes continues A → B → C : seconde assist à A.</li>
 <li>Tir : issue → passeur / gardien / bloqueur → position du tir. CSC : score adverse, sans tir ni assist. Golazo : décoration. Tir cadré arrêté : arrêt lié ; tir bloqué : blocage lié.</li>
 <li>Récupération : cause → joueur lié → position. Second ballon : confirmer le contrôle après rebond. Après pressing : choisir le presseur ; une seule récupération, au joueur qui contrôle.</li>
 <li>Dribble : éliminer un adversaire, y compris pour sortir de la pression. Raté : préciser si l’équipe perd la possession. Aucun duel ajouté automatiquement.</li>
 <li>Tacle : résultat → contrôle ou sortie → adversaire → position. Raté : tentative sans contribution défensive réussie.</li>
 <li>À la fin de chaque action : cliquer sur la position observée, ou « Position inconnue ». La heatmap utilise uniquement ces observations. Les contacts déduits ≈ restent séparés des touches exactes.</li>
 </ol><p>Une perte, une reprise adverse, un autre tir ou une action manquante coupe la chaîne de création. Ne pas ressaisir un crédit déjà lié ; corriger le geste existant.</p></details>;
}
