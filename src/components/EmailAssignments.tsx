import { useEffect, useRef, useState } from 'react';
import { CheckCircle, EnvelopeSimple, GoogleLogo, PaperPlaneTilt, SignOut, Spinner, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { GmailAuthError, GmailToken, loadGoogleIdentityServices, requestGmailToken, revokeGmailToken, sendGmailMessage } from '../utils/gmail';
import { buildAssignmentEmail } from '../utils/assignmentEmail';
import { isValidEmail } from '../utils/parseParticipants';
import { useSanta } from './ThemeProvider';

export interface EmailPairing {
  giverId: string;
  giverName: string;
  giverEmail?: string;
  receiverName: string;
  receiverHint?: string;
}

type SendStatus =
  | { state: 'sending' }
  | { state: 'sent' }
  | { state: 'error'; message: string };

interface EmailAssignmentsProps {
  pairings: EmailPairing[];
  instructions?: string;
  googleClientId: string;
  // Assignments no longer match the participants; sending would be wrong.
  isStale: boolean;
  // Identifies the current draw, so statuses reset when pairings are regenerated.
  generationKey: string;
}

export function EmailAssignments({ pairings, instructions, googleClientId, isStale, generationKey }: EmailAssignmentsProps) {
  const { t } = useTranslation();
  const santa = useSanta();

  const [token, setToken] = useState<GmailToken | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, SendStatus>>({});
  const [isSending, setIsSending] = useState(false);
  const tokenRef = useRef<GmailToken | null>(null);
  tokenRef.current = token;

  useEffect(() => {
    if (googleClientId) {
      loadGoogleIdentityServices().catch(err => setAuthError(err.message));
    }
  }, [googleClientId]);

  useEffect(() => {
    setStatuses({});
  }, [generationKey]);

  const sendable = pairings.filter(p => p.giverEmail && isValidEmail(p.giverEmail));
  const missing = pairings.filter(p => !p.giverEmail || !isValidEmail(p.giverEmail));
  const pending = sendable.filter(p => statuses[p.giverId]?.state !== 'sent');

  const connect = async () => {
    setAuthError(null);
    try {
      setToken(await requestGmailToken(googleClientId));
    } catch (err) {
      setAuthError((err as Error).message);
    }
  };

  const disconnect = () => {
    if (token) revokeGmailToken(token);
    setToken(null);
  };

  const send = async (targets: EmailPairing[]) => {
    if (targets.length === 0) return;

    // Authorization opens a popup, which browsers only allow straight from a
    // click; so we require connecting first rather than prompting mid-send.
    const currentToken = tokenRef.current;
    if (!currentToken || currentToken.expiresAt < Date.now() + 60_000) {
      setToken(null);
      setAuthError(t('email.reconnect'));
      return;
    }

    setIsSending(true);
    try {
      for (const pairing of targets) {
        setStatuses(s => ({ ...s, [pairing.giverId]: { state: 'sending' } }));

        const message = buildAssignmentEmail({
          giverName: pairing.giverName,
          giverEmail: pairing.giverEmail!,
          receiverName: pairing.receiverName,
          receiverHint: pairing.receiverHint,
          instructions,
          strings: {
            subject: t('email.subject', { santa }),
            greeting: t('email.greeting', { name: pairing.giverName }),
            assignment: t('email.assignment'),
            hintLabel: t('email.hintLabel'),
            instructionsLabel: t('email.instructionsLabel'),
            signOff: t('email.signOff'),
          },
        });

        try {
          await sendGmailMessage(currentToken, message);
          setStatuses(s => ({ ...s, [pairing.giverId]: { state: 'sent' } }));
        } catch (err) {
          setStatuses(s => ({ ...s, [pairing.giverId]: { state: 'error', message: (err as Error).message } }));
          if (err instanceof GmailAuthError) {
            // Token expired or was revoked; stop and let the user reconnect.
            setToken(null);
            setAuthError(t('email.reconnect'));
            break;
          }
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const sendAll = () => {
    if (!window.confirm(t('email.confirmSendAll', { count: pending.length }))) return;
    send(pending);
  };

  if (!googleClientId) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-gray-600 space-y-2">
        <h4 className="font-medium text-gray-700 flex items-center gap-2">
          <EnvelopeSimple size={20} weight="bold" />
          {t('email.title')}
        </h4>
        <p className="text-xs">{t('email.notConfigured')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium text-gray-700 flex items-center gap-2">
          <EnvelopeSimple size={20} weight="bold" />
          {t('email.title')}
        </h4>
        {token ? (
          <button
            onClick={disconnect}
            disabled={isSending}
            className="p-1 px-2 text-xs text-gray-600 rounded hover:bg-gray-200 flex items-center gap-1 disabled:opacity-50"
          >
            <SignOut size={14} weight="bold" />
            {t('email.disconnect')}
          </button>
        ) : (
          <button
            onClick={connect}
            className="p-2 bg-white border text-gray-700 rounded hover:bg-gray-100 flex items-center gap-2"
          >
            <GoogleLogo size={18} weight="bold" />
            {t('email.connect')}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">{t('email.privacyNote')}</p>

      {authError && (
        <p className="text-xs p-2 bg-red-100 text-red-700 rounded">{authError}</p>
      )}

      {isStale && (
        <p className="text-xs p-2 bg-yellow-100 text-yellow-800 rounded">{t('email.staleWarning')}</p>
      )}

      {sendable.length > 0 && (
        <div className="grid grid-cols-[minmax(100px,auto)_1fr_auto] gap-2 items-center">
          {sendable.map(pairing => {
            const status = statuses[pairing.giverId];
            return (
              <div key={pairing.giverId} className="contents">
                <span className="font-medium">{pairing.giverName}</span>
                <span className="text-xs text-gray-500 truncate" title={status?.state === 'error' ? status.message : undefined}>
                  {status?.state === 'error'
                    ? <span className="text-red-600 flex items-center gap-1"><WarningCircle size={14} weight="bold" className="flex-none" />{status.message}</span>
                    : pairing.giverEmail}
                </span>
                <span className="flex justify-end">
                  {status?.state === 'sending' ? (
                    <Spinner size={18} className="animate-spin text-gray-500" />
                  ) : status?.state === 'sent' ? (
                    <CheckCircle size={18} weight="fill" className="text-green-600" aria-label={t('email.sent')} />
                  ) : (
                    <button
                      onClick={() => send([pairing])}
                      disabled={!token || isSending || isStale}
                      className="p-1 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-40 disabled:hover:bg-transparent"
                      title={t('email.sendOne', { name: pairing.giverName })}
                    >
                      <PaperPlaneTilt size={18} weight="bold" />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {missing.length > 0 && (
        <p className="text-xs text-gray-500">
          {t('email.missingEmails', { names: missing.map(p => p.giverName).join(', ') })}
        </p>
      )}

      <button
        onClick={sendAll}
        disabled={!token || isSending || isStale || pending.length === 0}
        className="w-full p-2 bg-red-700 text-white rounded hover:bg-red-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:bg-red-700"
      >
        {isSending ? <Spinner size={20} className="animate-spin" /> : <PaperPlaneTilt size={20} weight="bold" />}
        {sendable.length > 0 && pending.length === 0
          ? t('email.allSent')
          : t('email.sendAll', { count: pending.length })}
      </button>
    </div>
  );
}
