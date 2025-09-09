import { appconfig } from '../config';
import Debug from 'debug';

const debug = Debug('pmpos:admin-service');

const withInternalHeaders = (base = {}) => {
  const send = process.env.REACT_APP_SEND_INTERNAL_KEY === 'true';
  const key = process.env.INTERNAL_API_KEY || localStorage.getItem('X_INTERNAL_API_KEY');
  if (send && key) return { ...base, 'X-INTERNAL-API-KEY': key };
  return base;
};

export const adminService = {
  async isAdminByName(name) {
    try {
      if (!name) return false;
      const resp = await fetch('/internal-api/validate-admin', {
        method: 'POST',
        headers: withInternalHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name })
      });
      if (!resp.ok) return false;
      const json = await resp.json();
      const ok = !!json?.ok;
      const isAdmin = !!json?.isAdmin;
      debug('isAdminByName', { name, ok, isAdmin });
      if (ok) {
        try { localStorage.setItem('pmpos_user_isAdmin', isAdmin ? '1' : '0'); } catch {}
      }
      return ok && isAdmin;
    } catch (e) {
      debug('isAdminByName failed', e?.message || e);
      return false;
    }
  }
};

export default adminService;

