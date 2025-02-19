interface ProcessingStatusProps {
  isProcessing: boolean;
}

export default function ProcessingStatus({ isProcessing }: ProcessingStatusProps) {
  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-md w-full space-y-4">
        <div className="flex items-center justify-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          <span className="text-lg font-medium text-white">Processing your playlist...</span>
        </div>
        <p className="text-gray-400 text-center">
          We're searching for your songs and creating your playlist. This may take a moment.
        </p>
      </div>
    </div>
  );
}
