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
    <div className="space-y-4">
      <div className="space-y-2">
        {songs.map((song, index) => (
          <div key={index} className="flex items-center gap-4 bg-gray-800/50 p-3 rounded-lg">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={song.name}
                  onChange={(e) => handleSongChange(index, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Song name"
                />
                <button
                  onClick={() => handleRemoveSong(index)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2">
                  {editingIndex === index ? (
                    <input
                      type="text"
                      value={song.artist || ''}
                      onChange={(e) => handleSongChange(index, 'artist', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-gray-800 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="Artist name"
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
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 cursor-pointer hover:text-white"
                      onClick={() => setEditingIndex(index)}
                    >
                      {song.artist ? (
                        <>
                          <span>Artist: {song.artist}</span>
                          <PencilIcon className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <span className="text-gray-500 italic flex items-center gap-2">
                          Add artist
                          <PencilIcon className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {(song.tempo || song.genre || song.energy || song.mood) && (
                <div className="flex flex-wrap gap-3 text-sm text-gray-400 px-3">
                  {song.tempo && <span>Tempo: {song.tempo}</span>}
                  {song.genre && <span>Genre: {song.genre}</span>}
                  {song.energy && <span>Energy: {song.energy}</span>}
                  {song.mood && <span>Mood: {song.mood}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
