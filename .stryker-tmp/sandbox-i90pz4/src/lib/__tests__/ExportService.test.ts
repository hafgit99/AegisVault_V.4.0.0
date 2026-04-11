// @ts-nocheck
import { ExportService } from '../ExportService';

describe('ExportService regression tests', () => {
  it('escapes CSV fields with quotes, commas and newlines', () => {
    const csv = ExportService.buildCsv([
      {
        title: 'Work "Admin", Portal',
        username: 'user@example.com',
        pass: 'line1\nline2',
        category: 'Work',
        website: 'https://example.com',
        tags: ['prod', 'team'],
      },
    ]);

    expect(csv).toContain('"Work ""Admin"", Portal"');
    expect(csv).toContain('"line1\nline2"');
    expect(csv).toContain('"prod;team"');
  });

  it('builds structured JSON payloads', () => {
    const json = ExportService.buildJson([
      {
        title: 'Github',
        username: 'octocat',
        pass: 'secretPass123',
        category: 'Work',
        website: 'https://github.com',
        tags: ['dev'],
      },
    ]);

    expect(JSON.parse(json)).toEqual([
      {
        title: 'Github',
        username: 'octocat',
        password: 'secretPass123',
        category: 'Work',
        website: 'https://github.com',
        tags: ['dev'],
        notes: '',
        cardDetails: null,
        identityDetails: null,
      },
    ]);
  });

  it('builds canonical JSON payloads from vault entries', () => {
    const json = ExportService.buildCanonicalJson([
      {
        id: 1,
        title: 'Github',
        username: 'octocat',
        website: 'https://github.com',
        category: 'login',
        updated_at: '2026-03-23T10:00:00.000Z',
        pass: 'secretPass123',
        notes: 'important note',
        tags: ['dev'],
      },
    ] as never);

    expect(JSON.parse(json)).toEqual([
      {
        id: 1,
        title: 'Github',
        username: 'octocat',
        url: 'https://github.com',
        category: 'login',
        favorite: false,
        tags: ['dev'],
        deleted_at: null,
        updated_at: '2026-03-23T10:00:00.000Z',
        secret: {
          password: 'secretPass123',
          notes: 'important note',
        },
        passkey: null,
        attachments: [],
      },
    ]);
  });

  it('preserves card and identity details in structured JSON export', () => {
    const json = ExportService.buildJson([
      {
        title: 'Corporate Card',
        username: 'finance',
        pass: '4111111111111111',
        category: 'Cards',
        website: 'https://bank.example.com',
        tags: ['card'],
        cardDetails: {
          cardholder_name: 'Jane Doe',
          card_number: '4111111111111111',
          brand: 'visa',
          expiry_month: '12',
          expiry_year: '2030',
          cvv: '123',
        },
        identityDetails: {
          document_type: 'national_id',
          identity_number: '12345678901',
          issuing_country: 'TR',
        },
      },
    ]);

    const parsed = JSON.parse(json);
    expect(parsed[0]?.cardDetails?.card_number).toBe('4111111111111111');
    expect(parsed[0]?.identityDetails?.identity_number).toBe('12345678901');
  });
});
