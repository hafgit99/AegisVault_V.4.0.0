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

    const headerLine = lines[0].toLowerCase();
    const isBitwarden = headerLine.includes('folder') && headerLine.includes('favorite') && headerLine.includes('type') && headerLine.includes('name');
    const is1Password = headerLine.includes('title') && headerLine.includes('url') && headerLine.includes('username') && headerLine.includes('password');

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
            } else if (char === ',' && !inQuotes) {
                cols.push(curStr.replace(/(^"|"$)/g, '').replace(/""/g, '"').trim());
                curStr = "";
            } else {
                curStr += char;
            }
        }
        cols.push(curStr.replace(/(^"|"$)/g, '').replace(/""/g, '"').trim()); // push last col

        let title = "Imported Entry";
        let username = "";
        let pass = "";
        let website = "";
        
        try {
            if (isBitwarden) {
                // Typical bitwarden order: folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp
                title = cols[3] || "Imported Bitwarden";
                website = cols[7] || "";
                username = cols[8] || "";
                pass = cols[9] || "";
            } else if (is1Password) {
                // Typical 1password order: Title,URL,Username,Password,OTPAuth
                title = cols[0] || "Imported 1Password";
                website = cols[1] || "";
                username = cols[2] || "";
                pass = cols[3] || "";
            } else {
                // Generic Aegis/fallback: title,username,password,category
                title = cols[0] || "Imported";
                username = cols[1] || "";
                pass = cols[2] || "";
            }
            
            if (pass) {
                entries.push({ title, username, pass, website, category: 'General' });
            }
        } catch (e) {
            console.warn(`Skipping corrupted line ${i}:`, e);
            continue; // Skip malformed lines instead of crashing
        }
    }

    if (entries.length === 0) {
        throw new Error("Could not extract any valid passwords from the CSV.");
    }
    return entries;
  }
}
