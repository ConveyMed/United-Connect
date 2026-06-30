const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase config — REPLACE when duplicating template. Use this app's OWN project URL + anon key.
const supabaseUrl = 'https://wyeopzxtpywmauttizuy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZW9wenh0cHl3bWF1dHRpenV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3ODAwODIsImV4cCI6MjA5ODM1NjA4Mn0.KwVM-3oKGoTcIhw7UW-8oz25O3GFeINkqE6uLvPohns';

const supabase = createClient(supabaseUrl, supabaseKey);

// Map filenames to product names
const fileToProduct = {
  'remedy-shoulder-system.md': 'Remedy Shoulder',
  'biowash-surgical-irrigation-ifu.md': 'BioWash',
  'osteofab-technology-whitepaper.md': 'OsteoFab Technology',
  'griplasty-system.md': 'Griplasty',
  'u2-knee-mdt.md': 'U2 Knee MDT',
};

const docsFolder = path.join(process.env.HOME, 'Downloads', 'AI product and content');

async function uploadDocs() {
  console.log('Starting upload...\n');

  for (const [filename, productName] of Object.entries(fileToProduct)) {
    const filePath = path.join(docsFolder, filename);

    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${filename} not found`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const wordCount = content.split(/\s+/).length;

    console.log(`[UPLOAD] ${productName} (${wordCount} words)...`);

    const { error } = await supabase
      .from('product_docs')
      .upsert({
        product_name: productName,
        content: content,
        page_count: Math.ceil(wordCount / 500), // rough estimate
      }, {
        onConflict: 'product_name'
      });

    if (error) {
      console.log(`  [ERROR] ${error.message}`);
    } else {
      console.log(`  [OK] Uploaded!`);
    }
  }

  console.log('\nDone!');
}

uploadDocs();
