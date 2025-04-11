import { FileNode, WorkerMessage, MAX_FILES } from '../types/analyzer';

async function processFile(file: File, path: string): Promise<FileNode> {
  const content = await file.text();
  
  // Extract imports using regex
  const importRegex = /import\s+?(?:(?:(?:[\w*\s{},]*)\s+from\s+?)|)(?:(?:".*?")|(?:'.*?'))[\s]*?(?:;|$|)/g;
  const imports = [...content.matchAll(importRegex)].map(match => match[0]);
  
  // Extract exports
  const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
  const exports = [...content.matchAll(exportRegex)].map(match => match[1]);
  
  // Find references (variable names, function calls, etc.)
  const referenceRegex = /\b\w+\b(?=\s*[\.(])/g;
  const references = [...content.matchAll(referenceRegex)].map(match => match[0]);
  
  return {
    path,
    type: 'file',
    size: file.size,
    content,
    imports,
    exports,
    references,
    critical: false
  };
}

self.onmessage = async (e: MessageEvent) => {
  const { dirHandle, files, path, excludePatterns } = e.data;
  
  const fileNodes: FileNode[] = [];
  let filesProcessed = 0;
  let totalFiles = 0;
  
  if (dirHandle) {
    // Handle directory picker case
    async function scanDirectory(handle: FileSystemDirectoryHandle, basePath: string = '') {
      try {
        for await (const entry of handle.values()) {
          if (shouldExclude(entry.name, excludePatterns)) continue;
          
          const entryPath = `${basePath}${basePath ? '/' : ''}${entry.name}`;
          
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const fileNode = await processFile(file, entryPath);
            fileNodes.push(fileNode);
            filesProcessed++;
            
            self.postMessage({
              type: 'progress',
              payload: { 
                filesProcessed,
                totalFiles,
                currentFile: entryPath
              }
            });
          } else if (entry.kind === 'directory') {
            const subDirHandle = await handle.getDirectoryHandle(entry.name);
            await scanDirectory(subDirHandle, entryPath);
          }
        }
      } catch (error) {
        console.error('Error scanning directory:', error);
      }
    }
    
    // First pass: count total files
    async function countFiles(handle: FileSystemDirectoryHandle) {
      for await (const entry of handle.values()) {
        if (shouldExclude(entry.name, excludePatterns)) continue;
        
        if (entry.kind === 'file') {
          totalFiles++;
        } else if (entry.kind === 'directory') {
          const subDirHandle = await handle.getDirectoryHandle(entry.name);
          await countFiles(subDirHandle);
        }
      }
    }
    
    await countFiles(dirHandle);
    
    self.postMessage({
      type: 'progress', 
      payload: { totalFiles, filesProcessed: 0, currentFile: '', stage: 'scanning' }
    });
    
    if (totalFiles > MAX_FILES) {
      return;
    }
    
    await scanDirectory(dirHandle);
  } else if (files) {
    // Handle file input case
    totalFiles = files.length;
    
    self.postMessage({
      type: 'progress', 
      payload: { totalFiles, filesProcessed: 0, currentFile: '', stage: 'scanning' }
    });
    
    if (totalFiles > MAX_FILES) {
      return;
    }
    
    for (const file of files) {
      if (!shouldExclude(file.name, excludePatterns)) {
        // Extract directory structure from webkitRelativePath
        const path = file.webkitRelativePath || file.name;
        const fileNode = await processFile(file, path);
        fileNodes.push(fileNode);
        filesProcessed++;
        
        self.postMessage({
          type: 'progress',
          payload: { 
            filesProcessed,
            totalFiles,
            currentFile: file.name
          }
        });
      }
    }
  }
  
  self.postMessage({
    type: 'result',
    payload: { files: fileNodes }
  });
};

function shouldExclude(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => 
    path.includes(pattern) || path.match(new RegExp(pattern))
  );
}