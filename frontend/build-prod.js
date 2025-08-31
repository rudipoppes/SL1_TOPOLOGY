#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('Building production version with authentication...');

// Backup original main.tsx
fs.copyFileSync('src/main.tsx', 'src/main.tsx.backup');

try {
  // Replace main.tsx with production version
  fs.copyFileSync('src/main-prod.tsx', 'src/main.tsx');
  
  // Build production
  execSync('npm run build', { stdio: 'inherit' });
  
  // Create production dist
  if (fs.existsSync('dist-prod')) {
    fs.rmSync('dist-prod', { recursive: true });
  }
  fs.cpSync('dist', 'dist-prod', { recursive: true });
  
  console.log('Production build completed successfully!');
  
} finally {
  // Restore original main.tsx
  fs.copyFileSync('src/main.tsx.backup', 'src/main.tsx');
  fs.unlinkSync('src/main.tsx.backup');
  
  // Rebuild development version
  console.log('Restoring development build...');
  execSync('npm run build', { stdio: 'inherit' });
}