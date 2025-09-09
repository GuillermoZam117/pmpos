// Preload order tags by product using cached Menu, and override fetchGroups to avoid noisy 400s
// Strategy:
// - Read pmpos_cached_menu from localStorage (populated by menuService)
// - Build simple maps: tagsByProductId and tagsByProductIdPortion (if portion-level tags exist)
// - Override orderTagService.fetchGroups(productId, portion) to return from cache (empty array if none)

const TAG_CACHE = {
  byProductId: Object.create(null), // id -> [ { tagName, values: [ { tag, price? } ] } ]
  byProductIdPortion: Object.create(null) // `${id}::${portion}` -> same shape
};

function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}

function seedFromMenu(menu) {
  if (!menu || !Array.isArray(menu.categories)) return;
  try {
    for (const cat of menu.categories) {
      const items = cat?.menuItems || cat?.items || [];
      for (const it of items) {
        const pid = it?.productId || it?.product?.id;
        if (!pid) continue;

        // Basic tag list from item definition (structure can vary)
        const tags = Array.isArray(it.tags) ? it.tags : (Array.isArray(it.product?.tags) ? it.product.tags : []);
        // Normalize tags to [{ tagName, values: [] }]
        const norm = tags.map(t => ({ tagName: String(t?.name || t?.tagName || ''), values: [] }));
        TAG_CACHE.byProductId[pid] = norm;

        // If item has portions, create portion-level entries (same tag list unless defined)
        const portions = Array.isArray(it.portions) ? it.portions : (Array.isArray(it.product?.portions) ? it.product.portions : []);
        for (const p of portions) {
          const key = `${pid}::${String(p?.name || '')}`;
          if (!TAG_CACHE.byProductIdPortion[key]) TAG_CACHE.byProductIdPortion[key] = norm;
        }
      }
    }
  } catch (_) { /* ignore */ }
}

function seedFromLocalStorage() {
  try {
    const raw = window.localStorage.getItem('pmpos_cached_menu');
    const cached = safeParse(raw);
    if (cached && !cached.__seeded) {
      seedFromMenu(cached);
    }
  } catch (_) { /* ignore */ }
}

// Override orderTagService.fetchGroups
function overrideFetchGroups() {
  try {
    const svc = require('./orderTagService');
    if (svc && typeof svc.fetchGroups === 'function') {
      const original = svc.fetchGroups.bind(svc);
      svc.fetchGroups = async (productId, portion) => {
        // Prefer portion-specific cache, fallback to product cache, finally []
        const key = `${productId}::${String(portion || '')}`;
        const cached = TAG_CACHE.byProductIdPortion[key] || TAG_CACHE.byProductId[productId] || [];
        // If we have cache, return it without network
        if (cached && Array.isArray(cached)) return cached;
        // Last resort: call original but degrade 400 to [] and silence logs
        try {
          const res = await original(productId, portion);
          return Array.isArray(res) ? res : [];
        } catch (e) {
          return [];
        }
      };
    }
  } catch (_) { /* ignore */ }
}

try {
  if (typeof window !== 'undefined') {
    seedFromLocalStorage();
    overrideFetchGroups();
    try { console.log('🔧 OrderTag preload initialized (menu-cache based).'); } catch (_) {}
  }
} catch (_) {}
// Preload order tags by product using cached Menu, and override fetchGroups to avoid noisy 400s
import orderTagService from './orderTagService';
import menuService from './menuService';

// Idempotency guard to avoid double initialization when imported twice
const __w = typeof window !== 'undefined' ? window : null;
const __already = __w && __w.__pmpos_orderTagPreloadInit === true;

// Local caches built from Menu
const tagsByProduct = new Map(); // productId -> [{ tagName }]
const tagsByProductPortion = new Map(); // `${productId}|${portion}` -> [{ tagName, name, price }]

function buildCachesFromMenu(menu) {
  try {
    tagsByProduct.clear();
    tagsByProductPortion.clear();
    if (!menu || !Array.isArray(menu.categories)) return;
    for (const cat of menu.categories) {
      for (const it of (cat.menuItems || [])) {
        const pid = it.productId || it.product?.id;
        if (!pid) continue;
        // Portion-level
        const portions = it.portions?.length ? it.portions : (it.product?.portions || []);
        for (const p of (portions || [])) {
          const pName = String(p?.name || 'Normal');
          const key = `${pid}|${pName}`;
          if (!tagsByProductPortion.has(key)) tagsByProductPortion.set(key, []);
          // Known values may not be present in menu; keep array defined for fast lookup
        }
        // Group-level (names only)
        const tags = Array.isArray(it.tags) ? it.tags : (Array.isArray(it.product?.tags) ? it.product.tags : []);
        const norm = tags.map(t => ({ tagName: String(t?.name || t?.tagName || '') }));
        if (norm.length) tagsByProduct.set(Number(pid), norm);
      }
    }
  } catch (e) {
    try { console.warn('orderTagPreload: failed building caches', e?.message || e); } catch(_) {}
  }
}

// Initial build from cached menu if any
try {
  if (!__already) {
    const cached = menuService.getCurrentMenu?.() || null;
    if (cached) buildCachesFromMenu(cached);
    console.log('🔧 OrderTag preload initialized (menu-cache based).');
  }
} catch (_) {}

// Rebuild caches when DataManager refreshes menu
try {
  if (typeof window !== 'undefined') {
    window.addEventListener('dataManagerRefresh', (ev) => {
      if (!ev?.detail || ev.detail.type !== 'menu') return;
      try {
        const fresh = menuService.getCurrentMenu?.() || null;
        buildCachesFromMenu(fresh);
        if (!__already) console.log('🔁 OrderTag caches rebuilt after menu refresh');
      } catch (_) {}
    });
  }
} catch (_) {}

// Override orderTagService.fetchGroups and getGroups on default instance
try {
  const svc = orderTagService;
  if (!__already && svc && typeof svc.fetchGroups === 'function') {
    svc.fetchGroups = async (productId, portion) => {
      const pid = Number(productId);
      const prt = String(portion || 'Normal');
      const key = `${pid}|${prt}`;
      if (tagsByProductPortion.has(key)) {
        const vals = tagsByProductPortion.get(key) || [];
        return (vals || []).map(v => ({ id: `${v.tagName}:${v.name}`, name: v.name, group: v.tagName, price: v.price || 0 }));
      }
      if (tagsByProduct.has(pid)) {
        const groups = tagsByProduct.get(pid) || [];
        // Return shells with group names to populate UI without network
        return groups.map(g => ({ id: `${g.tagName}:`, name: '', group: g.tagName, price: 0 }));
      }
      // No info -> avoid network request (prevents 400 spam)
      return [];
    };
    if (typeof svc.getGroups === 'function') {
      svc.getGroups = async (productId, portion) => svc.fetchGroups(productId, portion);
    }
    try { console.log('🔧 OrderTag fetchGroups/getGroups overridden (menu cache).'); } catch (_) {}
  }
} catch (e) {
  try { console.warn('⚠️ orderTagPreload override failed', e?.message || e); } catch(_) {}
}

// Mark initialized to prevent double setup
try { if (__w) __w.__pmpos_orderTagPreloadInit = true; } catch(_) {}
