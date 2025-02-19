import { Platform } from '@/types';

interface PlatformSelectorProps {
  onSelect: (platform: Platform) => void;
  selectedPlatform?: Platform;
}

export default function PlatformSelector({ onSelect, selectedPlatform }: PlatformSelectorProps) {
  const platforms: Platform[] = ['YouTube Music', 'Spotify'];

  return (
    <div className="w-full max-w-3xl">
      <h2 className="text-xl font-semibold text-white mb-4">Select Platform</h2>
      <div className="flex gap-4">
        {platforms.map((platform) => (
          <button
            key={platform}
            onClick={() => onSelect(platform)}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
              selectedPlatform === platform
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {platform}
          </button>
        ))}
      </div>
    </div>
  );
}
