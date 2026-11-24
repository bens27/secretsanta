// Sends email through the organizer's own Gmail account, entirely from the
// browser: Google Identity Services gives us a short-lived OAuth access token
// restricted to the `gmail.send` scope (it can send mail but not read any),
// and we call the Gmail REST API with it. Nothing goes through a backend.
//
// Inside the macOS app the browser popup flow isn't available, so both the
// authorization and the API call are delegated to the native side, which
// signs in through the system browser (see macos/Sources/SecretSanta/GmailAuth.swift).

import { callNative, isNativeApp } from './native';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string; message?: string }) => void;
          }): TokenClient;
          revoke(token: string, done?: () => void): void;
        };
      };
    };
  }
}

let gisPromise: Promise<void> | null = null;

// Load the GIS script ahead of time: the token popup must be opened directly
// from a click handler, or browsers will block it.
export function loadGoogleIdentityServices(): Promise<void> {
  if (isNativeApp() || window.google?.accounts?.oauth2)
    return Promise.resolve();

  gisPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });

  return gisPromise;
}

export interface GmailToken {
  accessToken: string;
  expiresAt: number;
}

export function requestGmailToken(clientId: string): Promise<GmailToken> {
  if (isNativeApp()) {
    return callNative<{ accessToken: string; expiresIn: number }>('gmailAuthorize', { clientId }).then(result => ({
      accessToken: result.accessToken,
      expiresAt: Date.now() + result.expiresIn * 1000,
    }));
  }

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2)
    return Promise.reject(new Error('Google Identity Services is not loaded yet'));

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SEND_SCOPE,
      callback: response => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Authorization failed'));
        } else {
          resolve({
            accessToken: response.access_token,
            expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
          });
        }
      },
      error_callback: error => {
        reject(new Error(error.message || error.type));
      },
    });

    client.requestAccessToken();
  });
}

export function revokeGmailToken(token: GmailToken) {
  if (isNativeApp()) {
    callNative('gmailRevoke', { accessToken: token.accessToken }).catch(() => {});
    return;
  }

  window.google?.accounts?.oauth2?.revoke(token.accessToken);
}

export class GmailAuthError extends Error {}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes)
    binary += String.fromCharCode(byte);
  return btoa(binary);
}

// RFC 2047 encoded-word, so names and subjects can contain any character
// (accents, emoji) without risking header injection.
function encodeHeaderWord(text: string): string {
  return /^[\x20-\x7e]*$/.test(text) && !/[=?"<>]/.test(text)
    ? text
    : `=?UTF-8?B?${utf8ToBase64(text)}?=`;
}

function wrapBase64(base64: string): string {
  return base64.replace(/.{1,76}/g, '$&\r\n');
}

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface EmailMessage {
  toName: string;
  toEmail: string;
  subject: string;
  text: string;
  html: string;
}

export function buildRawMessage(message: EmailMessage, boundary = `secretsanta-${crypto.randomUUID()}`): string {
  if (/[\r\n<>\s]/.test(message.toEmail))
    throw new Error(`Invalid email address: ${message.toEmail}`);

  const lines = [
    `To: ${encodeHeaderWord(message.toName)} <${message.toEmail}>`,
    `Subject: ${encodeHeaderWord(message.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    wrapBase64(utf8ToBase64(message.text)),
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    wrapBase64(utf8ToBase64(message.html)),
    `--${boundary}--`,
    ``,
  ];

  // The message is pure ASCII at this point, so btoa is safe.
  return toBase64Url(btoa(lines.join('\r\n')));
}

export async function sendGmailMessage(token: GmailToken, message: EmailMessage): Promise<void> {
  const raw = buildRawMessage(message);

  let status: number;
  let bodyText: string;

  if (isNativeApp()) {
    ({ status, body: bodyText } = await callNative<{ status: number; body: string }>('gmailSend', { accessToken: token.accessToken, raw }));
  } else {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    status = response.status;
    bodyText = await response.text().catch(() => '');
  }

  if (status >= 200 && status < 300)
    return;

  let detail = `HTTP ${status}`;
  try {
    const body = JSON.parse(bodyText);
    if (body?.error?.message) detail = body.error.message;
  } catch {}

  if (status === 401)
    throw new GmailAuthError(detail);

  throw new Error(detail);
}
