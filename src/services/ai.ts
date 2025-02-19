import OpenAI from 'openai';

export interface SongMetadata {
  name: string;
  artist?: string;
  tempo?: 'slow' | 'medium' | 'fast';
  genre?: string;
  energy?: number;
  mood?: string;
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
        store: true,
        messages: [
          {
            role: "system",
            content: `You are a music expert. Your task is to:
1. Correct song names and identify artists
2. If no artist is provided, suggest the most popular artist for that song
3. Format song names properly (correct capitalization, remove unnecessary spaces)
4. Remove any non-song-related text or annotations

You will receive a list of song names, one per line. For each song, identify the artist and return a JSON array.

Example input:
shape of you
perfect
castle on the hill

Example output:
[
  {"name": "Shape of You", "artist": "Ed Sheeran"},
  {"name": "Perfect", "artist": "Ed Sheeran"},
  {"name": "Castle on the Hill", "artist": "Ed Sheeran"}
]`
          },
          {
            role: "user",
            content: `Analyze these songs and return a JSON array with details for each song. Include name, artist (if not specified, use ""), tempo (slow/medium/fast), genre, energy (0-1), and mood. Format the response as a JSON array only, no markdown. Songs: ${songNames.join(', ')}`
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

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) {
        console.error('Parsed result is not an array');
        return songNames.map(name => ({ name, artist: '' }));
      }

      // Ensure all original songs are included
      const processedNames = new Set(parsed.map(s => s.name.toLowerCase()));
      const missingSongs = songNames
        .filter(name => !processedNames.has(name.toLowerCase()))
        .map(name => ({ name, artist: '' }));

      return [...parsed, ...missingSongs];
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return songNames.map(name => ({ name, artist: '' }));
    }
  }

  async analyzeSongs(songs: SongMetadata[]): Promise<SongMetadata[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        store: true,
        messages: [
          {
            role: "system",
            content: `You are a music expert. Analyze songs and provide detailed metadata:
1. Tempo (slow/medium/fast)
2. Genre (be specific but consistent)
3. Energy level (0-1, where 1 is highest energy)
4. Mood (descriptive but concise)

Return your response as a JSON array with the complete song metadata.
Example: [{"name": "Shallow", "artist": "Lady Gaga", "tempo": "medium", "genre": "pop rock", "energy": 0.7, "mood": "emotional"}]`
          },
          {
            role: "user",
            content: `Analyze these songs and add metadata:

Songs:
${JSON.stringify(songs, null, 2)}`
          }
        ],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content || "[]";
      console.log('Raw AI response:', content);
      const cleanContent = this.cleanJsonResponse(content);
      const parsed = JSON.parse(cleanContent);
      return Array.isArray(parsed) ? parsed : songs;
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return songs;
    }
  }

  async optimizePlaylistOrder(songs: SongMetadata[]): Promise<SongMetadata[]> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      store: true,
      messages: [
        {
          role: "system",
          content: `You are a professional DJ and playlist curator. 
Create the perfect playlist order following these rules:
1. Start with medium energy songs to set the mood
2. Gradually build up energy while maintaining flow
3. Group similar genres and moods together
4. Create smooth transitions between tempos
5. End with calmer songs for a nice cooldown
6. Consider both song characteristics and artist styles
7. Avoid jarring transitions in energy or mood

Return your response as a JSON array with songs in the optimal order.`
        },
        {
          role: "user",
          content: `Optimize this playlist order. Return the songs array in the optimal order.

Songs:
${JSON.stringify(songs, null, 2)}`
        }
      ],
      temperature: 0.5,
    });

    try {
      const content = response.choices[0].message.content || "[]";
      console.log('Raw AI response:', content);
      const cleanContent = this.cleanJsonResponse(content);
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return songs;
    }
  }
}
