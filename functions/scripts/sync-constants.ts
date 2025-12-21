import * as fs from 'fs';
import * as path from 'path';

/**
 * Sync Constants Script
 * 
 * This script copies constants from the root src directory to the functions src directory
 * to ensure they stay in sync during the build process.
 */

const PROJECT_ROOT = path.join(__dirname, '../..');
const SOURCE_FILE = path.join(PROJECT_ROOT, 'src/constants/email-templates.ts');
const TARGET_DIR = path.join(__dirname, '../src/constants');
const TARGET_FILE = path.join(TARGET_DIR, 'email-templates.ts');

const AUTO_GENERATED_HEADER = `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// This file is automatically copied from src/constants/email-templates.ts
// Run 'npm run sync:constants' or 'npm run build' to regenerate

`;

function syncConstants() {
  console.log('🔄 Syncing constants from root to functions directory...');
  
  try {
    // Check if source file exists
    if (!fs.existsSync(SOURCE_FILE)) {
      console.error(`❌ Source file not found: ${SOURCE_FILE}`);
      process.exit(1);
    }

    // Ensure target directory exists
    if (!fs.existsSync(TARGET_DIR)) {
      console.log(`📁 Creating directory: ${TARGET_DIR}`);
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // Read source file
    const sourceContent = fs.readFileSync(SOURCE_FILE, 'utf-8');
    
    // Write to target with auto-generated header
    const targetContent = AUTO_GENERATED_HEADER + sourceContent;
    fs.writeFileSync(TARGET_FILE, targetContent, 'utf-8');
    
    console.log(`✅ Successfully synced: ${path.basename(SOURCE_FILE)}`);
    console.log(`   From: ${SOURCE_FILE}`);
    console.log(`   To:   ${TARGET_FILE}`);
  } catch (error) {
    console.error('❌ Error syncing constants:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  syncConstants();
}

export { syncConstants };

