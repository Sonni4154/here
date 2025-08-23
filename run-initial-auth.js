#!/usr/bin/env node

// Quick script to run the initial authorization server
require('dotenv').config();
const { spawn } = require('child_process');

console.log('🚀 Starting QuickBooks Initial Authorization Server...\n');

const server = spawn('npx', ['tsx', 'server/quickbooks-initial-auth.ts'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down authorization server...');
  server.kill();
  process.exit();
});