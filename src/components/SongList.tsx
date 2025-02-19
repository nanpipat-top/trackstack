import { Song } from '@/types';
import { useState } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';

interface SongListProps {
  songs: Song[];
  onSongsChange: (songs: Song[]) => void;
}

export default function SongList({ songs, onSongsChange }: SongListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleSongChange = (index: number, field: keyof Song, value: string) => {
    const newSongs = [...songs];
    newSongs[index] = { ...newSongs[index], [field]: value };
    onSongsChange(newSongs);
  };

  const handleRemoveSong = (index: number) => {
    const newSongs = songs.filter((_, i) => i !== index);
    onSongsChange(newSongs);
  };

  return (
    <div className="w-full space-y-2">
      <h2 className="text-xl font-semibold text-white mb-4 text-center">Your Songs</h2>
      <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
        {songs.map((song, index) => (
          <div key={index} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={song.name}
                  onChange={(e) => handleSongChange(index, 'name', e.target.value)}
                  className="text-white font-medium truncate bg-transparent border-0 focus:outline-none focus:ring-0"
                />
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={song.artist || ''}
                    onChange={(e) => handleSongChange(index, 'artist', e.target.value)}
                    className="text-gray-400 text-sm truncate bg-transparent border-0 focus:outline-none focus:ring-0"
                    autoFocus
                    onBlur={() => setEditingIndex(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingIndex(null);
                      }
                    }}
                  />
                ) : (
                  <div 
                    className="text-gray-400 text-sm truncate cursor-pointer hover:text-white flex items-center gap-2"
                    onClick={() => setEditingIndex(index)}
                  >
                    {song.artist ? (
                      <>
                        <span>{song.artist}</span>
                        <PencilIcon className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span className="text-gray-500 italic">Add artist</span>
                        <PencilIcon className="w-3.5 h-3.5" />
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemoveSong(index)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {(song.tempo || song.genre || song.energy || song.mood) && (
              <div className="flex flex-wrap gap-2 text-sm">
                {song.tempo && (
                  <span className="px-2 py-1 bg-gray-700 rounded-full text-gray-300">
                    {song.tempo}
                  </span>
                )}
                {song.genre && (
                  <span className="px-2 py-1 bg-gray-700 rounded-full text-gray-300">
                    {song.genre}
                  </span>
                )}
                {song.energy && (
                  <span className="px-2 py-1 bg-gray-700 rounded-full text-gray-300">
                    Energy: {song.energy}
                  </span>
                )}
                {song.mood && (
                  <span className="px-2 py-1 bg-gray-700 rounded-full text-gray-300">
                    {song.mood}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
