import { beforeEach, describe, expect, it } from 'vitest';
import { AliasProviderService } from '../AliasProviderService';
import { SecureAppSettings } from '../SecureAppSettings';

describe('AliasProviderService', () => {
  beforeEach(() => {
    SecureAppSettings.resetForTests();
  });

  it('creates provider profiles and generates site-aware aliases', () => {
    const provider = AliasProviderService.saveProviderProfile({
      name: 'Custom Workspace',
      kind: 'custom',
      domains: ['mask.example'],
      defaultDomain: 'mask.example',
      generationStrategy: 'site_plus_random',
      enabled: true,
      isDefault: true,
    });

    const alias = AliasProviderService.createAliasDetails({
      providerId: provider.id,
      website: 'https://app.github.com/login',
      title: 'GitHub',
    });

    expect(alias.providerId).toBe(provider.id);
    expect(alias.email.endsWith('@mask.example')).toBe(true);
    expect(alias.email.includes('github')).toBe(true);
    expect(alias.status).toBe('active');
  });

  it('rotates and marks aliases as exposed', () => {
    const alias = AliasProviderService.createAliasDetails({
      website: 'https://notion.so',
      title: 'Notion',
    });

    const compromised = AliasProviderService.markAliasExposed(alias, 'compromised', 'breach');
    expect(compromised.status).toBe('compromised');
    expect(compromised.exposureCategory).toBe('breach');

    const rotated = AliasProviderService.rotateAlias(compromised);
    expect(rotated.email).not.toBe(alias.email);
    expect(rotated.lastRotatedAt).toBeTruthy();
    expect(rotated.history?.length).toBeGreaterThan(1);
  });

  it('queues and rolls back aliases while computing risk', () => {
    const alias = AliasProviderService.createAliasDetails({
      website: 'https://calendar.example',
      title: 'Calendar',
    });

    const queued = AliasProviderService.queueRotation(alias, 'watchtower');
    expect(queued.rotationQueue?.[0]?.status).toBe('queued');

    const exposed = AliasProviderService.markAliasExposed(queued, 'compromised', 'spam');
    const risk = AliasProviderService.evaluateAliasRisk(exposed);
    expect(risk.score).toBeLessThan(75);
    expect(risk.needsRotation).toBe(true);

    const rotated = AliasProviderService.rotateAlias(exposed, 'watchtower');
    const rolledBack = AliasProviderService.rollbackAlias(rotated);
    expect(rolledBack.email).toBe(alias.email);
  });
});
