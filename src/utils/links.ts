import { encryptText } from "./crypto";
import { ReceiverData } from "../types";

export async function generateAssignmentLink(giver: string, receiver: string, receiverHint?: string, instructions?: string, mode?: string) {
  // The macOS app is served from a private URL scheme, so its links must
  // point at the public website instead (set at build time).
  const baseUrl = import.meta.env.VITE_PUBLIC_URL?.replace(/\/$/, '')
    ?? `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}`;
  
  // If there's a hint, encrypt a JSON object
  const dataToEncrypt = receiverHint
    ? JSON.stringify({ name: receiver, hint: receiverHint } as ReceiverData)
    : receiver;
    
  const encryptedReceiver = await encryptText(dataToEncrypt);
  const params = new URLSearchParams({
    from: giver,
    to: encryptedReceiver,
  });
  
  if (instructions?.trim()) {
    params.set('info', instructions.trim());
  }

  // Recipients see the organizer's festive mode.
  if (mode && mode !== 'classic') {
    params.set('mode', mode);
  }

  return `${baseUrl}/pairing?${params.toString()}`;
}

export function generateCSV(assignments: [string, string][]) {
  const csvContent = assignments
    .map(([giver, receiver]) => `${giver}\t${receiver}`)
    .join('\n');
  return `Giver\tReceiver\n${csvContent}`;
} 