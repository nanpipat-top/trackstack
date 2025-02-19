'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import SongInput from '@/components/SongInput';
import SongList from '@/components/SongList';
import PlatformSelector from '@/components/PlatformSelector';
import ResultModal from '@/components/ResultModal';
import { Platform, ProcessResult, AIProcessingStatus as Status, Song } from '@/types';
import toast from 'react-hot-toast';

type Step = 'input' | 'process';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState<Step>('input');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('Spotify');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rawSongs, setRawSongs] = useState<string[]>([]);
  const [processedSongs, setProcessedSongs] = useState<Song[] | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [aiStatus, setAIStatus] = useState<Status | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated' && searchParams.get('callback') === 'true') {
      const storedSongs = localStorage.getItem('pendingSongs');
      const storedPlatform = localStorage.getItem('pendingPlatform');
      
      if (storedSongs && storedPlatform) {
        try {
          localStorage.removeItem('pendingSongs');
          localStorage.removeItem('pendingPlatform');
          
          const songs = JSON.parse(storedSongs);
          setProcessedSongs(songs);
          setSelectedPlatform(storedPlatform as Platform);
          setCurrentStep('process');
          
          setIsLoading(true);
          
          const apiUrl = storedPlatform === 'YouTube Music' ? '/api/youtube' : '/api/spotify';
          
          fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              songs: songs,
              name: 'My Awesome Playlist'
            }),
          })
          .then(async response => {
            const responseText = await response.text();
            
            if (!response.ok) {
              throw new Error(`Failed to create playlist: ${responseText}`);
            }

            const data = JSON.parse(responseText);
            
            if (data.url) {
              window.open(data.url, '_blank');
            }
            toast.success('Playlist created successfully!');
            
            router.push('/');
          })
          .catch(error => {
            toast.error('Failed to create playlist. Please try again.');
          })
          .finally(() => {
            setIsLoading(false);
          });
        } catch (error) {
          toast.error('Failed to restore state. Please try again.');
          setIsLoading(false);
        }
      }
    }
  }, [session, status, searchParams, router]);

  const handleSongsSubmit = (songs: string[]) => {
    setRawSongs(songs);
    const initialSongs: Song[] = songs.map(name => ({
      name,
      found: false
    }));
    setProcessedSongs(initialSongs);
    setCurrentStep('process');
  };

  const handleProcessWithAI = async () => {
    setIsProcessing(true);
    const loadingToast = toast.loading('Correcting song names and adding artists...');
    
    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ songs: processedSongs }),
      });

      if (!response.ok) {
        throw new Error('Failed to process songs');
      }

      const data = await response.json();
      setProcessedSongs(data.songs);
      toast.success('AI processing complete!', {
        id: loadingToast,
        duration: 2000, 
      });
    } catch (error) {
      toast.error('Failed to process songs. Please try again.', {
        id: loadingToast,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!processedSongs || processedSongs.length === 0) {
      toast.error('Please add some songs first');
      return;
    }

    if (!selectedPlatform) {
      toast.error('Please select a platform');
      return;
    }

    if (!session) {
      try {
        const songsData = JSON.stringify(processedSongs);
        localStorage.setItem('pendingSongs', songsData);
        localStorage.setItem('pendingPlatform', selectedPlatform);
        
        await signIn(
          selectedPlatform === 'YouTube Music' ? 'google' : 'spotify',
          { callbackUrl: window.location.origin + '/?callback=true' }
        );
      } catch (error) {
        toast.error('Failed to store data. Please try again.');
      }
      return;
    }

    setIsLoading(true);
    setIsCreating(true);
    
    const apiUrl = selectedPlatform === 'YouTube Music' ? '/api/youtube' : '/api/spotify';
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songs: processedSongs,
          name: 'My Awesome Playlist'
        }),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`Failed to create playlist: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
      toast.success('Playlist created successfully!');
    } catch (error) {
      toast.error('Failed to create playlist. Please try again.');
    } finally {
      setIsLoading(false);
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedPlatform('Spotify');
    setProcessedSongs(null);
    setCurrentStep('input');
    setAIStatus(null);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Playlist Creator
            </h1>
            <p className="text-gray-400">
              Create playlists on YouTube Music or Spotify from your song list
            </p>
            <p className="text-sm text-purple-400">
              Optional AI processing for smart song correction and optimal ordering
            </p>
          </div>

          {currentStep === 'input' ? (
            <div className="space-y-4">
              <SongInput onSongsSubmit={handleSongsSubmit} />
              {rawSongs.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setCurrentStep('process')}
                    className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-gray-900 rounded-lg p-6 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Your Songs</h2>
                  <SongList
                    songs={processedSongs || []}
                    onSongsChange={setProcessedSongs}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <button
                      onClick={handleProcessWithAI}
                      disabled={isProcessing}
                      className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2 group relative"
                    >
                      <span className="text-purple-400">✨</span>
                      {isProcessing ? 'Processing...' : 'Process with AI (Optional)'}
                      <div className="absolute -bottom-24 left-0 right-0 bg-gray-800 rounded-lg p-4 text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        AI will help:
                        • Correct song names and add artists
                        • Analyze tempo, genre, and energy
                        • Optimize playlist order for best flow
                      </div>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Create Playlist</h3>
                    <PlatformSelector
                      selectedPlatform={selectedPlatform}
                      onSelect={setSelectedPlatform}
                    />
                    <button
                      onClick={handleCreatePlaylist}
                      disabled={isLoading || isCreating}
                      className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
                    >
                      {isLoading || isCreating ? (
                        <>
                          <span className="opacity-0">Create Playlist</span>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </>
                      ) : (
                        `Create on ${selectedPlatform}`
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-full px-6 py-3 text-gray-400 hover:text-gray-300 font-medium transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {aiStatus && <ResultModal status={aiStatus} />}

      {isCreating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg shadow-lg text-center border border-purple-500">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium text-white">Creating your playlist...</p>
            <p className="text-sm text-gray-400 mt-2">This may take a moment</p>
          </div>
        </div>
      )}
    </main>
  );
}
