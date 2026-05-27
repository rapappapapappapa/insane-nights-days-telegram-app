# Atelier · Afficher le palier billet sur « Mes tickets »

Tu as déjà le **multi-tarifs** à l’achat. L’étape suivante évidente : dans **Mes tickets**, montrer **quel tarif** a été payé (`tierId` + libellé lisible).

Durée indicative : **45 min–1 h** selon ton rythme. Tu écris le code ; rien à mémoriser par cœur : lis les indices, utilise la doc Prisma / JS si besoin.

---

## Objectifs pédagogiques

1. Suivre des données depuis la **base** jusqu’à l’écran (**API → JSON → React Native**).
2. Réutiliser du code serveur existant (**`parseTicketTiersFromDb`**) au lieu de recopier du JSON à la main.
3. Tester ton changement (**log console** ou petit **`curl`**).

---

## Règles du jeu

- À chaque bloc **« À toi »**, tu modifies le fichier indiqué, tu sauvegardes, puis tu passes au bloc suivant.
- Si tu es bloqué plus de ~15 minutes sur une étape, ouvre **`WORKSHOP_PALIER_SUR_MES_TICKETS_SOLUTION.md`** uniquement pour *cette* étape puis referme‑le pour la suite.

---

### Étape 0 — Branch (recommandé)

```bash
git checkout -b atelier/tier-label-mes-tickets
```

---

### Étape 1 — API : exposer `tierId` sur chaque ticket

**Fichier** : `server/routes/registerTicketsAndPayments.js`

**Contexte** : les tickets en base ont un champ **`tierId`** (nullable). L’objet renvoyé au mobile (`formattedTickets`) ne l’inclut pas encore.

**À toi**

1. Repère le `userTickets.map((ticket) => ({ ... }))` dans **`GET /api/user/me/tickets`** (vers la ligne ~717).
2. Ajoute une propriété **`tierId`** : la valeur Prisma `ticket.tierId` (ou `null` si absent).
3. Fais **la même chose** pour la route miroir **`GET /api/user/:userId/tickets`** (deuxième `map` similaire vers ~771).

**Vérif** : redémarre le serveur, connecte‑toi, appelle l’API (app ou `curl` avec un JWT) et vérifie que chaque élément de `tickets` contient bien `"tierId": "..."` ou `null`.

---

### Étape 2 — Petite fonction utilitaire (libellé du palier)

**Fichier à créer** : `server/utils/ticketTierDisplay.js`

**À toi**

1. Crée le fichier.
2. **Importe** `parseTicketTiersFromDb` depuis `./ticketTiers` (déjà dans le projet).
3. Exporte une fonction :

   ```js
   /**
    * @param {unknown} eventTicketTiersJson - valeur Prisma Event.ticketTiers (Json)
    * @param {string|null|undefined} tierId
    * @returns {string|null} libellé du palier, ou null si inconnu / pas de multi-tarifs
    */
   function tierLabelForTicket(eventTicketTiersJson, tierId) {
     // ...
   }
   ```

4. Logique attendue (à coder toi-même) :
   - si **`tierId`** est vide / null → retourner **`null`** ;
   - parser les paliers avec **`parseTicketTiersFromDb(eventTicketTiersJson)`** ; si pas de tableau ou vide → **`null`** ;
   - trouver l’entrée dont **`id`** === `tierId` → retourner son **`label`** ;
   - sinon → **`null`**.

**Vérif** : tu peux lancer Node en one-liner ou ajouter un `console.log` temporaire dans une route de test (puis le retirer).

---

### Étape 3 — API : ajouter `tierLabel` dans la réponse

**Fichier** : `server/routes/registerTicketsAndPayments.js`

**À toi**

1. En haut du fichier (avec les autres `require`), importe **`tierLabelForTicket`** depuis `../utils/ticketTierDisplay`.
2. Dans **les deux** `map` des tickets (mêmes routes qu’à l’étape 1), ajoute :

   - **`tierLabel`** : résultat de **`tierLabelForTicket(ticket.event.ticketTiers, ticket.tierId)`**

   Prisma inclut déjà tout l’`event` dans le `include` : **`ticket.event.ticketTiers`** doit être disponible sans changer la requête.

**Vérif** : la réponse JSON contient par exemple `"tierLabel": "Early bird"` ou `null` pour les anciens billets sans palier.

---

### Étape 4 — Mobile : afficher le palier sur la carte ticket

**Fichier** : `insane-nights-days-mobile/screens/events/TicketsPage.js`

**À toi**

1. Sous le bloc qui affiche **`{ticket.price}€`** (ou à côté du lieu / date, au choix), affiche **une ligne de texte** seulement si **`ticket.tierLabel`** est non vide.
2. Texte suggéré :
   - FR : `Tarif : {ticket.tierLabel}`
   - EN : `Tier: {ticket.tierLabel}`
3. Ajoute un **`StyleSheet`** discret (taille un peu plus petite, couleur grisée) pour ne pas concurrencer le prix.
4. (Bonus) Ajoute **`tierLabel`** dans **`accessibilityLabel`** du header de carte si tu veux un VoiceOver plus complet.

**Vérif** : achète un billet sur un événement multi-tarifs, ouvre **Mes tickets** → le libellé apparaît.

---

### Étape 5 — Propreté & doc

**À toi**

1. Retire tout `console.log` de debug.
2. Ajoute une ligne dans **`CHANGELOG.md`** (semaine en cours) : *« Mobile + API : affichage du palier (`tierLabel`) sur Mes tickets »*.
3. Optionnel : `node --check server/utils/ticketTierDisplay.js` et `node --check server/routes/registerTicketsAndPayments.js` (syntaxe).

---

## Checklist finale

- [ ] `GET /api/user/me/tickets` renvoie **`tierId`** + **`tierLabel`**.
- [ ] Même comportement pour **`GET /api/user/:userId/tickets`** (toujours restreint à soi).
- [ ] **`TicketsPage`** affiche le palier quand présent.

Quand c’est bon : **`git commit`** avec un message clair (tu peux demander une relecture à l’IA si tu veux).

---

## Pour aller plus loin (hors cadre)

- Afficher **`tierLabel`** aussi dans la modal QR grande taille.
- Internationaliser les libellés côté serveur (pas trivial) : pour l’instant les labels viennent du booker comme saisis.
