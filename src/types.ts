export interface Song {
  name: string;
  artist?: string;
  found?: boolean;
  tempo?: 'slow' | 'medium' | 'fast';
  genre?: string;
  energy?: number;
  mood?: string;
  platformId?: string;  // ID of the song in the platform (e.g., YouTube video ID)
}

export type Platform = 'YouTube Music' | 'Spotify';

export interface ProcessResult {
  success: boolean;
  songs: Song[];
  platform: Platform;
  playlistUrl?: string;
  notFoundSongs?: string[];
}

export type AIProcessingStep = 'correcting' | 'analyzing' | 'ordering' | 'done';

export interface AIProcessingStatus {
  status: 'success' | 'error';
  message: string;
  step: AIProcessingStep;
}

export interface PlaylistResult {
  url: string;
  playlistId: string;
  title: string;
  thumbnail: string;
}
