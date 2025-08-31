#!/usr/bin/env node

/**
 * SL1 Topology - Password Reset Utility
 * 
 * This utility allows administrators to reset the authentication password
 * for the SL1 Topology application.
 * 
 * Usage:
 *   node scripts/reset-password.js
 *   npm run reset-password
 */

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '../config/auth-config.json');
const RESET_CODE = 'RESET_SL1_TOPO_2025_SECURE';

// Create readline interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('❌ Error loading auth config:', error.message);
    console.error('   Config file should be at:', CONFIG_PATH);
    process.exit(1);
  }
}

async function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('✅ Configuration updated successfully');
  } catch (error) {
    console.error('❌ Error saving config:', error.message);
    process.exit(1);
  }
}

async function resetPassword() {
  console.log('🔐 SL1 Topology - Password Reset Utility');
  console.log('=====================================');
  console.log('');

  // Load current config
  const config = await loadConfig();

  // Verify reset code
  console.log('🔑 Admin verification required');
  const resetCode = await question('Enter admin reset code: ');
  
  if (resetCode !== RESET_CODE) {
    console.log('❌ Invalid reset code. Access denied.');
    rl.close();
    process.exit(1);
  }

  console.log('✅ Reset code verified');
  console.log('');

  // Get new credentials
  console.log('📝 Enter new credentials');
  const newUsername = await question('New username (or press Enter to keep current): ');
  const newPassword = await question('New password: ');
  const confirmPassword = await question('Confirm password: ');

  if (newPassword !== confirmPassword) {
    console.log('❌ Passwords do not match');
    rl.close();
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.log('❌ Password must be at least 8 characters long');
    rl.close();
    process.exit(1);
  }

  console.log('');
  console.log('🔄 Generating secure hashes...');

  // Hash new credentials
  const hashedUsername = newUsername.trim() 
    ? await hashPassword(newUsername.trim())
    : config.credentials.username;
  const hashedPassword = await hashPassword(newPassword);

  // Update config
  config.credentials.username = hashedUsername;
  config.credentials.password = hashedPassword;
  config.credentials.note = `Updated on ${new Date().toISOString()} - ${newUsername.trim() || '[username unchanged]'}:${newPassword}`;

  await saveConfig(config);

  console.log('');
  console.log('✅ Password reset completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  if (newUsername.trim()) {
    console.log(`   Username: ${newUsername}`);
  } else {
    console.log('   Username: [unchanged]');
  }
  console.log(`   Password: ${newPassword}`);
  console.log('');
  console.log('🔄 Please restart the application for changes to take effect.');
  console.log('');

  rl.close();
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Unexpected error:', error.message);
  rl.close();
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Password reset cancelled');
  rl.close();
  process.exit(0);
});

// Run the reset utility
resetPassword().catch((error) => {
  console.error('❌ Reset failed:', error.message);
  rl.close();
  process.exit(1);
});