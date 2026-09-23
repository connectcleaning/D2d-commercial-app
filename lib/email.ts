import nodemailer from 'nodemailer'

// Transactional email (invites + password resets) via Gmail SMTP.
// Requires GMAIL_USER and GMAIL_APP_PASSWORD env vars. Lead emails still go
// through GoHighLevel — this is only for internal auth emails.

const FROM_NAME = 'Connect Cleaning'

export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || 'https://d2d-leads.connectcleanfl.com').replace(/\/$/, '')
}

function getTransport() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('Email is not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing).')
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  })
}

async function send(to: string, subject: string, text: string, html: string): Promise<void> {
  const transport = getTransport()
  await transport.sendMail({
    from: `${FROM_NAME} <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  })
}

function shell(title: string, bodyHtml: string, button: { label: string; url: string }): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
    <h2 style="color:#1e3a8a;margin:0 0 16px">${title}</h2>
    ${bodyHtml}
    <p style="margin:24px 0">
      <a href="${button.url}" style="background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;display:inline-block;font-weight:600">${button.label}</a>
    </p>
    <p style="color:#6b7280;font-size:13px">Or paste this link into your browser:<br>
      <a href="${button.url}" style="color:#1e3a8a;word-break:break-all">${button.url}</a>
    </p>
    <p style="color:#9ca3af;font-size:12px;margin-top:24px">Connect Cleaning — Commercial Lead Capture</p>
  </div>`
}

export async function sendInviteEmail(to: string, name: string, link: string): Promise<void> {
  const first = name.split(' ')[0] || 'there'
  const subject = "You've been added to Connect Cleaning's lead app"
  const text = `Hi ${first},\n\nYou've been added to the Connect Cleaning commercial lead app. Set your password to sign in:\n${link}\n\nThis link expires in 7 days.`
  const html = shell(
    'Welcome to the lead app',
    `<p>Hi ${first},</p><p>You've been added to the Connect Cleaning commercial lead app. Set your password to get started — the link expires in 7 days.</p>`,
    { label: 'Set your password', url: link }
  )
  await send(to, subject, text, html)
}

export async function sendResetEmail(to: string, name: string, link: string): Promise<void> {
  const first = name.split(' ')[0] || 'there'
  const subject = 'Reset your Connect Cleaning app password'
  const text = `Hi ${first},\n\nWe got a request to reset your password. Set a new one here:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`
  const html = shell(
    'Reset your password',
    `<p>Hi ${first},</p><p>We got a request to reset your password. The link below expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
    { label: 'Reset password', url: link }
  )
  await send(to, subject, text, html)
}
