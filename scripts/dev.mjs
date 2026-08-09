#!/usr/bin/env node
/**
 * Starts the API and the Expo dev server together, so the app is never running against a
 * stopped backend. Dependency-free on purpose. Ctrl-C stops both.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = process.argv.slice(2);

const children = [];

function start(name, command, commandArgs, cwd) {
  const child = spawn(command, commandArgs, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code, signal) => {
    if (signal) return;
    console.log(`\n[${name}] exited with code ${code}. Shutting down.`);
    shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('api', npm, ['run', 'dev'], resolve(root, 'server'));
start('expo', npm, ['run', 'start', '--', ...args], root);
