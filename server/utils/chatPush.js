const prisma = require('../lib/prisma');
const { sendExpoPushToTokens } = require('./expoPush');

const PREVIEW_LEN = 120;

function truncatePreview(text) {
  if (!text) return '';
  const t = String(text).trim().replace(/\s+/g, ' ');
  return t.length <= PREVIEW_LEN ? t : `${t.slice(0, PREVIEW_LEN)}…`;
}

async function getTokensForUsers(userIds) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return [];
  const rows = await prisma.pushDevice.findMany({
    where: { userId: { in: ids } },
    select: { expoPushToken: true },
  });
  return rows.map((r) => r.expoPushToken);
}

/**
 * @param {string[]} recipientUserIds
 * @param {string} senderUserId
 * @param {{ title: string, body: string, profileType: string, messageType: string, eventDjId?: string|null, eventVenueId?: string|null, eventId?: string|null, eventTitle?: string|null, preview?: string }} payload
 */
async function notifyChatRecipients(recipientUserIds, senderUserId, payload) {
  const recipients = [...new Set(recipientUserIds)].filter((id) => id && id !== senderUserId);
  if (!recipients.length) return;

  const tokens = await getTokensForUsers(recipients);
  if (!tokens.length) return;

  const data = {
    type: 'CHAT_MESSAGE',
    profileType: payload.profileType,
    messageType: payload.messageType,
    eventDjId: payload.eventDjId ?? null,
    eventVenueId: payload.eventVenueId ?? null,
    eventId: payload.eventId ?? null,
    eventTitle: payload.eventTitle ?? null,
    preview: payload.preview ?? null,
  };

  await sendExpoPushToTokens(tokens, {
    title: payload.title,
    body: payload.body,
    data,
  });
}

/** DJ ↔ Booker (invitation) */
async function afterPrivateDjMessage({ senderId, invitation, content, eventTitle }) {
  const bookerUserId = invitation?.event?.booker?.userId;
  const djId = invitation?.djId;
  if (!bookerUserId || !djId) return;

  const recipientId = senderId === djId ? bookerUserId : djId;
  const profileType = recipientId === djId ? 'DJ' : 'BOOKER';

  const title = eventTitle ? `Nox — ${eventTitle}` : 'Nox';
  const body = truncatePreview(content);

  await notifyChatRecipients([recipientId], senderId, {
    title,
    body,
    profileType,
    messageType: 'PRIVATE',
    eventDjId: invitation.id,
    eventVenueId: null,
    eventId: null,
    eventTitle,
    preview: body,
  });
}

/** Booker ↔ Lieu */
async function afterVenueMessage({ senderId, ev, content, eventTitle }) {
  const bookerUserId = ev?.event?.booker?.userId;
  const venueUserId = ev?.venue?.userId;
  if (!bookerUserId || !venueUserId) return;

  const recipientId = senderId === bookerUserId ? venueUserId : bookerUserId;
  const profileType = recipientId === venueUserId ? 'VENUE' : 'BOOKER';

  const title = eventTitle ? `Nox — ${eventTitle}` : 'Nox';
  const body = truncatePreview(content);

  await notifyChatRecipients([recipientId], senderId, {
    title,
    body,
    profileType,
    messageType: 'PRIVATE',
    eventVenueId: ev.id,
    eventDjId: null,
    eventId: null,
    eventTitle,
    preview: body,
  });
}

/** Chat groupe événement */
async function afterGroupMessage({ senderId, event, content }) {
  const bookerUserId = event?.booker?.userId;
  const djIds = (event?.eventDjs || []).map((ed) => ed.djId).filter(Boolean);
  const all = [bookerUserId, ...djIds].filter(Boolean);
  const title = event?.title ? `Nox — ${event.title}` : 'Nox';
  const preview = truncatePreview(content);

  for (const rid of all) {
    if (!rid || rid === senderId) continue;
    let profileType = 'DJ';
    if (rid === bookerUserId) profileType = 'BOOKER';
    const tokens = await getTokensForUsers([rid]);
    if (!tokens.length) continue;
    await sendExpoPushToTokens(tokens, {
      title,
      body: preview,
      data: {
        type: 'CHAT_MESSAGE',
        profileType,
        messageType: 'GROUP',
        eventDjId: null,
        eventVenueId: null,
        eventId: event.id,
        eventTitle: event.title ?? null,
        preview,
      },
    });
  }
}

module.exports = {
  notifyChatRecipients,
  afterPrivateDjMessage,
  afterVenueMessage,
  afterGroupMessage,
};
