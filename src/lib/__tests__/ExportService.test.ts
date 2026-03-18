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
});
