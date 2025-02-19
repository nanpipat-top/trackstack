'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { PlayCircleIcon } from '@heroicons/react/24/solid';
import SongInput from '@/components/SongInput';
import SongList from '@/components/SongList';
import PlatformSelector from '@/components/PlatformSelector';
import ResultModal from '@/components/ResultModal';
import { Platform, ProcessResult, AIProcessingStatus as Status, Song, PlaylistResult } from '@/types';
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
  const [playlistResult, setPlaylistResult] = useState<PlaylistResult | null>(null);

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

  const handleSongInput = async (text: string) => {
    const songList = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(name => ({ name }));

    setCurrentStep('process');
    setProcessedSongs(songList);
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

    // Save current state before redirecting
    const currentState = {
      songs: processedSongs,
      platform: selectedPlatform
    };
    localStorage.setItem('playlistPendingState', JSON.stringify(currentState));

    // Always force new login
    try {
      setIsLoading(true);
      await signOut({ redirect: false });
      await signIn(
        selectedPlatform === 'YouTube Music' ? 'google' : 'spotify',
        { 
          callbackUrl: window.location.origin,
          prompt: 'consent'
        }
      );
    } catch (error) {
      toast.error('Failed to authenticate. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle auth callback and playlist creation
  useEffect(() => {
    const createPlaylistAfterAuth = async () => {
      // Check if we have pending state and valid session
      const pendingStateStr = localStorage.getItem('playlistPendingState');
      if (!pendingStateStr || !session?.accessToken) return;

      try {
        const pendingState = JSON.parse(pendingStateStr);
        setProcessedSongs(pendingState.songs);
        setSelectedPlatform(pendingState.platform);
        
        setIsLoading(true);
        setIsCreating(true);

        const apiUrl = pendingState.platform === 'YouTube Music' ? '/api/youtube' : '/api/spotify';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            songs: pendingState.songs,
            name: 'My Awesome Playlist'
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create playlist');
        }

        // Clear pending state
        localStorage.removeItem('playlistPendingState');
        
        setPlaylistResult(data);
        toast.success('Playlist created successfully!');
      } catch (error) {
        console.error('Error creating playlist:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create playlist');
        
        // Clear pending state on error too
        localStorage.removeItem('playlistPendingState');
      } finally {
        setIsLoading(false);
        setIsCreating(false);
      }
    };

    createPlaylistAfterAuth();
  }, [session]); // Run when session changes

  const handleReset = () => {
    setResult(null);
    setSelectedPlatform('Spotify');
    setProcessedSongs(null);
    setCurrentStep('input');
    setAIStatus(null);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-8">
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
            <div className="space-y-8">
              <SongInput onSongInput={handleSongInput} />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-gray-900 rounded-lg p-6 space-y-6">
                <div className="space-y-4">
                  {/* <h2 className="text-xl font-semibold">Your Songs</h2> */}
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
                    {/* <h3 className="text-lg font-medium">Create Playlist</h3> */}
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

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/95 p-8 rounded-2xl shadow-2xl text-center border border-purple-500/30">
            <div className="relative mb-4">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-white text-lg font-medium mb-1">
              {isCreating ? 'Creating playlist...' : 'Please wait...'}
            </p>
            <p className="text-gray-400 text-sm">This may take a moment</p>
          </div>
        </div>
      )}

      {playlistResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg shadow-lg text-center border border-purple-500 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-4">Playlist Created!</h3>
            
            <div className="relative mb-4 flex justify-center">
              <div className="w-24 h-24 bg-purple-600/20 rounded-full flex items-center justify-center">
                <PlayCircleIcon className="w-16 h-16 text-purple-500" />
              </div>
            </div>
            
            <h4 className="text-xl text-white mb-4">{playlistResult.title}</h4>
            
            <div className="bg-gray-800 p-3 rounded-lg mb-6 overflow-hidden">
              <p className="text-purple-400 text-sm break-all">{playlistResult.url.replace('www.', 'music.')}</p>
            </div>

            <div className="flex gap-3">
              <a
                href={playlistResult.url.replace('www.', 'music.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Open Playlist
              </a>
              <button
                onClick={() => setPlaylistResult(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
