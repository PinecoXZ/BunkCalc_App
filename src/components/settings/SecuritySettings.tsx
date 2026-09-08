import React from 'react';
import type { AppSettings } from '../../lib/types';
import SubHeader from './SubHeader';
import { checkBiometricAvailability, authenticateWithBiometrics } from '../../lib/biometrics';

interface SecuritySettingsProps {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  onBack: () => void;
  onOpenPinModal: (mode: 'set' | 'change') => void;
  onShowModal: (modal: {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'error' | 'alert' | 'success' | 'confirm';
    confirmText?: string;
    onConfirm: () => void;
  }) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  settings,
  setSettings,
  onBack,
  onOpenPinModal,
  onShowModal,
}) => {
  return (
    <div className="animate-in fade-in duration-150 space-y-6">
      <SubHeader
        title="Security & Biometrics"
        subtitle="Passcode lock, fingerprint & privacy"
        onBack={onBack}
      />

      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        {/* PIN Lock Toggle */}
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold text-sm">App PIN Lock</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Lock BunkCalc with a 4-digit passcode on launch</p>
          </div>
          <button 
            onClick={() => {
              if (!settings.appLockEnabled) {
                if (!settings.appLockPin) {
                  onOpenPinModal('set');
                } else {
                  setSettings({ ...settings, appLockEnabled: true });
                }
              } else {
                setSettings({ ...settings, appLockEnabled: false });
              }
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${settings.appLockEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.appLockEnabled ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>

        {settings.appLockEnabled && (
          <>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Passcode Protection Active</span>
              <button 
                onClick={() => onOpenPinModal('change')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Change PIN
              </button>
            </div>

            {/* Fingerprint & Biometric Authentication Toggle */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm">Fingerprint Unlock</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Unlock instantly using device fingerprint sensor</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  const willEnable = !(settings.biometricsEnabled ?? true);
                  if (willEnable) {
                    const status = await checkBiometricAvailability();
                    if (!status.isAvailable) {
                      onShowModal({
                        isOpen: true,
                        title: "Biometrics Unavailable",
                        message: status.reason || "No fingerprint sensor or enrolled biometrics detected on this device.",
                        type: "alert",
                        confirmText: "OK",
                        onConfirm: () => {},
                      });
                      return;
                    }
                  }
                  setSettings({ ...settings, biometricsEnabled: willEnable });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative ${(settings.biometricsEnabled ?? true) ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${(settings.biometricsEnabled ?? true) ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            {/* Test Fingerprint Prompt Button */}
            {(settings.biometricsEnabled ?? true) && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={async () => {
                    const res = await authenticateWithBiometrics('Verify fingerprint sensor functionality');
                    onShowModal({
                      isOpen: true,
                      title: res.success ? "Fingerprint Verified" : "Authentication Status",
                      message: res.success ? "Fingerprint sensor is active and functioning perfectly." : (res.error || "Authentication cancelled."),
                      type: res.success ? "success" : "alert",
                      confirmText: "Done",
                      onConfirm: () => {},
                    });
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Test Fingerprint Sensor</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;

