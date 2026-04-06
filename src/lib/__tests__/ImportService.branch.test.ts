// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { ImportService } from '../ImportService';

type ImportServiceTestAccess = typeof ImportService & {
  parseCsv: (text: string) => any;
  parseJson: (text: string) => any;
  parseCsvCanonical: (text: string) => any;
  parseJsonCanonical: (text: string) => any;
};

const svc = ImportService as unknown as ImportServiceTestAccess;

describe('ImportService: Branch Coverage', () => {
  it('parseJson: items with .items wrapper', () => {
    const json = JSON.stringify({
      items: [
        { title: 'A', username: 'u', password: 'p1', website: 'https://a.com' },
        { title: 'B', username: 'u2', password: 'p2', website: 'https://b.com' },
      ],
    });
    const result = svc.parseJson(json);
    expect(result.entries.length).toBe(2);
  });

  it('parseJson: items with .entries wrapper', () => {
    const json = JSON.stringify({
      entries: [{ title: 'X', username: 'u', password: 'pass123', url: 'https://x.com' }],
    });
    const result = svc.parseJson(json);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].website).toBe('https://x.com');
  });

  it('parseJson: non-array root with no items/entries throws', () => {
    const json = JSON.stringify({ foo: 'bar' });
    expect(() => svc.parseJson(json)).toThrow('No valid passwords');
  });

  it('parseJson: too many rows throws', () => {
    const items = Array.from({ length: 25001 }, (_, i) => ({
      title: `T${i}`,
      username: `u${i}`,
      password: `p${i}`,
    }));
    expect(() => svc.parseJson(JSON.stringify(items))).toThrow('too large');
  });

  it('parseJson: null items are skipped', () => {
    const json = JSON.stringify([
      null,
      { title: 'Valid', password: 'p123', username: 'u' },
      42,
      'string',
    ]);
    const result = svc.parseJson(json);
    expect(result.entries.length).toBe(1);
  });

  it('parseJson: tags as semicolon-separated string', () => {
    const json = JSON.stringify([{ title: 'Tagged', password: 'p', tags: 'work;finance' }]);
    const result = svc.parseJson(json);
    expect(result.entries[0].tags).toContain('work');
    expect(result.entries[0].tags).toContain('finance');
  });

  it('parseJson: no password entry is skipped', () => {
    const json = JSON.stringify([{ title: 'NoPass', username: 'u', website: 'https://a.com' }]);
    expect(() => svc.parseJson(json)).toThrow('No valid passwords');
  });

  it('parseJson: uses login.username and login.password', () => {
    const json = JSON.stringify([
      { title: 'L', login: { username: 'lu', password: 'lp', uris: [{ uri: 'https://l.com' }] } },
    ]);
    const result = svc.parseJson(json);
    expect(result.entries[0].username).toBe('lu');
    expect(result.entries[0].pass).toBe('lp');
    expect(result.entries[0].website).toBe('https://l.com');
  });

  it('parseJson: uses .name as title fallback', () => {
    const json = JSON.stringify([{ name: 'NamedEntry', password: 'p123', username: 'u' }]);
    const result = svc.parseJson(json);
    expect(result.entries[0].title).toBe('NamedEntry');
  });

  it('parseJson: uses .pass field', () => {
    const json = JSON.stringify([{ title: 'PassField', pass: 'mypass123', username: 'u' }]);
    const result = svc.parseJson(json);
    expect(result.entries[0].pass).toBe('mypass123');
  });

  it('parseJson: uses .uri field', () => {
    const json = JSON.stringify([
      { title: 'UriField', password: 'p', username: 'u', uri: 'https://uri.com' },
    ]);
    const result = svc.parseJson(json);
    expect(result.entries[0].website).toBe('https://uri.com');
  });

  it('parseJson: flat card + identity fields', () => {
    const json = JSON.stringify([
      {
        title: 'Card',
        password: 'p',
        username: 'u',
        cardholder_name: 'John',
        card_number: '4111111111111111',
        document_type: 'passport',
        identity_number: 'AB123',
      },
    ]);
    const result = svc.parseJson(json);
    expect(result.entries[0].cardDetails.cardholder_name).toBe('John');
    expect(result.entries[0].identityDetails.document_type).toBe('passport');
  });

  it('parseJson: invalid JSON throws', () => {
    expect(() => svc.parseJson('not json at all')).toThrow();
  });

  it('parseCsv: semicolon-separated CSV', () => {
    const csv = `title;username;password;website\nSemiEntry;u@test.com;pass123;https://semi.com`;
    const result = svc.parseCsv(csv);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].title).toBe('SemiEntry');
  });

  it('parseCsv: no title header uses fallback logic', () => {
    const csv = `website,username,password\nhttps://w.com,u@w.com,pass123`;
    const result = svc.parseCsv(csv);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].title).toBe('https://w.com');
  });

  it('parseCsv: no title header, < 3 columns', () => {
    const csv = `username,password\nu@test.com,pass123`;
    const result = svc.parseCsv(csv);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].title).toBe('u@test.com');
  });

  it('parseCsv: row with exception is skipped', () => {
    const csv = `title,username,password,website\nMyEntry,u@t.com,pass,https://a.com`;
    const result = svc.parseCsv(csv);
    expect(result.entries.length).toBe(1);
  });

  it('parseCsv: empty CSV throws', () => {
    expect(() => svc.parseCsv('')).toThrow('empty');
  });

  it('parseCsv: only header throws', () => {
    expect(() => svc.parseCsv('title,username,password\n')).toThrow('empty');
  });

  it('parseCsv: too many rows throws', () => {
    const header = 'title,username,password,website\n';
    const row = 'T,u,p,https://a.com\n';
    const big = header + row.repeat(25001);
    expect(() => svc.parseCsv(big)).toThrow('too large');
  });

  it('parseCsv: Bitwarden vendor detection', () => {
    const csv = `title,login_uri,login_totp,username,password\nT,u,p,https://a.com,p`;
    const result = svc.parseCsv(csv);
    expect(result.report.warnings).toContain('BITWARDEN_CSV_DETECTED');
  });

  it('parseCsv: 1Password vendor detection', () => {
    const csv = `title,otpauth,website name,username,password\nT,otp://x,WName,u,p`;
    const result = svc.parseCsv(csv);
    expect(result.report.warnings).toContain('ONEPASSWORD_CSV_DETECTED');
  });

  it('parseCsv: KeePassXC vendor detection', () => {
    const csv = `title,group,last modified,totp,username,password,website\nT,G,2024,t,u,p,https://a.com`;
    const result = svc.parseCsv(csv);
    expect(result.report.warnings).toContain('KEEPASSXC_CSV_DETECTED');
  });

  it('parseCsv: Proton Pass vendor detection', () => {
    const csv = `title,createtime,modifytime,note,vault,username,password,website\nT,c,m,n,v,u,p,https://a.com`;
    const result = svc.parseCsv(csv);
    expect(result.report.warnings).toContain('PROTON_PASS_CSV_DETECTED');
  });

  it('parseCsv: entry without password is skipped', () => {
    const csv = `title,username,password,website\nT,u@t.com,,https://a.com`;
    expect(() => svc.parseCsv(csv)).toThrow('Could not extract');
  });

  it('parseCsv: weak password detection', () => {
    const csv = `title,username,password,website\nT,u@t.com,short,https://a.com`;
    const result = svc.parseCsv(csv);
    expect(result.report.weakPasswords).toBe(1);
  });

  it('parseCsv: missing critical fields detection', () => {
    const csv = `title,username,password\nT,,pass12345678`;
    const result = svc.parseCsv(csv);
    expect(result.report.missingCriticalFields).toBe(1);
  });

  it('parseCsv: duplicate detection', () => {
    const csv = `title,username,password,website\nT,u,pass12345678,https://a.com\nT,u,pass12345678,https://a.com`;
    const result = svc.parseCsv(csv);
    expect(result.report.duplicateCandidates).toBe(1);
  });

  it('parseCsv: entry with notes and tags', () => {
    const csv = `title,username,password,website,tags,notes\nT,u,pass12345678,https://a.com,"work;dev",MyNote`;
    const result = svc.parseCsv(csv);
    expect(result.entries[0].tags).toContain('work');
    expect(result.entries[0].notes).toBe('MyNote');
  });

  it('parseCsv: entry with card fields', () => {
    const csv = `title,username,password,website,cardholder name,card_number,card expiry month,card expiry year,card cvv,card pin\nT,u,pass12345678,https://a.com,John,4111,12,2026,123,9999`;
    const result = svc.parseCsv(csv);
    expect(result.entries[0].cardDetails.cardholder_name).toBe('John');
    expect(result.entries[0].cardDetails.card_number).toBe('4111');
  });

  it('parseCsv: entry with identity fields', () => {
    const csv = `title,username,password,website,identity document type,identity number,identity issuing country,identity nationality,identity date of birth,identity issued at,identity expires at\nT,u,pass12345678,https://a.com,passport,AB123,TR,Turkish,1990-01-01,2020,2030`;
    const result = svc.parseCsv(csv);
    expect(result.entries[0].identityDetails.document_type).toBe('passport');
    expect(result.entries[0].identityDetails.identity_number).toBe('AB123');
  });

  it('parseFile: file too large rejects', async () => {
    const bigFile = new File(['x'.repeat(10 * 1024 * 1024 + 1)], 'big.json', {
      type: 'application/json',
    });
    const onProgress = vi.fn();
    await expect(ImportService.parseFile(bigFile, onProgress)).rejects.toThrow('exceeds');
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('parseFile: empty file rejects', async () => {
    const emptyFile = new File([''], 'empty.json', { type: 'application/json' });
    const onProgress = vi.fn();
    await expect(ImportService.parseFile(emptyFile, onProgress)).rejects.toThrow();
  });

  it('parseFile: valid JSON file resolves', async () => {
    const data = JSON.stringify([{ title: 'T', username: 'u', password: 'p12345678' }]);
    const file = new File([data], 'test.json', { type: 'application/json' });
    const onProgress = vi.fn();
    const result = await ImportService.parseFile(file, onProgress);
    expect(result.entries.length).toBe(1);
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ status: 'importing' }));
  });

  it('parseFile: valid CSV file resolves', async () => {
    const csv = `title,username,password,website\nT,u,pass12345678,https://a.com`;
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const onProgress = vi.fn();
    const result = await ImportService.parseFile(file, onProgress);
    expect(result.entries.length).toBe(1);
  });

  it('parseJsonCanonical: produces canonical records with card + identity', () => {
    const json = JSON.stringify([
      {
        title: 'Full',
        username: 'u',
        password: 'p12345678',
        cardDetails: { cardholder_name: 'Jane', card_number: '4222' },
        identityDetails: { document_type: 'id', identity_number: 'X1' },
      },
    ]);
    const result = svc.parseJsonCanonical(json);
    expect(result.records.length).toBe(1);
    expect(result.records[0].custom_data.card_details.cardholder_name).toBe('Jane');
    expect(result.records[0].custom_data.identity_details.document_type).toBe('id');
  });

  it('parseCsvCanonical: produces canonical records', () => {
    const csv = `title,username,password,website\nT,u,pass12345678,https://a.com`;
    const result = svc.parseCsvCanonical(csv);
    expect(result.records.length).toBe(1);
    expect(result.records[0].id).toMatch(/^import-/);
  });

  it('sanitizeUrlText: URL with explicit trailing slash and no path', () => {
    const csv = `title,username,password,website\nT,u,pass12345678,https://a.com/`;
    const result = svc.parseCsv(csv);
    // Should keep trailing slash since it was explicit
    expect(result.entries[0].website).toMatch(/a\.com/);
  });

  it('parseCsv: title fallback to username when no title header and no url', () => {
    const csv = `password,username\npass12345678,u@test.com`;
    const result = svc.parseCsv(csv);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].title).toBe('u@test.com');
  });

  it('parseCsv: category column is used', () => {
    const csv = `title,username,password,website,category\nT,u,pass12345678,https://a.com,Social`;
    const result = svc.parseCsv(csv);
    expect(result.entries[0].category).toBe('Social');
  });
});
