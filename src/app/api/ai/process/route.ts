import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/services/ai';
import { Song } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { songs } = await req.json();
    console.log('Initial songs:', songs.length);
    
    const aiService = new AIService();

    // Extract song names for AI processing
    const songNames = songs.map((song: Song | string) => 
      typeof song === 'string' ? song : song.name
    );

    // Enhance songs (correct names and get artists)
    const enhancedSongs = await aiService.enhanceSongs(songNames);
    console.log('After enhancement:', enhancedSongs.length);

    // Convert to Song type
    const processedSongs: Song[] = enhancedSongs.map(song => ({
      ...song,
      found: false // Will be updated during platform-specific search
    }));
    console.log('Final songs:', processedSongs.length);

    return NextResponse.json({ songs: processedSongs });
  } catch (error) {
    console.error('AI processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process songs with AI' },
      { status: 500 }
    );
  }
}
