<!-- Réponse à l’atelier — spoiler : ouvre uniquement après avoir essayé. -->

# Solution · Palier sur Mes tickets

## `server/utils/ticketTierDisplay.js`

```javascript
const { parseTicketTiersFromDb } = require('./ticketTiers');

/**
 * @param {unknown} eventTicketTiersJson
 * @param {string|null|undefined} tierId
 * @returns {string|null}
 */
function tierLabelForTicket(eventTicketTiersJson, tierId) {
  const tid = tierId != null ? String(tierId).trim() : '';
  if (!tid) return null;

  const tiers = parseTicketTiersFromDb(eventTicketTiersJson);
  if (!Array.isArray(tiers) || tiers.length === 0) return null;

  const hit = tiers.find((t) => t && String(t.id) === tid);
  if (!hit || !hit.label) return null;

  return String(hit.label).trim() || null;
}

module.exports = { tierLabelForTicket };
```

## Extraits `registerTicketsAndPayments.js`

En tête :

```javascript
const { tierLabelForTicket } = require('../utils/ticketTierDisplay');
```

Dans chaque `formattedTickets.map` :

```javascript
tierId: ticket.tierId ?? null,
tierLabel: tierLabelForTicket(ticket.event.ticketTiers, ticket.tierId),
```

## Extraits `TicketsPage.js`

À l’intérieur de la carte, après le titre ou sous le prix :

```jsx
{ticket.tierLabel ? (
  <Text style={styles.ticketTierHint}>
    {language === 'fr' ? 'Tarif : ' : 'Tier: '}
    {ticket.tierLabel}
  </Text>
) : null}
```

Styles (exemple) :

```javascript
ticketTierHint: {
  marginTop: 4,
  fontSize: 13,
  color: 'rgba(255,255,255,0.55)',
},
```
