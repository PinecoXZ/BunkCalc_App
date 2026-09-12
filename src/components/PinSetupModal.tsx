import React, { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import PinKeypad from './PinKeypad';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  initialMode?: 'set' | 'change' | 'disable';
  currentPin?: string;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'set',
  currentPin,
}) => {
  const [step, setStep] = useState<'verify_old' | 'enter_new' | 'confirm_new'>(
    initialMode === 'change' || initialMode === 'disable' ? 'verify_old' : 'enter_new'
  );
  const [enteredPin, setEnteredPin] = useState('');
  const [newPinCandidate, setNewPinCandidate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const triggerHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // web fallback
    }
  };

  const handleDigit = (digit: string) => {
    triggerHaptic();
    setErrorMsg('');
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);

      if (nextPin.length === 4) {
        handlePinComplete(nextPin);
      }
    }
  };

  const handleDelete = () => {
    triggerHaptic();
    setErrorMsg('');
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const handlePinComplete = (pin: string) => {
    if (step === 'verify_old') {
      if (pin === currentPin) {
        if (initialMode === 'disable') {
          onSuccess('');
          onClose();
        } else {
          setStep('enter_new');
          setEnteredPin('');
        }
      } else {
        setErrorMsg('Incorrect current PIN');
        setEnteredPin('');
      }
    } else if (step === 'enter_new') {
      setNewPinCandidate(pin);
      setStep('confirm_new');
      setEnteredPin('');
    } else if (step === 'confirm_new') {
      if (pin === newPinCandidate) {
        onSuccess(pin);
        onClose();
      } else {
        setErrorMsg('PINs do not match. Try again.');
        setStep('enter_new');
        setNewPinCandidate('');
        setEnteredPin('');
      }
    }
  };

  const getTitle = () => {
    if (step === 'verify_old') return 'Enter Current PIN';
    if (step === 'enter_new') return initialMode === 'change' ? 'Enter New 4-Digit PIN' : 'Set 4-Digit Security PIN';
    return 'Confirm New PIN';
  };

  const getSubtitle = () => {
    if (step === 'verify_old') return 'Verify your existing passcode';
    if (step === 'enter_new') return 'Choose a memorable 4-digit code';
    return 'Re-enter the same 4-digit code';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="neu-card rounded-3xl p-6 w-full max-w-xs flex flex-col items-center">
        {/* Header Icon */}
        <div className="w-12 h-12 rounded-2xl neu-inset text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h3 className="text-base font-black text-slate-900 dark:text-white text-center tracking-tight">{getTitle()}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-0.5 mb-5 font-medium">{getSubtitle()}</p>

        {/* 4 Dots Indicator */}
        <div className="flex gap-4 mb-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-blue-600 scale-110 shadow-md shadow-blue-500/40'
                    : 'neu-inset opacity-70'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg ? (
          <p className="text-xs font-bold text-rose-500 mb-3 animate-bounce">{errorMsg}</p>
        ) : (
          <div className="h-4 mb-3" />
        )}

        {/* Numeric Numpad */}
        <PinKeypad
          onDigit={handleDigit}
          onDelete={handleDelete}
          variant="light"
          bottomLeftButton={
            <button
              onClick={onClose}
              className="neu-btn h-13 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer"
            >
              Cancel
            </button>
          }
        />
      </div>
    </div>
  );
};
