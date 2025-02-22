import { Platform } from '@/types';
import Image from 'next/image';

interface PlatformSelectorProps {
  onSelect: (platform: Platform) => void;
  selectedPlatform?: Platform;
}

export default function PlatformSelector({ onSelect, selectedPlatform }: PlatformSelectorProps) {
  const platforms: Platform[] = ['Spotify', 'YouTube Music'];

  const getIconPath = (platform: Platform) => {
    switch (platform) {
      case 'YouTube Music':
        return '/youtube-music-icon.svg';
      case 'Spotify':
        return '/spotify-icon.svg';
      default:
        return '';
    }
  };

  const getButtonColor = (platform: Platform, isSelected: boolean) => {
    if (!isSelected) return 'bg-gray-800 text-gray-400 hover:text-white';
    
    switch (platform) {
      case 'YouTube Music':
        return 'bg-red-600 text-white';
      case 'Spotify':
        return 'bg-green-600 text-white';
      default:
        return 'bg-purple-600 text-white';
    }
  };

  return (
    <div className="w-full max-w-3xl">

      <h2 className="text-xl font-semibold text-white mb-4">Build on ⚡️</h2>
      <div className="flex gap-4">
        {platforms.map((platform) => (
          <button
            key={platform}
            onClick={() => platform === 'Spotify' && onSelect(platform)}
            className={`relative flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              getButtonColor(platform, selectedPlatform === platform)
            } ${platform === 'Spotify' ? 'transform hover:scale-105 shadow-lg hover:shadow-green-500/30' : ''} ${
              platform === 'YouTube Music' ? 'opacity-60 cursor-not-allowed' : ''
            }`}
            style={{
              flex: platform === 'Spotify' ? '1.2' : '1'
            }}
            disabled={platform === 'YouTube Music'}
          >
            <Image 
              src={getIconPath(platform)}
              alt={platform}
              width={platform === 'Spotify' ? 28 : 24}
              height={platform === 'Spotify' ? 28 : 24}
              className={selectedPlatform === platform ? 'text-white' : 'text-gray-400'}
            />
            {platform}
            {platform === 'YouTube Music' && (
              <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold">
                Coming Soon
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
