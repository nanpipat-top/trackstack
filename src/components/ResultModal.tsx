import { AIProcessingStatus } from '@/types';

interface ResultModalProps {
  status: AIProcessingStatus | null;
}

export default function ResultModal({ status }: ResultModalProps) {
  if (!status) return null;

  const isProcessing = status.step !== 'done';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-center space-x-2">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400" />
          ) : (
            <span className="text-green-400 text-2xl">✓</span>
          )}
          <p className="text-lg font-medium text-white">{status.message}</p>
        </div>
      </div>
    </div>
  );
}
