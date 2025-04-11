import { FileNode, AnalysisResult } from '../types/analyzer';

function searchCode(query: string, files: FileNode[]): any[] {
  const results = [];
  const searchRegex = new RegExp(query, 'gi');

  for (const file of files) {
    if (!file.content) continue;

    const matches = {
      imports: file.imports.filter(imp => imp.match(searchRegex)).length,
      exports: file.exports.filter(exp => exp.match(searchRegex)).length,
      references: file.references.filter(ref => ref.match(searchRegex)).length,
      content: (file.content.match(searchRegex) || []).length
    };

    const totalMatches = matches.imports + matches.exports + matches.references;
    if (totalMatches > 0) {
      // Find the context around the match
      const lines = file.content.split('\n');
      let context = '';
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(searchRegex)) {
          const start = Math.max(0, i - 1);
          const end = Math.min(lines.length, i + 2);
          context = lines.slice(start, end).join('\n');
          break;
        }
      }

      const type = matches.exports > 0 ? 'export' :
                   matches.imports > 0 ? 'import' :
                   file.content.includes(`function ${query}`) ? 'function' :
                   'variable';

      // Calculate significance based on various factors
      const significance = (
        (matches.exports * 2) +
        matches.imports +
        (matches.references * 0.5) +
        (file.critical ? 0.3 : 0)
      ) / 10;

      results.push({
        file,
        type,
        matches: totalMatches,
        significance: Math.min(significance, 1),
        context
      });
    }
  }

  return results.sort((a, b) => b.significance - a.significance);
}

async function analyzeImports(file: FileNode): Promise<string[]> {
  return file.imports.map(imp => {
    const match = imp.match(/from\s+['"](.+?)['"]/);
    return match ? match[1] : '';
  }).filter(Boolean);
}

async function findReferences(file: FileNode, allFiles: FileNode[]): Promise<string[]> {
  const refs = new Set<string>();
  
  file.references.forEach(ref => {
    allFiles.forEach(otherFile => {
      if (otherFile.exports.includes(ref)) {
        refs.add(otherFile.path);
      }
    });
  });
  
  return Array.from(refs);
}

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === 'search') {
    const results = searchCode(e.data.query, e.data.files);
    self.postMessage({ type: 'result', payload: results });
    return;
  }

  const files: FileNode[] = e.data.files;
  console.log('Starting analysis with files:', files.length);
  
  // Calculate file statistics
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalLines = files.reduce((sum, file) => {
    return sum + (file.content?.split('\n').length || 0);
  }, 0);
  const avgLinesOfCode = Math.round(totalLines / files.length);
  const largestFiles = [...files]
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map(file => ({
      path: file.path,
      size: file.size,
      lines: file.content?.split('\n').length || 0
    }));

  // Categorize files
  const filesByCategory: Record<string, string[]> = {};
  files.forEach(file => {
    const category = getFileCategory(file.path);
    if (!filesByCategory[category]) {
      filesByCategory[category] = [];
    }
    filesByCategory[category].push(file.path);
  });
  
  const dependencies = new Map<string, string[]>();
  const moduleGraph = new Map<string, Set<string>>();
  const criticalPaths = new Set<string>();
  
  let processed = 0;
  
  for (const file of files) {
    console.log('Processing file:', file.path);
    // Analyze imports and build dependency graph
    const imports = await analyzeImports(file);
    dependencies.set(file.path, imports);
    
    // Build module graph
    const references = await findReferences(file, files);
    moduleGraph.set(file.path, new Set(references));
    
    // Identify critical files
    if (isCriticalFile(file)) {
      criticalPaths.add(file.path);
      console.log('Found critical file:', file.path);
    }
    
    processed++;
    if (processed % 50 === 0) {
      self.postMessage({
        type: 'progress',
        payload: { filesProcessed: processed, totalFiles: files.length }
      });
    }
  }
  
  const result: AnalysisResult = {
    files,
    criticalPaths: Array.from(criticalPaths),
    filesByCategory,
    summary: {
      totalFiles: files.length,
      totalSize,
      avgLinesOfCode,
      largestFiles
    },
    dependencies,
    moduleGraph
  };
  
  console.log('Analysis complete. Critical paths:', result.criticalPaths);
  self.postMessage({ type: 'result', payload: result });
};

function isCriticalFile(file: FileNode): boolean {
  // Log the file being checked
  console.log('Checking if critical:', file.path);

  // Check for high dependency count
  const hasHighDependencies = file.imports.length > 5;
  
  // Check for high reference count
  const hasHighReferences = file.references.length > 10;

  const criticalPatterns = [
    /package\.json$/,
    /tsconfig\.json$/,
    /vite\.config\./,
    /webpack\.config\./,
    /next\.config\./,
    /\.env$/,
    /Config\.js$/,
    /Config\.ts$/,
    /FormConfig\.js$/,
    /FormConfig\.ts$/,
    /index\./,
    /main\./,
    /App\./,
    /store\./,
    /reducer\./,
    /context\./,
    /Modal(s)?\.js$/,
    /Modal(s)?\.tsx?$/,
    /Drawer\.js$/,
    /Drawer\.ts$/,
    /Drawer\.tsx$/,
    /Step[0-9]+\.js$/,
    /Step[0-9]+\.tsx?$/,
    /api\.\w+$/,
    /client\.\w+$/,
    /service\.\w+$/,
    /constants\.\w+$/,
    /types\.\w+$/
  ];
  
  const isCritical = criticalPatterns.some(pattern => pattern.test(file.path)) ||
    hasHighDependencies ||
    hasHighReferences;

  if (isCritical) {
    console.log('Found critical file:', file.path);
  }
  return isCritical;
}

function getFileCategory(path: string): string {
  if (path.includes('/components/')) return 'Components';
  if (path.includes('/pages/')) return 'Pages';
  if (path.includes('/hooks/')) return 'Hooks';
  if (path.includes('/utils/')) return 'Utilities';
  if (path.includes('/lib/')) return 'Libraries';
  if (path.includes('/types/')) return 'Types';
  if (path.includes('/assets/')) return 'Assets';
  if (path.match(/\.(ts|js|jsx|tsx)$/)) return 'Source';
  if (path.match(/\.(json|ya?ml|toml)$/)) return 'Configuration';
  return 'Other';
}