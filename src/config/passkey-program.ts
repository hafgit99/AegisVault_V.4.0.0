export type PasskeyProgramMode =
  | "vault_unlock"
  | "site_passkey_mvp"
  | "site_passkey_future_rp";

export interface PasskeyProgramDefinition {
  mode: PasskeyProgramMode;
  label: string;
  scope: "shipping_4_1" | "post_4_1";
  description: string;
}

export const PASSKEY_PROGRAM_DEFINITIONS: Record<PasskeyProgramMode, PasskeyProgramDefinition> = {
  vault_unlock: {
    mode: "vault_unlock",
    label: "Vault Unlock",
    scope: "shipping_4_1",
    description: "Uses passkey material to unlock the local vault profile on this device.",
  },
  site_passkey_mvp: {
    mode: "site_passkey_mvp",
    label: "Site Passkey MVP",
    scope: "shipping_4_1",
    description: "Stores site passkey metadata and inventory state without full RP runtime flows.",
  },
  site_passkey_future_rp: {
    mode: "site_passkey_future_rp",
    label: "Site Passkey Future RP",
    scope: "post_4_1",
    description: "Reserved for future relying-party connected runtime flows beyond 4.1.",
  },
};

export const PASSKEY_PROGRAM_SCOPES = {
  shipping_4_1: Object.values(PASSKEY_PROGRAM_DEFINITIONS).filter((item) => item.scope === "shipping_4_1"),
  post_4_1: Object.values(PASSKEY_PROGRAM_DEFINITIONS).filter((item) => item.scope === "post_4_1"),
};
