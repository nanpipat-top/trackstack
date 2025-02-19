import { ChangeEvent, DragEvent, useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface SongInputProps {
  onSongsSubmit: (songs: string[]) => void;
}

export default function SongInput({ onSongsSubmit }: SongInputProps) {
  const [songs, setSongs] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setSongs(e.target.value);
  };

  const handleSubmit = () => {
    const songList = songs
      .split('\n')
      .map(song => song.trim())
      .filter(song => song.length > 0);
    if (songList.length > 0) {
      onSongsSubmit(songList);
      setSongs(''); // Reset songs after submission
    }
  };

  const processText = async (text: string) => {
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length > 0) {
      setSongs(lines.join('\n'));
      onSongsSubmit(lines);
      setSongs(''); // Reset songs after submission
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      if (file.type.startsWith('image/')) {
        // Process image with OCR
        const worker = await createWorker('eng');
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();
        await processText(text);
      } else if (file.type === 'text/plain') {
        // Process text file
        const text = await file.text();
        await processText(text);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Failed to process file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="space-y-4">
        <div
          className={`relative border-2 ${
            isDragging ? 'border-purple-500' : 'border-gray-700'
          } border-dashed rounded-lg p-4`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <textarea
            value={songs}
            onChange={handleTextChange}
            placeholder="Enter your songs, one per line..."
            className="w-full h-48 bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {!songs && (
              <div className="text-gray-500 text-center">
                <DocumentTextIcon className="w-8 h-8 mx-auto mb-2" />
                <p>Type or drag & drop</p>
                <p className="text-sm">Supports text and image files</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white flex items-center space-x-2"
          >
            <PhotoIcon className="w-5 h-5" />
            <span>Upload Image</span>
          </button>
          
          {songs.trim() && (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
            >
              Next
            </button>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,text/plain"
          onChange={(e) => handleFileSelect(e)}
        />
      </div>
    </div>
  );
}
