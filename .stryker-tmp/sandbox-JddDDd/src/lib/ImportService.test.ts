// @ts-nocheck
import { ImportService } from "./ImportService";

type ImportServiceWithTestAccess = typeof ImportService & {
  parseCsv: (text: string) => {
    entries: Array<Record<string, unknown>>;
    report: {
      sourceFormat: "csv" | "json";
      totalRows: number;
      validEntries: number;
      skippedRows: number;
      weakPasswords: number;
      missingCriticalFields: number;
      duplicateCandidates: number;
      warnings: string[];
    };
  };
  parseJson: (text: string) => {
    entries: Array<Record<string, unknown>>;
    report: {
      sourceFormat: "csv" | "json";
      totalRows: number;
      validEntries: number;
      skippedRows: number;
      weakPasswords: number;
      missingCriticalFields: number;
      duplicateCandidates: number;
      warnings: string[];
    };
  };
  parseCsvCanonical: (text: string) => {
    records: Array<Record<string, unknown>>;
    report: {
      sourceFormat: "csv" | "json";
      totalRows: number;
      validEntries: number;
      skippedRows: number;
      weakPasswords: number;
      missingCriticalFields: number;
      duplicateCandidates: number;
      warnings: string[];
    };
  };
  parseJsonCanonical: (text: string) => {
    records: Array<Record<string, unknown>>;
    report: {
      sourceFormat: "csv" | "json";
      totalRows: number;
      validEntries: number;
      skippedRows: number;
      weakPasswords: number;
      missingCriticalFields: number;
      duplicateCandidates: number;
      warnings: string[];
    };
  };
};

const importServiceForTest = ImportService as unknown as ImportServiceWithTestAccess;

describe("ImportService regression tests", () => {
  it("throws when malformed CSV does not produce any importable password", () => {
    const corruptedCsv =
      "folder,favorite,type,name\n" +
      "Only,One,Column,Here\n" +
      "This line has,too,many,columns,than,the,header,allows\n" +
      '"Missing close quote,on,this,line';

    const result = () => importServiceForTest.parseCsv(corruptedCsv);

    expect(result).toThrow("Could not extract any valid passwords from the CSV.");
  });

  it("detects Bitwarden CSV and maps login fields", () => {
    const bitwardenCsv =
      "folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n" +
      "Work,0,login,Netflix,,,0,https://netflix.com,user@example.com,secretPass123,\n";

    const result = importServiceForTest.parseCsv(bitwardenCsv);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      title: "Netflix",
      username: "user@example.com",
      pass: "secretPass123",
      website: "https://netflix.com",
      category: "Work",
    });
    expect(result.report.warnings).toContain("BITWARDEN_CSV_DETECTED");
    expect(result.report.validEntries).toBe(1);
  });

  it("parses multiline quoted CSV values and duplicate signatures", () => {
    const csv =
      "title,username,password,website,tags\n" +
      '"Primary Account","user@example.com","secretPass123","https://example.com","prod;team"\n' +
      '"Primary Account","user@example.com","secretPass123","https://example.com","line1\nline2"\n';

    const result = importServiceForTest.parseCsv(csv);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[1].tags).toEqual(["line1\nline2"]);
    expect(result.report.duplicateCandidates).toBe(1);
  });

  it("maps 1Password style JSON login payloads", () => {
    const payload = JSON.stringify({
      items: [
        {
          title: "Github",
          category: "Work",
          tags: ["dev", "git"],
          login: {
            username: "octocat",
            password: "secretPass123",
            uris: [{ uri: "https://github.com/login" }],
          },
        },
      ],
    });

    const result = importServiceForTest.parseJson(payload);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      title: "Github",
      username: "octocat",
      pass: "secretPass123",
      website: "https://github.com/login",
      category: "Work",
      tags: ["dev", "git"],
    });
    expect(result.report.sourceFormat).toBe("json");
    expect(result.report.validEntries).toBe(1);
  });

  it("throws for empty JSON structures", () => {
    const result = () => importServiceForTest.parseJson("{}");

    expect(result).toThrow("No valid passwords could be imported from the JSON file.");
  });

  it("builds canonical records from CSV import output", () => {
    const csv =
      "title,username,password,website,tags\n" +
      '"Github","octocat","secretPass123","https://github.com","dev;git"\n';

    const result = importServiceForTest.parseCsvCanonical(csv);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      title: "Github",
      username: "octocat",
      url: "https://github.com",
      category: "other",
      favorite: false,
      tags: ["dev", "git"],
      secret: {
        password: "secretPass123",
      },
    });
  });

  it("builds canonical records from JSON import output", () => {
    const payload = JSON.stringify({
      items: [
        {
          title: "Github",
          category: "Work",
          login: {
            username: "octocat",
            password: "secretPass123",
            uris: [{ uri: "https://github.com/login" }],
          },
        },
      ],
    });

    const result = importServiceForTest.parseJsonCanonical(payload);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      title: "Github",
      username: "octocat",
      url: "https://github.com/login",
      secret: {
        password: "secretPass123",
      },
    });
  });
});
