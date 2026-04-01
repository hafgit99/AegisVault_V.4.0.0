import { describe, expect, it } from "vitest";
import {
  PASSKEY_PROGRAM_DEFINITIONS,
  PASSKEY_PROGRAM_SCOPES,
} from "../passkey-program";

describe("passkey-program config", () => {
  it("defines all expected modes", () => {
    expect(PASSKEY_PROGRAM_DEFINITIONS.vault_unlock.scope).toBe("shipping_4_1");
    expect(PASSKEY_PROGRAM_DEFINITIONS.site_passkey_mvp.scope).toBe("shipping_4_1");
    expect(PASSKEY_PROGRAM_DEFINITIONS.site_passkey_active.scope).toBe("shipping_4_2");
    expect(PASSKEY_PROGRAM_DEFINITIONS.site_passkey_future_rp.scope).toBe("post_4_2");
  });

  it("builds scope groups from definitions", () => {
    expect(PASSKEY_PROGRAM_SCOPES.shipping_4_1).toHaveLength(2);
    expect(PASSKEY_PROGRAM_SCOPES.shipping_4_2).toHaveLength(1);
    expect(PASSKEY_PROGRAM_SCOPES.post_4_2).toHaveLength(1);
    expect(PASSKEY_PROGRAM_SCOPES.shipping_4_2[0].mode).toBe("site_passkey_active");
  });
});
