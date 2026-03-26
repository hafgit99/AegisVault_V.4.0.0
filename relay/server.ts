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

// Database setup
let db: any;
async function setupDb() {
  db = await open({
    filename: './sync_relay.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS envelopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      version TEXT NOT NULL,
      payload TEXT NOT NULL,
      iv TEXT NOT NULL,
      hmac TEXT NOT NULL,
      sequenceNumber INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_session ON envelopes(sessionId);
  `);
}

// HMAC Validation Middleware (Optional but recommended)
// In a true zero-knowledge setup, the server might not have the AuthKey.
// But if the server tracks registered DeviceIDs, it can verify per-device tokens.

// Push Endpoint
fastify.post('/v1/sync/push', async (request, reply) => {
  const body = request.body as any;
  const { sessionId, deviceId, version, payload, iv, hmac, sequenceNumber } = body;

  if (!sessionId || !payload || !hmac) {
    return reply.status(400).send({ error: 'Missing mandatory fields' });
  }

  // Check sequence number to prevent old snapshots overwriting new ones
  const latest = await db.get('SELECT sequenceNumber FROM envelopes WHERE sessionId = ? ORDER BY sequenceNumber DESC LIMIT 1', [sessionId]);
  if (latest && sequenceNumber <= latest.sequenceNumber) {
    return reply.status(409).send({ error: 'Conflict: Older sequence number', latestSequence: latest.sequenceNumber });
  }

  await db.run(
    'INSERT INTO envelopes (sessionId, deviceId, version, payload, iv, hmac, sequenceNumber) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [sessionId, deviceId, version, payload, iv, hmac, sequenceNumber]
  );

  return { success: true, sequenceNumber };
});

// Pull Endpoint
fastify.get('/v1/sync/pull/:sessionId', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const { after = 0 } = request.query as { after?: number };

  const envelopes = await db.all(
    'SELECT * FROM envelopes WHERE sessionId = ? AND sequenceNumber > ? ORDER BY sequenceNumber ASC',
    [sessionId, after]
  );

  return envelopes;
});

// Admin / Cleanup (Rate limits and TTL should be added here)
fastify.delete('/v1/sync/session/:sessionId', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  await db.run('DELETE FROM envelopes WHERE sessionId = ?', [sessionId]);
  return { success: true };
});

const start = async () => {
  try {
    await setupDb();
    await fastify.listen({ port: 3000, host: '0-0-0-0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
