// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  bufferToHex,
  ensureArrayBuffer,
  generateRandomBytes,
  hexToBuffer,
  isBufferSource,
  isLikelyHex,
  overwriteBuffer,
  toBufferSource,
} from '../crypto-types';

describe('crypto-types', () => {
  it('ensures array buffers from Uint8Array inputs', () => {
    const data = new Uint8Array([1, 2, 3]);
    const buffer = ensureArrayBuffer(data);

    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(buffer))).toEqual([1, 2, 3]);
  });

  it('throws for invalid ensureArrayBuffer inputs', () => {
    expect(() => ensureArrayBuffer('nope' as unknown as Uint8Array)).toThrow('Expected Uint8Array');
  });

  it('converts to BufferSource consistently', () => {
    const uint = new Uint8Array([4, 5, 6]);
    const arr = uint.buffer.slice(0);
    const view = new DataView(arr);

    expect(toBufferSource(uint)).toBeInstanceOf(ArrayBuffer);
    expect(toBufferSource(arr)).toBe(arr);
    expect(toBufferSource(view)).toBe(view);
  });

  it('generates random bytes and validates bad lengths', () => {
    const bytes = generateRandomBytes(16);

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes).toHaveLength(16);
    expect(() => generateRandomBytes(0)).toThrow(RangeError);
    expect(() => generateRandomBytes(1.5)).toThrow(RangeError);
  });

  it('overwrites sensitive buffers and rejects invalid inputs', () => {
    const buffer = new Uint8Array([7, 7, 7, 7]);
    overwriteBuffer(buffer);

    expect(Array.from(buffer)).not.toEqual([7, 7, 7, 7]);
    expect(() => overwriteBuffer('bad' as unknown as Uint8Array)).toThrow('Expected Uint8Array');
  });

  it('round-trips hex conversions and rejects invalid hex input', () => {
    const hex = bufferToHex(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    expect(hex).toBe('48656c6c6f');
    expect(Array.from(hexToBuffer(hex))).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);

    expect(() => hexToBuffer('abc')).toThrow('Hex string must have even length');
    expect(() => hexToBuffer('zz')).toThrow('Invalid hex string');
  });

  it('detects likely hex and valid BufferSource values', () => {
    expect(isLikelyHex('48656c6c6f')).toBe(true);
    expect(isLikelyHex('ABC')).toBe(false);
    expect(isLikelyHex('Hello')).toBe(false);
    expect(isLikelyHex(null as unknown as string)).toBe(false);

    expect(isBufferSource(new Uint8Array([1, 2]))).toBe(true);
    expect(isBufferSource(new DataView(new ArrayBuffer(4)))).toBe(true);
    expect(isBufferSource(new ArrayBuffer(4))).toBe(true);
    expect(isBufferSource('nope')).toBe(false);
  });
});
