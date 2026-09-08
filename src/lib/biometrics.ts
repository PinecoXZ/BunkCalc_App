import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

export interface BiometricStatus {
  isAvailable: boolean;
  biometryType: 'fingerprint' | 'face' | 'none';
  reason?: string;
}

/**
 * Checks whether biometric hardware (Fingerprint / Face ID) is supported and enrolled on this device.
 */
export const checkBiometricAvailability = async (): Promise<BiometricStatus> => {
  try {
    const info = await BiometricAuth.checkBiometry();
    if (info.isAvailable) {
      let type: 'fingerprint' | 'face' | 'none' = 'fingerprint';
      if (info.biometryType === BiometryType.faceId || info.biometryType === BiometryType.faceAuthentication) {
        type = 'face';
      }
      return {
        isAvailable: true,
        biometryType: type,
      };
    }
    return {
      isAvailable: false,
      biometryType: 'none',
      reason: info.reason || 'Biometrics not enrolled or unavailable',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Fallback: check WebAuthn user-verifying platform authenticator
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          return {
            isAvailable: true,
            biometryType: 'fingerprint',
          };
        }
      } catch {
        // ignore
      }
    }
    return {
      isAvailable: false,
      biometryType: 'none',
      reason: errorMsg || 'Biometrics not supported on this platform',
    };
  }
};

/**
 * Prompts the user with native Android BiometricPrompt (Fingerprint / Face ID).
 */
export const authenticateWithBiometrics = async (
  reason: string = 'Scan fingerprint to unlock BunkCalc'
): Promise<{ success: boolean; error?: string }> => {
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Use PIN Instead',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Enter Passcode',
    });
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: errorMsg || 'Biometric authentication cancelled or failed',
    };
  }
};
