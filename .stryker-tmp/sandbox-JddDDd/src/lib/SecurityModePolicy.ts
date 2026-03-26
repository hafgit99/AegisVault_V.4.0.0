// @ts-nocheck
import { SecureAppSettings, type SecurityModeProfile } from "./SecureAppSettings";

export interface SecurityModeDefinition {
  profile: SecurityModeProfile;
  allowPlaintextExport: boolean;
  allowQrSync: boolean;
  allowHibpNetwork: boolean;
  maxAutoLockMinutes: number;
  descriptionKey: string;
}

const SECURITY_MODE_DEFINITIONS: Record<SecurityModeProfile, SecurityModeDefinition> = {
  standard: {
    profile: "standard",
    allowPlaintextExport: true,
    allowQrSync: true,
    allowHibpNetwork: true,
    maxAutoLockMinutes: 30,
    descriptionKey: "securityModeStandardDesc",
  },
  strict: {
    profile: "strict",
    allowPlaintextExport: false,
    allowQrSync: true,
    allowHibpNetwork: true,
    maxAutoLockMinutes: 5,
    descriptionKey: "securityModeStrictDesc",
  },
  maximum: {
    profile: "maximum",
    allowPlaintextExport: false,
    allowQrSync: false,
    allowHibpNetwork: false,
    maxAutoLockMinutes: 1,
    descriptionKey: "securityModeMaximumDesc",
  },
};

export class SecurityModePolicy {
  static getProfile(): SecurityModeProfile {
    return SecureAppSettings.getSecurityModeProfile();
  }

  static setProfile(profile: SecurityModeProfile): void {
    SecureAppSettings.setSecurityModeProfile(profile);
  }

  static getDefinition(profile: SecurityModeProfile = this.getProfile()): SecurityModeDefinition {
    return SECURITY_MODE_DEFINITIONS[profile];
  }

  static listDefinitions(): SecurityModeDefinition[] {
    return [
      SECURITY_MODE_DEFINITIONS.standard,
      SECURITY_MODE_DEFINITIONS.strict,
      SECURITY_MODE_DEFINITIONS.maximum,
    ];
  }

  static isPlaintextExportAllowed(profile: SecurityModeProfile = this.getProfile()): boolean {
    return this.getDefinition(profile).allowPlaintextExport;
  }

  static isQrSyncAllowed(profile: SecurityModeProfile = this.getProfile()): boolean {
    return this.getDefinition(profile).allowQrSync;
  }

  static isHibpAllowed(profile: SecurityModeProfile = this.getProfile()): boolean {
    return this.getDefinition(profile).allowHibpNetwork;
  }

  static enforceAutoLock(value: number, profile: SecurityModeProfile = this.getProfile()): number {
    const { maxAutoLockMinutes } = this.getDefinition(profile);
    if (value <= 0) {
      return maxAutoLockMinutes;
    }
    return Math.min(value, maxAutoLockMinutes);
  }
}
