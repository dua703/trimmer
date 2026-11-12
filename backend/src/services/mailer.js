const nodemailer = require("nodemailer");
const { env } = require("../config/env");

let transport;

function smtpConfigured() {
  return Boolean(env.GMAIL_SCRIPT_URL || (env.SMTP_USER && env.SMTP_PASS));
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s+/g, "") }
    });
  }
  return transport;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function verificationEmail(firstName, link) {
  const hours = env.EMAIL_VERIFICATION_TTL_HOURS;
  const name = escapeHtml(firstName || "there");
  return {
    subject: "Confirm your Trimmer account",
    text: [
      `Hi ${firstName || "there"},`,
      "",
      "Welcome to Trimmer! Confirm your email address to activate your account:",
      link,
      "",
      `This link expires in ${hours} hours. If you did not create an account, you can ignore this email.`
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#4A2040">
        <h2 style="margin-bottom:8px">Welcome to Trimmer, ${name}!</h2>
        <p>Confirm your email address to activate your account.</p>
        <p style="margin:28px 0">
          <a href="${escapeHtml(link)}" style="background:#4A2040;color:#FFF6EF;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Confirm email</a>
        </p>
        <p style="font-size:13px;color:#7A534C">Or paste this link into your browser:<br>${escapeHtml(link)}</p>
        <p style="font-size:13px;color:#7A534C">This link expires in ${hours} hours. If you did not create an account, ignore this email.</p>
      </div>`
  };
}

/**
 * Sends the verification email. Uses HTTPS relay (GMAIL_SCRIPT_URL) when set
 * so cloud hosts that block outbound SMTP ports (e.g. Render Free) work over
 * port 443. Without credentials in development, prints the link to console.
 */
async function sendVerificationEmail(user, link) {
  if (!smtpConfigured()) {
    if (env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured.");
    }
    console.warn(`[mail] SMTP not configured. Verification link for ${user.email}: ${link}`);
    return { delivered: false };
  }

  const message = verificationEmail(user.firstName, link);

  if (env.GMAIL_SCRIPT_URL) {
    const response = await fetch(env.GMAIL_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: user.email,
        subject: message.subject,
        text: message.text,
        html: message.html
      }),
      redirect: "follow"
    });
    if (!response.ok) {
      throw new Error(`HTTPS mail relay failed with status ${response.status}`);
    }
    return { delivered: true };
  }

  await getTransport().sendMail({
    from: env.MAIL_FROM || env.SMTP_USER,
    to: user.email,
    ...message
  });
  return { delivered: true };
}

module.exports = { sendVerificationEmail, verificationEmail, smtpConfigured };
