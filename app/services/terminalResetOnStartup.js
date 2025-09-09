// Resets stored terminal mappings on startup when URL contains ?resetTerminal
// Usage: http://localhost:8081/?resetTerminal or ?resetTerminal=1 (value is ignored)

try {
  if (typeof window !== 'undefined') {
    const qs = new URLSearchParams(window.location.search);
    if (qs.has('resetTerminal')) {
      const keys = [
        'pmpos_terminals_by_user',
        'pmpos_current_terminal',
        'pmpos_last_user',
        'pmpos_last_terminal_user'
      ];
      keys.forEach(k => {
        try { window.localStorage.removeItem(k); } catch (_) {}
      });
      try { console.log('🧹 Terminal mapping cleared due to ?resetTerminal flag.'); } catch (_) {}
    }
  }
} catch (_) {}

