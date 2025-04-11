import React from 'react';
import { FileText, Star, Code } from 'lucide-react';
import type { SearchResult } from '../types/analyzer';
import { useMemo } from 'react';

interface Props {
  results: SearchResult[];
  query: string;
}

interface GroupedResults {
  [directory: string]: SearchResult[];
}

function openInVSCode(files: string[]) {
  // Use the VS Code API to open multiple files
  const paths = files.join(' ');
  // @ts-ignore - VS Code API
  window.xdg_open(`vscode://file/${paths}`);
}

function getDirectory(path: string): string {
  const parts = path.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
}

function groupResultsByDirectory(results: SearchResult[]): GroupedResults {
  return results.reduce((groups, result) => {
    const directory = getDirectory(result.file.path);
    if (!groups[directory]) {
      groups[directory] = [];
    }
    groups[directory].push(result);
    return groups;
  }, {} as GroupedResults);
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

export function SearchResults({ results, query }: Props) {
  if (!query) {
    return null;
  }

  if (results.length === 0) {
    return null;
  }

  const groupedResults = useMemo(() => groupResultsByDirectory(results), [results]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </div>
        <button
          onClick={() => openInVSCode(results.map(r => r.file.path))}
          className="flex items-center px-3 py-1.5 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
        >
          <Code className="w-4 h-4 mr-2" />
          Open in VS Code
        </button>
      </div>
      <div className="space-y-4">
        {Object.entries(groupedResults).map(([directory, dirResults]) => (
          <div key={directory} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">
                {directory === '/' ? '/' : directory}
                <span className="ml-2 text-gray-500">
                  ({dirResults.length} file{dirResults.length !== 1 ? 's' : ''})
                </span>
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {dirResults.map((result) => (
                <div 
                  key={result.file.path}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="text-left">
                        <h4 className="font-medium text-gray-900">
                          <span className="text-gray-500">
                            {directory === '/' ? '' : `${directory}/`}
                          </span>
                          <span>{getFileName(result.file.path)}</span>
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {result.matches} matches • {result.type} reference
                        </p>
                      </div>
                    </div>
                    {result.significance > 0.7 && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 rounded-md">
                        <Star className="w-4 h-4 text-amber-400" fill="currentColor" />
                        <span className="text-xs font-medium text-amber-700">IMPORTANT FILE</span>
                      </div>
                    )}
                  </div>
                  
                  {result.context && (
                    <div className="mt-3 text-sm">
                      <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                        <code className="text-gray-700">{result.context}</code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}