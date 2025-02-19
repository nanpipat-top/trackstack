export type Platform = 'YouTube Music' | 'Spotify';

export interface Song {
  name: string;
  artist?: string;
  found: boolean;
  platformId?: string;
  tempo?: 'slow' | 'medium' | 'fast';
  genre?: string;
  energy?: number;
  mood?: string;
}

export interface ProcessResult {
  success: boolean;
  playlistUrl?: string;
  songs: Song[];
  notFoundSongs: string[];
}

export type AIProcessingStep = 'correcting' | 'analyzing' | 'ordering' | 'done';

export interface AIProcessingStatus {
  step: AIProcessingStep;
  message: string;
}
