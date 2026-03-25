import { ExportService } from "../ExportService";

describe("ExportService regression tests", () => {
  it("escapes CSV fields with quotes, commas and newlines", () => {
    const csv = ExportService.buildCsv([
      {
        title: 'Work "Admin", Portal',
        username: "user@example.com",
        pass: "line1\nline2",
        category: "Work",
        website: "https://example.com",
        tags: ["prod", "team"],
      },
    ]);

    expect(csv).toContain('"Work ""Admin"", Portal"');
    expect(csv).toContain('"line1\nline2"');
    expect(csv).toContain('"prod;team"');
  });

  it("builds structured JSON payloads", () => {
    const json = ExportService.buildJson([
      {
        title: "Github",
        username: "octocat",
        pass: "secretPass123",
        category: "Work",
        website: "https://github.com",
        tags: ["dev"],
      },
    ]);

    expect(JSON.parse(json)).toEqual([
      {
        title: "Github",
        username: "octocat",
        password: "secretPass123",
        category: "Work",
        website: "https://github.com",
        tags: ["dev"],
      },
    ]);
  });

  it("builds canonical JSON payloads from vault entries", () => {
    const json = ExportService.buildCanonicalJson([
      {
        id: 1,
        title: "Github",
        username: "octocat",
        website: "https://github.com",
        category: "login",
        updated_at: "2026-03-23T10:00:00.000Z",
        pass: "secretPass123",
        notes: "important note",
        tags: ["dev"],
      },
    ] as never);

    expect(JSON.parse(json)).toEqual([
      {
        id: 1,
        title: "Github",
        username: "octocat",
        url: "https://github.com",
        category: "login",
        favorite: false,
        tags: ["dev"],
        deleted_at: null,
        updated_at: "2026-03-23T10:00:00.000Z",
        secret: {
          password: "secretPass123",
          notes: "important note",
        },
        passkey: null,
        attachments: [],
      },
    ]);
  });
});
