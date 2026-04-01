#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const DEFAULT_EXTENSION_ID = process.env.AEGIS_CLI_EXTENSION_ID || 'aegisvault-cli@local';
const DEFAULT_SOCKET_PATH = process.platform === 'win32'
  ? '\\\\.\\pipe\\aegis-vault-native-v1'
  : path.join(os.tmpdir(), 'aegis-vault-native-v1.sock');
const CONFIG_DIR = path.join(os.homedir(), '.aegis-vault');
const CONFIG_PATH = path.join(CONFIG_DIR, 'cli-config.json');

const I18N = {
  tr: {
    usage: 'Kullanim: aegis-cli <komut> [opsiyonlar]',
    commands: 'Komutlar: pair, status, language, list, get <id>, add, update <id>, delete <id>, restore <id>, empty-trash, unpair',
    paired: 'CLI eslestirildi.',
    unpaired: 'CLI eslesmesi kaldirildi.',
    status: 'Durum',
    vaultLocked: 'Kasa kilitli.',
    success: 'Basarili',
    failed: 'Basarisiz',
    missingCommand: 'Komut belirtilmedi.',
    missingId: 'Gecerli bir id girin.',
    pairRequired: 'Bu islem icin once `aegis-cli pair` calistirin.',
    titleRequired: '`--title` zorunlu.',
    passRequired: '`--pass` zorunlu.',
    opDone: 'Islem tamamlandi.',
    noData: 'Kayit bulunamadi.',
  },
  en: {
    usage: 'Usage: aegis-cli <command> [options]',
    commands: 'Commands: pair, status, language, list, get <id>, add, update <id>, delete <id>, restore <id>, empty-trash, unpair',
    paired: 'CLI paired successfully.',
    unpaired: 'CLI pairing removed.',
    status: 'Status',
    vaultLocked: 'Vault is locked.',
    success: 'Success',
    failed: 'Failed',
    missingCommand: 'Missing command.',
    missingId: 'Provide a valid id.',
    pairRequired: 'Run `aegis-cli pair` before this operation.',
    titleRequired: '`--title` is required.',
    passRequired: '`--pass` is required.',
    opDone: 'Operation completed.',
    noData: 'No records found.',
  },
};

function normalizeLanguage(value) {
  return typeof value === 'string' && value.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

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

function normalizeClientPublicJwk(jwk) {
  if (!jwk || typeof jwk !== 'object') return null;
  const kty = typeof jwk.kty === 'string' ? jwk.kty : '';
  const crv = typeof jwk.crv === 'string' ? jwk.crv : '';
  const x = typeof jwk.x === 'string' ? jwk.x : '';
  const y = typeof jwk.y === 'string' ? jwk.y : '';
  if (kty !== 'EC' || crv !== 'P-256' || !x || !y) return null;
  return {
    key_ops: ['verify'],
    ext: true,
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
  };
}

function computeClientKeyId(publicJwk) {
  const normalized = normalizeClientPublicJwk(publicJwk);
  if (!normalized) return '';
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 24);
}

function getClientInfo(extensionId) {
  return {
    browserName: 'Aegis CLI',
    browserVersion: '1.0.0',
    platform: `${os.platform()}-${os.arch()}`,
    locale: Intl.DateTimeFormat().resolvedOptions().locale || 'en-US',
    installId: extensionId,
    extensionVersion: 'cli',
    userAgent: `aegis-cli/${process.version}`,
  };
}

function buildNativeBridgePayload(message) {
  const clientPublicJwk = normalizeClientPublicJwk(message.clientPublicJwk);
  const credential = message?.credential && typeof message.credential === 'object'
    ? {
        title: typeof message.credential.title === 'string' ? message.credential.title : '',
        username: typeof message.credential.username === 'string' ? message.credential.username : '',
        pass: typeof message.credential.pass === 'string' ? message.credential.pass : '',
        website: typeof message.credential.website === 'string' ? message.credential.website : '',
        submittedAt: typeof message.credential.submittedAt === 'string' ? message.credential.submittedAt : '',
        source: typeof message.credential.source === 'string' ? message.credential.source : 'browser_form',
      }
    : null;
  const entry = message?.entry && typeof message.entry === 'object'
    ? {
        title: typeof message.entry.title === 'string' ? message.entry.title : '',
        username: typeof message.entry.username === 'string' ? message.entry.username : '',
        pass: typeof message.entry.pass === 'string' ? message.entry.pass : '',
        website: typeof message.entry.website === 'string' ? message.entry.website : '',
        category: typeof message.entry.category === 'string' ? message.entry.category : '',
        tags: Array.isArray(message.entry.tags) ? message.entry.tags.map((item) => String(item || '')) : [],
      }
    : null;

  return JSON.stringify({
    type: typeof message?.type === 'string' ? message.type : '',
    extensionId: typeof message?.extensionId === 'string' ? message.extensionId.trim() : '',
    domain: normalizeDomain(typeof message?.domain === 'string' ? message.domain : ''),
    requestNonce: typeof message?.requestNonce === 'string' ? message.requestNonce.trim() : '',
    clientKeyId: typeof message?.clientKeyId === 'string' ? message.clientKeyId.trim() : '',
    clientTimestamp: typeof message?.clientTimestamp === 'string' ? message.clientTimestamp.trim() : '',
    clientNonce: typeof message?.clientNonce === 'string' ? message.clientNonce.trim() : '',
    clientInfo: {
      browserName: typeof message?.clientInfo?.browserName === 'string' ? message.clientInfo.browserName.trim() : '',
      browserVersion: typeof message?.clientInfo?.browserVersion === 'string' ? message.clientInfo.browserVersion.trim() : '',
      platform: typeof message?.clientInfo?.platform === 'string' ? message.clientInfo.platform.trim() : '',
      locale: typeof message?.clientInfo?.locale === 'string' ? message.clientInfo.locale.trim() : '',
      installId: typeof message?.clientInfo?.installId === 'string' ? message.clientInfo.installId.trim() : '',
      extensionVersion: typeof message?.clientInfo?.extensionVersion === 'string' ? message.clientInfo.extensionVersion.trim() : '',
      userAgent: typeof message?.clientInfo?.userAgent === 'string' ? message.clientInfo.userAgent.trim() : '',
    },
    clientPublicJwk,
    credential,
    entry,
    entryId: Number.isFinite(Number(message?.entryId)) ? Number(message.entryId) : 0,
    query: typeof message?.query === 'string' ? message.query.slice(0, 256) : '',
    category: typeof message?.category === 'string' ? message.category.slice(0, 64) : '',
    scope: typeof message?.scope === 'string' ? message.scope.slice(0, 16) : '',
    searchScope: typeof message?.searchScope === 'string' ? message.searchScope.slice(0, 16) : '',
    limit: Number.isFinite(Number(message?.limit)) ? Number(message.limit) : 0,
  });
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {
      extensionId: DEFAULT_EXTENSION_ID,
      language: 'en',
      privateJwk: null,
      publicJwk: null,
      clientKeyId: '',
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return {
      extensionId: typeof raw.extensionId === 'string' ? raw.extensionId : DEFAULT_EXTENSION_ID,
      language: normalizeLanguage(raw.language),
      privateJwk: raw.privateJwk || null,
      publicJwk: raw.publicJwk || null,
      clientKeyId: typeof raw.clientKeyId === 'string' ? raw.clientKeyId : '',
    };
  } catch {
    return {
      extensionId: DEFAULT_EXTENSION_ID,
      language: 'en',
      privateJwk: null,
      publicJwk: null,
      clientKeyId: '',
    };
  }
}

function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function ensureClientKeys(config) {
  const normalizedPublic = normalizeClientPublicJwk(config.publicJwk);
  if (normalizedPublic && config.privateJwk && config.clientKeyId) {
    return config;
  }
  const keyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const publicJwk = normalizeClientPublicJwk(keyPair.publicKey.export({ format: 'jwk' }));
  const privateJwk = keyPair.privateKey.export({ format: 'jwk' });
  const clientKeyId = computeClientKeyId(publicJwk);
  const nextConfig = {
    ...config,
    publicJwk,
    privateJwk,
    clientKeyId,
  };
  saveConfig(nextConfig);
  return nextConfig;
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {};
  const positionals = [];
  while (args.length) {
    const token = args.shift();
    if (token.startsWith('--')) {
      const key = token.slice(2);
      if (!args.length || args[0].startsWith('--')) {
        options[key] = true;
      } else {
        options[key] = args.shift();
      }
      continue;
    }
    positionals.push(token);
  }
  return { positionals, options };
}

function sendBridgeMessage(message) {
  return new Promise((resolve, reject) => {
    const socketPath = process.env.AEGIS_NATIVE_BRIDGE_SOCKET_PATH || DEFAULT_SOCKET_PATH;
    const socket = net.createConnection(socketPath);
    let buffer = '';
    let settled = false;

    const finish = (cb, value) => {
      if (settled) return;
      settled = true;
      cb(value);
    };

    socket.setEncoding('utf8');
    socket.setTimeout(5000);

    socket.on('connect', () => {
      socket.write(`${JSON.stringify(message)}\n`);
    });

    socket.on('data', (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) return;
      const raw = buffer.slice(0, newlineIndex).trim();
      try {
        finish(resolve, JSON.parse(raw || '{}'));
      } catch {
        finish(reject, new Error('INVALID_NATIVE_BRIDGE_RESPONSE'));
      } finally {
        socket.end();
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      finish(reject, new Error('NATIVE_BRIDGE_TIMEOUT'));
    });
    socket.on('error', (error) => finish(reject, error));
    socket.on('end', () => {
      if (!settled) finish(reject, new Error('NATIVE_BRIDGE_EOF'));
    });
  });
}

function signBridgeMessage(config, message) {
  const timestamp = Date.now().toString();
  const clientNonce = crypto.randomUUID();
  const requestNonce = crypto.randomUUID();
  const signingPayload = {
    ...message,
    requestNonce,
    clientTimestamp: timestamp,
    clientNonce,
    clientKeyId: config.clientKeyId,
    clientPublicJwk: config.publicJwk,
  };
  const signer = crypto.createSign('SHA256');
  signer.update(buildNativeBridgePayload(signingPayload));
  signer.end();
  const privateKey = crypto.createPrivateKey({ key: config.privateJwk, format: 'jwk' });
  const clientSignature = signer.sign(privateKey).toString('hex');
  return {
    ...signingPayload,
    clientSignature,
  };
}

async function callBridge(config, type, payload = {}) {
  const baseMessage = {
    type,
    extensionId: config.extensionId,
    clientInfo: getClientInfo(config.extensionId),
    ...payload,
  };
  const signedMessage = signBridgeMessage(config, baseMessage);
  return sendBridgeMessage(signedMessage);
}

function printOutput(result, options, t) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result && typeof result === 'object' && Array.isArray(result.data)) {
    if (result.data.length === 0) {
      console.log(t.noData);
      return;
    }
    console.table(result.data);
    return;
  }
  if (result && typeof result === 'object' && result.data && typeof result.data === 'object') {
    console.log(JSON.stringify(result.data, null, 2));
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

async function main() {
  const { positionals, options } = parseArgs(process.argv.slice(2));
  let config = loadConfig();
  config.language = options.lang ? normalizeLanguage(options.lang) : normalizeLanguage(config.language);
  config.extensionId = typeof options.extensionId === 'string' && options.extensionId.trim()
    ? options.extensionId.trim()
    : config.extensionId;
  config = ensureClientKeys(config);
  saveConfig(config);

  const t = I18N[config.language];
  const command = (positionals[0] || '').toLowerCase();
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(t.usage);
    console.log(t.commands);
    return;
  }

  const requiresPair = ['list', 'get', 'add', 'update', 'delete', 'restore', 'empty-trash', 'unpair', 'language'];
  if (requiresPair.includes(command) && command !== 'language') {
    const statusCheck = await callBridge(config, 'GET_PAIRING_STATUS');
    if (!statusCheck?.ok || !statusCheck?.paired) {
      throw new Error(t.pairRequired);
    }
  }

  if (command === 'pair') {
    const response = await callBridge(config, 'INIT_PAIRING', { browserName: 'Aegis CLI' });
    if (!response?.ok) throw new Error(response?.error || 'PAIRING_FAILED');
    console.log(t.paired);
    printOutput(response, options, t);
    return;
  }

  if (command === 'unpair') {
    const response = await callBridge(config, 'CLEAR_PAIRING');
    if (!response?.ok) throw new Error(response?.error || 'UNPAIR_FAILED');
    console.log(t.unpaired);
    return;
  }

  if (command === 'status') {
    const [pairingStatus, vaultStatus] = await Promise.all([
      callBridge(config, 'GET_PAIRING_STATUS'),
      callBridge(config, 'GET_VAULT_STATUS'),
    ]);
    printOutput({
      ok: Boolean(pairingStatus?.ok && vaultStatus?.ok),
      data: {
        paired: Boolean(pairingStatus?.paired),
        pairingMode: pairingStatus?.pairingMode || 'none',
        isUnlocked: Boolean(vaultStatus?.isUnlocked),
        entryCount: Number(vaultStatus?.entryCount || 0),
      },
    }, options, t);
    return;
  }

  if (command === 'language') {
    const response = await callBridge(config, 'GET_UI_LANGUAGE');
    if (!response?.ok) throw new Error(response?.error || 'UI_LANGUAGE_FAILED');
    printOutput(response, options, t);
    return;
  }

  if (command === 'list') {
    const response = await callBridge(config, 'LIST_VAULT_ENTRIES', {
      query: typeof options.query === 'string' ? options.query : '',
      category: typeof options.category === 'string' ? options.category : '',
      scope: options.scope === 'trash' ? 'trash' : 'active',
      searchScope: ['all', 'title', 'username', 'tags'].includes(String(options.searchScope || ''))
        ? options.searchScope
        : 'all',
      limit: Number.isFinite(Number(options.limit)) ? Number(options.limit) : 50,
    });
    if (!response?.ok) throw new Error(response?.error || 'LIST_FAILED');
    printOutput(response, options, t);
    return;
  }

  if (command === 'get') {
    const id = toNumber(positionals[1]);
    if (!Number.isFinite(id)) throw new Error(t.missingId);
    const response = await callBridge(config, 'GET_VAULT_ENTRY', { entryId: id });
    if (!response?.ok) throw new Error(response?.error || 'GET_FAILED');
    printOutput(response, options, t);
    return;
  }

  if (command === 'add') {
    const title = typeof options.title === 'string' ? options.title : '';
    const pass = typeof options.pass === 'string' ? options.pass : '';
    if (!title) throw new Error(t.titleRequired);
    if (!pass) throw new Error(t.passRequired);
    const tags = typeof options.tags === 'string'
      ? options.tags.split(',').map((item) => item.trim()).filter(Boolean)
      : [];
    const response = await callBridge(config, 'CREATE_VAULT_ENTRY', {
      entry: {
        title,
        username: typeof options.username === 'string' ? options.username : '',
        pass,
        website: typeof options.website === 'string' ? options.website : '',
        category: typeof options.category === 'string' ? options.category : 'General',
        tags,
      },
    });
    if (!response?.ok) throw new Error(response?.error || 'CREATE_FAILED');
    console.log(t.opDone);
    printOutput(response, options, t);
    return;
  }

  if (command === 'update') {
    const id = toNumber(positionals[1]);
    if (!Number.isFinite(id)) throw new Error(t.missingId);
    const entry = {};
    if (typeof options.title === 'string') entry.title = options.title;
    if (typeof options.username === 'string') entry.username = options.username;
    if (typeof options.pass === 'string') entry.pass = options.pass;
    if (typeof options.website === 'string') entry.website = options.website;
    if (typeof options.category === 'string') entry.category = options.category;
    if (typeof options.tags === 'string') {
      entry.tags = options.tags.split(',').map((item) => item.trim()).filter(Boolean);
    }
    const response = await callBridge(config, 'UPDATE_VAULT_ENTRY', { entryId: id, entry });
    if (!response?.ok) throw new Error(response?.error || 'UPDATE_FAILED');
    console.log(t.opDone);
    printOutput(response, options, t);
    return;
  }

  if (command === 'delete') {
    const id = toNumber(positionals[1]);
    if (!Number.isFinite(id)) throw new Error(t.missingId);
    const response = await callBridge(config, 'DELETE_VAULT_ENTRY', { entryId: id });
    if (!response?.ok) throw new Error(response?.error || 'DELETE_FAILED');
    console.log(t.opDone);
    printOutput(response, options, t);
    return;
  }

  if (command === 'restore') {
    const id = toNumber(positionals[1]);
    if (!Number.isFinite(id)) throw new Error(t.missingId);
    const response = await callBridge(config, 'RESTORE_VAULT_ENTRY', { entryId: id });
    if (!response?.ok) throw new Error(response?.error || 'RESTORE_FAILED');
    console.log(t.opDone);
    printOutput(response, options, t);
    return;
  }

  if (command === 'empty-trash') {
    const response = await callBridge(config, 'EMPTY_VAULT_TRASH');
    if (!response?.ok) throw new Error(response?.error || 'EMPTY_TRASH_FAILED');
    console.log(t.opDone);
    printOutput(response, options, t);
    return;
  }

  throw new Error(`${t.missingCommand} ${command}`);
}

main().catch((error) => {
  const config = loadConfig();
  const t = I18N[normalizeLanguage(config.language)];
  console.error(`${t.failed}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

