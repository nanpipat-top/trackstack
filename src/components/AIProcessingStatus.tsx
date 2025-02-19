import { AIProcessingStatus as Status, AIProcessingStep } from '@/types';

interface AIProcessingStatusProps {
  status: Status | null;
}

export default function AIProcessingStatus({ status }: AIProcessingStatusProps) {
  if (!status) return null;

  const steps: { key: AIProcessingStep; label: string }[] = [
    { key: 'correcting', label: 'Correcting Song Names' },
    { key: 'analyzing', label: 'Analyzing Songs' },
    { key: 'ordering', label: 'Optimizing Order' },
    { key: 'done', label: 'Done' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === status.step);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg shadow-xl max-w-md w-full space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">AI Processing</h3>
          <p className="text-gray-400">{status.message}</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.key}
              className="flex items-center space-x-3"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  index === currentStepIndex
                    ? 'bg-purple-500 animate-pulse'
                    : index < currentStepIndex
                    ? 'bg-green-500'
                    : 'bg-gray-700'
                }`}
              >
                {index < currentStepIndex && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {index === currentStepIndex && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <span
                className={`${
                  index <= currentStepIndex ? 'text-white' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
