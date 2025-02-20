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
        throw new Error('Failed to process songs');
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
      // If API fails, at least show the raw input as songs
      setProcessedSongs(songList.map(name => ({ name })));
      setCurrentStep('process');
      toast.error('Failed to process songs with AI. Showing raw input.');
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
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-white">Create Your Playlist</h1>
                <p className="text-gray-400">
                  Enter your songs below and we'll help you create a playlist
                </p>
              </div>
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
    </main>
  );
}
