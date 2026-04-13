const crypto = require('crypto');
const net = require('net');
const os = require('os');
const path = require('path');

const PAIRING_SECRET = (process.env.AEGIS_EXTENSION_PAIRING_SECRET || '').trim();
const ALLOWLIST_EXTENSION_IDS = (
  process.env.AEGIS_EXTENSION_ALLOWLIST ||
  process.env.AEGIS_EXTENSION_ID ||
  ''
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

function normalizeDomain(input) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';
  try {
    const parsed = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return trimmed.replace(/^www\./, '');
  }
}

function isAllowlistedExtensionId(extensionId) {
  if (typeof extensionId !== 'string' || !extensionId) return false;
  if (ALLOWLIST_EXTENSION_IDS.length === 0) return false;
  return ALLOWLIST_EXTENSION_IDS.includes(extensionId);
}

function toHex(buffer) {
  return Buffer.from(buffer).toString('hex');
}

function getNativeBridgeSocketPath() {
  if (process.platform === 'win32') {
    return '\\\\.\\pipe\\aegis-vault-native-v1';
  }

  return path.join(os.tmpdir(), 'aegis-vault-native-v1.sock');
}

function buildBridgeProof(message, pairingSecret = '') {
  const activeSecret = (pairingSecret || PAIRING_SECRET || '').trim();
  if (!activeSecret || activeSecret.length < 32) {
    // Hidden debug log for developer to see in Chrome stderr
    return '';
  }

  const payload = JSON.stringify({
    type: typeof message?.type === 'string' ? message.type : '',
    extensionId: typeof message?.extensionId === 'string' ? message.extensionId.trim() : '',
    domain: normalizeDomain(typeof message?.domain === 'string' ? message.domain : ''),
    requestNonce: typeof message?.requestNonce === 'string' ? message.requestNonce.trim() : '',
    clientKeyId: typeof message?.clientKeyId === 'string' ? message.clientKeyId.trim() : '',
    clientTimestamp:
      typeof message?.clientTimestamp === 'string' ? message.clientTimestamp.trim() : '',
    clientNonce: typeof message?.clientNonce === 'string' ? message.clientNonce.trim() : '',
    clientInfo: {
      browserName:
        typeof message?.clientInfo?.browserName === 'string'
          ? message.clientInfo.browserName.trim()
          : '',
      browserVersion:
        typeof message?.clientInfo?.browserVersion === 'string'
          ? message.clientInfo.browserVersion.trim()
          : '',
      platform:
        typeof message?.clientInfo?.platform === 'string' ? message.clientInfo.platform.trim() : '',
      locale:
        typeof message?.clientInfo?.locale === 'string' ? message.clientInfo.locale.trim() : '',
      installId:
        typeof message?.clientInfo?.installId === 'string'
          ? message.clientInfo.installId.trim()
          : '',
      extensionVersion:
        typeof message?.clientInfo?.extensionVersion === 'string'
          ? message.clientInfo.extensionVersion.trim()
          : '',
      userAgent:
        typeof message?.clientInfo?.userAgent === 'string'
          ? message.clientInfo.userAgent.trim()
          : '',
    },
    clientPublicJwk: message?.clientPublicJwk || null,
    credential:
      message?.credential && typeof message.credential === 'object'
        ? {
            title: typeof message.credential.title === 'string' ? message.credential.title : '',
            username:
              typeof message.credential.username === 'string' ? message.credential.username : '',
            pass: typeof message.credential.pass === 'string' ? message.credential.pass : '',
            website:
              typeof message.credential.website === 'string' ? message.credential.website : '',
            submittedAt:
              typeof message.credential.submittedAt === 'string'
                ? message.credential.submittedAt
                : '',
            source:
              typeof message.credential.source === 'string'
                ? message.credential.source
                : 'browser_form',
          }
        : null,
    entry:
      message?.entry && typeof message.entry === 'object'
        ? {
            title: typeof message.entry.title === 'string' ? message.entry.title : '',
            username: typeof message.entry.username === 'string' ? message.entry.username : '',
            pass: typeof message.entry.pass === 'string' ? message.entry.pass : '',
            website: typeof message.entry.website === 'string' ? message.entry.website : '',
            category: typeof message.entry.category === 'string' ? message.entry.category : '',
            tags: Array.isArray(message.entry.tags)
              ? message.entry.tags.map((item) => String(item || ''))
              : [],
          }
        : null,
    entryId: Number.isFinite(Number(message?.entryId)) ? Number(message.entryId) : 0,
    query: typeof message?.query === 'string' ? message.query : '',
    category: typeof message?.category === 'string' ? message.category : '',
    scope: typeof message?.scope === 'string' ? message.scope : '',
    searchScope: typeof message?.searchScope === 'string' ? message.searchScope : '',
    limit: Number.isFinite(Number(message?.limit)) ? Number(message.limit) : 0,
    title: typeof message?.title === 'string' ? message.title.slice(0, 256) : '',
  });

  return crypto
    .createHmac('sha256', Buffer.from(activeSecret, 'utf8'))
    .update(payload)
    .digest('hex');
}

function createSignedBridgePayload(message, pairingSecret = '') {
  return {
    ...message,
    proof: buildBridgeProof(message, pairingSecret),
  };
}

function buildForwardBridgeMessage(message, overrides = {}) {
  const rawCredential =
    message?.credential && typeof message.credential === 'object' ? message.credential : null;
  const credential = rawCredential
    ? {
        title: String(rawCredential.title || '').slice(0, 120),
        username: String(rawCredential.username || '').slice(0, 256),
        pass: String(rawCredential.pass || '').slice(0, 1024),
        website: String(rawCredential.website || '').slice(0, 512),
        submittedAt: typeof rawCredential.submittedAt === 'string' ? rawCredential.submittedAt : '',
        source: typeof rawCredential.source === 'string' ? rawCredential.source : 'browser_form',
      }
    : null;
  const rawEntry = message?.entry && typeof message.entry === 'object' ? message.entry : null;
  const entry = rawEntry
    ? {
        title: String(rawEntry.title || '').slice(0, 256),
        username: String(rawEntry.username || '').slice(0, 256),
        pass: String(rawEntry.pass || '').slice(0, 1024),
        website: String(rawEntry.website || '').slice(0, 512),
        category: String(rawEntry.category || 'General').slice(0, 64),
        tags: Array.isArray(rawEntry.tags)
          ? rawEntry.tags.slice(0, 32).map((item) => String(item || '').slice(0, 64))
          : [],
      }
    : null;

  return {
    ...overrides,
    type: typeof overrides.type === 'string' ? overrides.type : message.type,
    extensionId: typeof message?.extensionId === 'string' ? message.extensionId : '',
    domain:
      typeof overrides.domain === 'string'
        ? overrides.domain
        : typeof message?.domain === 'string'
          ? message.domain
          : '',
    requestNonce: typeof message?.requestNonce === 'string' ? message.requestNonce : '',
    browserName:
      typeof overrides.browserName === 'string'
        ? overrides.browserName
        : typeof message?.browserName === 'string'
          ? message.browserName
          : '',
    clientInfo: message?.clientInfo || {},
    clientKeyId: typeof message?.clientKeyId === 'string' ? message.clientKeyId : '',
    clientTimestamp: typeof message?.clientTimestamp === 'string' ? message.clientTimestamp : '',
    clientNonce: typeof message?.clientNonce === 'string' ? message.clientNonce : '',
    clientSignature: typeof message?.clientSignature === 'string' ? message.clientSignature : '',
    clientPublicJwk: message?.clientPublicJwk || null,
    credential,
    entryId: Number.isFinite(Number(message?.entryId)) ? Number(message.entryId) : undefined,
    entry,
    query: typeof message?.query === 'string' ? message.query.slice(0, 256) : '',
    category: typeof message?.category === 'string' ? message.category.slice(0, 64) : '',
    scope: typeof message?.scope === 'string' ? message.scope.slice(0, 16) : '',
    searchScope: typeof message?.searchScope === 'string' ? message.searchScope.slice(0, 16) : '',
    limit: Number.isFinite(Number(message?.limit)) ? Number(message.limit) : undefined,
    title: typeof message?.title === 'string' ? message.title.slice(0, 256) : '',
  };
}

async function sendNativeBridgeMessage(message, pairingSecret = '') {
  const socketPath = process.env.AEGIS_NATIVE_BRIDGE_SOCKET_PATH || getNativeBridgeSocketPath();

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let responseBuffer = '';
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };

    socket.setEncoding('utf8');
    socket.setTimeout(3000);

    socket.on('connect', () => {
      const payload = createSignedBridgePayload(message, pairingSecret);

      socket.write(`${JSON.stringify(payload)}\n`);
    });

    socket.on('data', (chunk) => {
      responseBuffer += chunk;
      const newlineIndex = responseBuffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const rawResponse = responseBuffer.slice(0, newlineIndex).trim();
      try {
        finish(resolve, JSON.parse(rawResponse || '{}'));
      } catch (error) {
        finish(reject, new Error('INVALID_NATIVE_BRIDGE_RESPONSE'));
      } finally {
        socket.end();
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      finish(reject, new Error('NATIVE_BRIDGE_TIMEOUT'));
    });

    socket.on('error', (error) => {
      finish(reject, error);
    });

    socket.on('end', () => {
      if (!settled) {
        finish(reject, new Error('NATIVE_BRIDGE_EOF'));
      }
    });
  });
}

function readMessages(onMessage) {
  let buffer = Buffer.alloc(0);

  process.stdin.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const messageLength = buffer.readUInt32LE(0);
      if (buffer.length < messageLength + 4) {
        return;
      }

      const messageBuffer = buffer.subarray(4, 4 + messageLength);
      buffer = buffer.subarray(4 + messageLength);

      try {
        const message = JSON.parse(messageBuffer.toString('utf8'));
        void onMessage(message);
      } catch (error) {
        writeMessage({ ok: false, error: 'INVALID_NATIVE_MESSAGE' });
      }
    }
  });
}

function writeMessage(message) {
  const json = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  const payload = Buffer.concat([header, json]);
  process.stdout.write(payload);
  return payload;
}

async function handleMessageWithDeps(
  message,
  deps = {
    sendNativeBridgeMessage,
    writeMessage,
    isAllowlistedExtensionId,
  }
) {
  const type = typeof message?.type === 'string' ? message.type : '';
  const extensionId = typeof message?.extensionId === 'string' ? message.extensionId.trim() : '';
  const pairingSecret =
    typeof message?.pairingSecret === 'string' ? message.pairingSecret.trim() : '';

  if (!deps.isAllowlistedExtensionId(extensionId)) {
    deps.writeMessage({ ok: false, error: 'FORBIDDEN_EXTENSION_ID' });
    return;
  }

  try {
    if (type === 'INIT_PAIRING') {
      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'INIT_PAIRING',
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'PAIRING_FAILED'),
        paired: Boolean(result?.paired),
        secret: typeof result?.secret === 'string' ? result.secret : '',
        pairedAt: typeof result?.pairedAt === 'string' ? result.pairedAt : '',
        riskFlags: Array.isArray(result?.riskFlags) ? result.riskFlags : [],
        deviceFingerprint:
          typeof result?.deviceFingerprint === 'string' ? result.deviceFingerprint : '',
        pairingMode:
          typeof result?.pairingMode === 'string' ? result.pairingMode : 'signed-p256-v1',
        clientKeyId: typeof result?.clientKeyId === 'string' ? result.clientKeyId : '',
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'CLEAR_PAIRING') {
      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'CLEAR_PAIRING',
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'CLEAR_PAIRING_FAILED'),
        cleared: Boolean(result?.cleared),
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'GET_PAIRING_STATUS') {
      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'GET_PAIRING_STATUS',
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'PAIRING_STATUS_FAILED'),
        paired: Boolean(result?.paired),
        pairedAt: typeof result?.pairedAt === 'string' ? result.pairedAt : '',
        pairingMode: typeof result?.pairingMode === 'string' ? result.pairingMode : 'none',
        clientKeyId: typeof result?.clientKeyId === 'string' ? result.clientKeyId : '',
        clientLabel: typeof result?.clientLabel === 'string' ? result.clientLabel : '',
        deviceFingerprint:
          typeof result?.deviceFingerprint === 'string' ? result.deviceFingerprint : '',
        lastUsedAt: typeof result?.lastUsedAt === 'string' ? result.lastUsedAt : '',
        lastApprovedAt: typeof result?.lastApprovedAt === 'string' ? result.lastApprovedAt : '',
        riskFlags: Array.isArray(result?.riskFlags) ? result.riskFlags : [],
        riskLevel: typeof result?.riskLevel === 'string' ? result.riskLevel : 'low',
        pairingHistory: Array.isArray(result?.pairingHistory) ? result.pairingHistory : [],
        secretSource: typeof result?.secretSource === 'string' ? result.secretSource : 'none',
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'GET_VAULT_STATUS') {
      const status = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'GET_VAULT_STATUS',
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(status?.ok),
        error: status?.ok ? undefined : String(status?.error || 'STATUS_FAILED'),
        isUnlocked: Boolean(status?.isUnlocked),
        entryCount: Number(status?.entryCount || 0),
        desktopAuth: status?.desktopAuth || null,
      });
      return;
    }

    if (type === 'GET_UI_LANGUAGE') {
      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'GET_UI_LANGUAGE',
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'UI_LANGUAGE_FAILED'),
        language: typeof result?.language === 'string' ? result.language : 'en',
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'GENERATE_ALIAS') {
      const domain = normalizeDomain(typeof message?.domain === 'string' ? message.domain : '');
      if (!domain) {
        deps.writeMessage({ ok: false, error: 'INVALID_DOMAIN' });
        return;
      }

      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'GENERATE_ALIAS',
          domain,
          title:
            typeof message?.title === 'string' && message.title.trim()
              ? message.title.trim()
              : domain,
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'ALIAS_GENERATION_FAILED'),
        alias: typeof result?.alias === 'string' ? result.alias : '',
        providerLabel: typeof result?.providerLabel === 'string' ? result.providerLabel : '',
        providerSyncStatus:
          typeof result?.providerSyncStatus === 'string' ? result.providerSyncStatus : 'manual',
        providerManagementUrl:
          typeof result?.providerManagementUrl === 'string' ? result.providerManagementUrl : '',
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'GET_DOMAIN_CREDS') {
      const domain = normalizeDomain(typeof message?.domain === 'string' ? message.domain : '');
      if (!domain) {
        deps.writeMessage({ ok: false, error: 'INVALID_DOMAIN', data: [] });
        return;
      }

      const data = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'GET_DOMAIN_CREDS',
          domain,
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(data?.ok),
        error: data?.ok ? undefined : String(data?.error || 'DOMAIN_FAILED'),
        data: Array.isArray(data?.data) ? data.data : [],
        desktopAuth: data?.desktopAuth || null,
      });
      return;
    }

    if (type === 'GET_DOMAIN_PASSKEYS') {
      const domain = normalizeDomain(typeof message?.domain === 'string' ? message.domain : '');
      if (!domain) {
        deps.writeMessage({ ok: false, error: 'INVALID_DOMAIN', data: [] });
        return;
      }

      const data = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'GET_DOMAIN_PASSKEYS',
          domain,
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(data?.ok),
        error: data?.ok ? undefined : String(data?.error || 'DOMAIN_FAILED'),
        data: Array.isArray(data?.data) ? data.data : [],
        desktopAuth: data?.desktopAuth || null,
      });
      return;
    }

    if (type === 'AUTOSAVE_CREDENTIAL') {
      const domain = normalizeDomain(typeof message?.domain === 'string' ? message.domain : '');
      const rawCredential =
        message?.credential && typeof message.credential === 'object' ? message.credential : null;
      const credential = rawCredential
        ? {
            title: String(rawCredential.title || '').slice(0, 120),
            username: String(rawCredential.username || '').slice(0, 256),
            pass: String(rawCredential.pass || '').slice(0, 1024),
            website: String(rawCredential.website || '').slice(0, 512),
            submittedAt:
              typeof rawCredential.submittedAt === 'string' ? rawCredential.submittedAt : '',
            source:
              typeof rawCredential.source === 'string' ? rawCredential.source : 'browser_form',
          }
        : null;

      if (!domain || !credential?.pass || !credential?.website) {
        deps.writeMessage({ ok: false, error: 'INVALID_AUTOSAVE_PAYLOAD' });
        return;
      }

      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'AUTOSAVE_CREDENTIAL',
          domain,
          credential,
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        saved: Boolean(result?.saved),
        action: typeof result?.action === 'string' ? result.action : 'none',
        entryId: Number.isFinite(Number(result?.entryId)) ? Number(result.entryId) : undefined,
        error: result?.ok ? undefined : String(result?.error || 'AUTOSAVE_FAILED'),
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'LIST_VAULT_ENTRIES') {
      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'LIST_VAULT_ENTRIES',
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'CLI_LIST_FAILED'),
        data: Array.isArray(result?.data) ? result.data : [],
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'GET_VAULT_ENTRY') {
      const entryId = Number.isFinite(Number(message?.entryId)) ? Number(message.entryId) : NaN;
      if (!Number.isFinite(entryId)) {
        deps.writeMessage({ ok: false, error: 'INVALID_ENTRY_ID', data: null });
        return;
      }
      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'GET_VAULT_ENTRY',
          entryId,
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'CLI_GET_FAILED'),
        data: result?.data || null,
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'CREATE_VAULT_ENTRY' || type === 'UPDATE_VAULT_ENTRY') {
      const entry = message?.entry && typeof message.entry === 'object' ? message.entry : null;
      if (!entry) {
        deps.writeMessage({ ok: false, error: 'INVALID_ENTRY_PAYLOAD' });
        return;
      }
      const entryId = Number.isFinite(Number(message?.entryId))
        ? Number(message.entryId)
        : undefined;
      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type,
          ...(Number.isFinite(Number(entryId)) ? { entryId } : {}),
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'CLI_WRITE_FAILED'),
        data: result?.data || null,
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'DELETE_VAULT_ENTRY' || type === 'RESTORE_VAULT_ENTRY') {
      const entryId = Number.isFinite(Number(message?.entryId)) ? Number(message.entryId) : NaN;
      if (!Number.isFinite(entryId)) {
        deps.writeMessage({ ok: false, error: 'INVALID_ENTRY_ID' });
        return;
      }
      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type,
          entryId,
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'CLI_MUTATION_FAILED'),
        data: result?.data || null,
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    if (type === 'EMPTY_VAULT_TRASH') {
      const result = await deps.sendNativeBridgeMessage(
        buildForwardBridgeMessage(message, {
          type: 'EMPTY_VAULT_TRASH',
        }),
        pairingSecret
      );
      deps.writeMessage({
        ok: Boolean(result?.ok),
        error: result?.ok ? undefined : String(result?.error || 'CLI_EMPTY_TRASH_FAILED'),
        data: result?.data || null,
        desktopAuth: result?.desktopAuth || null,
      });
      return;
    }

    deps.writeMessage({ ok: false, error: 'UNSUPPORTED_MESSAGE_TYPE' });
  } catch (error) {
    deps.writeMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'NATIVE_HOST_ERROR',
    });
  }
}

async function handleMessage(message) {
  return handleMessageWithDeps(message);
}

if (require.main === module) {
  process.stdin.resume();
  readMessages(handleMessage);
}

module.exports = {
  buildBridgeProof,
  createSignedBridgePayload,
  sendNativeBridgeMessage,
  normalizeDomain,
  isAllowlistedExtensionId,
  getNativeBridgeSocketPath,
  buildForwardBridgeMessage,
  writeMessage,
  handleMessage,
  handleMessageWithDeps,
};
