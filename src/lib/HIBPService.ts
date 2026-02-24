export class HIBPService {
  /**
   * Checks if a password has been compromised using the Have I Been Pwned API.
   * Uses k-anonymity: only the first 5 characters of the SHA-1 hash are sent to the API.
   * The API returns a list of suffix matches, which are checked locally.
   *
   * @param password The plaintext password to check.
   * @returns The number of times the password was found in breaches (0 if safe).
   */
  static async checkPassword(password: string): Promise<number> {
    if (!password) return 0;

    try {
      // 1. Calculate SHA-1 hash of the password
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await window.crypto.subtle.digest("SHA-1", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      // 2. Implement k-anonymity: Split hash into prefix (5 chars) and suffix
      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);

      // 3. Query HIBP API with only the prefix
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      
      if (!response.ok) {
        console.warn(`HIBP API returned status: ${response.status}`);
        return 0; 
      }

      const responseText = await response.text();

      // 4. Check if our suffix exists in the returned list
      const lines = responseText.split('\n');
      for (const line of lines) {
        const [returnedSuffix, countStr] = line.split(':');
        if (returnedSuffix.trim() === suffix) {
          return parseInt(countStr, 10);
        }
      }

      return 0; // Not found
    } catch (error) {
      console.error("Error checking HIBP API:", error);
      return 0; // Fail open (assume safe on network error)
    }
  }
}
