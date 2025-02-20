import { Platform } from '@/types';
import Image from 'next/image';

interface PlatformSelectorProps {
  onSelect: (platform: Platform) => void;
  selectedPlatform?: Platform;
}

export default function PlatformSelector({ onSelect, selectedPlatform }: PlatformSelectorProps) {
  const platforms: Platform[] = ['YouTube Music', 'Spotify'];

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
            onClick={() => onSelect(platform)}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              getButtonColor(platform, selectedPlatform === platform)
            }`}
          >
            <Image 
              src={getIconPath(platform)}
              alt={platform}
              width={24}
              height={24}
              className={selectedPlatform === platform ? 'text-white' : 'text-gray-400'}
            />
            {platform}
          </button>
        ))}
      </div>
    </div>
  );
}
