import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../auth/auth.config';

// Simple in-memory store for rate limiting
// In production, you should use Redis or a database
const rateLimits = new Map<string, { count: number, resetAt: number }>();

const RATE_LIMIT = {
  maxRequests: 3, // Maximum playlists per day
  maxSongs: 20,   // Maximum songs per playlist
  windowMs: 24 * 60 * 60 * 1000 // 24 hours
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check rate limit
    const userId = session.user?.email || 'anonymous';
    const now = Date.now();
    const userLimit = rateLimits.get(userId);

    if (userLimit) {
      // Reset count if window has passed
      if (now > userLimit.resetAt) {
        rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
      } else if (userLimit.count >= RATE_LIMIT.maxRequests) {
        return NextResponse.json({
          error: `Rate limit exceeded. You can create up to ${RATE_LIMIT.maxRequests} playlists per day.`
        }, { status: 429 });
      } else {
        // Increment count
        rateLimits.set(userId, { count: userLimit.count + 1, resetAt: userLimit.resetAt });
      }
    } else {
      // First request from this user
      rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    }

    const body = await req.json();
    const { songs, name = 'Trackstack Playlist' } = body;

    // Check song limit
    if (songs.length > RATE_LIMIT.maxSongs) {
      return NextResponse.json({
        error: `Playlist is too large. Maximum ${RATE_LIMIT.maxSongs} songs allowed.`
      }, { status: 400 });
    }

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
      } catch {
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
  } catch (error: unknown) {
    console.error('Error in YouTube API:', error);
    
    // Handle Google API specific errors
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        return NextResponse.json({
          error: 'YouTube API limit reached. We recommend using Spotify instead as it has higher limits and is completely free!',
          suggestSpotify: true
        }, { status: 429 });
      }

      // Handle other errors
      let userMessage = 'Failed to create playlist on YouTube';
      let statusCode = 500;

      if (error.message.includes('quota')) {
        userMessage = 'YouTube API limit reached. We recommend using Spotify instead as it has higher limits and is completely free!';
        statusCode = 429;
      } else if (error.message.includes('authenticate')) {
        userMessage = 'Please sign in again to continue';
        statusCode = 401;
      } else {
        console.error('Unexpected error:', error);
      }

      return NextResponse.json(
        { 
          error: userMessage,
          suggestSpotify: true,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: statusCode }
      );
    }

    // If error is not an Error instance, return a generic error
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        suggestSpotify: true
      },
      { status: 500 }
    );
  }
}
