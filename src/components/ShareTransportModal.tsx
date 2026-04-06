import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  Download,
  Key,
  Lock,
  Shield,
  Copy,
  Check,
  FileDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  SharingTransportService,
  type SharingKeyPair,
  type ShareableEntry,
} from '../lib/SharingTransportService';
import type { VaultEntry } from '../vaultService';

interface ShareTransportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: VaultEntry[];
  onImport?: (entries: ShareableEntry[]) => void;
}

type Tab = 'send' | 'receive';

export function ShareTransportModal({
  isOpen,
  onClose,
  entries,
  onImport,
}: ShareTransportModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('send');

  // ── Send State ──
  const [keyPair, setKeyPair] = useState<SharingKeyPair | null>(null);
  const [recipientKeyJson, setRecipientKeyJson] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<number>>(new Set());
  const [description, setDescription] = useState('');
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [encryptedPayload, setEncryptedPayload] = useState<string | null>(null);
  const [payloadCopied, setPayloadCopied] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  // ── Receive State ──
  const [receivePayloadJson, setReceivePayloadJson] = useState('');
  const [receivePrivateKeyJson, setReceivePrivateKeyJson] = useState('');
  const [decryptedEntries, setDecryptedEntries] = useState<ShareableEntry[] | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleGenerateKeyPair();
      setSelectedEntryIds(new Set());
      setEncryptedPayload(null);
      setDecryptedEntries(null);
      setReceivePayloadJson('');
      setReceivePrivateKeyJson('');
      setDescription('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleGenerateKeyPair = useCallback(async () => {
    try {
      const kp = await SharingTransportService.generateKeyPair();
      setKeyPair(kp);
      toast.success(t('shareTransportKeyPairGenerated'));
    } catch (err) {
      console.error('[ShareTransport] Key generation failed:', err);
    }
  }, [t]);

  const toggleEntry = (id: number) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEncrypt = async () => {
    if (!keyPair) {
      toast.error(t('shareTransportNoEntriesSelected'));
      return;
    }

    const selectedEntries = entries.filter((e) => selectedEntryIds.has(e.id));
    if (selectedEntries.length === 0) {
      toast.warning(t('shareTransportNoEntriesSelected'));
      return;
    }

    let recipientJwk: JsonWebKey;
    try {
      recipientJwk = JSON.parse(recipientKeyJson);
    } catch {
      // If no recipient key provided, use own public key (self-share for testing)
      recipientJwk = keyPair.publicKeyJwk;
    }

    setIsEncrypting(true);
    try {
      const result = await SharingTransportService.encryptEntries(selectedEntries, recipientJwk, {
        description: description || undefined,
        expiresAt:
          expiryHours > 0 ? new Date(Date.now() + expiryHours * 3600000).toISOString() : undefined,
        senderKeyPair: keyPair,
      });

      if (result.success && result.payload) {
        setEncryptedPayload(result.payload);
        toast.success(t('shareTransportSelectedCount', { count: result.entryCount }));
      } else {
        toast.error(t('shareTransportEncryptFailed', { error: result.error }));
      }
    } catch (err) {
      toast.error(t('shareTransportEncryptFailed', { error: String(err) }));
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleCopyPayload = async () => {
    if (!encryptedPayload) return;
    try {
      await navigator.clipboard.writeText(encryptedPayload);
      setPayloadCopied(true);
      setTimeout(() => setPayloadCopied(false), 2000);
    } catch {
      toast.error(t('shareTransportEncryptFailed', { error: 'Clipboard' }));
    }
  };

  const handleDownloadPayload = () => {
    if (!encryptedPayload) return;
    const blob = new Blob([encryptedPayload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis-share-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDecrypt = async () => {
    if (!receivePayloadJson.trim() || !receivePrivateKeyJson.trim()) return;

    setIsDecrypting(true);
    try {
      let privateKeyJwk: JsonWebKey;
      try {
        privateKeyJwk = JSON.parse(receivePrivateKeyJson);
      } catch {
        toast.error(t('shareTransportDecryptFailed', { error: 'Invalid private key JSON' }));
        setIsDecrypting(false);
        return;
      }

      // Validate first
      const validation = SharingTransportService.validatePayload(receivePayloadJson);
      if (!validation.valid) {
        toast.error(t('shareTransportValidationFailed', { error: validation.error }));
        setIsDecrypting(false);
        return;
      }

      const result = await SharingTransportService.decryptEntries(
        receivePayloadJson,
        privateKeyJwk
      );

      if (result.success && result.entries) {
        setDecryptedEntries(result.entries);
        toast.success(t('shareTransportDecryptSuccess', { count: result.entryCount }));
      } else {
        toast.error(t('shareTransportDecryptFailed', { error: result.error }));
      }
    } catch (err) {
      toast.error(t('shareTransportDecryptFailed', { error: String(err) }));
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleImportEntries = () => {
    if (decryptedEntries && onImport) {
      onImport(decryptedEntries);
      toast.success(t('shareTransportImported', { count: decryptedEntries.length }));
      onClose();
    }
  };

  if (!isOpen) return null;

  const payloadSize = encryptedPayload ? new TextEncoder().encode(encryptedPayload).length : 0;
  const transportMethod = encryptedPayload
    ? SharingTransportService.getRecommendedTransport(encryptedPayload)
    : null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-transport-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm dark:bg-black/70"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl animate-in zoom-in-95 duration-300 slide-in-from-bottom-5">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-t-[2rem] border-b border-gray-100 dark:border-gray-800 px-6 py-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2
                id="share-transport-title"
                className="text-lg font-bold text-gray-900 dark:text-white"
              >
                {t('shareTransportTitle')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('shareTransportDesc')}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('send')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'send'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Send className="w-4 h-4" />
              {t('shareTransportSendTab')}
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'receive'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Download className="w-4 h-4" />
              {t('shareTransportReceiveTab')}
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ── SEND TAB ── */}
          {activeTab === 'send' && (
            <>
              {/* Key Info */}
              {keyPair && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {t('shareTransportFingerprint', { fp: keyPair.publicKeyFingerprint })}
                    </span>
                  </div>

                  {/* Public Key (collapsible) */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      onClick={() => setShowPublicKey(!showPublicKey)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span>{t('shareTransportPublicKeyLabel')}</span>
                      {showPublicKey ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {showPublicKey && (
                      <div className="p-3">
                        <textarea
                          readOnly
                          value={JSON.stringify(keyPair.publicKeyJwk, null, 2)}
                          className="w-full h-24 text-[10px] font-mono bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg p-2 resize-none border-0 outline-none"
                          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        />
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                          {t('shareTransportPublicKeyHint')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Private Key (collapsible) */}
                  <div className="rounded-xl border border-amber-300 dark:border-amber-700 overflow-hidden">
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {t('shareTransportPrivateKeyLabel')}
                      </span>
                      {showPrivateKey ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                    {showPrivateKey && (
                      <div className="p-3">
                        <textarea
                          readOnly
                          value={JSON.stringify(keyPair.privateKeyJwk, null, 2)}
                          className="w-full h-24 text-[10px] font-mono bg-amber-50 dark:bg-amber-900/20 text-gray-700 dark:text-gray-300 rounded-lg p-2 resize-none border-0 outline-none"
                          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        />
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {t('shareTransportPrivateKeyHint')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recipient Key */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 block">
                  {t('shareTransportRecipientKeyLabel')}
                </label>
                <textarea
                  value={recipientKeyJson}
                  onChange={(e) => setRecipientKeyJson(e.target.value)}
                  placeholder={t('shareTransportRecipientKeyPlaceholder')}
                  className="w-full h-20 text-xs font-mono bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl p-3 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-400/40 resize-none transition-all"
                />
              </div>

              {/* Description & Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 block">
                    {t('shareTransportDescriptionLabel')}
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('shareTransportDescriptionPlaceholder')}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-400/40 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 block">
                    {t('shareTransportExpiryLabel')}
                  </label>
                  <select
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(Number(e.target.value))}
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-400/40 transition-all"
                  >
                    <option value={1}>1 saat</option>
                    <option value={6}>6 saat</option>
                    <option value={24}>24 saat</option>
                    <option value={72}>72 saat</option>
                    <option value={168}>1 hafta</option>
                    <option value={0}>Süre sonu yok</option>
                  </select>
                </div>
              </div>

              {/* Entry Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  {t('shareTransportSelectEntries')}
                </h3>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                  {entries.length === 0 ? (
                    <p className="p-3 text-xs text-gray-400 dark:text-gray-500 text-center">—</p>
                  ) : (
                    entries.map((entry) => (
                      <label
                        key={entry.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEntryIds.has(entry.id)}
                          onChange={() => toggleEntry(entry.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-400/40"
                        />
                        <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                          {entry.title}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto truncate max-w-[120px]">
                          {entry.username}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {selectedEntryIds.size > 0 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    {t('shareTransportSelectedCount', { count: selectedEntryIds.size })}
                  </p>
                )}
              </div>

              {/* Encrypt Button */}
              <button
                onClick={handleEncrypt}
                disabled={isEncrypting || selectedEntryIds.size === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEncrypting ? (
                  <span className="animate-pulse">⏳</span>
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {t('shareTransportEncryptBtn')}
              </button>

              {/* Payload Output */}
              {encryptedPayload && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {t('shareTransportPayloadLabel')}
                    </h3>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {t('shareTransportSizeInfo', {
                        size: payloadSize.toLocaleString(),
                        method:
                          transportMethod === 'qr'
                            ? t('shareTransportMethodQr')
                            : transportMethod === 'clipboard'
                              ? t('shareTransportMethodClipboard')
                              : t('shareTransportMethodFile'),
                      })}
                    </span>
                  </div>
                  <textarea
                    readOnly
                    value={encryptedPayload}
                    className="w-full h-28 text-[10px] font-mono bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl p-3 border border-gray-200 dark:border-gray-700 resize-none"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {t('shareTransportPayloadHint')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyPayload}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-all"
                    >
                      {payloadCopied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {t('shareTransportCopyPayload')}
                    </button>
                    <button
                      onClick={handleDownloadPayload}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-all"
                    >
                      <FileDown className="w-4 h-4" />
                      {t('shareTransportDownloadPayload')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── RECEIVE TAB ── */}
          {activeTab === 'receive' && (
            <>
              {/* Payload Input */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 block">
                  {t('shareTransportReceivePayloadLabel')}
                </label>
                <textarea
                  value={receivePayloadJson}
                  onChange={(e) => setReceivePayloadJson(e.target.value)}
                  placeholder={t('shareTransportReceivePayloadPlaceholder')}
                  className="w-full h-28 text-xs font-mono bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl p-3 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-emerald-400/40 resize-none transition-all"
                />
              </div>

              {/* Private Key Input */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" />
                  {t('shareTransportReceiveKeyLabel')}
                </label>
                <textarea
                  value={receivePrivateKeyJson}
                  onChange={(e) => setReceivePrivateKeyJson(e.target.value)}
                  placeholder={t('shareTransportReceiveKeyPlaceholder')}
                  className="w-full h-20 text-xs font-mono bg-amber-50 dark:bg-amber-900/20 text-gray-800 dark:text-gray-200 rounded-xl p-3 border border-amber-200 dark:border-amber-800 outline-none focus:ring-2 focus:ring-amber-400/40 resize-none transition-all"
                />
              </div>

              {/* Decrypt Button */}
              <button
                onClick={handleDecrypt}
                disabled={
                  isDecrypting || !receivePayloadJson.trim() || !receivePrivateKeyJson.trim()
                }
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDecrypting ? (
                  <span className="animate-pulse">⏳</span>
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                {t('shareTransportDecryptBtn')}
              </button>

              {/* Decrypted Entries */}
              {decryptedEntries && decryptedEntries.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {t('shareTransportEntryPreviewTitle')}
                  </h3>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 overflow-hidden divide-y divide-emerald-100 dark:divide-emerald-900">
                    {decryptedEntries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 px-3 py-2 bg-emerald-50/50 dark:bg-emerald-900/10"
                      >
                        <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {entry.title}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                            {entry.username} · {entry.url}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleImportEntries}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    {t('shareTransportImportEntries', { count: decryptedEntries.length })}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            <Lock className="w-3 h-3" />
            <span>ECDH P-256 + AES-256-GCM + HMAC-SHA256</span>
          </div>
          <button
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
