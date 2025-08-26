// Dev-only console proxy to mirror browser logs into the dev server terminal
// Sends logs via GET /__log?level=..&tag=..&msg=..

(() => {
  try {
    if (process.env.NODE_ENV === 'production') return;
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;

    const encode = (s) => encodeURIComponent(String(s).slice(0, 2000));
    const send = (level, args) => {
      try {
        const msg = args.map(a => {
          try {
            if (typeof a === 'string') return a;
            return JSON.stringify(a);
          } catch { return String(a); }
        }).join(' ');
        const url = `/__log?level=${encode(level)}&msg=${encode(msg)}`;
        // Use keepalive where available to avoid blocking
        fetch(url, { method: 'GET', keepalive: true }).catch(() => {});
      } catch {}
    };

    const wrap = (level) => {
      const orig = console[level] ? console[level].bind(console) : console.log.bind(console);
      return (...args) => {
        send(level, args);
        return orig(...args);
      };
    };

    console.log = wrap('log');
    console.info = wrap('info');
    console.warn = wrap('warn');
    console.error = wrap('error');
    console.debug = wrap('debug');
  } catch {}
})();

