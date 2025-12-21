#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Resend Email Templates Upload Script
 * 
 * This script uploads all email templates (*.temp.js files) to Resend.
 * It creates new templates or updates existing ones, then publishes them.
 * 
 * Usage:
 *   npm run upload:email-templates
 *   npm run upload:email-templates -- --cleanup   # Also delete duplicate templates
 * 
 * Environment:
 *   RESEND_API_KEY - Required. Your Resend API key.
 */

const fs = require('fs');
const path = require('path');

// Rate limit delay (Resend allows 2 requests per second)
const RATE_LIMIT_DELAY_MS = 1000;

// Parse command line arguments
const args = process.argv.slice(2);
const CLEANUP_MODE = args.includes('--cleanup');

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load environment variables from .env files
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  
  return env;
}

// Load API key from environment
function getApiKey() {
  // First check process.env
  if (process.env.RESEND_API_KEY) {
    return process.env.RESEND_API_KEY;
  }
  
  // Try loading from .env files
  const projectRoot = path.resolve(__dirname, '..');
  const envFiles = ['.env.local', '.env', '.env.production'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(projectRoot, envFile);
    const env = loadEnvFile(envPath);
    if (env.RESEND_API_KEY) {
      console.log(`📁 Loaded RESEND_API_KEY from ${envFile}`);
      return env.RESEND_API_KEY;
    }
  }
  
  return null;
}

// Find all template files
function findTemplateFiles() {
  const templatesDir = __dirname;
  const files = fs.readdirSync(templatesDir);
  
  return files
    .filter(file => file.endsWith('.temp.js'))
    .map(file => ({
      name: file.replace('.temp.js', ''),
      path: path.join(templatesDir, file)
    }));
}

// Main upload function
async function uploadTemplates() {
  console.log('🚀 Resend Email Templates Upload Script\n');
  
  if (CLEANUP_MODE) {
    console.log('🧹 Cleanup mode enabled - will delete duplicate templates\n');
  }
  
  // Get API key
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('❌ Error: RESEND_API_KEY not found.');
    console.error('   Set it in your environment or in .env.local/.env file.');
    process.exit(1);
  }
  
  // Dynamic import for ES module
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  
  // Find template files
  const templateFiles = findTemplateFiles();
  
  if (templateFiles.length === 0) {
    console.log('⚠️  No template files (*.temp.js) found.');
    process.exit(0);
  }
  
  console.log(`📋 Found ${templateFiles.length} template(s) to upload:\n`);
  templateFiles.forEach(t => console.log(`   - ${t.name}`));
  console.log('');
  
  // Load all template configs to get their names/aliases
  const templateConfigs = [];
  for (const templateFile of templateFiles) {
    try {
      delete require.cache[require.resolve(templateFile.path)];
      const config = require(templateFile.path);
      templateConfigs.push({
        file: templateFile,
        config
      });
    } catch (err) {
      console.error(`   ❌ Error loading ${templateFile.name}: ${err.message}`);
    }
  }
  
  // Fetch existing templates (first page only for now)
  console.log('🔍 Fetching existing templates from Resend...\n');
  
  const { data: listData, error: listError } = await resend.templates.list();
  
  if (listError) {
    console.error('❌ Error listing templates:', listError.message);
    process.exit(1);
  }
  
  // Wait after API call to respect rate limits
  await delay(RATE_LIMIT_DELAY_MS);
  
  // Handle different SDK response structures
  const allTemplates = Array.isArray(listData) ? listData : (listData?.data || []);
  
  console.log(`   Found ${allTemplates.length} existing template(s) in Resend (first page):\n`);
  allTemplates.forEach(t => {
    console.log(`   - "${t.name}" (ID: ${t.id})${t.alias ? ` [alias: ${t.alias}]` : ''}`);
  });
  console.log('');
  
  // Group templates by name/alias to find duplicates
  const templatesByName = new Map();
  const templatesByAlias = new Map();
  
  for (const t of allTemplates) {
    // Group by name
    if (!templatesByName.has(t.name)) {
      templatesByName.set(t.name, []);
    }
    templatesByName.get(t.name).push(t);
    
    // Group by alias
    if (t.alias) {
      if (!templatesByAlias.has(t.alias)) {
        templatesByAlias.set(t.alias, []);
      }
      templatesByAlias.get(t.alias).push(t);
    }
  }
  
  // Check for duplicates and handle cleanup
  for (const { file, config } of templateConfigs) {
    const { name, alias } = config;
    
    // Find all templates matching this name or alias
    const matchingByAlias = templatesByAlias.get(alias) || [];
    const matchingByName = templatesByName.get(name) || [];
    
    // Combine and deduplicate
    const allMatching = [...matchingByAlias];
    for (const t of matchingByName) {
      if (!allMatching.find(m => m.id === t.id)) {
        allMatching.push(t);
      }
    }
    
    if (allMatching.length > 1) {
      console.log(`⚠️  Found ${allMatching.length} duplicates for "${name}":`);
      allMatching.forEach(t => console.log(`      - ID: ${t.id}`));
      
      if (CLEANUP_MODE) {
        // Keep the first one (most recently updated), delete the rest
        const [keep, ...toDelete] = allMatching.sort((a, b) => {
          // Sort by created_at descending (newest first)
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
        
        console.log(`   🧹 Keeping: ${keep.id}, deleting ${toDelete.length} duplicate(s)...`);
        
        for (const t of toDelete) {
          try {
            // Use raw fetch API for delete since SDK method may vary
            const response = await fetch(`https://api.resend.com/templates/${t.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              console.log(`      ❌ Failed to delete ${t.id}: ${errorData.message || response.statusText}`);
            } else {
              console.log(`      ✅ Deleted ${t.id}`);
              // Remove from our tracking maps
              const byName = templatesByName.get(t.name);
              if (byName) {
                const idx = byName.findIndex(x => x.id === t.id);
                if (idx !== -1) byName.splice(idx, 1);
              }
              if (t.alias) {
                const byAlias = templatesByAlias.get(t.alias);
                if (byAlias) {
                  const idx = byAlias.findIndex(x => x.id === t.id);
                  if (idx !== -1) byAlias.splice(idx, 1);
                }
              }
            }
            await delay(RATE_LIMIT_DELAY_MS);
          } catch (err) {
            console.log(`      ❌ Error deleting ${t.id}: ${err.message}`);
          }
        }
      } else {
        console.log(`   💡 Run with --cleanup to delete duplicates\n`);
      }
    }
  }
  
  // Track results
  const results = [];
  
  // Process each template
  for (const { file: templateFile, config: templateConfig } of templateConfigs) {
    console.log(`\n📝 Processing: ${templateFile.name}`);
    
    const { name, alias, from, subject, html, variables } = templateConfig;
    
    // First, try to get template directly by alias (more reliable than list)
    let existingTemplate = null;
    console.log(`   🔍 Checking if template exists by alias: ${alias}...`);
    
    try {
      const { data: templateByAlias, error: getError } = await resend.templates.get(alias);
      
      if (getError) {
        // Only log if it's NOT a 404/not found error
        if (!getError.message?.includes('not found') && !getError.message?.includes('404')) {
          console.log(`      ⚠️  Lookup warning: ${getError.message}`);
        }
      } else if (templateByAlias) {
        existingTemplate = templateByAlias;
        console.log(`   ✅ Found template by alias (ID: ${existingTemplate.id})`);
      }
    } catch (e) {
      // Only log if it's NOT a 404/not found error
      if (!e.message?.includes('not found') && !e.message?.includes('404')) {
        console.log(`      ⚠️  Lookup exception: ${e.message}`);
      }
    }
    
    await delay(RATE_LIMIT_DELAY_MS);
    
    // If not found by alias, check our cached list
    if (!existingTemplate) {
      const matchingByAlias = templatesByAlias.get(alias) || [];
      const matchingByName = templatesByName.get(name) || [];
      existingTemplate = matchingByAlias[0] || matchingByName[0];
      if (existingTemplate) {
        console.log(`   ✅ Found template in cache (ID: ${existingTemplate.id})`);
      }
    }
    
    let templateId;
    
    if (existingTemplate) {
      // Update existing template
      console.log(`   📤 Updating existing template (ID: ${existingTemplate.id})...`);
      
      const { data, error } = await resend.templates.update(existingTemplate.id, {
        name,
        alias,  // Include alias to ensure it's preserved/set
        html,
        from,
        subject,
        variables
      });
      
      if (error) {
        console.error(`   ❌ Update failed: ${error.message}`);
        results.push({ name, success: false, error: error.message });
        await delay(RATE_LIMIT_DELAY_MS);
        continue;
      }
      
      templateId = existingTemplate.id;
      console.log(`   ✅ Template updated`);
    } else {
      // Create new template
      console.log(`   📤 Creating new template...`);
      
      const { data, error } = await resend.templates.create({
        name,
        alias,
        from,
        subject,
        html,
        variables
      });
      
      if (error) {
        console.error(`   ❌ Create failed: ${error.message}`);
        results.push({ name, success: false, error: error.message });
        await delay(RATE_LIMIT_DELAY_MS);
        continue;
      }
      
      templateId = data?.id;
      console.log(`   ✅ Template created (ID: ${templateId})`);
      
      // Add to our tracking so we don't create duplicates in the same run
      const newTemplate = { id: templateId, name, alias };
      if (!templatesByName.has(name)) templatesByName.set(name, []);
      templatesByName.get(name).push(newTemplate);
      if (alias) {
        if (!templatesByAlias.has(alias)) templatesByAlias.set(alias, []);
        templatesByAlias.get(alias).push(newTemplate);
      }
    }
    
    // Wait before next API call to respect rate limits
    await delay(RATE_LIMIT_DELAY_MS);
    
    // Publish the template
    console.log(`   📢 Publishing template...`);
    
    const { error: publishError } = await resend.templates.publish(templateId);
    
    if (publishError) {
      console.error(`   ⚠️  Publish failed: ${publishError.message}`);
      results.push({ name, success: true, id: templateId, published: false, error: publishError.message });
    } else {
      console.log(`   ✅ Template published`);
      results.push({ name, success: true, id: templateId, published: true });
    }
    
    // Wait before processing next template to respect rate limits
    await delay(RATE_LIMIT_DELAY_MS);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Upload Summary\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('✅ Successful:');
    successful.forEach(r => {
      console.log(`   - ${r.name}: ${r.id}${r.published ? ' (published)' : ' (not published)'}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed:');
    failed.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n📋 Template IDs for email-service.ts:');
  console.log('```typescript');
  console.log('export const EMAIL_TEMPLATES = {');
  successful.forEach(r => {
    console.log(`  ${r.name}: '${r.id}',`);
  });
  console.log('} as const;');
  console.log('```');
  
  // Exit with error if any failed
  if (failed.length > 0) {
    process.exit(1);
  }
  
  console.log('\n🎉 All templates uploaded successfully!\n');
}

// Run the script
uploadTemplates().catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
