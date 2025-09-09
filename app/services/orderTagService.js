import { appconfig } from '../config';
import { tokenService } from './tokenService';
import Debug from 'debug';

const debug = Debug('pmpos:order-tags');

class OrderTagService {
  constructor() {
    this.cache = new Map(); // key: `${productId}|${portion}` -> [{name, price}]
    this.preloading = false;
  }

  _key(productId, portion) {
    return `${productId}|${portion || 'Normal'}`;
  }

  getCached(productId, portion) {
    return this.cache.get(this._key(productId, portion)) || [];
  }

  async fetchGroups(productId, portion) {
    try {
      // Ensure terminal is registered before making terminal-dependent queries
      const terminalService = (await import('./terminalService')).default;
      const user = tokenService.getCurrentUser();
      if (user?.name) {
        const terminalId = await terminalService.ensureTerminalRegistered(user.name);
        if (!terminalId) {
          debug('⚠️ No terminal registered, getOrderTagGroups may fail');
        } else {
          debug('✅ Terminal confirmed for getOrderTagGroups:', terminalId);
        }
      }

      const token = await tokenService.getValidAccessToken();
      const cfg = appconfig();
      const pid = parseInt(productId, 10);
      const prt = String(portion || 'Normal');
      const query = `query { getOrderTagGroups(productId: ${pid}, portion: "${prt}", hidden: false) { name tags { name price } } }`;
      const resp = await fetch(cfg.GQLurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      
      // Check for terminal-related errors
      if (json.errors) {
        const isTerminalError = json.errors.some(err => 
          err.message?.includes('Terminal not found') || 
          err.innerException?.Message?.includes('Terminal not found')
        );
        
        if (isTerminalError) {
          debug('⚠️ Terminal not found error, attempting to re-register terminal');
          if (user?.name) {
            // Force terminal re-registration
            terminalService.clearTerminal(user.name);
            const newTerminalId = await terminalService.ensureTerminalRegistered(user.name);
            
            if (newTerminalId) {
              debug('✅ Terminal re-registered, retrying getOrderTagGroups');
              // Retry the query with new terminal
              const retryResp = await fetch(cfg.GQLurl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query })
              });
              
              if (retryResp.ok) {
                const retryJson = await retryResp.json();
                if (!retryJson.errors) {
                  const groups = retryJson?.data?.getOrderTagGroups || [];
                  const flat = [];
                  for (const g of groups) {
                    for (const t of (g.tags || [])) flat.push({ id: `${g.name}:${t.name}`, name: t.name, group: g.name, price: t.price });
                  }
                  this.cache.set(this._key(productId, portion), flat);
                  return flat;
                }
              }
            }
          }
          
          // If retry failed, return empty (graceful degradation)
          debug('⚠️ getOrderTagGroups failed even after terminal re-registration, returning empty');
          return [];
        }
      }
      const groups = json?.data?.getOrderTagGroups || [];
      const flat = [];
      for (const g of groups) {
        for (const t of (g.tags || [])) flat.push({ id: `${g.name}:${t.name}`, name: t.name, group: g.name, price: t.price });
      }
      this.cache.set(this._key(productId, portion), flat);
      return flat;
    } catch (e) {
      debug('fetchGroups failed', { productId, portion, err: e?.message || e });
      return [];
    }
  }

  async getGroups(productId, portion) {
    const cached = this.getCached(productId, portion);
    if (cached.length) return cached;
    return await this.fetchGroups(productId, portion);
  }

  async preload(menu, concurrency = 4, priorityCategories = []) {
    if (this.preloading || !menu?.categories) return;
    this.preloading = true;
    try {
      const priSet = new Set((priorityCategories || []).filter(Boolean));
      const priTasks = [];
      const tasks = [];
      for (const c of menu.categories) {
        for (const it of (c.menuItems || [])) {
          const pid = it.productId || it.product?.id;
          const parts = (it.portions && it.portions.length ? it.portions : (it.product?.portions || []));
          if (!pid || !parts || !parts.length) continue;
          for (const p of parts) {
            const key = this._key(pid, p.name || 'Normal');
            if (this.cache.has(key)) continue;
            const job = { productId: pid, portion: p.name || 'Normal' };
            if (priSet.has(c.name)) priTasks.push(job);
            else tasks.push(job);
          }
        }
      }
      const allTasks = [...priTasks, ...tasks];
      debug(`preloading order tags for ${allTasks.length} product/portion combos (priority first: ${priTasks.length})`);
      let i = 0;
      const runNext = async () => {
        if (i >= allTasks.length) return;
        const { productId, portion } = allTasks[i++];
        await this.fetchGroups(productId, portion);
        await runNext();
      };
      const runners = Array.from({ length: Math.min(concurrency, allTasks.length) }, () => runNext());
      await Promise.all(runners);
      debug('order tags preload completed');
    } catch (e) {
      debug('preload failed', e?.message || e);
    } finally {
      this.preloading = false;
    }
  }

  async preloadForCategory(menu, categoryName, concurrency = 4) {
    if (!menu?.categories || !categoryName) return;
    const cat = (menu.categories || []).find(c => c.name === categoryName);
    if (!cat) return;
    return await this.preload({ categories: [cat] }, concurrency, [categoryName]);
  }
}

export default new OrderTagService();
export { OrderTagService };
