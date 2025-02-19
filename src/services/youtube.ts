import { google } from 'googleapis';
import { Song } from '@/types';
import { MusicService } from './base';

export class YouTubeService implements MusicService {
  private youtube;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.youtube = google.youtube({ version: 'v3', auth });
  }

  async createPlaylist(name: string, description: string): Promise<string | null> {
    try {
      const playlistResponse = await this.youtube.playlists.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            title: name,
            description
          }
        }
      });

      return playlistResponse.data.id || null;
    } catch (error) {
      console.error('Create playlist error:', error);
      return null;
    }
  }

  async addToPlaylist(playlistId: string, songs: Song[]): Promise<void> {
    for (const song of songs) {
      try {
        // Search for video
        const searchResponse = await this.youtube.search.list({
          part: ['snippet'],
          q: `${song.name} ${song.artist || ''}`.trim(),
          type: ['video'],
          maxResults: 1
        });

        const videoId = searchResponse.data.items?.[0]?.id?.videoId;
        if (!videoId) {
          song.found = false;
          continue;
        }

        // Add to playlist
        await this.youtube.playlistItems.insert({
          part: ['snippet'],
          requestBody: {
            snippet: {
              playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId
              }
            }
          }
        });

        song.found = true;
        song.platformId = videoId;
      } catch (error) {
        console.error('Error adding song:', song.name, error);
        song.found = false;
      }
    }
  }
}
