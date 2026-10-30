import { createHash } from 'node:crypto';
import { cache } from './cache.js';

const sortKeys = (value) => {
  if (Array.isArray(value)) return [...value].sort();
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys(value[k])]),
    );
  return value;
};

/** Cached search: the key hashes the normalised filters and embeds the family version for cheap invalidation. */
export async function cachedSearch(family, filters, ttlSeconds, loader) {
  const version = await cache.version(family);
  const hash = createHash('sha1')
    .update(JSON.stringify(sortKeys(filters)))
    .digest('hex');
  return cache.getOrSet(`search:${family}:v${version}:${hash}`, ttlSeconds, loader);
}
