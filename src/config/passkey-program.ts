export type PasskeyProgramMode =
  | "vault_unlock"
  | "site_passkey_mvp"
  | "site_passkey_active"
  | "site_passkey_future_rp";

export interface PasskeyProgramDefinition {
  mode: PasskeyProgramMode;
  label: string;
  scope: "shipping_4_1" | "shipping_4_2" | "post_4_2";
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
  site_passkey_active: {
    mode: "site_passkey_active",
    label: "Site Passkey",
    scope: "shipping_4_2",
    description: "Fully operational site passkey with WebAuthn registration and authentication runtime.",
  },
  site_passkey_future_rp: {
    mode: "site_passkey_future_rp",
    label: "Site Passkey Future RP",
    scope: "post_4_2",
    description: "Reserved for advanced relying-party flows such as cross-device signing and passkey sync.",
  },
};

export const PASSKEY_PROGRAM_SCOPES = {
  shipping_4_1: Object.values(PASSKEY_PROGRAM_DEFINITIONS).filter((item) => item.scope === "shipping_4_1"),
  shipping_4_2: Object.values(PASSKEY_PROGRAM_DEFINITIONS).filter((item) => item.scope === "shipping_4_2"),
  post_4_2: Object.values(PASSKEY_PROGRAM_DEFINITIONS).filter((item) => item.scope === "post_4_2"),
};
