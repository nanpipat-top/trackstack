import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/services/ai';
import { Song } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { songs } = await req.json();
    console.log('Initial songs:', songs.length);
    
    const aiService = new AIService();

    // Step 1: Correct song names
    const correctedSongs = await aiService.correctSongNames(songs);
    console.log('After correction:', correctedSongs.length);

    // Step 2: Analyze songs
    const analyzedSongs = await aiService.analyzeSongs(correctedSongs);
    console.log('After analysis:', analyzedSongs.length);

    // Step 3: Optimize playlist order
    const optimizedSongs = await aiService.optimizePlaylistOrder(analyzedSongs);
    console.log('After optimization:', optimizedSongs.length);

    // Convert to Song type
    const processedSongs: Song[] = optimizedSongs.map(song => ({
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
