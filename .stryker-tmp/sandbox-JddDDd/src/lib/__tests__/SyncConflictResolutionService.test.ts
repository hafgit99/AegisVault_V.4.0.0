// @ts-nocheck
import { describe, expect, it } from "vitest";
import { SyncConflictResolutionService } from "../SyncConflictResolutionService";

describe("SyncConflictResolutionService", () => {
  it("detects matching signatures and exact password matches", () => {
    const currentEntries = [
      {
        id: 1,
        title: "Example",
        username: "alice",
        pass: "secret-1",
        website: "https://example.com",
      },
      {
        id: 2,
        title: "Other",
        username: "bob",
        pass: "secret-2",
        website: "https://other.test",
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any;

    const incomingEntries = [
      {
        title: "Example",
        username: "alice",
        pass: "secret-1",
        website: "https://example.com",
      },
      {
        title: "Other",
        username: "bob",
        pass: "changed-pass",
        website: "https://other.test",
      },
      {
        title: "New",
        username: "eve",
        pass: "brand-new",
        website: "https://new.test",
      },
    ];

    const summary = SyncConflictResolutionService.summarize(currentEntries, incomingEntries, "structured_import");

    expect(summary.incomingCount).toBe(3);
    expect(summary.duplicateCount).toBe(2);
    expect(summary.exactMatchCount).toBe(1);
    expect(summary.conflictingIds).toEqual([1, 2]);
  });
});
