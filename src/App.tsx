import React from 'react';
import { useState, useRef, useCallback } from 'react';
import { FolderOpen, FileSearch, FileText, BarChart2, FileCode, Package, Search } from 'lucide-react';
import { Spinner } from './components/Spinner';
import { ProgressBar } from './components/ProgressBar';
import { SearchResults } from './components/SearchResults';
import type { AnalysisProgress, AnalysisResult, SearchResult } from './types/analyzer';
import { DEFAULT_EXCLUDE_PATTERNS, MAX_FILES } from './types/analyzer';

function App() {
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress>({
    filesProcessed: 0,
    totalFiles: 0,
    currentFile: '',
    stage: 'scanning'
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress({
      filesProcessed: 0,
      totalFiles: 0,
      currentFile: '',
      stage: 'scanning'
    });
    
    try {
      let files: File[] = [];
      
      // Try using the Directory Picker API first
      try {
        const dirHandle = await window.showDirectoryPicker();
        // If successful, continue with existing worker logic
        const scannerWorker = new Worker(new URL('./workers/fileScanner.ts', import.meta.url), {
          type: 'module'
        });
        
        scannerWorker.onmessage = (e) => {
          if (e.data.type === 'progress') {
            setProgress(prev => ({ ...prev, ...e.data.payload }));
            if (e.data.payload.totalFiles > MAX_FILES) {
              setError(`Project contains ${e.data.payload.totalFiles.toLocaleString()} files. Please exclude some folders to keep analysis under ${MAX_FILES.toLocaleString()} files.`);
              setAnalyzing(false);
              scannerWorker.terminate();
            }
          } else if (e.data.type === 'result') {
            startAnalysis(e.data.payload.files);
          }
        };
        
        scannerWorker.postMessage({
          dirHandle,
          path: '/',
          excludePatterns: DEFAULT_EXCLUDE_PATTERNS
        });
        
      } catch (dirError) {
        // Fallback to file input if Directory Picker fails
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalyzing(false);
    }
  };

  const startAnalysis = (files: any[]) => {
    console.log('Starting analysis with files:', files.length);
    const analyzerWorker = new Worker(new URL('./workers/analyzer.ts', import.meta.url), {
      type: 'module'
    });
    
    analyzerWorker.onmessage = (e) => {
      if (e.data.type === 'progress') {
        console.log('Analysis progress:', e.data.payload);
        setProgress(prev => ({
          ...prev,
          stage: 'analyzing',
          ...e.data.payload
        }));
      } else if (e.data.type === 'result') {
        console.log('Analysis complete:', e.data.payload);
        setResult(e.data.payload);
        setAnalyzing(false);
      }
    };
    
    analyzerWorker.postMessage({ files });
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (fileList) {
      const files = Array.from(fileList);
      const scannerWorker = new Worker(new URL('./workers/fileScanner.ts', import.meta.url), {
        type: 'module'
      });
      
      scannerWorker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          setProgress(prev => ({ ...prev, ...e.data.payload }));
        } else if (e.data.type === 'result') {
          startAnalysis(e.data.payload.files);
        }
      };
      
      scannerWorker.postMessage({
        files,
        path: '/',
        excludePatterns: DEFAULT_EXCLUDE_PATTERNS
      });
    }
  };

  const handleSearch = useCallback((query: string) => {
    if (!result || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const searchWorker = new Worker(new URL('./workers/analyzer.ts', import.meta.url), {
      type: 'module'
    });

    searchWorker.onmessage = (e) => {
      if (e.data.type === 'result') {
        setSearchResults(e.data.payload);
      }
    };

    searchWorker.postMessage({
      type: 'search',
      query: query.trim(),
      files: result.files
    });
  }, [result]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-8 flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Project Analyzer</h1>
            {result && (
              <div className="relative flex-1 max-w-lg">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  placeholder="Search for variables, functions, imports..."
                  className="w-full px-4 py-2 pl-10 bg-white border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              className="hidden"
              webkitdirectory=""
              directory=""
              multiple
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderOpen className="w-5 h-5 mr-2" />
              Analyze Project
            </button>
          </div>
        </div>

        {result && (
          <div className="mb-8">
            <SearchResults results={searchResults} query={searchQuery} />
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p>{error}</p>
            <p className="mt-2 text-sm">
              Try adding these patterns to exclude:
              <code className="ml-2 px-2 py-1 bg-red-100 rounded">
                dist/*, build/*, public/*, assets/*
              </code>
            </p>
          </div>
        )}

        {analyzing && <ProgressBar progress={progress} />}

        {result && (
          <>
            <div className="mt-8 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <FileSearch className="w-6 h-6 mr-2 text-blue-600" />
                        Project Overview
                      </h2>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center text-gray-600 mb-1">
                            <FileText className="w-4 h-4 mr-2" />
                            Total Files
                          </div>
                          <div className="text-2xl font-semibold">{result.summary.totalFiles}</div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center text-gray-600 mb-1">
                            <BarChart2 className="w-4 h-4 mr-2" />
                            Avg Lines
                          </div>
                          <div className="text-2xl font-semibold">
                            {result.summary.avgLinesOfCode} LOC
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                        <FileCode className="w-5 h-5 mr-2 text-blue-600" />
                        Critical Files ({result.criticalPaths.length})
                        {result.criticalPaths.length === 0 && (
                          <Spinner className="w-4 h-4 ml-2 text-blue-600" />
                        )}
                      </h3>
                      {result.criticalPaths.length === 0 ? (
                        <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                          Analyzing project structure...
                        </div>
                      ) : (
                        <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                          {result.criticalPaths.map(path => (
                            <li key={path} className="text-sm bg-gray-50 p-2 rounded flex items-center justify-between group hover:bg-gray-100 transition-colors">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <code className="text-blue-600 truncate">{path}</code>
                              </div>
                              <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                {result.files.find(f => f.path === path)?.content?.split('\n').length || 0} LOC
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        These files are essential for project configuration and core functionality
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-blue-600" />
                        Project Structure
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(result.filesByCategory).map(([category, files]) => (
                          <div key={category} className="bg-gray-50 p-3 rounded">
                            <div className="font-medium text-gray-700 mb-1">{category}</div>
                            <div className="text-sm text-gray-600">
                              {files.length} file{files.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700 mb-3">Largest Files</h3>
                      <ul className="space-y-2">
                        {result.summary.largestFiles.map(({ path, size, lines }) => (
                          <li key={path} className="text-sm bg-gray-50 p-2 rounded flex justify-between">
                            <code className="text-blue-600 flex-1">{path}</code>
                            <div className="text-gray-600 flex gap-4">
                              <span>{Math.round(size / 1024)} KB</span>
                              <span>{lines} LOC</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
