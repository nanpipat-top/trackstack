import OpenAI from 'openai';

export interface SongMetadata {
  name: string;
  artist?: string;
}

export class AIService {
  private openai: OpenAI;
  private model = "gpt-4o";

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private cleanJsonResponse(content: string): string {
    console.log('Raw AI response:', content);
    try {
      // First try to find JSON in code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        console.log('Found JSON in code block');
        // Validate that it's a valid JSON string
        const parsed = JSON.parse(jsonMatch[1]);
        return JSON.stringify(parsed);
      }

      // Then try to find any array in the content
      const arrayMatch = content.match(/\[[\s\S]*?\]/);
      if (arrayMatch) {
        console.log('Found JSON array');
        // Validate that it's a valid JSON string
        const parsed = JSON.parse(arrayMatch[0]);
        return JSON.stringify(parsed);
      }

      // If no JSON found, try to parse the text response
      console.log('Parsing text response');
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      console.log('Found lines:', lines.length);
      
      // Convert text to JSON array
      const songs = lines.map(line => {
        const [name, artist] = line.split('-').map(s => s.trim());
        return { name: name || line, artist: artist || undefined };
      });

      return JSON.stringify(songs);
    } catch (error) {
      console.error('Error cleaning JSON response:', error);
      return '[]';
    }
  }

  async correctSongNames(songs: string[] | { name: string }[]): Promise<SongMetadata[]> {
    // Convert to array of strings if needed
    const songNames = Array.isArray(songs) 
      ? songs.map(song => typeof song === 'string' ? song : song.name)
      : [];

    console.log('Processing songs:', songNames);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a music expert. Your task is to correct song names and identify artists.

For each song in the input:
1. If you can identify the song:
   - Correct the song name (proper capitalization, remove unnecessary spaces)
   - Add the most popular artist for that song
   - Remove any non-song-related text or annotations
2. If you cannot identify the song:
   - Return the original input exactly as provided
   - Leave the artist field empty

Return a JSON array maintaining the exact same order as the input.
Each item should have 'name' and 'artist' fields.

Example input:
shape of u
some unknown song title
castle on the hill

Example output:
[
  {"name": "Shape of You", "artist": "Ed Sheeran"},
  {"name": "some unknown song title", "artist": ""},
  {"name": "Castle on the Hill", "artist": "Ed Sheeran"}
]`
          },
          {
            role: "user",
            content: songNames.join('\n')
          }
        ],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || "[]";
      console.log('Raw AI response:', content);

      // Extract JSON from markdown if present
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('No JSON found in response');
        return songNames.map(name => ({ name, artist: '' }));
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : songNames.map(name => ({ name, artist: '' }));
      } catch (error) {
        console.error('Error parsing JSON:', error);
        return songNames.map(name => ({ name, artist: '' }));
      }
    } catch (error) {
      console.error('Error in API call:', error);
      return songNames.map(name => ({ name, artist: '' }));
    }
  }

  async enhanceSongs(songs: SongMetadata[]): Promise<SongMetadata[]> {
    return await this.correctSongNames(songs);
  }
}
