import { localBackend } from './local-backend.mjs';

let lastError;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    localBackend();
    console.log('Local Supabase is ready.');
    process.exit(0);
  } catch (error) {
    lastError = error;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

throw lastError ?? new Error('Local Supabase did not become ready');
