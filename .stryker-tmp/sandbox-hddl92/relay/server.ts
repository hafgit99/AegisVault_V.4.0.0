// @ts-nocheck
import Fastify from 'fastify';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';

/**
 * Aegis Sync Relay Server (Phase 2 / Adim 2.5)
 *
 * Sifir-bilgi prensibiyle calisan, sadece sifreli paketleri saklayan
 * ve cihazlar arasinda takas edilmesini saglayan minimal relay sunucusu.
 */

const fastify = Fastify({ logger: true });
const RELAY_KEY = (process.env.AEGIS_SYNC_RELAY_KEY || '').trim();
const RELAY_ADMIN_KEY = (process.env.AEGIS_SYNC_RELAY_ADMIN_KEY || RELAY_KEY).trim();
const RELAY_TTL_HOURS = Number.parseInt(process.env.AEGIS_SYNC_RELAY_TTL_HOURS || '72', 10);
const RELAY_RATE_LIMIT_WINDOW_MS = Number.parseInt(
  process.env.AEGIS_SYNC_RELAY_RATE_WINDOW_MS || '60000',
  10
);
const RELAY_RATE_LIMIT_MAX_REQUESTS = Number.parseInt(
  process.env.AEGIS_SYNC_RELAY_RATE_MAX_REQUESTS || '120',
  10
);
const rateLimitStore = new Map<string, number[]>();

// Database setup
let db: any;
let lastTtlCleanup = 0;

function safeHeaderValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value.length > 0) return String(value[0] || '').trim();
  return '';
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorized(request: { headers: Record<string, unknown> }, expected: string): boolean {
  if (!expected) return true;
  const header = safeHeaderValue(request.headers['x-aegis-relay-key']);
  if (!header) return false;
  return timingSafeEqual(header, expected);
}

function getClientIp(request: { ip?: string; headers: Record<string, unknown> }): string {
  const fwd = safeHeaderValue(request.headers['x-forwarded-for']);
  if (fwd) return fwd.split(',')[0].trim();
  return String(request.ip || 'unknown');
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const existing = rateLimitStore.get(ip) || [];
  const fresh = existing.filter((timestamp) => now - timestamp <= RELAY_RATE_LIMIT_WINDOW_MS);
  fresh.push(now);
  rateLimitStore.set(ip, fresh);
  return fresh.length > RELAY_RATE_LIMIT_MAX_REQUESTS;
}

async function cleanupExpiredEnvelopesIfNeeded(): Promise<void> {
  const now = Date.now();
  if (now - lastTtlCleanup < 60_000) return;
  lastTtlCleanup = now;

  const ttlHours = Number.isFinite(RELAY_TTL_HOURS) && RELAY_TTL_HOURS > 0 ? RELAY_TTL_HOURS : 72;
  await db.run("DELETE FROM envelopes WHERE createdAt < datetime('now', ?)", [
    `-${ttlHours} hours`,
  ]);
}

async function setupDb() {
  db = await open({
    filename: './sync_relay.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS envelopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      version TEXT NOT NULL,
      nonce TEXT NOT NULL,
      envelopeMac TEXT NOT NULL,
      payload TEXT NOT NULL,
      iv TEXT NOT NULL,
      hmac TEXT NOT NULL,
      sequenceNumber INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_session ON envelopes(sessionId);
  `);

  const tableInfo = await db.all('PRAGMA table_info(envelopes)');
  const columns = new Set((tableInfo as Array<{ name: string }>).map((col) => col.name));
  if (!columns.has('nonce')) {
    await db.exec("ALTER TABLE envelopes ADD COLUMN nonce TEXT NOT NULL DEFAULT ''");
  }
  if (!columns.has('envelopeMac')) {
    await db.exec("ALTER TABLE envelopes ADD COLUMN envelopeMac TEXT NOT NULL DEFAULT ''");
  }
}

// HMAC Validation Middleware (Optional but recommended)
// In a true zero-knowledge setup, the server might not have the AuthKey.
// But if the server tracks registered DeviceIDs, it can verify per-device tokens.

// Push Endpoint
fastify.post('/v1/sync/push', async (request, reply) => {
  if (!isAuthorized(request as any, RELAY_KEY)) {
    return reply.status(401).send({ error: 'UNAUTHORIZED' });
  }

  const ip = getClientIp(request as any);
  if (isRateLimited(ip)) {
    return reply.status(429).send({ error: 'RATE_LIMITED' });
  }

  await cleanupExpiredEnvelopesIfNeeded();

  const body = request.body as any;
  const { sessionId, deviceId, version, nonce, envelopeMac, payload, iv, hmac, sequenceNumber } =
    body;

  if (!sessionId || !payload || !hmac || !nonce || !envelopeMac || !iv || !deviceId || !version) {
    return reply.status(400).send({ error: 'Missing mandatory fields' });
  }
  if (!Number.isFinite(sequenceNumber)) {
    return reply.status(400).send({ error: 'INVALID_SEQUENCE' });
  }

  // Check sequence number to prevent old snapshots overwriting new ones
  const latest = await db.get(
    'SELECT sequenceNumber FROM envelopes WHERE sessionId = ? ORDER BY sequenceNumber DESC LIMIT 1',
    [sessionId]
  );
  if (latest && sequenceNumber <= latest.sequenceNumber) {
    return reply
      .status(409)
      .send({ error: 'Conflict: Older sequence number', latestSequence: latest.sequenceNumber });
  }

  await db.run(
    'INSERT INTO envelopes (sessionId, deviceId, version, nonce, envelopeMac, payload, iv, hmac, sequenceNumber) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [sessionId, deviceId, version, nonce, envelopeMac, payload, iv, hmac, sequenceNumber]
  );

  return { success: true, sequenceNumber };
});

// Pull Endpoint
fastify.get('/v1/sync/pull/:sessionId', async (request, reply) => {
  if (!isAuthorized(request as any, RELAY_KEY)) {
    return reply.status(401).send({ error: 'UNAUTHORIZED' });
  }

  const ip = getClientIp(request as any);
  if (isRateLimited(ip)) {
    return reply.status(429).send({ error: 'RATE_LIMITED' });
  }

  await cleanupExpiredEnvelopesIfNeeded();

  const { sessionId } = request.params as { sessionId: string };
  const { after = 0 } = request.query as { after?: number };

  const envelopes = await db.all(
    'SELECT * FROM envelopes WHERE sessionId = ? AND sequenceNumber > ? ORDER BY sequenceNumber ASC',
    [sessionId, after]
  );

  return envelopes;
});

// Admin / Cleanup (requires admin-level key)
fastify.delete('/v1/sync/session/:sessionId', async (request, reply) => {
  if (!isAuthorized(request as any, RELAY_ADMIN_KEY)) {
    return reply.status(401).send({ error: 'UNAUTHORIZED' });
  }

  const { sessionId } = request.params as { sessionId: string };
  await db.run('DELETE FROM envelopes WHERE sessionId = ?', [sessionId]);
  return { success: true };
});

const start = async () => {
  try {
    await setupDb();
    await fastify.listen({ port: 3000, host: process.env.AEGIS_SYNC_RELAY_HOST || '127.0.0.1' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
