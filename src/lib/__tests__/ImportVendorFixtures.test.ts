import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ImportService } from "../ImportService";

type ImportServiceWithTestAccess = typeof ImportService & {
  parseCsv: (text: string) => {
    entries: Array<Record<string, unknown>>;
    report: {
      warnings: string[];
      validEntries: number;
      duplicateCandidates: number;
    };
  };
  parseJson: (text: string) => {
    entries: Array<Record<string, unknown>>;
    report: {
      warnings: string[];
      validEntries: number;
      duplicateCandidates: number;
    };
  };
};

const importServiceForTest = ImportService as unknown as ImportServiceWithTestAccess;
const fixture = (name: string) =>
  readFileSync(resolve(process.cwd(), "tests", "fixtures", "import-export", name), "utf8");

describe("ImportService vendor fixture matrix", () => {
  it("parses Bitwarden CSV fixture", () => {
    const result = importServiceForTest.parseCsv(fixture("bitwarden-export.csv"));

    expect(result.report.warnings).toContain("BITWARDEN_CSV_DETECTED");
    expect(result.report.validEntries).toBe(2);
    expect(result.entries[0]).toMatchObject({
      title: "Netflix",
      username: "user@example.com",
      website: "https://netflix.com/login",
    });
  });

  it("parses Bitwarden style JSON fixture", () => {
    const result = importServiceForTest.parseJson(fixture("bitwarden-export.json"));

    expect(result.report.validEntries).toBe(1);
    expect(result.entries[0]).toMatchObject({
      title: "Bitwarden JSON Entry",
      username: "json-user@example.com",
      website: "https://portal.example.com/login",
      tags: ["team", "json"],
    });
  });

  it("parses 1Password CSV fixture", () => {
    const result = importServiceForTest.parseCsv(fixture("1password-export.csv"));

    expect(result.report.warnings).toContain("ONEPASSWORD_CSV_DETECTED");
    expect(result.report.validEntries).toBe(2);
    expect(result.entries[1]).toMatchObject({
      title: "Stripe",
      username: "finance@example.com",
      category: "General",
    });
  });

  it("parses KeePassXC CSV fixture with multiline notes", () => {
    const result = importServiceForTest.parseCsv(fixture("keepassxc-export.csv"));

    expect(result.report.warnings).toContain("KEEPASSXC_CSV_DETECTED");
    expect(result.report.validEntries).toBe(2);
    expect(result.entries[0]).toMatchObject({
      title: "Example Portal",
      username: "portal-user",
      website: "https://portal.example.com",
      category: "Internet",
    });
  });

  it("parses Proton Pass CSV fixture", () => {
    const result = importServiceForTest.parseCsv(fixture("proton-pass-export.csv"));

    expect(result.report.warnings).toContain("PROTON_PASS_CSV_DETECTED");
    expect(result.report.validEntries).toBe(2);
    expect(result.entries[0]).toMatchObject({
      title: "Proton Mail",
      username: "user@proton.me",
      category: "Personal",
    });
  });
});
