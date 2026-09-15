const realFetch = globalThis.fetch.bind(globalThis);
const proxyValue = process.env.WAYFOUND_OPENAI_TEST_PROXY?.trim();

if (proxyValue) {
  if (process.env.WAYFOUND_LOCAL_TEST !== '1' || process.env.WAYFOUND_AI_DEV_CONSOLE !== 'true') {
    throw new Error('WAYFOUND_OPENAI_TEST_PROXY is allowed only in the explicit local development-console test boundary.');
  }

  const proxy = new URL(proxyValue);
  if (proxy.protocol !== 'http:' || proxy.hostname !== '127.0.0.1' || proxy.port !== '4545' || (proxy.pathname !== '/' && proxy.pathname !== '')) {
    throw new Error('WAYFOUND_OPENAI_TEST_PROXY must be exactly the approved loopback CI endpoint on port 4545.');
  }

  globalThis.fetch = (input, init) => {
    const source = input instanceof URL
      ? input
      : typeof input === 'string'
        ? new URL(input)
        : new URL(input.url);

    if (source.origin === 'https://api.openai.com') {
      const redirected = new URL(`${source.pathname}${source.search}`, proxy.origin);
      return realFetch(redirected, init);
    }

    return realFetch(input, init);
  };
}
