/**
 * Webhook Yousign — finalisation de la signature électronique des contrats.
 *
 * À configurer dans Yousign (API > Webhooks) :
 * - Endpoint : https://<PUBLIC_URL>/api/webhooks/yousign
 * - Événements : signature_request.done, signature_request.declined, signature_request.expired
 * - Secret → YOUSIGN_WEBHOOK_SECRET (vérification HMAC sha256 sur le body brut)
 */

const { verifyYousignWebhookSignature } = require('../utils/yousign');
const { finalizeSignedContract, revertContractSignature } = require('../utils/contractSignature');

module.exports = function registerYousignWebhook(app) {
  app.post('/api/webhooks/yousign', async (req, res) => {
    try {
      const signature = req.headers['x-yousign-signature-256'];
      if (!verifyYousignWebhookSignature(req.rawBody, signature)) {
        console.error('[yousign webhook] Signature HMAC invalide.');
        return res.status(401).json({ success: false, message: 'Signature webhook invalide.' });
      }

      const eventName = req.body?.event_name;
      const requestId = req.body?.data?.signature_request?.id;
      if (!eventName || !requestId) {
        return res.status(200).json({ success: true, ignored: true });
      }

      if (eventName === 'signature_request.done') {
        const result = await finalizeSignedContract(requestId);
        console.log('[yousign webhook] done:', requestId, result);
        return res.status(200).json({ success: true, ...result });
      }

      if (eventName === 'signature_request.declined' || eventName === 'signature_request.expired') {
        const reason = eventName.endsWith('expired') ? 'expired' : 'declined';
        const result = await revertContractSignature(requestId, reason);
        console.log(`[yousign webhook] ${reason}:`, requestId, result);
        return res.status(200).json({ success: true, ...result });
      }

      return res.status(200).json({ success: true, ignored: true });
    } catch (e) {
      console.error('[yousign webhook] Erreur:', e);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });
};
