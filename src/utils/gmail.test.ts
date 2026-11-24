import { describe, it, expect } from 'vitest';

import { buildRawMessage } from './gmail';
import { buildAssignmentEmail } from './assignmentEmail';

function decodeBase64Url(raw: string): string {
  const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
}

function decodeUtf8Base64(base64: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), c => c.charCodeAt(0)));
}

function extractPart(mime: string, contentType: string): string {
  const match = mime.match(new RegExp(`Content-Type: ${contentType}; charset="UTF-8"\\r\\nContent-Transfer-Encoding: base64\\r\\n\\r\\n([\\s\\S]*?)\\r\\n--`));
  if (!match) throw new Error(`Part ${contentType} not found`);
  return decodeUtf8Base64(match[1]);
}

const strings = {
  subject: 'Your Secret Santa assignment 🎁',
  greeting: 'Hi Zoé,',
  assignment: 'You have been picked to get a gift for:',
  hintLabel: 'Gift hint:',
  instructionsLabel: 'From the organizer:',
  signOff: 'Happy holidays!',
};

describe('buildRawMessage', () => {
  it('should produce a valid base64url MIME message with encoded headers', () => {
    const raw = buildRawMessage({
      toName: 'Zoé',
      toEmail: 'zoe@example.com',
      subject: 'Your Secret Santa assignment 🎁',
      text: 'Bonjour Zoé 🎄',
      html: '<p>Bonjour Zoé 🎄</p>',
    }, 'BOUNDARY');

    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);

    const mime = decodeBase64Url(raw);
    expect(mime).toContain(`To: =?UTF-8?B?${btoa('Zo\xc3\xa9')}?= <zoe@example.com>\r\n`);
    expect(mime).toMatch(/Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=\r\n/);
    expect(mime).toContain('Content-Type: multipart/alternative; boundary="BOUNDARY"');
    expect(mime.trimEnd().endsWith('--BOUNDARY--')).toBe(true);
    expect(extractPart(mime, 'text/plain')).toBe('Bonjour Zoé 🎄');
    expect(extractPart(mime, 'text/html')).toBe('<p>Bonjour Zoé 🎄</p>');
  });

  it('should keep plain ASCII names readable', () => {
    const mime = decodeBase64Url(buildRawMessage({ toName: 'Bob', toEmail: 'bob@example.com', subject: 'Hi', text: '', html: '' }));
    expect(mime).toContain('To: Bob <bob@example.com>\r\n');
    expect(mime).toContain('Subject: Hi\r\n');
  });

  it('should not allow header injection through names or addresses', () => {
    const mime = decodeBase64Url(buildRawMessage({ toName: 'Eve\r\nBcc: x@evil.com', toEmail: 'eve@example.com', subject: 'Hi\r\nBcc: y@evil.com', text: '', html: '' }));
    expect(mime).not.toContain('Bcc:');

    expect(() => buildRawMessage({ toName: 'Eve', toEmail: 'eve@example.com>\r\nBcc: x@evil.com', subject: '', text: '', html: '' })).toThrow();
  });
});

describe('buildAssignmentEmail', () => {
  it('should include the receiver, hint and instructions, escaping HTML', () => {
    const email = buildAssignmentEmail({
      giverName: 'Zoé',
      giverEmail: 'zoe@example.com',
      receiverName: 'Bob <b>',
      receiverHint: 'likes cats & dogs',
      instructions: 'Budget: $20\nDate: Dec 24',
      strings,
    });

    expect(email.toEmail).toBe('zoe@example.com');
    expect(email.text).toContain('Bob <b>');
    expect(email.text).toContain('Gift hint: likes cats & dogs');
    expect(email.text).toContain('Budget: $20\nDate: Dec 24');
    expect(email.html).toContain('Bob &lt;b&gt;');
    expect(email.html).not.toContain('<b>');
    expect(email.html).toContain('likes cats &amp; dogs');
    expect(email.html).toContain('Budget: $20<br>Date: Dec 24');
  });

  it('should omit empty hint and instructions sections', () => {
    const email = buildAssignmentEmail({ giverName: 'A', giverEmail: 'a@example.com', receiverName: 'B', instructions: '  ', strings });
    expect(email.text).not.toContain(strings.hintLabel);
    expect(email.text).not.toContain(strings.instructionsLabel);
    expect(email.html).not.toContain(strings.hintLabel);
  });
});
