import Debug from 'debug';
import menuService from './menuService';
import orderTagService from './orderTagService';

const debug = Debug('pmpos:product-tags-index');

class ProductOrderTagsIndex {
    constructor() {
        this.index = new Map(); // key: `${name}|${portion}` -> [{ group, tags: [{ name, price }] }]
        this.ttlMs = 5 * 60 * 1000; // 5 minutes
        this.lastBuilt = 0;
        this.building = false;
    }

    _key(name, portion) {
        return `${String(name)}|${String(portion || 'Normal')}`;
    }

    isFresh() {
        return Date.now() - this.lastBuilt < this.ttlMs;
    }

    clear() {
        this.index.clear();
        this.lastBuilt = 0;
    }

    async build(force = false) {
        if (this.building) {
            debug('⏳ build already in progress, skipping');
            return;
        }
        if (!force && this.isFresh()) {
            debug('✅ index still fresh');
            return;
        }
        this.building = true;
        try {
            debug('📦 building product→orderTags index...');
            const menu = await menuService.getMenu(false);
            if (!menu?.categories?.length) {
                debug('⚠️ no menu categories available');
                return;
            }
            const tasks = [];
            for (const c of menu.categories) {
                for (const it of (c.menuItems || [])) {
                    const name = it?.product?.name || it?.name;
                    const portions = it?.product?.portions || [{ name: 'Normal' }];
                    for (const p of portions) {
                        const portion = p?.name || 'Normal';
                        tasks.push({ name, portion, productId: it?.productId || it?.product?.id });
                    }
                }
            }
            // Limit concurrency to avoid hammering server
            const max = 6;
            let i = 0;
            const runNext = async () => {
                if (i >= tasks.length) return;
                const t = tasks[i++];
                try {
                    // Prefer productId path (orderTagService uses productId)
                    debug(`🏷️ Building index for: ${t.name}, portion: ${t.portion}, productId: ${t.productId}`);
                    const flat = await orderTagService.getGroups(t.productId, t.portion);
                    if (flat && flat.length) {
                        debug(`✅ Found ${flat.length} order tags for ${t.name}`);
                        // group results back by group name
                        const grouped = new Map();
                        for (const f of flat) {
                            const arr = grouped.get(f.group) || [];
                            arr.push({ name: f.name, price: f.price });
                            grouped.set(f.group, arr);
                        }
                        const groups = Array.from(grouped.entries()).map(([group, tags]) => ({ group, tags }));
                        this.index.set(this._key(t.name, t.portion), groups);
                        debug(`🎯 Stored ${groups.length} tag groups for ${t.name}`);
                    } else {
                        debug(`⚠️ No order tags found for ${t.name} portion ${t.portion}`);
                    }
                } catch (e) {
                    debug('❌ fetch groups failed for', t, e?.message || e);
                }
                await runNext();
            };
            await Promise.all(Array.from({ length: Math.min(max, tasks.length) }, () => runNext()));
            this.lastBuilt = Date.now();
            debug(`✅ index built (${this.index.size} product/portion entries)`);
        } finally {
            this.building = false;
        }
    }

    async get(name, portion = 'Normal') {
        if (!this.isFresh()) await this.build();
        return this.index.get(this._key(name, portion)) || [];
    }
}

const productOrderTagsIndex = new ProductOrderTagsIndex();
export default productOrderTagsIndex;
export { ProductOrderTagsIndex };
