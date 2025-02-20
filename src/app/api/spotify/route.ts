import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { SpotifyService } from '@/services/spotify';
import { Song } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { songs, name, description = 'Created with Playlist Creator' } = await req.json();

    if (!Array.isArray(songs) || !name) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const spotifyService = new SpotifyService(session.accessToken);
    const playlistId = await spotifyService.createPlaylist(name, description);

    if (!playlistId) {
      return NextResponse.json(
        { error: 'Failed to create playlist' },
        { status: 500 }
      );
    }

    await spotifyService.addToPlaylist(playlistId, songs as Song[]);

    return NextResponse.json({
      success: true,
      playlistId,
      message: 'Playlist created successfully',
      url: `https://open.spotify.com/playlist/${playlistId}`
    });
  } catch (error) {
    console.error('Error in Spotify API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
