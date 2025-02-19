import axios from 'axios';
import { Song } from '@/types';
import { MusicService } from './base';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export class SpotifyService implements MusicService {
  constructor(private accessToken: string) {}

  private async search(query: string): Promise<string | null> {
    try {
      const response = await axios.get(`${SPOTIFY_API_BASE}/search`, {
        params: {
          q: query,
          type: 'track',
          limit: 1
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });

      if (response.data.tracks.items && response.data.tracks.items.length > 0) {
        return response.data.tracks.items[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Spotify search error:', error);
      return null;
    }
  }

  async createPlaylist(name: string, description: string): Promise<string | null> {
    try {
      // First get user ID
      const meResponse = await axios.get(`${SPOTIFY_API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });
      const userId = meResponse.data.id;

      // Create playlist
      const response = await axios.post(
        `${SPOTIFY_API_BASE}/users/${userId}/playlists`,
        {
          name,
          description,
          public: false
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.id;
    } catch (error) {
      console.error('Create playlist error:', error);
      return null;
    }
  }

  async addToPlaylist(playlistId: string, songs: Song[]): Promise<void> {
    const uris: string[] = [];
    
    // Search for all songs first
    for (const song of songs) {
      if (!song.platformId) {
        const trackUri = await this.search(`${song.name} ${song.artist || ''}`);
        if (trackUri) {
          song.platformId = trackUri;
          song.found = true;
          uris.push(trackUri);
        } else {
          song.found = false;
        }
      } else {
        uris.push(song.platformId);
      }
    }

    // Add found songs to playlist in batches of 100 (Spotify API limit)
    if (uris.length > 0) {
      try {
        for (let i = 0; i < uris.length; i += 100) {
          const batch = uris.slice(i, i + 100);
          await axios.post(
            `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
            {
              uris: batch
            },
            {
              headers: {
                Authorization: `Bearer ${this.accessToken}`
              }
            }
          );
        }
      } catch (error) {
        console.error('Add to playlist error:', error);
      }
    }
  }
}
