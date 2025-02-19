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
    const playlist = await youtube.playlists.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          title: name,
          description: 'Created with Playlist Creator'
        }
      }
    });

    const playlistId = playlist.data.id;
    if (!playlistId) {
      throw new Error('Failed to create playlist');
    }

    // Get playlist details including thumbnail
    const playlistDetails = await youtube.playlists.list({
      part: ['snippet'],
      id: [playlistId]
    });

    const thumbnailUrl = playlistDetails.data.items?.[0]?.snippet?.thumbnails?.high?.url || '';
    const playlistTitle = playlistDetails.data.items?.[0]?.snippet?.title || name;

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

    return NextResponse.json({
      success: true,
      url: `https://www.youtube.com/playlist?list=${playlistId}`,
      playlistId,
      title: playlistTitle,
      thumbnail: thumbnailUrl
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create playlist';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
