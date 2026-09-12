import React, { useState, useEffect, useCallback } from 'react';
import { authenticateWithBiometrics, checkBiometricAvailability } from '../lib/biometrics';
import PinKeypad from './PinKeypad';

interface Props {
  correctPin: string;
  biometricsEnabled?: boolean;
  onSuccess: () => void;
}

export const AppLockModal: React.FC<Props> = ({ correctPin, biometricsEnabled = true, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [hasError, setHasError] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  const triggerBiometricAuth = useCallback(async () => {
    const res = await authenticateWithBiometrics('Scan fingerprint to unlock BunkCalc');
    if (res.success) {
      onSuccess();
    }
  }, [onSuccess]);

  useEffect(() => {
    let mounted = true;
    checkBiometricAvailability().then((status) => {
      if (mounted && status.isAvailable) {
        setHasBiometrics(true);
        if (biometricsEnabled !== false) {
          triggerBiometricAuth();
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, [biometricsEnabled, triggerBiometricAuth]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setHasError(false);

    if (newPin.length === 4) {
      if (newPin === correctPin) {
        onSuccess();
      } else {
        setHasError(true);
        setTimeout(() => {
          setPin('');
          setHasError(false);
        }, 500);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setHasError(false);
  };

  const handleClear = () => {
    setPin('');
    setHasError(false);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Security PIN Lock"
      className="fixed inset-0 bg-[#e6ecf5] dark:bg-[#181c24] z-[100] flex flex-col items-center justify-center p-6 select-none transition-colors"
    >
      <div className="w-full max-w-xs neu-card rounded-3xl p-8 flex flex-col items-center text-center space-y-6">
        
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-3xl neu-btn flex items-center justify-center text-blue-500 shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-wider uppercase">BunkCalc Locked</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter your 4-digit security PIN</p>
        </div>

        {/* PIN Dots Display */}
        <div className={`flex gap-4 p-3 neu-inset rounded-2xl transition-transform ${hasError ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  isFilled
                    ? 'bg-blue-500 border-blue-500 scale-110 shadow-sm shadow-blue-500/50'
                    : hasError
                    ? 'border-red-500 bg-red-500/20'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800'
                }`}
              />
            );
          })}
        </div>

        {hasError && (
          <p className="text-xs font-bold text-red-500 animate-pulse">Incorrect PIN. Try again.</p>
        )}

        {/* Keypad */}
        <PinKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          bottomLeftButton={
            hasBiometrics ? (
              <button
                onClick={triggerBiometricAuth}
                title="Unlock with Fingerprint"
                aria-label="Unlock with Fingerprint"
                className="neu-btn h-13 rounded-2xl text-blue-500 dark:text-blue-400 flex items-center justify-center cursor-pointer transition-all active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleClear}
                className="neu-btn h-13 rounded-2xl text-slate-500 dark:text-slate-400 text-xs font-bold uppercase cursor-pointer transition-all active:scale-95"
              >
                Clear
              </button>
            )
          }
        />

        {hasBiometrics && (
          <button
            onClick={triggerBiometricAuth}
            className="text-xs font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1.5 py-2 px-4 rounded-2xl neu-btn transition-all active:scale-95 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
            <span>Scan Fingerprint to Unlock</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AppLockModal;
