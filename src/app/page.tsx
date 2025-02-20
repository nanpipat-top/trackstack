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
import { AIService } from '@/services/ai';
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
  const [showSpotifyButton, setShowSpotifyButton] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const switchToSpotify = () => {
    setSelectedPlatform('Spotify');
    setShowSpotifyButton(false);
    toast.success('Switched to Spotify! Try creating your playlist again', {
      duration: 4000
    });
  };

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
              const data = JSON.parse(responseText);
              toast.error(data.error, {
                duration: 5000,
                style: {
                  maxWidth: '500px',
                  whiteSpace: 'pre-wrap'
                }
              });
              if (data.details) {
                console.debug('Error details:', data.details);
              }
              if (data.suggestSpotify) {
                setShowSpotifyButton(true);
              }
              const e = data.error instanceof Error ? data.error : new Error(data.error || 'Failed to create playlist');
              setError(e);
              throw e;
            }

            const data = JSON.parse(responseText);
            
            if (data.url) {
              window.open(data.url, '_blank');
            }
            toast.success('Playlist created successfully!');
            
            router.push('/');
          })
          .catch(error => {
            const e = error instanceof Error ? error : new Error('Unknown error occurred');
            setError(e);
            toast.error(e.message);
          })
          .finally(() => {
            setIsLoading(false);
          });
        } catch (error) {
          const e = error instanceof Error ? error : new Error('Unknown error occurred');
          setError(e);
          toast.error(e.message);
          setIsLoading(false);
        }
      }
    }
  }, [session, status, searchParams, router]);

  const handleSongInput = async (text: string) => {
    setIsProcessing(true);
    const songList = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    setRawSongs(songList);

    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ songs: songList }),
      });

      if (!response.ok) {
        const data = await response.json();
        
        // Show error message
        toast.error(data.error, {
          duration: 5000,
          style: {
            maxWidth: '500px',
            whiteSpace: 'pre-wrap'
          }
        });

        // Show development details if available
        if (data.details) {
          console.debug('Error details:', data.details);
        }
        
        if (data.suggestSpotify) {
          setShowSpotifyButton(true);
        }
        
        const e = data.error instanceof Error ? data.error : new Error(data.error || 'Failed to process songs');
        setError(e);
        throw e;
      }

      const data = await response.json();
      // Ensure data is in the correct format
      const processedData = Array.isArray(data) ? data : data.songs || [];
      setProcessedSongs(processedData.map((song: any) => ({
        name: typeof song === 'string' ? song : song.name || '',
        artist: typeof song === 'string' ? undefined : song.artist
      })));
      setCurrentStep('process');
      toast.success('Songs processed and enhanced with AI!');
    } catch (error) {
      const e = error instanceof Error ? error : new Error('Failed to process songs');
      setError(e);
      // If API fails, at least show the raw input as songs
      setProcessedSongs(songList.map(name => ({ name })));
      setCurrentStep('process');
      toast.error(e.message);
      console.error('Error processing songs:', error);
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
      const e = error instanceof Error ? error : new Error('Failed to authenticate');
      setError(e);
      toast.error(e.message);
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
          const errorText = data.error || '';
          if (errorText.includes('quota')) {
            toast.error(
              'YouTube API limit reached. Please try again later or use Spotify instead.',
              { duration: 5000 }
            );
          } else {
            toast.error('Failed to create playlist. Please try again.');
          }
          const e = error instanceof Error ? error : new Error('Failed to create playlist');
          setError(e);
          throw e;
        }

        // Clear pending state
        localStorage.removeItem('playlistPendingState');
        
        setPlaylistResult(data);
        toast.success('Playlist created successfully!');
      } catch (error) {
        const e = error instanceof Error ? error : new Error('Failed to create playlist');
        setError(e);
        console.error('Error creating playlist:', error);
        toast.error(e.message);
        
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
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
              Trackstack ✨
            </h1>
            <p className="text-xl text-gray-400">
              Stack your tracks, craft your perfect playlist
            </p>
          </div>

          {currentStep === 'input' && (
            <div className="max-w-2xl mx-auto w-full space-y-8">
              <SongInput onSongInput={handleSongInput} isProcessing={isProcessing} />
            </div>
          )}

          {currentStep === 'process' && (
            <div className="space-y-8">
              <div className="bg-gray-900 rounded-lg p-6 space-y-6 transform transition-all duration-300 hover:shadow-[0_0_30px_-12px] hover:shadow-purple-500/20">
                <div className="space-y-4">
                  <SongList 
                    songs={processedSongs || []} 
                    onSongsChange={setProcessedSongs}
                  />
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 space-y-6">
                <PlatformSelector
                  selectedPlatform={selectedPlatform}
                  onSelect={setSelectedPlatform}
                />
                <button
                  onClick={handleCreatePlaylist}
                  disabled={isCreating || !processedSongs?.length}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  {isCreating ? 'Creating Playlist...' : 'Create Playlist'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {aiStatus && <ResultModal status={aiStatus} />}

      {(isLoading || isProcessing) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/95 p-8 rounded-2xl shadow-2xl text-center border border-purple-500/30">
            <div className="relative mb-4">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-white text-lg font-medium mb-1">
              {isCreating ? 'Creating your epic playlist... 🎵' : 
               isProcessing ? 'Enhancing with AI Magic... ✨' : 
               'Working some magic... ✨'}
            </p>
            <p className="text-gray-400 text-sm">Just a moment while we craft something special 🪄</p>
          </div>
        </div>
      )}

      {playlistResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg shadow-lg text-center border border-purple-500 max-w-md w-full mx-4 transform transition-all duration-300 hover:shadow-[0_0_50px_-12px] hover:shadow-purple-500/30">
            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
              Your Stack is Ready! 🎉
            </h3>
            
            <div className="relative mb-4 flex justify-center transform transition-all duration-300 hover:scale-105">
              <div className="w-24 h-24 bg-purple-600/20 rounded-full flex items-center justify-center">
                <PlayCircleIcon className="w-16 h-16 text-purple-500" />
              </div>
            </div>
            
            <h4 className="text-xl text-white mb-4">{playlistResult.title}</h4>
            
            <div className="bg-gray-800 p-3 rounded-lg mb-6 overflow-hidden transform transition-all duration-300 hover:bg-gray-700">
              <p className="text-purple-400 text-sm break-all">{playlistResult.url.replace("www.", "music.")}</p>
            </div>

            <div className="flex gap-3">
              <a
                href={playlistResult.url.replace("www.", "music.")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5"
              >
                Open Playlist 🎵
              </a>
              <button
                onClick={() => setPlaylistResult(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5"
              >
                Create Another ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {showSpotifyButton && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <span>Want to try Spotify instead?</span>
          <button
            onClick={switchToSpotify}
            className="bg-white text-green-600 px-4 py-2 rounded-md font-semibold hover:bg-green-50 transition-colors"
          >
            Switch to Spotify
          </button>
        </div>
      )}

      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-50 border-l-4 border-red-500 p-4 max-w-2xl w-full mx-4 rounded shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 whitespace-pre-wrap">{error.message}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
