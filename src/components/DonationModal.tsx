import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, QrCode, Heart, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

const cryptoAddresses = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    address: 'bc1qqsuljwzs32ckkqdrsdus7wgqzuetty3g0x47l7',
    color: '#F7931A',
  },
  {
    name: 'Ethereum / USDT',
    symbol: 'ETH / USDT',
    address: '0x4bd17Cc073D08E3E021Fd315d840554c840843E1',
    color: '#627EEA',
  },
  {
    name: 'Solana',
    symbol: 'SOL',
    address: '81H1rKZHjpSsnr6Epumw9XVTfqAnqSHcTKm7D3VsEd74',
    color: '#14F195',
  },
  {
    name: 'Ripple',
    symbol: 'XRP',
    address: 'rfXzWPGKFMGdaYsqFCiyZHhRXF741Snx8N',
    color: '#23292F',
  },
  { name: 'Tron', symbol: 'TRON', address: 'TQBz3q8Ddjap3K8QdFQHtJKBxbvXMCi62E', color: '#FF0013' },
  {
    name: 'Litecoin',
    symbol: 'LTC',
    address: 'LZC3egqj1K9aZ3i42HbsRWK7m1SbUgXmak',
    color: '#345D9D',
  },
  {
    name: 'Bitcoin Cash',
    symbol: 'BCH',
    address: 'qzfd46kp4tguu8pxrs6gnux0qxndhnqk8sa83q08wm',
    color: '#8BC34A',
  },
  {
    name: 'Tezos',
    symbol: 'XTZ',
    address: 'tz1Tij1ujzkEyvA949x1q7EW17s6pUNbEUdV',
    color: '#2C7DF7',
  },
];

export function DonationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeQr, setActiveQr] = useState<number | null>(null);

  const copyToClipboard = (address: string, index: number) => {
    navigator.clipboard.writeText(address);
    setCopiedIndex(index);
    toast.success(t('addressCopied'));
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="donation-surface relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-[1.75rem] border shadow-2xl flex flex-col md:flex-row"
      >
        {/* Left Side: Info */}
        <div className="donation-hero-panel w-full md:w-[38%] p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="donation-hero-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-8">
              <Heart className="w-8 h-8 text-white fill-white/20" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">{t('donateTitle')}</h2>
            <p className="text-white/84 leading-relaxed text-sm">{t('donateDesc')}</p>
          </div>

          <div className="relative z-10 mt-12">
            <div className="donation-quote p-4 rounded-2xl text-xs text-white/90 italic">
              "{t('privacyQuote')}"
            </div>
          </div>
        </div>

        {/* Right Side: Crypto Grid */}
        <div className="donation-right-panel flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar backdrop-blur-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-[var(--color-deep-navy)]">{t('donateBtn')}</h3>
            <button
              onClick={onClose}
              className="donation-close-btn p-2 rounded-full transition-colors"
              aria-label="Close donation modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {cryptoAddresses.map((crypto, index) => (
              <div
                key={crypto.symbol}
                className="donation-card group p-4 rounded-2xl border shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                      style={{ backgroundColor: crypto.color }}
                    >
                      {crypto.symbol[0]}
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-[var(--color-deep-navy)]">
                        {crypto.name}
                      </span>
                      <span className="block text-[10px] opacity-40 uppercase tracking-widest font-bold">
                        {crypto.symbol}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveQr(index)}
                    className="donation-qr-trigger p-2 rounded-lg transition-all"
                    aria-label={`Show ${crypto.name} QR code`}
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>

                <div className="donation-address font-mono text-[10px] p-2.5 rounded-lg break-all text-[var(--color-deep-navy)]/70 mb-3 opacity-100 transition-opacity">
                  {crypto.address}
                </div>

                <button
                  onClick={() => copyToClipboard(crypto.address, index)}
                  className="btn-ink w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[var(--color-deep-navy)] text-white text-xs font-bold hover:bg-opacity-90 shadow-md active:scale-95 transition-all"
                >
                  {copiedIndex === index ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedIndex === index ? t('copiedToClipboard') : t('copyAddressBtn')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Floating QR Modal (Inner) */}
        <AnimatePresence>
          {activeQr !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="donation-qr-surface absolute inset-0 z-[210] flex flex-col items-center justify-center p-8 md:p-12 text-center"
            >
              <button
                onClick={() => setActiveQr(null)}
                className="donation-close-btn absolute top-6 right-6 md:top-8 md:right-8 p-3 rounded-full transition-colors"
                aria-label="Close QR code"
              >
                <X className="w-6 h-6 md:w-8 md:h-8" />
              </button>

              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-white text-2xl md:text-3xl font-bold mb-5 shadow-xl"
                style={{ backgroundColor: cryptoAddresses[activeQr].color }}
              >
                {cryptoAddresses[activeQr].symbol[0]}
              </div>

              <h4 className="text-3xl font-bold text-[var(--color-deep-navy)] mb-2">
                {cryptoAddresses[activeQr].name}
              </h4>
              <p className="donation-qr-copy text-sm mb-8 md:mb-10 max-w-sm">
                {t('qrScanSupport')}
              </p>

              <div className="donation-qr-code-box p-5 md:p-6 rounded-[1.75rem] shadow-2xl mb-8 md:mb-10">
                <QRCodeSVG
                  value={cryptoAddresses[activeQr].address}
                  size={224}
                  level="H"
                  includeMargin
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              <div className="donation-qr-address px-5 md:px-6 py-4 rounded-2xl font-mono text-sm text-[var(--color-deep-navy)]/70 mb-8 md:mb-10 max-w-md break-all">
                {cryptoAddresses[activeQr].address}
              </div>

              <button
                onClick={() => copyToClipboard(cryptoAddresses[activeQr].address, activeQr)}
                className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-[var(--color-sage-green)] text-white font-bold shadow-lg hover:shadow-xl hover:bg-[#8ba68b] transition-all active:scale-95"
              >
                <Copy className="w-5 h-5" /> {t('copyAddressBtn')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
