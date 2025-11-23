import { appconfig } from '../config';
import { tokenService } from './tokenService';
import Debug from 'debug';

const debug = Debug('pmpos:order-tags');

// CRITICAL: Add module-level logging to ensure this file is loading
console.log('🚨🚨🚨 [MODULE LOADING] orderTagService.js is being loaded - SQL VERSION 4.0 ULTIMATE UPDATE 🚨🚨🚨');
console.log('🚨 [MODULE LOADING] Debug namespace created:', debug.namespace);
console.log('🚨 [MODULE LOADING] Current timestamp:', new Date().toISOString());
console.log('🚨 [MODULE LOADING] WEBPACK CACHE BUSTING - UNIQUE ID: 9988776655443322', Math.random());

class OrderTagService {
  constructor() {
    console.log('🚨 [CONSTRUCTOR] OrderTagService constructor called');
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
    console.log('� [ORDER TAG SERVICE] fetchGroups called with:', {
      productId: productId,
      portion: portion,
      originalPortion: portion,
      productIdType: typeof productId,
      portionType: typeof portion
    });

    debug('fetchGroups called', {
      productId,
      portion,
      originalPortion: portion,
      productIdType: typeof productId,
      portionType: typeof portion
    }); try {

      // Ensure terminal is registered before making terminal-dependent queries
      const terminalService = (await import('./terminalService')).default;
      const user = tokenService.getCurrentUser();

      // CRITICAL FIX: Use consistent terminal name from config
      const config = appconfig();
      let terminalName = config.terminalName || "SERVIDOR"; // Use config value first

      console.log('🔧 [ORDER TAG SERVICE] Initial terminal configuration:', {
        configTerminalName: config.terminalName,
        fallbackTerminalName: terminalName,
        hasUser: !!user,
        userName: user?.name
      });

      if (user?.name) {
        const terminalId = await terminalService.ensureTerminalRegistered(user.name);
        if (!terminalId) {
          debug('⚠️ No terminal registered, getOrderTagGroups may fail');
          console.log('⚠️ [ORDER TAG SERVICE] No terminal registered, using fallback terminal name:', terminalName);
        } else {
          debug('✅ Terminal confirmed for getOrderTagGroups:', terminalId);
          console.log('✅ [ORDER TAG SERVICE] Terminal confirmed:', terminalId);

          // CRITICAL FIX: Always use config terminal name for consistency
          terminalName = config.terminalName || "SERVIDOR";
          console.log('🏷️ [ORDER TAG SERVICE] Using terminal name from config:', terminalName);
        }
      }

      console.log('🎯 [ORDER TAG SERVICE] Final terminal name for GraphQL query:', terminalName);

      const token = await tokenService.getValidAccessToken();
      const cfg = appconfig();

      // Use correct format from documentation: productId + terminal (not portion)
      const pidInt = parseInt(productId, 10);

      console.log('🔄 [ORDER TAG SERVICE] Preparing GraphQL query (CORRECTED FORMAT):', {
        originalProductId: productId,
        pidInt: pidInt,
        terminalName: terminalName,
        gqlUrl: cfg.GQLurl
      });

      // CORRECTED QUERY: Use terminal parameter instead of portion, include all required fields
      let query = `query { 
        getOrderTagGroups(productId: ${pidInt}, terminal: "${terminalName}") { 
          name 
          maxSelection
          requiredSelection
          tags { name price } 
        } 
      }`;

      console.log('📤 [ORDER TAG SERVICE] Sending CORRECTED GraphQL query:', {
        query: query,
        url: cfg.GQLurl,
        token: token ? `${token.substring(0, 20)}...` : 'NO_TOKEN',
        terminalName: terminalName
      });

      const resp = await fetch(cfg.GQLurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query })
      });

      console.log('📥 [ORDER TAG SERVICE] GraphQL response status:', {
        status: resp.status,
        statusText: resp.statusText,
        ok: resp.ok
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();

      console.log('📋 [ORDER TAG SERVICE] GraphQL response JSON:', {
        hasData: !!json.data,
        hasErrors: !!json.errors,
        dataKeys: json.data ? Object.keys(json.data) : [],
        errors: json.errors,
        fullResponse: json
      });

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

      console.log('🏷️ [ORDER TAG SERVICE] Processing groups from response:', {
        rawJsonData: json.data,
        groups: groups,
        groupsCount: groups.length,
        groupsStructure: groups.map(g => ({
          name: g.name,
          maxSelection: g.maxSelection,
          requiredSelection: g.requiredSelection,
          tagsCount: (g.tags || []).length,
          tags: g.tags
        }))
      });


      console.log('🏷️ [ORDER TAG SERVICE] Processing groups from response:', {
        groups: groups,
        groupsCount: groups.length,
        groupsStructure: groups.map(g => ({
          name: g.name,
          maxSelection: g.maxSelection,
          requiredSelection: g.requiredSelection,
          tagsCount: (g.tags || []).length,
          tags: g.tags
        }))
      });

      const flat = [];
      for (const g of groups) {
        for (const t of (g.tags || [])) {
          const tagObj = {
            id: `${g.name}:${t.name}`,
            name: t.name,
            group: g.name,
            price: t.price,
            // Add new fields from documentation
            maxSelection: g.maxSelection,
            requiredSelection: g.requiredSelection
          };
          flat.push(tagObj);
          console.log('➕ [ORDER TAG SERVICE] Added tag:', tagObj);
        }
      }

      console.log('✅ [ORDER TAG SERVICE] Final processed tags:', {
        flatCount: flat.length,
        flat: flat
      });

      this.cache.set(this._key(productId, portion), flat);
      return flat;
    } catch (e) {
      debug('fetchGroups failed', { productId, portion, err: e?.message || e });
      console.error('❌ [ORDER TAG SERVICE] fetchGroups error:', {
        productId: productId,
        portion: portion,
        error: e?.message || e,
        stack: e?.stack
      });
      return [];
    }
  }

  async getGroups(productId, portion) {
    // ULTRA VISIBLE LOG - This should ALWAYS appear if function is called
    console.log('🚨🚨🚨🚨🚨 [ORDER TAG SERVICE] *** getGroups FUNCTION ENTRY - SQL FIRST VERSION 4.0 CACHE BUSTER *** 🚨🚨🚨🚨🚨');
    console.log('📞 [ORDER TAG SERVICE] getGroups parameters:', { productId, portion });
    console.log('🕒 [ORDER TAG SERVICE] Current timestamp:', new Date().toISOString());

    // FORCE SQL ENDPOINT ALWAYS (for debugging)
    console.log('🚨 [ORDER TAG SERVICE] FORCING SQL endpoint (cache buster)');

    // First try SQL endpoint (priority)
    try {
      console.log('🔄 [ORDER TAG SERVICE] Trying SQL endpoint first...');
      const sqlResult = await this.fetchGroupsSQL(productId, portion);
      if (sqlResult && sqlResult.length > 0) {
        console.log('✅ [ORDER TAG SERVICE] SQL endpoint successful, returning:', sqlResult.length, 'tags');
        return sqlResult;
      }
      console.log('⚠️ [ORDER TAG SERVICE] SQL endpoint returned empty, trying GraphQL fallback...');
    } catch (sqlError) {
      console.log('❌ [ORDER TAG SERVICE] SQL endpoint failed, trying GraphQL fallback:', sqlError.message);
      console.log('❌ [ORDER TAG SERVICE] SQL error details:', sqlError.stack);
    }

    // Fallback to GraphQL if SQL fails
    console.log('🔄 [ORDER TAG SERVICE] Using GraphQL fallback method...');

    const cached = this.getCached(productId, portion);
    debug('📋 Cache check result:', { cacheKey: this._key(productId, portion), cachedLength: cached.length });

    console.log('📋 [ORDER TAG SERVICE] Cache check:', {
      cacheKey: this._key(productId, portion),
      cachedLength: cached.length,
      cached: cached
    });

    if (cached.length) {
      debug('✅ Returning cached tags:', cached.length);
      console.log('✅ [ORDER TAG SERVICE] Returning cached tags:', cached);
      return cached;
    }

    debug('🔄 No cache, fetching from GraphQL server...');
    console.log('🔄 [ORDER TAG SERVICE] No cache, fetching from GraphQL server...');

    try {
      const result = await this.fetchGroups(productId, portion);
      debug('📦 fetchGroups completed with result:', { resultLength: result?.length || 0 });
      console.log('📦 [ORDER TAG SERVICE] fetchGroups result:', {
        resultLength: result?.length || 0,
        result: result
      });
      return result;
    } catch (error) {
      debug('❌ ERROR in getGroups:', error.message);
      console.error('❌ [ORDER TAG SERVICE] ERROR in getGroups:', error);
      return [];
    }
  }

  async fetchGroupsSQL(productId, portion) {
    console.log('🚨🚨🚨 [SQL ENDPOINT] fetchGroupsSQL called with:', {
      productId: productId,
      portion: portion
    });

    // ULTRA DEBUG - Verificar configuración
    const config = appconfig();
    console.log('🚨🚨🚨 [SQL ENDPOINT] Current config:', {
      hasReadService: !!config.readService,
      readServiceUrl: config.readService?.url,
      readServiceApiKey: config.readService?.apiKey ? 'SET' : 'MISSING',
      readServiceEnabled: config.readService?.enabled
    });

    try {
      // Get the config to determine the correct read service URL
      const config = appconfig();
      const readServiceConfig = config.readService || {};
      const baseUrl = readServiceConfig.url || 'http://localhost:4005';
      const apiKey = readServiceConfig.apiKey || 'test-key-123';
      const endpoint = `${baseUrl}/internal-api/order-tags/${productId}/${encodeURIComponent(portion || 'Normal')}`;

      console.log('📡 [ORDER TAG SERVICE] Fetching from SQL endpoint:', {
        baseUrl: baseUrl,
        endpoint: endpoint,
        readServiceEnabled: readServiceConfig.enabled,
        hasApiKey: !!apiKey
      });

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-INTERNAL-API-KEY': apiKey
        }
      });

      console.log('📥 [ORDER TAG SERVICE] SQL endpoint response status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📥 [ORDER TAG SERVICE] SQL endpoint response data:', data);

      // Handle different possible response formats
      let tagGroups = [];
      if (data.tagGroups && Array.isArray(data.tagGroups)) {
        tagGroups = data.tagGroups;
      } else if (data.data && Array.isArray(data.data)) {
        tagGroups = data.data;
      } else if (Array.isArray(data)) {
        tagGroups = data;
      } else {
        console.log('⚠️ [ORDER TAG SERVICE] Unexpected SQL response format:', data);
        return [];
      }

      if (tagGroups.length === 0) {
        console.log('⚠️ [ORDER TAG SERVICE] No tagGroups in SQL response');
        return [];
      }

      // Convert SQL response format to match expected format
      const flat = [];
      for (const group of tagGroups) {
        const groupName = group.name || group.groupName || 'Opciones';
        const tags = group.tags || group.orderTags || [];

        for (const tag of tags) {
          const tagObj = {
            id: `${groupName}:${tag.name}`,
            name: tag.name,
            group: groupName,
            price: parseFloat(tag.price) || 0,
            maxSelection: group.maxSelection || 1,
            requiredSelection: group.minSelection || group.requiredSelection || 0
          };
          flat.push(tagObj);
          console.log('➕ [ORDER TAG SERVICE] Added SQL tag:', tagObj);
        }
      }

      console.log('✅ [ORDER TAG SERVICE] SQL processed tags:', {
        flatCount: flat.length,
        flat: flat
      });

      // Cache the SQL result using same format as GraphQL
      this.cache.set(this._key(productId, portion), flat);
      return flat;

    } catch (error) {
      console.error('❌ [ORDER TAG SERVICE] fetchGroupsSQL error:', {
        error: error.message,
        stack: error.stack,
        productId,
        portion
      });
      throw error;
    }
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

// CRITICAL: Log before creating instance
console.log('🚨 [MODULE EXPORT] Creating OrderTagService instance');
const orderTagServiceInstance = new OrderTagService();
console.log('🚨 [MODULE EXPORT] OrderTagService instance created:', {
  hasGetGroups: typeof orderTagServiceInstance.getGroups === 'function',
  hasFetchGroups: typeof orderTagServiceInstance.fetchGroups === 'function',
  hasCache: orderTagServiceInstance.cache instanceof Map
});

export default orderTagServiceInstance;
export { OrderTagService };
