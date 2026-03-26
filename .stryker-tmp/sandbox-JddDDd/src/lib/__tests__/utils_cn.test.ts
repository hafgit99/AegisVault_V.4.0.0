// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils: cn (Tailwind/Class Merge)', () => {
  it('1. Merges simple class names', () => {
    expect(cn('px-2', 'py-2')).toBe('px-2 py-2');
  });

  it('2. Handled conditional values', () => {
    expect(cn('base', true && 'is-true', false && 'is-false')).toBe('base is-true');
  });

  it('3. Tailwind merge resolution for conflicts', () => {
    // p-4 (1rem) vs p-2 (0.5rem) -> p-2 should win if it's later?
    // Actually tailwind-merge handles specific conflicts (e.g. px-2 vs p-4)
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});
