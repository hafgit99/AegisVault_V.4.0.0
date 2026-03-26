// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityModePolicy } from '../SecurityModePolicy';
import { SecureAppSettings } from '../SecureAppSettings';

describe('SecurityModePolicy: Enforcements and Profile Logic', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock SecureAppSettings to avoid side effects
        vi.spyOn(SecureAppSettings, 'getSecurityModeProfile').mockReturnValue('standard');
        vi.spyOn(SecureAppSettings, 'setSecurityModeProfile').mockImplementation(() => {});
    });

    it('1. getProfile / setProfile proxied to SecureAppSettings', () => {
        expect(SecurityModePolicy.getProfile()).toBe('standard');
        SecurityModePolicy.setProfile('strict');
        expect(SecureAppSettings.setSecurityModeProfile).toHaveBeenCalledWith('strict');
    });

    it('2. listDefinitions includes all base levels', () => {
        const defs = SecurityModePolicy.listDefinitions();
        expect(defs.length).toBe(3);
        expect(defs.map(d => d.profile)).toContain('standard');
        expect(defs.map(d => d.profile)).toContain('maximum');
    });

    it('3. isPlaintextExportAllowed: standard=yes, strict=no', () => {
        expect(SecurityModePolicy.isPlaintextExportAllowed('standard')).toBe(true);
        expect(SecurityModePolicy.isPlaintextExportAllowed('strict')).toBe(false);
    });

    it('4. enforceAutoLock: clips value to profile limit', () => {
        // Maximum mode limit is 1 min
        expect(SecurityModePolicy.enforceAutoLock(10, 'maximum')).toBe(1);
        // Strict mode limit is 5 min
        expect(SecurityModePolicy.enforceAutoLock(10, 'strict')).toBe(5);
        // Standard mode limit is 30 min
        expect(SecurityModePolicy.enforceAutoLock(10, 'standard')).toBe(10);
        expect(SecurityModePolicy.enforceAutoLock(60, 'standard')).toBe(30);
    });

    it('5. isHibpAllowed check', () => {
        expect(SecurityModePolicy.isHibpAllowed('standard')).toBe(true);
        expect(SecurityModePolicy.isHibpAllowed('maximum')).toBe(false);
    });
});
