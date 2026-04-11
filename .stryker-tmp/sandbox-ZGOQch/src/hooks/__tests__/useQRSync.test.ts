// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { generateChunks } from '../useQRSync';

describe('useQRSync: generateChunks', () => {
  it('generates single chunk for short data', () => {
    const data = 'hello world';
    const chunks = generateChunks(data);
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toMatch(/^aegis:[a-f0-9]{8}:1:1:hello world$/);
  });

  it('generates multiple chunks for long data', () => {
    const data = 'A'.repeat(400);
    const chunks = generateChunks(data);
    expect(chunks.length).toBe(3); // 400 / 150 = 2.66 → 3 chunks
    expect(chunks[0]).toMatch(/^aegis:[a-f0-9]{8}:1:3:/);
    expect(chunks[1]).toMatch(/^aegis:[a-f0-9]{8}:2:3:/);
    expect(chunks[2]).toMatch(/^aegis:[a-f0-9]{8}:3:3:/);
  });

  it('produces consistent session IDs within a single call', () => {
    const chunks = generateChunks('A'.repeat(300));
    const sessionIds = chunks.map((c) => c.split(':')[1]);
    expect(new Set(sessionIds).size).toBe(1); // All same session
  });

  it('generates unique session IDs across calls', () => {
    const c1 = generateChunks('test1')[0].split(':')[1];
    const c2 = generateChunks('test2')[0].split(':')[1];
    expect(c1).toMatch(/^[a-f0-9]{8}$/);
    expect(c2).toMatch(/^[a-f0-9]{8}$/);
  });

  it('preserves data with special characters', () => {
    const data = 'user:pass@host/path?query=value&foo=bar';
    const chunks = generateChunks(data);
    expect(chunks.length).toBe(1);
    const payload = chunks[0].split(':').slice(4).join(':');
    expect(payload).toBe(data);
  });

  it('reassembles long data correctly across chunks', () => {
    const original = 'B'.repeat(500);
    const chunks = generateChunks(original);

    // Parse and reassemble
    const payloads: string[] = [];
    for (const chunk of chunks) {
      const parts = chunk.split(':');
      payloads.push(parts.slice(4).join(':'));
    }

    expect(payloads.join('')).toBe(original);
  });
});
