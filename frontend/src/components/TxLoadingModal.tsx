"use client";

import { WelpCoin } from "./WelpCoin";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
};

export function TxLoadingModal({ open, title, subtitle }: Props) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <div className="bg-white rounded-[1.5rem] border-2 border-gray-100 p-10 max-w-sm w-full shadow-xl text-center">
        <div className="flex justify-center mb-6">
          <WelpCoin size={64} animation="flip" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        <p className="text-xs text-gray-400 mt-4">Confirm in your wallet and wait a moment for Sepolia.</p>
      </div>
    </div>
  );
}
