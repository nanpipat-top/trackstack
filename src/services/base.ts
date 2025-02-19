import { Song } from '@/types';

export interface MusicService {
  createPlaylist(name: string, description: string): Promise<string | null>;
  addToPlaylist(playlistId: string, songs: Song[]): Promise<void>;
}
