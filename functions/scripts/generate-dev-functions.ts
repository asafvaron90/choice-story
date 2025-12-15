import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const FUNCTIONS_DIR = path.join(__dirname, '../src/functions');
const OUTPUT_FILE = path.join(__dirname, '../src/functions/generated-dev-functions.ts');

interface FunctionInfo {
  name: string;
  file: string;
  isCallable: boolean;
  isHttp: boolean;
  hasRunWith: boolean;
  runWithConfig?: string;
  fullText: string;
  startLine: number;
  endLine: number;
}

function findExportedFunctions(filePath: string): FunctionInfo[] {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const functions: FunctionInfo[] = [];

  function visit(node: ts.Node) {
    // Look for exported const declarations
    if (ts.isVariableStatement(node)) {
      const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExported) return;

      node.declarationList.declarations.forEach(decl => {
        if (!ts.isIdentifier(decl.name)) return;
        const functionName = decl.name.text;
        
        // Skip dev- prefixed functions
        if (functionName.startsWith('dev')) return;

        // Check if it's a Firebase Function
        if (decl.initializer) {
          let isCallable = false;
          let isHttp = false;
          let hasRunWith = false;
          let runWithConfig = '';

          // Traverse the AST to find Firebase function patterns
          function traverseNode(node: ts.Node): void {
            // Check for onCall or onRequest
            if (ts.isPropertyAccessExpression(node)) {
              const propName = node.name.text;
              if (propName === 'onCall') {
                isCallable = true;
              } else if (propName === 'onRequest') {
                isHttp = true;
              } else if (propName === 'runWith') {
                hasRunWith = true;
                // Extract runWith config
                if (ts.isCallExpression(node.parent)) {
                  const configArg = node.parent.arguments[0];
                  if (configArg && ts.isObjectLiteralExpression(configArg)) {
                    runWithConfig = sourceCode.substring(configArg.getStart(), configArg.getEnd());
                  }
                }
              }
            }
            
            // Continue traversing children
            ts.forEachChild(node, traverseNode);
          }

          traverseNode(decl.initializer);

          // Only process Firebase Functions (onCall or onRequest)
          if (isCallable || isHttp) {
            const start = node.getStart();
            const end = node.getEnd();
            const fullText = sourceCode.substring(start, end);
            
            functions.push({
              name: functionName,
              file: path.basename(filePath),
              isCallable,
              isHttp,
              hasRunWith,
              runWithConfig,
              fullText,
              startLine: sourceFile.getLineAndCharacterOfPosition(start).line + 1,
              endLine: sourceFile.getLineAndCharacterOfPosition(end).line + 1,
            });
          }
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return functions;
}

function generateDevFunction(func: FunctionInfo): string {
  // Generate dev- prefixed name (camelCase)
  const devName = `dev${func.name.charAt(0).toUpperCase() + func.name.slice(1)}`;
  
  // Extract the function body from the original
  // We need to replace getEnvironment() calls with 'development'
  let functionBody = func.fullText;
  
  // Replace getEnvironment() with 'development'
  functionBody = functionBody.replace(/getEnvironment\(\)/g, "'development'");
  
  // Replace the function name with dev- version
  // Handle both "export const functionName" and "export const functionName ="
  functionBody = functionBody.replace(
    new RegExp(`export const ${func.name}\\s*=`),
    `export const ${devName} =`
  );

  return functionBody;
}

function extractHelperFunctions(filePath: string, sourceCode: string): string[] {
  const helpers: string[] = [];
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  function visit(node: ts.Node) {
    // Look for function declarations (not exported) at top level
    if (ts.isFunctionDeclaration(node) && !node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      // Check if it's at the top level (not nested)
      let parent = node.parent;
      let isTopLevel = true;
      while (parent) {
        if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isArrowFunction(parent)) {
          isTopLevel = false;
          break;
        }
        parent = parent.parent;
      }
      
      if (isTopLevel) {
        const start = node.getStart();
        const end = node.getEnd();
        const funcText = sourceCode.substring(start, end);
        // Skip closures that reference variables from parent scope
        if (!funcText.includes('storyDocRef') && !funcText.includes('updateStatus')) {
          helpers.push(funcText);
        }
      }
    }
    // Look for const/async function declarations (not exported) at top level
    else if (ts.isVariableStatement(node) && !node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      // Check if it's at the top level
      let parent = node.parent;
      let isTopLevel = true;
      while (parent) {
        if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isArrowFunction(parent)) {
          isTopLevel = false;
          break;
        }
        parent = parent.parent;
      }
      
      if (isTopLevel) {
        const decl = node.declarationList.declarations[0];
        if (decl && decl.initializer && (
          ts.isFunctionExpression(decl.initializer) || 
          ts.isArrowFunction(decl.initializer)
        )) {
          const start = node.getStart();
          const end = node.getEnd();
          const funcText = sourceCode.substring(start, end);
          // Skip closures that reference variables from parent scope
          if (!funcText.includes('storyDocRef') && !funcText.includes('updateStatus')) {
            helpers.push(funcText);
          }
        }
      }
    }
    
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return helpers;
}

function generateOutputFile(allFunctions: Map<string, FunctionInfo[]>): string {
  const generatedFunctions: string[] = [];
  const allHelperFunctions: string[] = [];

  // Collect all imports from source files
  const allImports = new Set<string>();
  
  // Collect all imports, helper functions, and generate functions
  allFunctions.forEach((funcs, file) => {
    const filePath = path.join(FUNCTIONS_DIR, file);
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    
    // Extract imports from the source file
    const importRegex = /^import\s+.*$/gm;
    const imports = sourceCode.match(importRegex);
    if (imports) {
      imports.forEach(imp => allImports.add(imp));
    }
    
    // Extract helper functions
    const helpers = extractHelperFunctions(filePath, sourceCode);
    allHelperFunctions.push(...helpers);
    
    funcs.forEach(func => {
      const generated = generateDevFunction(func);
      generatedFunctions.push(generated);
    });
  });

  // Deduplicate imports by normalizing them and ensure saveImageToStorage is included
  const normalizedImports = new Map<string, string>();
  let hasSaveImageToStorage = false;
  
  Array.from(allImports).forEach(imp => {
    // Extract the import path to use as key
    const pathMatch = imp.match(/from\s+["']([^"']+)["']/);
    if (pathMatch) {
      const importPath = pathMatch[1];
      // Check if this import includes saveImageToStorage
      if (imp.includes('saveImageToStorage')) {
        hasSaveImageToStorage = true;
      }
      // Keep the first occurrence of each import path, but merge utils imports
      if (importPath === '../lib/utils') {
        // Collect all utils imports and merge them
        const existingUtils = normalizedImports.get(importPath);
        if (existingUtils) {
          // Extract existing imports
          const existingMatch = existingUtils.match(/\{([^}]+)\}/);
          const newMatch = imp.match(/\{([^}]+)\}/);
          if (existingMatch && newMatch) {
            const existingItems = existingMatch[1].split(',').map(s => s.trim());
            const newItems = newMatch[1].split(',').map(s => s.trim());
            const allItems = [...new Set([...existingItems, ...newItems])];
            normalizedImports.set(importPath, `import { ${allItems.join(', ')} } from "${importPath}";`);
          }
        } else {
          normalizedImports.set(importPath, imp);
        }
      } else if (!normalizedImports.has(importPath)) {
        normalizedImports.set(importPath, imp);
      }
    } else {
      // If no path match, just add it
      normalizedImports.set(imp, imp);
    }
  });
  
  // Ensure saveImageToStorage is imported if needed
  if (!hasSaveImageToStorage && allHelperFunctions.some(h => h.includes('saveImageToStorage'))) {
    const utilsImport = normalizedImports.get('../lib/utils');
    if (utilsImport) {
      const match = utilsImport.match(/\{([^}]+)\}/);
      if (match) {
        const items = match[1].split(',').map(s => s.trim());
        if (!items.includes('saveImageToStorage')) {
          items.push('saveImageToStorage');
          normalizedImports.set('../lib/utils', `import { ${items.join(', ')} } from "../lib/utils";`);
        }
      }
    } else {
      normalizedImports.set('../lib/utils', 'import { saveImageToStorage } from "../lib/utils";');
    }
  }
  
  // Remove getEnvironment from imports since we replace it with 'development'
  const utilsImport = normalizedImports.get('../lib/utils');
  if (utilsImport) {
    const match = utilsImport.match(/\{([^}]+)\}/);
    if (match) {
      const items = match[1].split(',').map(s => s.trim()).filter(item => item !== 'getEnvironment');
      if (items.length > 0) {
        normalizedImports.set('../lib/utils', `import { ${items.join(', ')} } from "../lib/utils";`);
      } else {
        normalizedImports.delete('../lib/utils');
      }
    }
  }
  
  // Check if 'admin' is imported from utils - if so, remove the firebase-admin import
  // to avoid duplicate identifier conflicts
  const finalUtilsImport = normalizedImports.get('../lib/utils');
  if (finalUtilsImport && finalUtilsImport.includes('admin')) {
    // Remove the firebase-admin import since admin is already imported from utils
    normalizedImports.delete('firebase-admin');
  }

  // Deduplicate helper functions by their name and replace getEnvironment()
  const uniqueHelpersMap = new Map<string, string>();
  allHelperFunctions.forEach(helper => {
    // Extract function name to deduplicate
    const nameMatch = helper.match(/(?:function|const|async function)\s+(\w+)/);
    if (nameMatch) {
      const funcName = nameMatch[1];
      if (!uniqueHelpersMap.has(funcName)) {
        // Replace getEnvironment() in helpers
        const helperWithDev = helper.replace(/getEnvironment\(\)/g, "'development'");
        uniqueHelpersMap.set(funcName, helperWithDev);
      }
    } else {
      // For anonymous functions, just add with getEnvironment replaced
      const helperWithDev = helper.replace(/getEnvironment\(\)/g, "'development'");
      uniqueHelpersMap.set(helper, helperWithDev);
    }
  });

  return `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// This file is generated automatically by scripts/generate-dev-functions.ts
// Run 'npm run generate:dev-functions' to regenerate

${Array.from(normalizedImports.values()).join('\n')}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

${Array.from(uniqueHelpersMap.values()).join('\n\n')}

// ============================================================================
// GENERATED DEV- FUNCTIONS (STAGING)
// ============================================================================

${generatedFunctions.join('\n\n')}
`;
}

function main() {
  console.log('🔍 Scanning function files...');
  
  const allFunctions = new Map<string, FunctionInfo[]>();
  const functionFiles = fs.readdirSync(FUNCTIONS_DIR)
    .filter(f => f.endsWith('.ts') && f !== 'generated-dev-functions.ts');

  for (const file of functionFiles) {
    const filePath = path.join(FUNCTIONS_DIR, file);
    console.log(`  📄 Processing ${file}...`);
    
    try {
      const functions = findExportedFunctions(filePath);
      if (functions.length > 0) {
        allFunctions.set(file, functions);
        console.log(`    ✓ Found ${functions.length} function(s)`);
      }
    } catch (error) {
      console.error(`    ✗ Error processing ${file}:`, error);
    }
  }

  console.log(`\n📝 Generating dev- functions...`);
  const output = generateOutputFile(allFunctions);
  
  console.log(`💾 Writing to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  
  const totalFunctions = Array.from(allFunctions.values()).reduce((sum, funcs) => sum + funcs.length, 0);
  console.log(`\n✅ Successfully generated ${totalFunctions} dev- function(s)!`);
}

if (require.main === module) {
  main();
}

