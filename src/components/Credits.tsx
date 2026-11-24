import { Coins, Heart, Sparkle, Star } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { MenuItem } from './SideMenu';

/** Who made this: the original author, then the fork's. */
export function Credits() {
  const { t } = useTranslation();

  return (
    <div className="mt-8 flex flex-col items-end gap-2 lg:mt-0 lg:fixed lg:bottom-4 lg:right-4 z-50">
      <div className="flex flex-wrap justify-end gap-2">
        <MenuItem to="https://bsky.app/profile/mael.dev" icon={<Star className={`text-orange-500`} weight={`fill`}/>}>
          {t(`home.vanity`)}
        </MenuItem>
        <MenuItem to="https://github.com/sponsors/arcanis?frequency=one-time&sponsor=arcanis" icon={<Heart className={`text-red-700`} weight={`fill`}/>}>
          {t(`home.sponsor`)}
        </MenuItem>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <MenuItem to="https://github.com/bens27/secretsanta" icon={<Sparkle className={`text-purple-600`} weight={`fill`}/>}>
          {t(`home.diversified`)}
        </MenuItem>
        <MenuItem to="https://github.com/sponsors/bens27?frequency=one-time" icon={<Coins className={`text-yellow-600`} weight={`fill`}/>}>
          {t(`home.spareChange`)}
        </MenuItem>
      </div>
    </div>
  );
}
