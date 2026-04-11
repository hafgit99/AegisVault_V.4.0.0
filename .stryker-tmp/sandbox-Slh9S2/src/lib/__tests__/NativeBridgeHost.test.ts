// @ts-nocheck
// @vitest-environment node
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type HostModule = {
  buildBridgeProof: (message: Record<string, unknown>, pairingSecret?: string) => string;
  createSignedBridgePayload: (
    message: Record<string, unknown>,
    pairingSecret?: string
  ) => Record<string, unknown>;
  sendNativeBridgeMessage: (
    message: Record<string, unknown>,
    pairingSecret?: string
  ) => Promise<Record<string, unknown>>;
  normalizeDomain: (input: unknown) => string;
  isAllowlistedExtensionId: (extensionId: unknown) => boolean;
  getNativeBridgeSocketPath: () => string;
  buildForwardBridgeMessage: (
    message: Record<string, unknown>,
    overrides?: Record<string, unknown>
  ) => Record<string, unknown>;
  writeMessage: (message: Record<string, unknown>) => Buffer;
  handleMessageWithDeps: (
    message: Record<string, unknown>,
    deps: {
      sendNativeBridgeMessage: (
        message: Record<string, unknown>,
        pairingSecret?: string
      ) => Promise<Record<string, unknown>>;
      writeMessage: (message: Record<string, unknown>) => unknown;
      isAllowlistedExtensionId: (extensionId: unknown) => boolean;
    }
  ) => Promise<void>;
  handleMessage: (message: Record<string, unknown>) => Promise<void>;
};

const requireForTests = createRequire(import.meta.url);
const hostModulePath = requireForTests.resolve('../../../scripts/aegis-native-host.cjs');
const socketPath =
  process.platform === 'win32'
    ? '\\\\.\\pipe\\aegis-vault-native-host-test'
    : path.join(os.tmpdir(), 'aegis-vault-native-host-test.sock');

describe('Aegis Native Host Bridge', () => {
  let hostModule: HostModule;

  const loadHostModule = (): HostModule => {
    delete requireForTests.cache[hostModulePath];
    return requireForTests(hostModulePath) as HostModule;
  };

  beforeEach(async () => {
    process.env.AEGIS_NATIVE_BRIDGE_SOCKET_PATH = socketPath;
    delete process.env.AEGIS_EXTENSION_ALLOWLIST;
    delete process.env.AEGIS_EXTENSION_ID;
    hostModule = loadHostModule();
  });

  afterEach(async () => {
    delete process.env.AEGIS_NATIVE_BRIDGE_SOCKET_PATH;
    delete process.env.AEGIS_EXTENSION_ALLOWLIST;
    delete process.env.AEGIS_EXTENSION_ID;
    vi.restoreAllMocks();
    if (process.platform !== 'win32') {
      try {
        await import('node:fs/promises').then((fs) => fs.unlink(socketPath));
      } catch {
        // ignore cleanup errors
      }
    }
  });

  it('binds proof generation to clientInfo as well as extension identity', () => {
    const secret = '0123456789abcdef0123456789abcdef';
    const baseMessage = {
      type: 'GET_PAIRING_STATUS',
      extensionId: 'iockeheicjcnfoegjjboooljndjcafae',
      clientInfo: {
        browserName: 'Aegis Vault',
        browserVersion: '4.0.0',
        platform: 'Win32',
        locale: 'tr-TR',
        installId: 'install-a',
        extensionVersion: '4.0.5',
        userAgent: 'test-agent',
      },
    };

    const proofA = hostModule.buildBridgeProof(baseMessage, secret);
    const proofB = hostModule.buildBridgeProof(
      {
        ...baseMessage,
        clientInfo: {
          ...baseMessage.clientInfo,
          installId: 'install-b',
        },
      },
      secret
    );

    expect(proofA).toHaveLength(64);
    expect(proofA).not.toBe(proofB);
  });

  it('normalizes domains and omits proofs for weak secrets', () => {
    expect(hostModule.normalizeDomain(' https://www.Example.com/login ')).toBe('example.com');
    expect(hostModule.normalizeDomain('www.test.example')).toBe('test.example');
    expect(hostModule.normalizeDomain(null)).toBe('');

    const payload = hostModule.createSignedBridgePayload(
      {
        type: 'GET_VAULT_STATUS',
        extensionId: 'iockeheicjcnfoegjjboooljndjcafae',
      },
      'too-short'
    );

    expect(payload.proof).toBe('');
  });

  it('applies allowlist and socket path rules from the environment', () => {
    process.env.AEGIS_EXTENSION_ALLOWLIST = 'allowed-one, allowed-two ';
    delete process.env.AEGIS_EXTENSION_ID;
    hostModule = loadHostModule();

    expect(hostModule.isAllowlistedExtensionId('allowed-one')).toBe(true);
    expect(hostModule.isAllowlistedExtensionId('blocked-one')).toBe(false);
    expect(hostModule.isAllowlistedExtensionId('')).toBe(false);

    const resolvedSocketPath = hostModule.getNativeBridgeSocketPath();
    if (process.platform === 'win32') {
      expect(resolvedSocketPath).toContain('\\\\.\\pipe\\aegis-vault-native-v1');
    } else {
      expect(resolvedSocketPath.endsWith('aegis-vault-native-v1.sock')).toBe(true);
    }
  });

  it('builds forward bridge messages with sane defaults and override support', () => {
    const forwarded = hostModule.buildForwardBridgeMessage(
      {
        type: 'GET_DOMAIN_CREDS',
        extensionId: 'ext-1',
        domain: 'example.com',
        requestNonce: 'nonce-1',
        browserName: 'Chrome',
        clientInfo: { installId: 'install-1' },
        clientKeyId: 'key-1',
        clientTimestamp: 'ts-1',
        clientNonce: 'nonce-2',
        clientSignature: 'sig-1',
        clientPublicJwk: { kty: 'EC' },
      },
      {
        type: 'GET_VAULT_STATUS',
        browserName: 'Firefox',
      }
    );

    expect(forwarded).toMatchObject({
      type: 'GET_VAULT_STATUS',
      extensionId: 'ext-1',
      domain: 'example.com',
      requestNonce: 'nonce-1',
      browserName: 'Firefox',
      clientKeyId: 'key-1',
      clientTimestamp: 'ts-1',
      clientNonce: 'nonce-2',
      clientSignature: 'sig-1',
    });
    expect(forwarded.clientPublicJwk).toEqual({ kty: 'EC' });
  });

  it('sends signed bridge payloads over the local IPC transport', async () => {
    const server = net.createServer((socket) => {
      socket.setEncoding('utf8');
      socket.once('data', (raw) => {
        const payload = JSON.parse(String(raw).trim());
        expect(payload.type).toBe('GET_VAULT_STATUS');
        expect(payload.extensionId).toBe('iockeheicjcnfoegjjboooljndjcafae');
        expect(payload.clientInfo?.installId).toBe('integration-install');
        expect(typeof payload.proof).toBe('string');
        socket.end(`${JSON.stringify({ ok: true, isUnlocked: true, entryCount: 3 })}\n`);
      });
    });

    await new Promise<void>((resolve) => server.listen(socketPath, resolve));

    try {
      const response = await hostModule.sendNativeBridgeMessage(
        {
          type: 'GET_VAULT_STATUS',
          extensionId: 'iockeheicjcnfoegjjboooljndjcafae',
          clientInfo: {
            browserName: 'Aegis Vault',
            browserVersion: '4.0.0',
            platform: 'Win32',
            locale: 'en-US',
            installId: 'integration-install',
            extensionVersion: '4.0.5',
            userAgent: 'integration-agent',
          },
        },
        '0123456789abcdef0123456789abcdef'
      );

      expect(response.ok).toBe(true);
      expect(response.entryCount).toBe(3);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });

  it('rejects invalid native bridge responses', async () => {
    const server = net.createServer((socket) => {
      socket.setEncoding('utf8');
      socket.once('data', () => {
        socket.end('not-json\n');
      });
    });

    await new Promise<void>((resolve) => server.listen(socketPath, resolve));

    try {
      await expect(
        hostModule.sendNativeBridgeMessage(
          {
            type: 'GET_VAULT_STATUS',
            extensionId: 'iockeheicjcnfoegjjboooljndjcafae',
          },
          '0123456789abcdef0123456789abcdef'
        )
      ).rejects.toThrow('INVALID_NATIVE_BRIDGE_RESPONSE');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });

  it('rejects unexpected EOF from the native bridge socket', async () => {
    const server = net.createServer((socket) => {
      socket.setEncoding('utf8');
      socket.once('data', () => {
        socket.end();
      });
    });

    await new Promise<void>((resolve) => server.listen(socketPath, resolve));

    try {
      await expect(
        hostModule.sendNativeBridgeMessage(
          {
            type: 'GET_VAULT_STATUS',
            extensionId: 'iockeheicjcnfoegjjboooljndjcafae',
          },
          '0123456789abcdef0123456789abcdef'
        )
      ).rejects.toThrow('NATIVE_BRIDGE_EOF');
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });

  it('serializes native host messages with a Chromium-style length prefix', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    const payload = hostModule.writeMessage({ ok: true, error: 'NONE' });
    const declaredLength = payload.readUInt32LE(0);
    const body = payload.subarray(4).toString('utf8');

    expect(declaredLength).toBe(Buffer.byteLength(body));
    expect(JSON.parse(body)).toEqual({ ok: true, error: 'NONE' });
    expect(writeSpy).toHaveBeenCalledTimes(1);
  });

  it('handles allowlist rejection, invalid domains and unsupported messages without IPC calls', async () => {
    const writeMessage = vi.fn();
    const sendNativeBridgeMessage = vi.fn();

    await hostModule.handleMessageWithDeps(
      {
        type: 'GET_VAULT_STATUS',
        extensionId: 'forbidden-ext',
      },
      {
        sendNativeBridgeMessage,
        writeMessage,
        isAllowlistedExtensionId: () => false,
      }
    );

    await hostModule.handleMessageWithDeps(
      {
        type: 'GET_DOMAIN_CREDS',
        extensionId: 'allowed-ext',
        domain: '',
      },
      {
        sendNativeBridgeMessage,
        writeMessage,
        isAllowlistedExtensionId: () => true,
      }
    );

    await hostModule.handleMessageWithDeps(
      {
        type: 'UNKNOWN_MESSAGE',
        extensionId: 'allowed-ext',
      },
      {
        sendNativeBridgeMessage,
        writeMessage,
        isAllowlistedExtensionId: () => true,
      }
    );

    expect(sendNativeBridgeMessage).not.toHaveBeenCalled();
    expect(writeMessage).toHaveBeenNthCalledWith(1, { ok: false, error: 'FORBIDDEN_EXTENSION_ID' });
    expect(writeMessage).toHaveBeenNthCalledWith(2, {
      ok: false,
      error: 'INVALID_DOMAIN',
      data: [],
    });
    expect(writeMessage).toHaveBeenNthCalledWith(3, {
      ok: false,
      error: 'UNSUPPORTED_MESSAGE_TYPE',
    });
  });

  it('maps native bridge responses and failures through handleMessageWithDeps', async () => {
    const writeMessage = vi.fn();
    const sendNativeBridgeMessage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        paired: true,
        pairedAt: '2026-03-17T12:00:00.000Z',
        pairingMode: 'signed-p256-v1',
        clientKeyId: 'client-key-1',
        desktopAuth: { keyId: 'desktop-key-1' },
      })
      .mockResolvedValueOnce({
        ok: true,
        language: 'tr',
        desktopAuth: { keyId: 'desktop-key-2' },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [{ id: 'entry-1' }],
        desktopAuth: { keyId: 'desktop-key-3' },
      })
      .mockRejectedValueOnce(new Error('BRIDGE_DOWN'));

    const deps = {
      sendNativeBridgeMessage,
      writeMessage,
      isAllowlistedExtensionId: () => true,
    };

    await hostModule.handleMessageWithDeps(
      {
        type: 'GET_PAIRING_STATUS',
        extensionId: 'allowed-ext',
      },
      deps
    );
    await hostModule.handleMessageWithDeps(
      {
        type: 'GET_UI_LANGUAGE',
        extensionId: 'allowed-ext',
      },
      deps
    );
    await hostModule.handleMessageWithDeps(
      {
        type: 'GET_DOMAIN_CREDS',
        extensionId: 'allowed-ext',
        domain: 'https://www.example.com/login',
      },
      deps
    );
    await hostModule.handleMessageWithDeps(
      {
        type: 'GET_VAULT_STATUS',
        extensionId: 'allowed-ext',
      },
      deps
    );

    expect(sendNativeBridgeMessage).toHaveBeenCalledTimes(4);
    expect(sendNativeBridgeMessage.mock.calls[2]?.[0]).toMatchObject({
      type: 'GET_DOMAIN_CREDS',
      domain: 'example.com',
    });

    expect(writeMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        ok: true,
        paired: true,
        pairingMode: 'signed-p256-v1',
        clientKeyId: 'client-key-1',
      })
    );
    expect(writeMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        ok: true,
        language: 'tr',
      })
    );
    expect(writeMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        ok: true,
        data: [{ id: 'entry-1' }],
      })
    );
    expect(writeMessage).toHaveBeenNthCalledWith(4, { ok: false, error: 'BRIDGE_DOWN' });
  });

  it('maps init and clear pairing responses through handleMessageWithDeps', async () => {
    const writeMessage = vi.fn();
    const sendNativeBridgeMessage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        paired: true,
        secret: 'secret-1',
        pairedAt: '2026-03-17T13:00:00.000Z',
        riskFlags: ['new_device'],
        deviceFingerprint: 'fp-1',
        pairingMode: 'signed-p256-v1',
        clientKeyId: 'client-key-9',
        desktopAuth: { keyId: 'desktop-key-9' },
      })
      .mockResolvedValueOnce({
        ok: true,
        cleared: true,
        desktopAuth: { keyId: 'desktop-key-10' },
      });

    const deps = {
      sendNativeBridgeMessage,
      writeMessage,
      isAllowlistedExtensionId: () => true,
    };

    await hostModule.handleMessageWithDeps(
      {
        type: 'INIT_PAIRING',
        extensionId: 'allowed-ext',
        pairingSecret: 'secret-value',
      },
      deps
    );
    await hostModule.handleMessageWithDeps(
      {
        type: 'CLEAR_PAIRING',
        extensionId: 'allowed-ext',
      },
      deps
    );

    expect(writeMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        ok: true,
        paired: true,
        secret: 'secret-1',
        deviceFingerprint: 'fp-1',
      })
    );
    expect(writeMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        ok: true,
        cleared: true,
      })
    );
  });
});
