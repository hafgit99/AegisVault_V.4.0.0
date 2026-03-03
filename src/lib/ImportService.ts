import type { VaultEntry } from "../vaultService";

export interface ImportProgress {
  totalAnalyzed: number;
  processed: number;
  status: 'parsing' | 'importing' | 'complete' | 'error';
  error?: string;
}

export type ProgressCallback = (progress: ImportProgress) => void;

export class ImportService {
  /**
   * Parse a CSV/JSON file to extract vault entries.
   * Handles potential data corruption and malformed structures safely.
   */
  static async parseFile(
    file: File, 
    onProgress: ProgressCallback
  ): Promise<Partial<VaultEntry>[]> {
    return new Promise((resolve, reject) => {
      onProgress({ totalAnalyzed: 0, processed: 0, status: 'parsing' });

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) throw new Error("File is empty or corrupted.");

          let entries: Partial<VaultEntry>[] = [];

          if (file.name.toLowerCase().endsWith('.json')) {
            entries = this.parseJson(text);
          } else {
            entries = this.parseCsv(text);
          }

          onProgress({ totalAnalyzed: entries.length, processed: 0, status: 'importing' });
          resolve(entries);
        } catch (error) {
          onProgress({ totalAnalyzed: 0, processed: 0, status: 'error', error: String(error) });
          reject(error);
        }
      };

      reader.onerror = () => {
        onProgress({ totalAnalyzed: 0, processed: 0, status: 'error', error: "Failed to read file." });
        reject(new Error("Failed to read file."));
      };

      reader.readAsText(file);
    });
  }

  private static parseJson(text: string): Partial<VaultEntry>[] {
    const entries: Partial<VaultEntry>[] = [];
    try {
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : (parsed.items || parsed.entries || []);
      
      arr.forEach((item: any) => {
        if (typeof item !== 'object' || !item) return;
        
        const title = item.title || item.name || "Imported Entry";
        const username = item.username || item.login?.username || "";
        const pass = item.password || item.pass || item.login?.password || "";
        const website = item.website || item.url || item.uri || item.login?.uris?.[0]?.uri || "";
        
        if (pass) {
          entries.push({ title, username, pass, website, category: item.category || 'General' });
        }
      });
    } catch (err) {
      throw new Error("Invalid JSON format. File may be corrupted.");
    }
    if (entries.length === 0) {
      throw new Error("JSON içerisinde içe aktarılacak geçerli parola bulunamadı.");
    }
    return entries;
  }

  private static parseCsv(text: string): Partial<VaultEntry>[] {
    const entries: Partial<VaultEntry>[] = [];
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) throw new Error("CSV file is empty or lacks headers.");

    const firstLine = lines[0];
    const firstLineLower = firstLine.toLowerCase();
    const commaCount = (firstLineLower.match(/,/g) || []).length;
    const semicolonCount = (firstLineLower.match(/;/g) || []).length;
    const separator = semicolonCount > commaCount ? ';' : ',';
    const headers = firstLineLower.split(separator).map(h => h.replace(/(^["']|["']$)/g, '').trim());
    
    // Header mappings
    const titleIdx = headers.findIndex(h => h === 'name' || h === 'title' || h === 'website name');
    const urlIdx = headers.findIndex(h => h === 'url' || h === 'website' || h === 'login_uri' || h === 'uri');
    const userIdx = headers.findIndex(h => h === 'username' || h === 'login_username' || h === 'login' || h === 'email');
    const passIdx = headers.findIndex(h => h === 'password' || h === 'login_password' || h === 'pass');
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // More robust CSV split handling quotes
        const cols = [];
        let curStr = "";
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === separator && !inQuotes) {
                cols.push(curStr.replace(/(^"|"$)/g, '').replace(/""/g, '"').trim());
                curStr = "";
            } else {
                curStr += char;
            }
        }
        cols.push(curStr.replace(/(^"|"$)/g, '').replace(/""/g, '"').trim()); // push last col

        try {
            let title = titleIdx !== -1 ? cols[titleIdx] : "";
            let website = urlIdx !== -1 ? cols[urlIdx] : "";
            let username = userIdx !== -1 ? cols[userIdx] : "";
            let pass = passIdx !== -1 ? cols[passIdx] : "";

            // Fallbacks for unknown formats (try to guess blindly)
            if (titleIdx === -1 && headers.length >= 3) {
              if (passIdx === -1) pass = cols[headers.length - 1] || ""; // Usually last is pass
              if (userIdx === -1) username = cols[headers.length - 2] || "";
              if (urlIdx === -1 && website === "") website = cols[0] || "";
              
              if (website) {
                try {
                  title = new URL(website.startsWith('http') ? website : `https://${website}`).hostname;
                } catch {
                  title = "Imported Entry";
                }
              } else {
                title = "Imported Entry";
              }
            } else if (!title) {
               title = website || "Imported Entry";
            }

            if (pass) {
                entries.push({ title, username, pass, website, category: 'General' });
            }
        } catch (e) {
            console.warn(`Skipping corrupted line ${i}:`, e);
            continue; // Skip malformed lines
        }
    }

    if (entries.length === 0) {
        throw new Error("Could not extract any valid passwords from the CSV.");
    }
    return entries;
  }
}
