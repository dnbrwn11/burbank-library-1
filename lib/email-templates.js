// Graphite (#1A1A1A) + Gold (#B89030) design system
// All templates return { subject, html }

const GRAPHITE = '#1A1A1A';
const GOLD = '#B89030';
const WHITE = '#FFFFFF';
const BG = '#F9F9F8';
const BORDER = '#E5E5E0';
const TEXT = '#222222';
const MUTED = '#A6A6A6';
const SUBTEXT = '#6B8CAE';

function base(subject, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${GRAPHITE};border-top:4px solid ${GOLD};padding:28px 40px;border-radius:8px 8px 0 0;">
            <span style="font-size:20px;font-weight:700;color:${GOLD};letter-spacing:-0.5px;">CostDeck</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${WHITE};padding:40px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${GRAPHITE};padding:24px 40px;border-radius:0 0 8px 8px;">
            <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.6;">
              © 2026 CostDeck · <a href="https://costdeck.ai" style="color:${GOLD};text-decoration:none;">costdeck.ai</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label, url) {
  return `<a href="${url}" style="display:inline-block;background:${GOLD};color:${WHITE};text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:6px;margin-top:8px;">${label}</a>`;
}

function h1(text) {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${TEXT};line-height:1.3;">${text}</h1>`;
}

function p(text, style = '') {
  return `<p style="margin:0 0 20px;font-size:15px;color:${TEXT};line-height:1.6;${style}">${text}</p>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:28px 0;">`;
}

function detail(label, value) {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:${SUBTEXT};width:140px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;font-size:14px;color:${TEXT};font-weight:600;">${value}</td>
  </tr>`;
}

// ─────────────────────────────────────────────
// Team Invite
// ─────────────────────────────────────────────
export function teamInvite({ inviterName, inviteeName, projectName, role, inviteUrl }) {
  const subject = `You've been invited to ${projectName} on CostDeck`;
  const greeting = inviteeName ? `Hi ${inviteeName},` : 'Hi there,';
  const html = base(subject, `
    ${h1("You've been invited to collaborate")}
    ${p(`${greeting}<br><br><strong>${inviterName}</strong> has invited you to join the project <strong>${projectName}</strong> on CostDeck as a <strong>${role}</strong>.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${detail('Project', projectName)}
      ${detail('Role', role)}
      ${detail('Invited by', inviterName)}
    </table>
    ${ctaButton('Accept Invitation', inviteUrl)}
    ${divider()}
    ${p(`This invitation link expires in 7 days. If you weren't expecting this, you can safely ignore this email.`, `font-size:13px;color:${MUTED};margin:0;`)}
  `);
  return { subject, html };
}

// ─────────────────────────────────────────────
// Bid Submitted
// ─────────────────────────────────────────────
export function bidSubmitted({ recipientName, projectName, submittedBy, amount, projectUrl }) {
  const subject = `New bid submitted on ${projectName}`;
  const formattedAmount = amount
    ? `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
    : 'See project for details';
  const html = base(subject, `
    ${h1('A new bid has been submitted')}
    ${p(`Hi ${recipientName},<br><br>A new bid has been submitted on <strong>${projectName}</strong>.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${detail('Project', projectName)}
      ${detail('Submitted by', submittedBy)}
      ${detail('Bid amount', formattedAmount)}
    </table>
    ${ctaButton('Review Bid', projectUrl)}
    ${divider()}
    ${p('Log in to CostDeck to review the full bid details and compare against your estimate.', `font-size:13px;color:${MUTED};margin:0;`)}
  `);
  return { subject, html };
}

// ─────────────────────────────────────────────
// Bid Invite
// ─────────────────────────────────────────────
export function bidInvite({ recipientName, inviterName, projectName, dueDate, inviteUrl }) {
  const subject = `You're invited to submit a bid on ${projectName}`;
  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const html = base(subject, `
    ${h1("You're invited to bid")}
    ${p(`Hi ${recipientName},<br><br><strong>${inviterName}</strong> has invited you to submit a bid for <strong>${projectName}</strong> on CostDeck.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${detail('Project', projectName)}
      ${detail('Requested by', inviterName)}
      ${dueDateFormatted ? detail('Due date', dueDateFormatted) : ''}
    </table>
    ${ctaButton('View Project & Submit Bid', inviteUrl)}
    ${divider()}
    ${p('Use CostDeck to review project details, scope, and submit your estimate directly.', `font-size:13px;color:${MUTED};margin:0;`)}
  `);
  return { subject, html };
}

// ─────────────────────────────────────────────
// Magic Link
// ─────────────────────────────────────────────
export function magicLink({ email, magicUrl }) {
  const subject = 'Your CostDeck sign-in link';
  const html = base(subject, `
    ${h1('Sign in to CostDeck')}
    ${p(`We received a sign-in request for <strong>${email}</strong>. Click the button below to sign in — no password needed.`)}
    ${ctaButton('Sign In to CostDeck', magicUrl)}
    ${divider()}
    ${p('This link expires in 1 hour and can only be used once.<br>If you didn\'t request this, you can safely ignore this email.', `font-size:13px;color:${MUTED};margin:0;`)}
  `);
  return { subject, html };
}

// ─────────────────────────────────────────────
// Approval Request
// ─────────────────────────────────────────────
export function approvalRequest({ approverName, requesterName, projectName, description, approveUrl, rejectUrl }) {
  const subject = `Approval requested for ${projectName}`;
  const html = base(subject, `
    ${h1('Your approval is requested')}
    ${p(`Hi ${approverName},<br><br><strong>${requesterName}</strong> is requesting your approval on <strong>${projectName}</strong>.`)}
    ${description ? `${divider()}<p style="margin:0 0 24px;font-size:15px;color:${TEXT};line-height:1.6;padding:16px;background:${BG};border-left:3px solid ${GOLD};border-radius:0 4px 4px 0;">${description}</p>` : divider()}
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:12px;">
          ${ctaButton('Approve', approveUrl)}
        </td>
        <td>
          <a href="${rejectUrl}" style="display:inline-block;background:${WHITE};color:${TEXT};text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:6px;border:2px solid ${BORDER};margin-top:8px;">Reject</a>
        </td>
      </tr>
    </table>
    ${divider()}
    ${p('Log in to CostDeck to review the full estimate before responding.', `font-size:13px;color:${MUTED};margin:0;`)}
  `);
  return { subject, html };
}
