// Central resolver for GraphQL endpoint, supporting dev proxy and fixed host/port

export const resolveGqlUrl = (cfg = null) => {
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const qs = w ? new URLSearchParams(w.location.search) : null;

    const paramApi = qs?.get('api') || (w ? w.localStorage.getItem('pmpos_api_url') : null);
    const paramPort = qs?.get('port') || (w ? w.localStorage.getItem('pmpos_api_port') : null);

    const envApi = process?.env?.SAMBAPOS_API_URL || null;
    const envPort = process?.env?.SAMBAPOS_API_PORT || null;
    const useProxy = (process?.env?.REACT_APP_USE_PROXY ?? 'true') !== 'false'; // default true

    // 1) Explicit API URL wins (querystring/env/config)
    const baseApi = paramApi || envApi || (cfg && cfg.apiUrl) || null;
    if (baseApi) return `${String(baseApi).replace(/\/$/, '')}/api/graphql`;

    // 2) Dev proxy by default
    if (useProxy && w) return '/api/graphql';

    // 3) Direct host:port fallback
    const host = (w && w.location && w.location.hostname) ? w.location.hostname : 'localhost';
    const port = paramPort || envPort || (cfg && (cfg.port || cfg.apiPort)) || '9000';
    return `http://${host}:${port}/api/graphql`;
  } catch (_) {
    // Safe fallback
    return '/api/graphql';
  }
};

export default resolveGqlUrl;

// Optional: Intercept window.fetch to normalize GraphQL endpoint usage across the app
export const attachGraphQLFetchInterceptor = (cfg = null) => {
  try {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

    const resolved = resolveGqlUrl(cfg);
    const originalFetch = window.fetch.bind(window);

    // Avoid double-wrapping
    if (window.__pmpos_gql_fetch_interceptor__) return;
    window.__pmpos_gql_fetch_interceptor__ = true;

    window.fetch = (input, init) => {
      try {
        let url = typeof input === 'string' ? input : (input && input.url) || '';
        // Only rewrite GraphQL endpoints; leave others intact
        if (/\/api\/graphql$/i.test(url)) {
          // Replace with resolved endpoint when different
          if (resolved && url !== resolved) {
            const newUrl = resolved;
            if (typeof input === 'string') {
              return originalFetch(newUrl, init);
            } else {
              // Clone Request with new URL
              const reqInit = {
                method: input.method,
                headers: input.headers,
                body: input.body,
                mode: input.mode,
                credentials: input.credentials,
                cache: input.cache,
                redirect: input.redirect,
                referrer: input.referrer,
                referrerPolicy: input.referrerPolicy,
                integrity: input.integrity,
                keepalive: input.keepalive,
                signal: input.signal
              };
              return originalFetch(new Request(newUrl, reqInit), init);
            }
          }
        }
      } catch (_) {}
      return originalFetch(input, init);
    };
    try { console.log('🔌 GraphQL fetch interceptor attached:', resolved); } catch (_) {}
  } catch (_) {}
};
