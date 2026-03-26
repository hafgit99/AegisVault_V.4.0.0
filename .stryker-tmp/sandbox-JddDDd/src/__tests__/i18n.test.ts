// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { resources } from '../i18n';

describe('i18n Localization', () => {
    it('1. should have English and Turkish translations', () => {
        expect(resources.en).toBeDefined();
        expect(resources.tr).toBeDefined();
    });

    it('2. should contain critical keys in English', () => {
        const en = resources.en.translation as any;
        expect(en.setupVault).toBe("Setup Vault");
        expect(en.unlock).toBe("Unlock");
        expect(en.masterPassword).toBe("Master Password");
    });

    it('3. should contain critical keys in Turkish', () => {
        const tr = resources.tr.translation as any;
        expect(tr.setupVault).toBe("Kasayı Kur");
        expect(tr.unlock).toBe("Kilidi Aç");
        expect(tr.masterPassword).toBe("Ana Şifre");
    });
});
