// middlewares/cache.js
const { cacheGet, cacheSet } = require('../services/redis');

/**
 * Cache middleware for GET endpoints.
 * Usage: router.get('/path', cache('prefix', 60), controller);
 */
function cache(prefix = 'cache', ttlSeconds = 60) {
  return async function(req, res, next) {
    try {
      if (req.method !== 'GET') return next();
      const key = `${prefix}:${req.originalUrl}`;
      const hit = await cacheGet(key);
      if (hit) {
        return res.status(200).json(hit);
      }
      // override res.json to capture payload
      const json = res.json.bind(res);
      res.json = async (body) => {
        try {
          await cacheSet(key, body, ttlSeconds);
        } catch (e) {}
        return json(body);
      };
      next();
    } catch (e) {
      next();
    }
  }
}

module.exports = cache;
