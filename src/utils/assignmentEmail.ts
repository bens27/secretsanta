import { EmailMessage } from './gmail';

export interface AssignmentEmailStrings {
  subject: string;
  greeting: string;
  assignment: string;
  hintLabel: string;
  instructionsLabel: string;
  signOff: string;
}

export interface AssignmentEmailInput {
  giverName: string;
  giverEmail: string;
  receiverName: string;
  receiverHint?: string;
  instructions?: string;
  strings: AssignmentEmailStrings;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlParagraphs(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

export function buildAssignmentEmail({ giverName, giverEmail, receiverName, receiverHint, instructions, strings }: AssignmentEmailInput): EmailMessage {
  const hint = receiverHint?.trim();
  const info = instructions?.trim();

  const text = [
    strings.greeting,
    ``,
    strings.assignment,
    ``,
    `    ${receiverName}`,
    ``,
    ...(hint ? [`${strings.hintLabel} ${hint}`, ``] : []),
    ...(info ? [strings.instructionsLabel, info, ``] : []),
    strings.signOff,
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#b91c1c;font-family:Georgia,serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;color:#374151;">
      <p style="margin:0 0 16px;">${htmlParagraphs(strings.greeting)}</p>
      <p style="margin:0 0 16px;">${htmlParagraphs(strings.assignment)}</p>
      <p style="margin:24px 0;text-align:center;font-size:40px;font-weight:bold;color:#b91c1c;">${escapeHtml(receiverName)}</p>
      ${hint ? `<p style="margin:0 0 16px;padding:12px;background:#f9fafb;border-radius:8px;"><strong>${escapeHtml(strings.hintLabel)}</strong> ${htmlParagraphs(hint)}</p>` : ``}
      ${info ? `<p style="margin:0 0 16px;padding:12px;background:#f9fafb;border-radius:8px;"><strong>${escapeHtml(strings.instructionsLabel)}</strong><br>${htmlParagraphs(info)}</p>` : ``}
      <p style="margin:24px 0 0;">${htmlParagraphs(strings.signOff)}</p>
    </div>
  </body>
</html>`;

  return {
    toName: giverName,
    toEmail: giverEmail,
    subject: strings.subject,
    text,
    html,
  };
}
