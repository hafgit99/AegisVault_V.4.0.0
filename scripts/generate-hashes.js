const { createHash } = await import('node:crypto');
const { readdir, readFile, writeFile } = await import('node:fs/promises');
const { join, extname } = await import('node:path');

async function generateHashes() {
  const releaseDir = join(process.cwd(), 'release');
  
  try {
    const files = await readdir(releaseDir);
    const targets = files.filter(f => 
      ['.exe', '.dmg', '.AppImage', '.deb', '.zip'].includes(extname(f)) && 
      !f.includes('.blockmap')
    );

    if (targets.length === 0) {
      console.log('ℹ️ No build artifacts found to hash.');
      return;
    }

    for (const file of targets) {
      const filePath = join(releaseDir, file);
      const fileBuffer = await readFile(filePath);
      const hash = createHash('sha256').update(fileBuffer).digest('hex');
      
      const hashFilePath = join(releaseDir, `${file}.sha256`);
      await writeFile(hashFilePath, hash);
      console.log(`✅ Generated hash file: release/${file}.sha256`);
      console.log(`   Hash: ${hash}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️ Release directory not found. Run building first.');
    } else {
      console.error('❌ Error generating hashes:', error);
    }
  }
}

generateHashes();
