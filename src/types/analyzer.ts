export interface FileNode {
  path: string;
  type: 'file' | 'directory';
  size: number;
  imports: string[];
  exports: string[];
  references: string[];
  content?: string;
  critical: boolean;
}

export interface AnalysisProgress {
  filesProcessed: number;
  totalFiles: number;
  currentFile: string;
  stage: 'scanning' | 'analyzing' | 'building-graph';
}

export interface AnalysisResult {
  files: FileNode[];
  criticalPaths: string[];
  filesByCategory: Record<string, string[]>;
  summary: {
    totalFiles: number;
    totalSize: number;
    avgLinesOfCode: number;
    largestFiles: Array<{ path: string; size: number; lines: number }>;
  };
  dependencies: Map<string, string[]>;
  moduleGraph: Map<string, Set<string>>;
}

export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.cache',
  '.temp',
  '.tmp',
  'vendor',
  'bower_components',
  '.idea',
  '.vscode',
  '.DS_Store'
] as const;

export const MAX_FILES = 1000;

export interface SearchResult {
  file: FileNode;
  type: 'variable' | 'function' | 'import' | 'export' | 'route';
  matches: number;
  significance: number;
  context?: string;
}

export interface WorkerMessage {
  type: 'analyze' | 'progress' | 'result' | 'search';
  payload: any;
}