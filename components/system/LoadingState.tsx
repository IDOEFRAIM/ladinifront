import React from 'react';

export default function LoadingState({ message = 'Chargement...' }: { message?: string }) {
  return (
    <div className="w-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm text-gray-600 dark:text-gray-300">{message}</div>
      </div>
    </div>
  );
}
