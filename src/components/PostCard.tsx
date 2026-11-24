import christmasWreath from '../../static/christmas-wreath.svg';
import giftBox from '../../static/gift-box.svg';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeProvider';

interface PostCardProps {
  children: React.ReactNode;
  className?: string;
}

function Badge({ emoji, fallback }: { emoji: string | undefined, fallback: string }) {
  return emoji
    ? <span className={`text-2xl leading-none`} aria-hidden="true">{emoji}</span>
    : <img className={`w-full h-full`} src={fallback} />;
}

export function PostCard({ children, className = "" }: PostCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const tagline = t(`themes.${theme.id}.tagline`);

  return (
    <div className={`postcard-frame shadow-md relative z-10 transform rotate-2 transition-transform duration-300 p-3 bg-postcard rounded-lg ${className}`}>
      <div className="relative p-8 bg-white">
        <div className="postcard-badge postcard-badge-a absolute -top-6 -left-6 w-12 h-12 bg-[#5CC48A] rounded-full flex items-center justify-center transform -rotate-12">
          <Badge emoji={theme.badges?.[0]} fallback={christmasWreath} />
        </div>
        
        {tagline && (
          <p className={`theme-tagline mb-4 text-sm italic text-gray-500`}>{tagline}</p>
        )}

        {children}
        
        <div className="postcard-badge postcard-badge-b absolute -bottom-6 -right-6 w-12 h-12 bg-[#EF3D3D] rounded-full flex items-center justify-center transform rotate-12">
          <Badge emoji={theme.badges?.[1]} fallback={giftBox} />
        </div>
      </div>
    </div>
  );
}
