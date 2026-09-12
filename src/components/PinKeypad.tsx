import React from 'react';

interface PinKeypadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** Renders in bottom-left cell. If not provided, an empty cell is shown. */
  bottomLeftButton?: React.ReactNode;
  /** Style variant - 'dark' for the lock screen (dark bg), 'light' for the setup modal (light/dark mode aware) */
  variant?: 'dark' | 'light';
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  onDigit,
  onDelete,
  bottomLeftButton,
  variant = 'dark',
}) => {
  const isDark = variant === 'dark';

  const buttonClasses = 'neu-btn h-13 rounded-2xl text-lg font-black text-slate-800 dark:text-slate-100 flex items-center justify-center cursor-pointer';
  const deleteBtnClasses = 'neu-btn h-13 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer';

  return (
    <div className={`grid grid-cols-3 gap-3 w-full ${isDark ? 'max-w-[260px]' : 'mb-4'}`}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
        <button
          key={digit}
          onClick={() => onDigit(digit)}
          className={buttonClasses}
        >
          {digit}
        </button>
      ))}
      {bottomLeftButton ? bottomLeftButton : <div />}
      <button
        onClick={() => onDigit('0')}
        className={buttonClasses}
      >
        0
      </button>
      <button
        onClick={onDelete}
        aria-label="Delete digit"
        className={deleteBtnClasses}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-7.172a2 2 0 00-1.414.586L3 12z" />
        </svg>
      </button>
    </div>
  );
};

export default PinKeypad;
