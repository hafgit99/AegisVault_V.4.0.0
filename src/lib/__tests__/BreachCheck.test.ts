// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { breachChecker } from '../breach-check';

// Mock fetch for HIBP API
global.fetch = vi.fn();

describe('HIBP BreachChecker (K-Anonymity)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. checkPassword: Sızdırılmış şifreyi tespit eder', async () => {
        // 'password' SHA-1: 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
        // Prefix: 5BAA6, Suffix: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
        
        const mockResponseText = 
            "1E4C9B93F3F0682250B6CF8331B7EE68FD8:99999\n" +
            "ABCDE12345:10\n";
            
        (fetch as any).mockResolvedValue({
            ok: true,
            text: async () => mockResponseText
        });

        const count = await breachChecker.checkPassword('password');
        expect(count).toBe(99999);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('5BAA6'));
    });

    it('2. checkPassword: Temiz şifre (0 sızma)', async () => {
        (fetch as any).mockResolvedValue({
            ok: true,
            text: async () => "XXXXX:10\nYYYYY:5"
        });

        const count = await breachChecker.checkPassword('clean_password_123');
        expect(count).toBe(0);
    });

    it('3. checkPassword: API hatasında null döner', async () => {
        (fetch as any).mockResolvedValue({
            ok: false,
            status: 500
        });

        const count = await breachChecker.checkPassword('any');
        expect(count).toBeNull();
    });
});
