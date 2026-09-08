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
      className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center p-6 select-none"
    >
      <div className="w-full max-w-xs flex flex-col items-center text-center space-y-8">
        
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-3xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-xl shadow-blue-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-black text-white tracking-wider uppercase">BunkCalc Locked</h2>
          <p className="text-xs text-slate-400 mt-1">Enter your 4-digit security PIN</p>
        </div>

        {/* PIN Dots Display */}
        <div className={`flex gap-4 my-2 transition-transform ${hasError ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  isFilled
                    ? 'bg-blue-500 border-blue-500 scale-110 shadow-md shadow-blue-500/40'
                    : hasError
                    ? 'border-red-500 bg-red-500/20'
                    : 'border-slate-700 bg-slate-900'
                }`}
              />
            );
          })}
        </div>

        {hasError && (
          <p className="text-xs font-bold text-red-400">Incorrect PIN. Try again.</p>
        )}

        {/* Keypad */}
        <PinKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          variant="dark"
          bottomLeftButton={
            hasBiometrics ? (
              <button
                onClick={triggerBiometricAuth}
                title="Unlock with Fingerprint"
                aria-label="Unlock with Fingerprint"
                className="h-14 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center transition-all active:scale-90 shadow-md shadow-blue-500/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleClear}
                className="h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800 border border-slate-800/80 text-slate-400 text-xs font-bold uppercase transition-all active:scale-90"
              >
                Clear
              </button>
            )
          }
        />

        {hasBiometrics && (
          <button
            onClick={triggerBiometricAuth}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-blue-500/10 transition-colors"
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

