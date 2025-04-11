import React from 'react';
import { AnalysisProgress } from '../types/analyzer';

interface Props {
  progress: AnalysisProgress;
}

export function ProgressBar({ progress }: Props) {
  const percentage = Math.round((progress.filesProcessed / progress.totalFiles) * 100) || 0;
  
  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1)}
        </span>
        <span className="text-sm font-medium text-gray-700">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-gray-500 truncate">
        Currently processing: {progress.currentFile}
      </p>
    </div>
  );
}