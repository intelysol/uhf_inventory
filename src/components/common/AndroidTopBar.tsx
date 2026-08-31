import React from 'react';
import { ArrowLeft, Sliders, Settings, Radio } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { ReaderStatusBadge } from './ReaderStatusBadge';

interface AndroidTopBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  showReaderChip?: boolean;
}

export const AndroidTopBar: React.FC<AndroidTopBarProps> = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  actions,
  showReaderChip = true,
}) => {
  const { goBack, navigationStack, navigateTo, readerState } = useRFID();
  const canGoBack = showBack && (onBack !== undefined || navigationStack.length > 1);

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };

  return (
    <header className="w-full bg-[#1a237e] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md z-10">
      <div className="flex items-center gap-3 min-w-0">
        {canGoBack && (
          <button
            id="btn-topbar-back"
            onClick={handleBackClick}
            className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center text-indigo-100 hover:bg-white/15 active:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-base font-bold text-white leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-indigo-200 font-medium truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showReaderChip && <ReaderStatusBadge compact />}

        {actions}
      </div>
    </header>
  );
};
