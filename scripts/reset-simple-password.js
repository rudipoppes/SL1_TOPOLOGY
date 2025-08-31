#!/usr/bin/env node

import fs from 'fs';
import crypto from 'crypto';
import readline from 'readline';

const CONFIG_PATH = '/home/ubuntu/SL1_TOPOLOGY/config/simple-auth-config.json';

async function hashPassword(password, salt, iterations) {
  // Simple hash for HTTP environments (matches browser implementation)
  let combined = password + salt;
  
  for (let i = 0; i < iterations; i++) {
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.webcrypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    combined = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  return combined;
}

function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading config:', error.message);
    process.exit(1);
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('✅ Password updated successfully!');
  } catch (error) {
    console.error('Error saving config:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🔐 SL1 Topology Password Reset Tool');
  console.log('=====================================');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  try {
    const config = loadConfig();
    
    console.log(`Current username: ${config.credentials.username}`);
    
    const newUsername = await question('Enter new username (or press Enter to keep current): ');
    const newPassword = await question('Enter new password: ');
    
    if (!newPassword.trim()) {
      console.log('❌ Password cannot be empty.');
      rl.close();
      return;
    }

    // Update config
    if (newUsername.trim()) {
      config.credentials.username = newUsername.trim();
    }
    
    config.credentials.passwordHash = await hashPassword(
      newPassword,
      config.config.saltKey,
      config.config.iterations
    );

    saveConfig(config);
    
    console.log('✅ Authentication config updated successfully!');
    console.log(`Username: ${config.credentials.username}`);
    console.log('Password: [ENCRYPTED]');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

main();