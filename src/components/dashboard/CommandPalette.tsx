import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Settings,
  Shield,
  Moon,
  Sun,
  Lock,
  X,
  Sparkles,
  Copy,
  User,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useVault } from '../../contexts/VaultContext';
import { type VaultEntry } from '../../vaultService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewEntry: () => void;
  onOpenSettings: () => void;
  onOpenQuickAlias: () => void;
  onToggleTheme: () => void;
  onLock: () => void;
  themeMode: 'light' | 'dark';
}

const localTranslations = {
  tr: {
    commandPaletteTitle: 'Spotlight Komut Paleti',
    commandPalettePlaceholder:
      'Komut veya şifreli kayıt ara... (ArrowUp/Down ile gezin, Enter ile seç)',
    commandNewEntry: 'Yeni Kayıt Ekle',
    commandSettings: 'Ayarları Aç',
    commandQuickAlias: 'Maskeli E-posta Üret (Quick Alias)',
    commandToggleTheme: 'Temayı Değiştir (Aydınlık / Karanlık)',
    commandLockVault: 'Kasayı Kilitle',
    commandNoResults: 'Eşleşen kayıt veya komut bulunamadı.',
    copiedPassword: 'Şifre güvenli şekilde kopyalandı!',
    copiedUsername: 'Kullanıcı adı panoya kopyalandı!',
    hintLock: 'Ctrl+L to Lock',
    hintTheme: 'Ctrl+T to Theme',
    hintSettings: 'Ctrl+, to Settings',
    hintNewEntry: 'Ctrl+N to New',
    hintQuickAlias: 'Ctrl+A for Alias',
    hintCopyPassword: 'Şifreyi Kopyala',
    hintCopyUsername: 'Kullanıcı Adı Kopyala',
    hintOpenEntry: 'Kaydı Düzenle / Detaylar',
    sectionCommands: 'Sistem Komutları',
    sectionPasswords: 'Kayıtlı Şifreler ve Kartlar',
    quickActions: 'Hızlı Eylemler',
  },
  en: {
    commandPaletteTitle: 'Spotlight Command Palette',
    commandPalettePlaceholder:
      'Search commands or credentials... (ArrowUp/Down to navigate, Enter to select)',
    commandNewEntry: 'Add New Entry',
    commandSettings: 'Open Settings',
    commandQuickAlias: 'Generate Masked Email (Quick Alias)',
    commandToggleTheme: 'Toggle Theme (Light / Dark)',
    commandLockVault: 'Lock Vault',
    commandNoResults: 'No matching entries or commands found.',
    copiedPassword: 'Password copied securely!',
    copiedUsername: 'Username copied to clipboard!',
    hintLock: 'Ctrl+L to Lock',
    hintTheme: 'Ctrl+T to Theme',
    hintSettings: 'Ctrl+, to Settings',
    hintNewEntry: 'Ctrl+N to New',
    hintQuickAlias: 'Ctrl+A for Alias',
    hintCopyPassword: 'Copy Password',
    hintCopyUsername: 'Copy Username',
    hintOpenEntry: 'Edit Record / Details',
    sectionCommands: 'System Commands',
    sectionPasswords: 'Saved Passwords & Cards',
    quickActions: 'Quick Actions',
  },
};

export function CommandPalette({
  isOpen,
  onClose,
  onNewEntry,
  onOpenSettings,
  onOpenQuickAlias,
  onToggleTheme,
  onLock,
  themeMode,
}: CommandPaletteProps) {
  const { i18n } = useTranslation();
  const { passwords, handleCopyItem } = useVault();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lang = i18n.language.startsWith('tr') ? 'tr' : 'en';
  const tLocal = localTranslations[lang];

  // Auto focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Base System Commands
  const systemCommands = [
    {
      id: 'cmd-new-entry',
      type: 'command',
      label: tLocal.commandNewEntry,
      icon: <Plus className="h-4.5 w-4.5 text-[var(--color-sage-green)]" />,
      action: () => {
        onNewEntry();
        onClose();
      },
      shortcut: 'Ctrl + N',
    },
    {
      id: 'cmd-settings',
      type: 'command',
      label: tLocal.commandSettings,
      icon: <Settings className="h-4.5 w-4.5 text-[var(--color-sage-green)]" />,
      action: () => {
        onOpenSettings();
        onClose();
      },
      shortcut: 'Ctrl + ,',
    },
    {
      id: 'cmd-quick-alias',
      type: 'command',
      label: tLocal.commandQuickAlias,
      icon: <Shield className="h-4.5 w-4.5 text-[var(--color-sage-green)]" />,
      action: () => {
        onOpenQuickAlias();
        onClose();
      },
      shortcut: 'Ctrl + A',
    },
    {
      id: 'cmd-theme',
      type: 'command',
      label: tLocal.commandToggleTheme,
      icon:
        themeMode === 'dark' ? (
          <Sun className="h-4.5 w-4.5 text-amber-400" />
        ) : (
          <Moon className="h-4.5 w-4.5 text-indigo-500" />
        ),
      action: () => {
        onToggleTheme();
        onClose();
      },
      shortcut: 'Ctrl + T',
    },
    {
      id: 'cmd-lock',
      type: 'command',
      label: tLocal.commandLockVault,
      icon: <Lock className="h-4.5 w-4.5 text-red-400" />,
      action: () => {
        onLock();
        onClose();
      },
      shortcut: 'Ctrl + L',
    },
  ];

  // Filtering Logic
  const filteredCommands = systemCommands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredPasswords = passwords.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.username.toLowerCase().includes(query.toLowerCase()) ||
      (item.website && item.website.toLowerCase().includes(query.toLowerCase()))
  );

  const totalItemsCount = filteredCommands.length + filteredPasswords.length;

  // Make sure selection is within bounds
  if (selectedIndex >= totalItemsCount && totalItemsCount > 0) {
    setSelectedIndex(totalItemsCount - 1);
  }

  // Handle Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow Down
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItemsCount);
    }
    // Arrow Up
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItemsCount) % totalItemsCount);
    }
    // Escape: Close
    else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
    // Enter: Select
    else if (e.key === 'Enter') {
      e.preventDefault();
      triggerActiveItem();
    }
    // Ctrl + C: Copy Password of highlighted entry (if in passwords section)
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (selectedIndex >= filteredCommands.length) {
        const passwordIndex = selectedIndex - filteredCommands.length;
        const entry = filteredPasswords[passwordIndex];
        if (entry) {
          e.preventDefault();
          handleCopyItem(entry.id, entry.pass || '');
          toast.success(tLocal.copiedPassword);
          onClose();
        }
      }
    }
    // Ctrl + U: Copy Username of highlighted entry (if in passwords section)
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      if (selectedIndex >= filteredCommands.length) {
        const passwordIndex = selectedIndex - filteredCommands.length;
        const entry = filteredPasswords[passwordIndex];
        if (entry) {
          e.preventDefault();
          navigator.clipboard.writeText(entry.username);
          toast.success(tLocal.copiedUsername);
          onClose();
        }
      }
    }
  };

  const triggerActiveItem = () => {
    if (totalItemsCount === 0) return;

    if (selectedIndex < filteredCommands.length) {
      // Trigger command
      filteredCommands[selectedIndex].action();
    } else {
      // Open / copy password of vault entry
      const passwordIndex = selectedIndex - filteredCommands.length;
      const entry = filteredPasswords[passwordIndex];
      if (entry) {
        // Trigger copying the password by default, or we can copy and toast
        handleCopyItem(entry.id, entry.pass || '');
        toast.success(tLocal.copiedPassword);
        onClose();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listContainerRef.current) {
      const activeEl = listContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Deteremine clean local brand/avatar gradients (offline security)
  const getOfflineGradient = (title: string) => {
    const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hues = [158, 204, 260, 340, 42, 12, 180, 220];
    const h = hues[hash % hues.length];
    return `linear-gradient(135deg, hsl(${h}, 50%, 55%), hsl(${(h + 40) % 360}, 55%, 35%))`;
  };

  if (!isOpen) return null;

  return (
    <div className="v5-quick-alias-backdrop fixed inset-0 z-[100] flex items-start justify-center bg-black/55 p-4 pt-[15vh] backdrop-blur-md animate-in fade-in duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="v5-command-palette-surface w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white/70 dark:bg-[#121826]/75 border border-white/20 dark:border-white/10 shadow-[0_0_50px_rgba(52,211,153,0.1)] backdrop-blur-2xl"
        role="dialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Field */}
        <div className="relative flex items-center border-b border-black/5 dark:border-white/5 px-5 py-4.5">
          <Search className="absolute left-5 h-5 w-5 text-[var(--color-sage-green)] opacity-60" />
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-8 pr-12 text-[15px] font-medium placeholder-black/35 dark:placeholder-white/35 bg-transparent border-0 outline-none text-[var(--color-deep-navy)] dark:text-white"
            placeholder={tLocal.commandPalettePlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <button
            onClick={onClose}
            className="absolute right-5 flex items-center justify-center h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-black/50 dark:text-white/50 transition-all"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* List Content */}
        <div
          ref={listContainerRef}
          className="max-h-[50vh] overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2"
        >
          {totalItemsCount === 0 && (
            <div className="py-12 text-center text-sm font-medium text-black/45 dark:text-white/45 flex flex-col items-center gap-3">
              <Sparkles className="h-8 w-8 opacity-40 animate-pulse" />
              {tLocal.commandNoResults}
            </div>
          )}

          {/* Section: Commands */}
          {filteredCommands.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-sage-green)] opacity-75">
                {tLocal.sectionCommands}
              </div>
              <div className="flex flex-col gap-0.5">
                {filteredCommands.map((cmd, idx) => {
                  const isActive = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      data-active={isActive}
                      onClick={() => cmd.action()}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group ${
                        isActive
                          ? 'bg-[var(--color-sage-green)]/15 dark:bg-[var(--color-sage-green)]/20 shadow-sm'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl transition-all ${
                            isActive
                              ? 'bg-[var(--color-sage-green)] text-white scale-105'
                              : 'bg-black/5 dark:bg-white/5 text-[var(--color-sage-green)]'
                          }`}
                        >
                          {cmd.icon}
                        </div>
                        <span
                          className={`text-[13.5px] font-semibold transition-all ${
                            isActive
                              ? 'text-[var(--color-deep-navy)] dark:text-white pl-1'
                              : 'text-black/75 dark:text-white/75'
                          }`}
                        >
                          {cmd.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase opacity-45 px-2 py-1 rounded bg-black/5 dark:bg-white/5">
                        {cmd.shortcut}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Passwords */}
          {filteredPasswords.length > 0 && (
            <div className="mt-2">
              <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-sage-green)] opacity-75">
                {tLocal.sectionPasswords}
              </div>
              <div className="flex flex-col gap-0.5">
                {filteredPasswords.map((item, idx) => {
                  const globalIdx = filteredCommands.length + idx;
                  const isActive = globalIdx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      onClick={() => {
                        handleCopyItem(item.id, item.pass || '');
                        toast.success(tLocal.copiedPassword);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group ${
                        isActive
                          ? 'bg-[var(--color-sage-green)]/15 dark:bg-[var(--color-sage-green)]/20 shadow-sm'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[12.5px] font-extrabold shadow-sm transition-all"
                          style={{
                            background: getOfflineGradient(item.title),
                          }}
                        >
                          {item.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className={`text-[13.5px] font-bold transition-all ${
                              isActive
                                ? 'text-[var(--color-deep-navy)] dark:text-white pl-1'
                                : 'text-black/85 dark:text-white/85'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[11.5px] font-medium text-black/50 dark:text-white/50 truncate max-w-[250px]">
                            {item.username || '-'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <div className="flex items-center gap-1.5 pr-2 animate-in fade-in duration-300">
                            <span className="text-[10px] font-bold text-black/45 dark:text-white/45 flex items-center gap-1">
                              <kbd className="bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded border border-black/10 dark:border-white/10">
                                Enter
                              </kbd>{' '}
                              {tLocal.hintCopyPassword}
                            </span>
                            <span className="text-[10px] font-bold text-black/45 dark:text-white/45 flex items-center gap-1 ml-2">
                              <kbd className="bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded border border-black/10 dark:border-white/10">
                                Ctrl+U
                              </kbd>{' '}
                              {tLocal.hintCopyUsername}
                            </span>
                          </div>
                        )}
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-sage-green)] bg-[var(--color-sage-green)]/10 px-2 py-1 rounded-lg">
                          {item.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Quick Help Guide */}
        <div className="bg-black/5 dark:bg-white/5 px-5 py-3 text-[11px] font-semibold text-black/50 dark:text-white/50 flex items-center justify-between border-t border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded border border-black/15 dark:border-white/15">
                ↑↓
              </kbd>{' '}
              Gezgin
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded border border-black/15 dark:border-white/15">
                Enter
              </kbd>{' '}
              Seç
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded border border-black/15 dark:border-white/15">
                Esc
              </kbd>{' '}
              Kapat
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-70">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-sage-green)] animate-pulse" />
            <span>Aegis Spotlight</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
