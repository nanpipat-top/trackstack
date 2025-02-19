import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { YouTubeService } from '@/services/youtube';
import { SpotifyService } from '@/services/spotify';
import { ProcessResult, Song } from '@/types';
import { MusicService } from '@/services/base';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  try {
    const { songs, platform } = await req.json();

    let service: MusicService;
    if (platform === 'youtube') {
      service = new YouTubeService(session.accessToken as string);
    } else if (platform === 'spotify') {
      service = new SpotifyService(session.accessToken as string);
    } else {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    // Create playlist
    const playlistName = 'My Imported Playlist';
    const playlistDescription = 'Created with Playlist Creator';
    const playlistId = await service.createPlaylist(playlistName, playlistDescription);

    if (!playlistId) {
      return NextResponse.json(
        { error: 'Failed to create playlist' },
        { status: 500 }
      );
    }

    // Process songs
    const songObjects: Song[] = Array.isArray(songs) 
      ? songs.map((song: string | Song) => {
          if (typeof song === 'string') {
            return {
              name: song,
              found: false
            };
          }
          return song;
        })
      : [];

    await service.addToPlaylist(playlistId, songObjects);

    const result: ProcessResult = {
      success: true,
      platform: platform === 'youtube' ? 'YouTube Music' : 'Spotify',
      playlistUrl: platform === 'youtube' 
        ? `https://music.youtube.com/playlist?list=${playlistId}`
        : `https://open.spotify.com/playlist/${playlistId}`,
      songs: songObjects,
      notFoundSongs: songObjects
        .filter(song => !song.found)
        .map(song => song.name)
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Playlist creation error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
