import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { songs, name = 'My Awesome Playlist' } = body;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    // Create playlist
    const playlistResponse = await youtube.playlists.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          title: name,
          description: 'Created with Playlist Creator'
        }
      }
    });

    const playlistId = playlistResponse.data.id;
    if (!playlistId) {
      throw new Error('Failed to create playlist');
    }

    // Add songs to playlist
    for (const song of songs) {
      try {
        // Search for song
        const searchResponse = await youtube.search.list({
          part: ['snippet'],
          q: song.name,
          maxResults: 1,
          type: ['video']
        });

        if (!searchResponse.data.items?.length) {
          continue;
        }

        // Get video ID
        const videoId = searchResponse.data.items[0].id?.videoId;
        if (!videoId) {
          continue;
        }

        // Add to playlist
        await youtube.playlistItems.insert({
          part: ['snippet'],
          requestBody: {
            snippet: {
              playlistId: playlistId,
              resourceId: {
                kind: 'youtube#video',
                videoId: videoId
              }
            }
          }
        });
      } catch (error) {
        // Continue with next song even if one fails
        continue;
      }
    }

    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    return NextResponse.json({ 
      success: true, 
      playlistId,
      url: playlistUrl
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create playlist';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
