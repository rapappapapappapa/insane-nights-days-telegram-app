const nodemailer = require('nodemailer');

// ============================================================================
// Configuration : Resend (prioritaire) ou SMTP
// ============================================================================
// Resend : RESEND_API_KEY + RESEND_FROM (ex: "Nox <onboarding@resend.dev>")
// SMTP   : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// ============================================================================

function isResendConfigured() {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function isConfigured() {
  return isResendConfigured() || isSmtpConfigured();
}

function getProvider() {
  if (isResendConfigured()) return 'resend';
  if (isSmtpConfigured()) return 'smtp';
  return null;
}

// ============================================================================
// Envoi via Resend
// ============================================================================
async function sendViaResend({ to, subject, text, html, attachments }) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM;

  const payload = {
    from,
    to: [to],
    subject,
    html: html || text,
  };
  if (attachments && attachments.length > 0) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
    }));
  }

  const { data, error } = await resend.emails.send(payload);

  if (error) {
    const err = new Error(error.message || 'Resend API error');
    err.code = 'RESEND_ERROR';
    err.details = error;
    throw err;
  }
  return data;
}

// ============================================================================
// Envoi via SMTP (Nodemailer)
// ============================================================================
async function sendViaSmtp({ to, subject, text, html, attachments }) {
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };
  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
    }));
  }

  const info = await transporter.sendMail(mailOptions);
  return info;
}

// ============================================================================
// Fonction principale sendMail
// ============================================================================
async function sendMail({ to, subject, text, html, attachments }) {
  if (!to) throw new Error('Missing email recipient');
  if (!subject) throw new Error('Missing email subject');

  if (!isConfigured()) {
    const err = new Error('Email not configured (set RESEND_API_KEY+RESEND_FROM or SMTP_*)');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }

  const provider = getProvider();

  try {
    if (provider === 'resend') {
      const result = await sendViaResend({ to, subject, text, html, attachments });
      console.log('[mailer] Email envoyé via Resend:', { to: to?.slice(0, 3) + '***', id: result?.id });
      return result;
    }
    if (provider === 'smtp') {
      const result = await sendViaSmtp({ to, subject, text, html, attachments });
      console.log('[mailer] Email envoyé via SMTP:', { to: to?.slice(0, 3) + '***', messageId: result?.messageId });
      return result;
    }
  } catch (e) {
    console.error('[mailer] Erreur envoi email:', {
      provider,
      to: to?.slice(0, 5) + '***',
      message: e?.message,
      code: e?.code,
    });
    throw e;
  }
}

module.exports = {
  isConfigured,
  getProvider,
  sendMail,
};
