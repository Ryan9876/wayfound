import { configurationError } from './errors.ts';

export type WayfoundDataEnvironment = 'development' | 'preview' | 'production';

export function requireEnvironmentIsolation(input: {
  nodeEnv?: string;
  vercelEnv?: string;
  dataEnvironment?: string;
}): WayfoundDataEnvironment {
  const { nodeEnv, vercelEnv, dataEnvironment } = input;
  if (!dataEnvironment || !['development', 'preview', 'production'].includes(dataEnvironment)) {
    throw configurationError('WAYFOUND_DATA_ENV must be development, preview, or production.');
  }
  if (vercelEnv && vercelEnv !== dataEnvironment) {
    throw configurationError(
      `Vercel environment ${vercelEnv} cannot use a ${dataEnvironment} Wayfound data environment.`,
    );
  }
  if (nodeEnv === 'production' && vercelEnv === 'production' && dataEnvironment !== 'production') {
    throw configurationError('Production application code requires the production data environment.');
  }
  return dataEnvironment as WayfoundDataEnvironment;
}
