import { useTranslation } from 'react-i18next';
import { isNativeApp } from '../utils/native';

interface SettingsProps {
  instructions: string;
  onChangeInstructions: (instructions: string) => void;
  googleClientId: string;
  defaultGoogleClientId?: string;
  onChangeGoogleClientId: (clientId: string) => void;
}

export function Settings({ instructions, onChangeInstructions, googleClientId, defaultGoogleClientId, onChangeGoogleClientId }: SettingsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="mb-2">
          <h4 className="block text-sm font-medium text-gray-700">
            {t('settings.instructions')}
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            {t('settings.instructionsHelp')}
          </p>
        </div>
        <textarea
          value={instructions}
          onChange={(e) => onChangeInstructions(e.target.value)}
          className="w-full p-2 border rounded min-h-[100px]"
          placeholder={t('settings.instructionsPlaceholder')}
        />
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="mb-2">
          <h4 className="block text-sm font-medium text-gray-700">
            {t('settings.googleClientId')}
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            {isNativeApp()
              ? t('settings.googleClientIdHelpNative', { bundleId: 'com.bens27.secretsanta' })
              : t('settings.googleClientIdHelp', { origin: window.location.origin })}
          </p>
        </div>
        <input
          type="text"
          value={googleClientId}
          onChange={(e) => onChangeGoogleClientId(e.target.value)}
          className="w-full p-2 border rounded font-mono text-xs"
          placeholder={defaultGoogleClientId || '1234567890-abc.apps.googleusercontent.com'}
          spellCheck={false}
        />
      </div>
    </div>
  );
} 