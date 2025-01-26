import { spawn } from 'child_process';
import { build } from 'vite';

async function startDev() {
  try {
    // Build and start the server
    await import('./build.js');
    const server = spawn('node', ['dist/server.js'], { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });

    server.on('error', (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });

    process.on('SIGTERM', () => {
      server.kill('SIGTERM');
    });

  } catch (error) {
    console.error('Failed to start development environment:', error);
    process.exit(1);
  }
}

startDev().catch(console.error);