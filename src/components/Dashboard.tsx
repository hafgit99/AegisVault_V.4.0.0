import { useState, useEffect, useMemo } from "react";
import { vaultService, type VaultEntry } from "../vaultService";
import { useClipboard } from "../hooks/useClipboard";
import { Copy, Plus, Search, ShieldCheck, Download, LogOut, Check, ChevronRight, Hash, Globe, CreditCard, X, Eye, EyeOff, Wand2, Clock, Settings, FileUp, FileDown, Database, AlertTriangle, ShieldAlert, KeyRound, Clock4, Tag, Lock, Wifi, User, FileText, Paperclip, DownloadCloud, Trash2, Edit2, Heart } from "lucide-react";
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import DOMPurify from 'dompurify';
import { ImportService, type ImportProgress } from "../lib/ImportService";
import { HIBPService } from "../lib/HIBPService";
import { QRExporter } from './QRExporter';
import { QRScanner } from './QRScanner';
import { SpotlightWalkthrough } from './SpotlightWalkthrough';
import autoTable from 'jspdf-autotable';
import { useTranslation } from 'react-i18next';
import { DonationModal } from './DonationModal';
import { extensionBridge } from '../lib/ExtensionBridge';

// Optional: Magic UI Components for premium feel
function GlowCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div 
      onMouseMove={handleMouseMove} 
      onMouseEnter={() => setOpacity(1)} 
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden group/glow transition-transform duration-500 hover:scale-[1.01] ${className}`}
    >
      <div 
        className="pointer-events-none absolute -inset-px transition-opacity duration-500 z-0"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(135,159,132,0.18), transparent 40%)`
        }}
      />
      <div className="relative z-10 w-full h-full flex flex-col">{children}</div>
    </div>
  );
}

function SecurityScoreGauge({ score, onClick }: { score: number, onClick: () => void }) {
  const dashArray = 2 * Math.PI * 45;
  const dashOffset = dashArray - (dashArray * score) / 100;

  return (
    <button 
      onClick={onClick}
      className="group relative flex items-center justify-center w-24 h-24 transition-transform hover:scale-110 active:scale-95"
    >
      <svg className="w-full h-full -rotate-90 transform">
        <circle
          cx="48"
          cy="48"
          r="45"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          className="text-black/5"
        />
        <circle
          cx="48"
          cy="48"
          r="45"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={dashArray}
          style={{ strokeDashoffset: dashOffset }}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${
            score > 80 ? "text-[var(--color-sage-green)]" : score > 50 ? "text-amber-500" : "text-red-500"
          }`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tracking-tighter text-[var(--color-deep-navy)]">{score}</span>
        <span className="text-[8px] uppercase font-black opacity-40">Score</span>
      </div>
      {/* Magic UI Pulse Effect */}
      <div className={`absolute inset-0 rounded-full animate-ping opacity-20 pointer-events-none ${
        score > 80 ? "bg-[var(--color-sage-green)]" : "bg-red-500"
      }`} style={{ animationDuration: '3s' }} />
    </button>
  );
}

interface DashboardProps {
  onLock: () => void;
  secretKey?: string;
}

export function Dashboard({ onLock, secretKey }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const [passwords, setPasswords] = useState<VaultEntry[]>([]);
  const { copiedId, timeLeft, copy: handleCopyItem, timeoutSeconds } = useClipboard(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showEmergencyKit, setShowEmergencyKit] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(true);
  const [newEntry, setNewEntry] = useState<Partial<VaultEntry>>({ title: '', username: '', pass: '', category: 'General' });
  const [showPassword, setShowPassword] = useState(false);
  const [standalonePassword, setStandalonePassword] = useState("");
  const [isStandaloneCopied, setIsStandaloneCopied] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [logoClicks, setLogoClicks] = useState(0);
  const [showSecretMenu, setShowSecretMenu] = useState(false);
  const [duressPin, setDuressPin] = useState(localStorage.getItem('aegis_duress_pin') || '');
  const [killPin, setKillPin] = useState(localStorage.getItem('aegis_kill_pin') || '');
  
  // Settings & Data Management State
  const [showSettings, setShowSettings] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importReport, setImportReport] = useState<{ total: number, weak: number, missingFields: number, weakIds?: number[] } | null>(null);
  const [showWeakPasswordsPopup, setShowWeakPasswordsPopup] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  
  const [isPwnedScanning, setIsPwnedScanning] = useState(false);
  const [pwnedScanProgress, setPwnedScanProgress] = useState(0);

  // Tagging State for New Entry
  const [tagInput, setTagInput] = useState("");

  // Advanced Generator State
  const [genLength, setGenLength] = useState(18);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genEntropy, setGenEntropy] = useState(0);

  // Auto-Lock State
  const [autoLockTime, setAutoLockTime] = useState<number>(2); // Default 2 minutes. 0 means NEVER.

  // P2P Sync State
  const [syncMode, setSyncMode] = useState<'none' | 'export' | 'import'>('none');
  const [syncData, setSyncData] = useState<string>('');
  const [showDonation, setShowDonation] = useState(false);
  
  // Attachments State
  const [newAttachments, setNewAttachments] = useState<File[]>([]);

  const toggleVisibility = (id: number) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next === 5) {
        setShowSecretMenu(true);
        toast.info(t('secretMenuActive'));
        return 0;
      }
      return next;
    });
  };

  const saveSecretSettings = () => {
    localStorage.setItem('aegis_duress_pin', duressPin);
    localStorage.setItem('aegis_kill_pin', killPin);
    toast.success(t('securitySettingsUpdated'));
  };

  const calculateEntropy = (len: number, num: boolean, sym: boolean) => {
    const pool = 52 + (num ? 10 : 0) + (sym ? 29 : 0);
    return Math.floor(len * Math.log2(pool));
  };

  const createSecurePasswordString = (len = genLength, num = genNumbers, sym = genSymbols) => {
    let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (num) charset += "0123456789";
    if (sym) charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";
    
    if (charset.length === 0) return "";
    const array = new Uint32Array(len);
    window.crypto.getRandomValues(array);
    let password = "";
    for (let i = 0; i < len; i++) {
      password += charset[array[i] % charset.length];
    }
    return password;
  };

  const generateSecurePassword = () => {
    setNewEntry(prev => ({...prev, pass: createSecurePasswordString()}));
    setShowPassword(true); // Automatically show generated password
  };

  const handleGenerateStandalone = () => {
    setStandalonePassword(createSecurePasswordString(genLength, genNumbers, genSymbols));
    setGenEntropy(calculateEntropy(genLength, genNumbers, genSymbols));
    setIsStandaloneCopied(false);
  };

  useEffect(() => {
    handleGenerateStandalone();
  }, [genLength, genNumbers, genSymbols]);
    
  const copyStandalonePassword = () => {
    if (!standalonePassword) return;
    navigator.clipboard.writeText(standalonePassword);
    setIsStandaloneCopied(true);
    setTimeout(() => setIsStandaloneCopied(false), 2000);
  };

  const loadPasswords = () => {
    setIsDecrypting(true);
    const isTrash = categoryFilter === 'Trash';
    vaultService.getPasswords(searchQuery, categoryFilter, isTrash).then(data => {
      // Simulate PBKDF2 SQLCipher decryption Shimmer delay
      setTimeout(() => {
        setPasswords(data);
        setVisibleCount(20); // Reset visible count on reload
        setIsDecrypting(false);
      }, 900);
    });
  };

  const handleLock = () => {
    // Memory Sanitization Process
    vaultService.lock(); // Nulls out AES-GCM CryptoKey
    extensionBridge.lockAndDisconnect(); // Chrome externally_connectable port bağlantısını kopar
    
    // Completely overwrite plaintext states before unmounting
    setPasswords(prev => {
      prev.forEach(p => p.pass = "SANITIZE_OVERWRITE");
      return [];
    });
    setStandalonePassword("");
    setNewEntry({});
    setVisiblePasswords(new Set());

    // 🔒 GÜVENLİK: Eklentideki (Background Service Worker) önbelleği temizle
    // Web eklentisi için: Content Script üzerinden LOCK_VAULT mesajı gönder
    window.postMessage({
      type: 'AEGIS_LOCK_VAULT'
    }, "*");

    // Electron (Desktop) İçin IPC Kilitleme Sinyali
    try {
      if (typeof window !== 'undefined' && (window as any).require) {
        const electron = (window as any).require('electron');
        if (electron && electron.ipcRenderer) {
          electron.ipcRenderer.send('lock-vault');
        }
      }
    } catch (e) {
      // Web modunda çalışıyorken patlamasın diye yutulur
    }
    
    onLock(); // Switch back to Kilit Açma
  };


  const handleExport = async (format: 'vault' | 'csv' | 'json' = 'vault') => {
    try {
      let dataStr = "";
      let mime = "";
      let ext = "";

      if (format === 'vault') {
        dataStr = await vaultService.exportVault();
        mime = 'application/json';
        ext = 'vault';
      } else if (format === 'csv') {
        const header = "title,username,password,category\n";
        const rows = passwords.map(p => `"${p.title.replace(/"/g, '""')}","${p.username.replace(/"/g, '""')}","${(p.pass || '').replace(/"/g, '""')}","${p.category}"`);
        dataStr = header + rows.join('\n');
        mime = 'text/csv';
        ext = 'csv';
      } else if (format === 'json') {
        dataStr = JSON.stringify(passwords.map(p => ({ title: p.title, username: p.username, password: p.pass, category: p.category })), null, 2);
        mime = 'application/json';
        ext = 'json';
      }

      const blob = new Blob([dataStr], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Aegis_Backup_${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error", err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportReport(null);
    setImportProgress({ totalAnalyzed: 0, processed: 0, status: 'parsing' });

    try {
      const entries = await ImportService.parseFile(file, (progress) => {
        setImportProgress(progress);
      });

      if (entries.length > 0) {
        setImportProgress(prev => prev ? { ...prev, status: 'importing' } : null);
        const report = await vaultService.bulkAddPasswords(entries);
        setImportReport(report);
        setImportProgress({ totalAnalyzed: entries.length, processed: entries.length, status: 'complete' });
        loadPasswords();
        toast.success(`${entries.length} kayıt başarıyla içe aktarıldı.`);
      }
    } catch (err: any) {
      console.error("Import error", err);
      setImportProgress({ totalAnalyzed: 0, processed: 0, status: 'error', error: err.message });
      toast.error(`İçe aktarma hatası: ${err.message}`);
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
      // Clear progress after a delay if complete
      setTimeout(() => setImportProgress(null), 5000);
    }
  };

  const handleSyncExportInit = async () => {
    try {
      const data = await vaultService.exportVault();
      setSyncData(data);
      setSyncMode('export');
    } catch (err) {
      console.error("Failed to prepare sync export", err);
    }
  };

  const handleSyncImportSuccess = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      const report = await vaultService.bulkAddPasswords(parsed);
      setImportReport(report);
      loadPasswords();
      // Wait a moment for user to see 'Complete' message before closing scanner
      setTimeout(() => setSyncMode('none'), 2500);
    } catch (err) {
      console.error("P2P Import success handle error", err);
    }
  };

  useEffect(() => {
    // 1. Otonom Auto-Lock Timer
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeout);
      if (autoLockTime > 0) {
        timeout = setTimeout(() => {
          handleLock();
        }, autoLockTime * 60 * 1000); 
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    // SQL WHERE Query simulation triggered on search/category change
    loadPasswords();
    handleGenerateStandalone(); // Initialize standalone password once
    resetTimer(); // Start inactivity timer

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timeout);
    };
  }, [searchQuery, categoryFilter, autoLockTime]);

  useEffect(() => {
    // 🔄 Eklentiye kasa verilerini gönderen merkezi fonksiyon
    const syncToExtension = () => {
      if (passwords.length === 0) return;
      
      const payload = passwords.map(p => ({
        title: p.title,
        username: p.username,
        pass: p.pass,
        website: p.website
      }));

      // Web İçin: Content Script üzerinden gönder
      window.postMessage({
        type: 'AEGIS_SYNC_VAULT',
        payload
      }, "*");

      // Electron (Desktop) İçin IPC İletişimi
      try {
        if (typeof window !== 'undefined' && (window as any).require) {
          const electron = (window as any).require('electron');
          if (electron && electron.ipcRenderer) {
            electron.ipcRenderer.send('sync-vault', payload);
          }
        }
      } catch (e) {
        // Web modunda çalışıyorken patlamasın diye yutulur
      }
    };

    // 1. İlk yükleme: Passwords değiştiğinde hemen gönder
    syncToExtension();

    // 2. Eklenti yeniden yüklendiğinde veya geç yüklendiğinde
    //    Content script "AEGIS_EXTENSION_READY" sinyali gönderir,
    //    biz de kasayı yeniden eşitleriz.
    const handleExtensionReady = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === 'AEGIS_EXTENSION_READY') {
        console.log("[Aegis Vault] 🤝 Eklenti hazır sinyali alındı, kasa yeniden eşitleniyor...");
        syncToExtension();
      }
    };
    window.addEventListener('message', handleExtensionReady);

    // 3. Periyodik yeniden eşitleme (MV3 SW ölüp yeniden başlamasına karşı)
    //    Her 30 saniyede bir eklentiye güncel veriyi tekrar gönder
    const periodicSyncId = setInterval(syncToExtension, 30000);

    return () => {
      window.removeEventListener('message', handleExtensionReady);
      clearInterval(periodicSyncId);
    };
  }, [passwords]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.title || !newEntry.pass) {
      toast.error(t('titleAndPassRequired'));
      return;
    }
    
    const cleanEntry = {
      ...newEntry,
      title: DOMPurify.sanitize(newEntry.title),
      username: DOMPurify.sanitize(newEntry.username || ""),
      website: DOMPurify.sanitize(newEntry.website || ""),
      category: DOMPurify.sanitize(newEntry.category || "General"),
      tags: newEntry.tags?.map(t => DOMPurify.sanitize(t)) || []
    };

    const newId = await vaultService.addPassword(cleanEntry);
    
    if (newAttachments.length > 0 && newId) {
      toast.info(t('uploadingAttachments'));
      for (const file of newAttachments) {
        try {
          await vaultService.addAttachment(newId as number, file);
        } catch (err: any) {
          toast.error(`Failed to attach ${file.name}: ${err.message}`);
        }
      }
    }

    setIsAdding(false);
    setNewEntry({ title: '', username: '', pass: '', category: 'General', tags: [] });
    setTagInput('');
    setNewAttachments([]);
    loadPasswords(); // Refresh DB results
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(f => {
        if (f.size > 50 * 1024 * 1024) {
          toast.error(t('fileTooLarge', { name: f.name }));
          return false;
        }
        return true;
      });
      setNewAttachments(prev => [...prev, ...validFiles]);
      e.target.value = ''; // Reset
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, name: string) => {
    try {
      toast.info(t('decryptingAttachment', { name }));
      const blob = await vaultService.getDecryptedAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      toast.error(t('decryptFailed'));
    }
  };

  // Watchtower Security Audit Calculations
  const watchtower = useMemo(() => {
    const weak = passwords.filter(p => !p.pass || p.pass.length < 8).length;
    
    // Improved Reused Detection
    const reusedPasswords = new Set<string>();
    const seen = new Set<string>();
    passwords.forEach(p => {
      if (p.pass) {
        if (seen.has(p.pass)) reusedPasswords.add(p.pass);
        else seen.add(p.pass);
      }
    });
    const reusedEntries = passwords.filter(p => p.pass && reusedPasswords.has(p.pass));
    const reused = reusedEntries.length;
    
    // 1 Year Stale Detection
    const oneYearMs = 1000 * 60 * 60 * 24 * 365;
    const old = passwords.filter(p => p.updated_at && (Date.now() - new Date(p.updated_at).getTime() > oneYearMs)).length;
    
    // Pwned Detection
    const pwned = passwords.filter(p => (p.pwned_count || 0) > 0).length;

    // Health Score Algorithm
    const totalIssues = weak + (reused * 0.5) + (old * 0.2) + (pwned * 2);
    const score = passwords.length > 0 
      ? Math.max(0, Math.round(((passwords.length - totalIssues) / passwords.length) * 100)) 
      : 100;

    return { weak, reused, old, pwned, score };
  }, [passwords]);

  const handleScanPwned = async () => {
    if (passwords.length === 0) return;
    setIsPwnedScanning(true);
    setPwnedScanProgress(0);
    
    let scanned = 0;
    for (const p of passwords) {
      if (p.pass) {
        const pwnedCount = await HIBPService.checkPassword(p.pass);
        if (pwnedCount > 0 && p.pwned_count !== pwnedCount) {
          await vaultService.addPassword({ ...p, pwned_count: pwnedCount });
        }
      }
      scanned++;
      setPwnedScanProgress(Math.round((scanned / passwords.length) * 100));
    }
    
    loadPasswords();
    setIsPwnedScanning(false);
    toast.success(t('watchtowerPwnedScanCompleted'));
  };

  // Unique Tags Extracted from Vault
  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    passwords.forEach(p => p.tags?.forEach(t => set.add(t)));
    return Array.from(set);
  }, [passwords]);

  const downloadEmergencyKit = () => {
    setShowEmergencyKit(true);
    setTimeout(() => {
      const doc = new jsPDF('p', 'pt', 'a4');
      
      // Quiet Luxury Colors (Sage Green variants & Deep Navy)
      const primaryColor = '#101828'; // Deep Navy
      const accentColor = '#72886f'; // Sage Green
      const lightBg = '#F9FAFB'; // Cloud Dancer

      doc.setFillColor(lightBg);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

      // Header "Aegis Vault"
      doc.setTextColor(primaryColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("Aegis Vault", 40, 60);
      
      doc.setFontSize(14);
      doc.setTextColor(accentColor);
      doc.text("Emergency Recovery Kit", 40, 80);
      
      doc.setDrawColor(accentColor);
      doc.setLineWidth(1);
      doc.line(40, 90, 550, 90);

      // Secret Key Simulation & Warnings
      doc.setFontSize(10);
      doc.setTextColor(primaryColor);
      doc.setFont("helvetica", "normal");
      doc.text("Keep this document in a safe, offline location. This kit contains your Vault's master recovery contents.", 40, 110);
      doc.setFont("helvetica", "bold");
      doc.text("NEVER share this file. Do not upload it to the cloud without encryption.", 40, 125);
      
      // Draw Secret Key Box (Quiet Luxury Style)
      doc.setFillColor('#ffffff');
      doc.setDrawColor('#E5E7EB'); // subtle border
      doc.roundedRect(40, 140, 510, 50, 4, 4, 'FD');
      
      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.setTextColor('#374151');
      // Print Actual Security Device Secret Key to the PDF
      const realSecretKey = secretKey || "NO-SECRET-KEY-PROVIDED";
      doc.text(`Account Secret Key: ${realSecretKey}`, 60, 170);

      // Table mapping for passwords
      const tableData = passwords.map((p, i) => [
        (i + 1).toString(),
        p.title,
        p.username || '-',
        p.pass || '-',
        p.category
      ]);

      autoTable(doc, {
        startY: 210,
        head: [['#', 'Vault Item', 'Identity (User/Email)', 'Secure Password', 'Category']],
        body: tableData,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 9,
          textColor: '#374151',
          lineColor: '#E5E7EB',
          lineWidth: 0.5,
          cellPadding: 8,
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: '#FFFFFF',
          fontStyle: 'bold',
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: '#F3F4F6'
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { fontStyle: 'bold', cellWidth: 100 },
          2: { cellWidth: 130 },
          3: { font: 'courier' },
        },
        didDrawPage: function (data: any) {
             const str = "Page " + doc.getCurrentPageInfo().pageNumber;
             doc.setFontSize(8);
             doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 20);
             doc.text("Generated by Aegis Offline Environment", 400, doc.internal.pageSize.getHeight() - 20);
        }
      });

      doc.save("Aegis_Emergency_Kit_v2.pdf");
      setShowEmergencyKit(false);
    }, 1500);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Bank": return <CreditCard className="w-5 h-5 text-blue-500" />;
      case "Social": return <Globe className="w-5 h-5 text-pink-500" />;
      case "Cards": return <CreditCard className="w-5 h-5 text-blue-600" />;
      case "Identities": return <User className="w-5 h-5 text-yellow-500" />;
      case "Notes": return <FileText className="w-5 h-5 text-gray-600" />;
      case "WiFi": return <Wifi className="w-5 h-5 text-green-500" />;
      default: return <Hash className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[var(--color-cloud-dancer)] text-[var(--color-deep-navy)] p-4 md:p-8 font-[var(--font-geist)] animate-in fade-in duration-700">
      <SpotlightWalkthrough />
      
      {/* Clipboard Timeline Progress Tracker */}
      {timeLeft > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white/70 backdrop-[10px] -webkit-backdrop-filter:blur(10px) border border-[var(--color-sage-green)]/30 px-5 py-2.5 rounded-full flex flex-col gap-1 z-50 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[var(--color-sage-green)] animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-deep-navy)]">{t('sanitizingClipboard')} {timeLeft}s</span>
          </div>
          <div className="w-40 h-1 bg-black/5 rounded-full overflow-hidden">
             <div className="h-full bg-[var(--color-sage-green)] transition-all duration-1000 ease-linear rounded-full" style={{ width: `${(timeLeft / timeoutSeconds) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Header */}
      <header className="max-w-[1400px] mx-auto flex justify-between items-center mb-10 p-4 xl:px-8">
        <div className="flex items-center gap-6">
          {watchtower && typeof watchtower.score === 'number' && (
            <SecurityScoreGauge score={watchtower.score} onClick={() => setShowSettings(true)} />
          )}
          <div className="flex items-center gap-3 cursor-help" onClick={handleLogoClick}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-sage-green)] to-[var(--color-deep-navy)] flex items-center justify-center shadow-lg active:scale-95 transition-transform p-1">
              <img src="./icon.png" alt="Aegis Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Aegis Vault</h1>
              <p className="text-xs opacity-70">WASM SQLCipher Active</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => i18n.changeLanguage(i18n.language.startsWith('en') ? 'tr' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40 border border-[var(--color-sage-green)]/20 hover:bg-white/80 transition-all text-xs font-bold shadow-sm backdrop-blur-md text-[var(--color-deep-navy)]"
          >
            <Globe className="w-3.5 h-3.5" />
            {i18n.language.startsWith('en') ? 'EN' : 'TR'}
          </button>
          <button 
            onClick={() => setShowDonation(true)} 
            className="p-2.5 rounded-full bg-white/40 border border-white/20 hover:bg-white/80 transition-all text-red-500 shadow-sm group relative"
            title={t('donateBtn')}
          >
            <Heart className="w-5 h-5 fill-current opacity-80 group-hover:opacity-100" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-full bg-white/40 border border-white/20 hover:bg-white/80 transition-all text-[var(--color-sage-green)] shadow-sm">
            <Settings className="w-5 h-5" />
          </button>
          <div className="relative group">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 transition-opacity group-focus-within:opacity-100" />
             <input
               type="text"
               placeholder={t('searchPlaceholder')}
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="pl-10 pr-4 py-2 w-48 md:w-64 text-sm bg-white/40 border border-white/20 rounded-full shadow-sm outline-none focus:bg-white/80 focus:ring-2 focus:ring-[var(--color-sage-green)]/40 transition-all font-medium"
             />
          </div>
          <button onClick={handleLock} className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all text-red-600 font-semibold text-sm shadow-sm active:scale-95">
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">{t('lockVault')}</span>
          </button>
        </div>
      </header>

      {/* Bento Grid Layout - Asymmetric */}
      <main className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 px-4 xl:px-8">
        
        {/* Main Vault Panel (Col Span 8 or 9) */}
        <GlowCard className="lg:col-span-8 xl:col-span-9 glass-card p-6 md:p-8 flex flex-col gap-6 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-sage-green)] opacity-[0.03] blur-3xl rounded-full pointer-events-none group-hover/glow:opacity-10 transition-opacity duration-1000" />
          
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{categoryFilter === 'Trash' ? t('trash') : t('yourVault')}</h2>
              <p className="text-sm opacity-60 flex items-center gap-2">
                {t('zeroKnowledge')}
                {!isDecrypting && (
                  <span className="bg-black/10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {passwords.length} {t('entries')}
                  </span>
                )}
              </p>
            </div>
            {categoryFilter === 'Trash' ? (
              <button 
                onClick={async () => {
                  if (confirm(t('confirmEmptyTrash'))) {
                    await vaultService.emptyTrash();
                    toast.success(t('trashEmptied'));
                    loadPasswords();
                  }
                }}
                disabled={passwords.length === 0}
                className="flex items-center gap-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> {t('emptyTrash')}
              </button>
            ) : !isAdding && (
              <button 
                onClick={() => {
                  setNewEntry({ ...newEntry, category: categoryFilter && categoryFilter !== 'Trash' && !categoryFilter.startsWith('#') ? categoryFilter : 'General' });
                  setIsAdding(true);
                }}
                className="flex items-center gap-2 bg-[var(--color-deep-navy)] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:bg-opacity-90 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" /> {t('newEntry')}
              </button>
            )}
          </div>

          <div 
            className="flex flex-col gap-3 mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
            onScroll={(e) => {
              const bottom = Math.abs(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight) < 50;
              if (bottom && visibleCount < passwords.length) {
                setVisibleCount(prev => prev + 20);
              }
            }}
          >
            
             {/* New Entry Form */}
            {isAdding && (
               <form onSubmit={handleCreateEntry} className="flex flex-col gap-4 p-5 rounded-2xl bg-white/70 border border-[var(--color-sage-green)]/30 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                 <div className="flex justify-between items-center mb-1">
                   <h3 className="font-semibold text-[var(--color-deep-navy)]">{t('createZeroKnowledgeEntry')}</h3>
                   <button 
                     type="button" 
                     onClick={() => {
                       setIsAdding(false);
                       setNewEntry({ title: '', username: '', pass: '', category: 'General', tags: [] });
                       setTagInput('');
                       setNewAttachments([]);
                     }} 
                     className="p-1 rounded-md hover:bg-black/5 text-gray-500"
                   >
                     <X className="w-4 h-4" />
                   </button>
                 </div>
                 
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="text" placeholder={newEntry.category === 'Cards' ? t('placeholderCardTitle') : newEntry.category === 'Identities' ? t('placeholderIdentityTitle') : newEntry.category === 'Notes' ? t('placeholderNoteTitle') : newEntry.category === 'WiFi' ? t('placeholderWifiTitle') : t('titlePlaceholder')} value={newEntry.title} onChange={e => setNewEntry({...newEntry, title: e.target.value})} className="col-span-1 rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner" />
                    <select value={newEntry.category} onChange={e => setNewEntry({...newEntry, category: e.target.value})} className="col-span-1 rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner">
                      <option value="General">{t('general')}</option>
                      <option value="Cards">{t('cards')}</option>
                      <option value="Identities">{t('identities')}</option>
                      <option value="Notes">{t('notes')}</option>
                      <option value="WiFi">{t('wifi')}</option>
                    </select>

                    {newEntry.category !== 'Notes' && (
                      <input type="text" placeholder={newEntry.category === 'Cards' ? t('placeholderCardUser') : newEntry.category === 'Identities' ? t('placeholderIdentityUser') : newEntry.category === 'WiFi' ? t('placeholderWifiUser') : t('usernameEmailPlaceholder')} value={newEntry.username} onChange={e => setNewEntry({...newEntry, username: e.target.value})} className="col-span-2 rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner" />
                    )}

                    {newEntry.category !== 'Notes' && (
                      <input type="text" placeholder={newEntry.category === 'Cards' ? t('placeholderCardUrl') : newEntry.category === 'Identities' ? t('placeholderIdentityUrl') : newEntry.category === 'WiFi' ? t('placeholderWifiUrl') : t('placeholderUrl')} value={newEntry.website || ''} onChange={e => setNewEntry({...newEntry, website: e.target.value})} className="col-span-2 rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner" />
                    )}

                    <div className="col-span-2 relative flex items-center">
                      {newEntry.category === 'Notes' ? (
                        <textarea required placeholder={t('placeholderNotePass')} value={newEntry.pass} onChange={e => setNewEntry({...newEntry, pass: e.target.value})} className="w-full rounded-lg bg-white/50 py-2.5 px-3 h-32 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner resize-none overflow-y-auto" />
                      ) : (
                        <input required type={showPassword ? "text" : "password"} placeholder={newEntry.category === 'Cards' ? t('placeholderCardPass') : newEntry.category === 'Identities' ? t('placeholderIdentityPass') : newEntry.category === 'WiFi' ? t('placeholderWifiPass') : t('securePassword')} value={newEntry.pass} onChange={e => setNewEntry({...newEntry, pass: e.target.value})} className="w-full rounded-lg bg-white/50 py-2.5 pl-3 pr-20 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 focus:ring-2 focus:ring-[var(--color-sage-green)]/20 shadow-inner pass-font" />
                      )}
                      
                      {newEntry.category !== 'Notes' && (
                        <div className="absolute right-2 flex items-center gap-1">
                          <button type="button" onClick={generateSecurePassword} className="p-1.5 rounded-md text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] hover:bg-white/80 transition-colors" title={t('generateSecurePasswordBtn')}>
                            <Wand2 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1.5 rounded-md text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] hover:bg-white/80 transition-colors" title={showPassword ? t('hidePassword') : t('showPassword')}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Tags Input */}
                    <div className="col-span-2 flex flex-col gap-2">
                       <input 
                         type="text" 
                         placeholder={t('addTagPlaceholder')}
                         value={tagInput}
                         onChange={e => setTagInput(e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' && tagInput.trim()) {
                             e.preventDefault();
                             if (!newEntry.tags?.includes(tagInput.trim())) {
                               setNewEntry(prev => ({...prev, tags: [...(prev.tags || []), tagInput.trim()]}));
                             }
                             setTagInput('');
                           }
                         }}
                         className="rounded-lg bg-white/50 py-2.5 px-3 text-sm font-medium outline-none border border-white/50 focus:border-[var(--color-sage-green)]/50 shadow-inner" 
                       />
                       {newEntry.tags && newEntry.tags.length > 0 && (
                         <div className="flex flex-wrap gap-2 mt-1">
                           {newEntry.tags.map(t => (
                             <span key={t} className="bg-[var(--color-sage-green)]/10 border border-[var(--color-sage-green)]/30 text-[var(--color-sage-green)] px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                               <Tag className="w-3 h-3" /> {t}
                               <button type="button" onClick={() => setNewEntry(prev => ({...prev, tags: prev.tags?.filter(tag => tag !== t)}))} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                             </span>
                           ))}
                         </div>
                       )}
                    </div>
                    
                    {/* Attachment Upload (50MB Limit) */}
                    <div className="col-span-2 mt-1">
                      <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2">
                           <input type="file" id="aegis-file-upload" multiple className="hidden" onChange={handleFileSelect} />
                           <label htmlFor="aegis-file-upload" className="cursor-pointer text-xs flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] hover:bg-[var(--color-sage-green)]/20 transition-all font-bold rounded-lg border border-[var(--color-sage-green)]/30">
                              <Paperclip className="w-3.5 h-3.5" /> {t('uploadAttachment')}
                           </label>
                         </div>
                         {newAttachments.length > 0 && (
                           <div className="flex flex-col gap-1.5 mt-2 p-2 bg-yellow-50/50 rounded-lg border border-yellow-500/20 shadow-inner">
                             <div className="text-[10px] uppercase font-bold text-yellow-600 tracking-wider flex items-center gap-1"><Lock className="w-3 h-3" /> {t('encryptedQueue')}</div>
                             <div className="flex flex-wrap gap-2">
                               {newAttachments.map((file, i) => (
                                 <div key={i} className="text-xs flex items-center gap-2 bg-white px-2 py-1 rounded shadow-sm border border-black/5">
                                    <FileUp className="w-3 h-3 text-blue-500" />
                                    <span className="font-medium text-gray-700 max-w-[120px] truncate">{file.name}</span>
                                    <span className="text-gray-400 text-[10px]">{(file.size / (1024 * 1024)).toFixed(1)}MB</span>
                                    <button type="button" onClick={() => setNewAttachments(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500 ml-1">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                 </div>
                               ))}
                             </div>
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                 
                  <div className="flex justify-end mt-2">
                   <button type="submit" className="flex items-center gap-2 bg-[var(--color-sage-green)] hover:brightness-90 text-[var(--color-deep-navy)] px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
                     <ShieldCheck className="w-4 h-4" /> {t('encryptSave')}
                   </button>
                 </div>
               </form>
            )}

            {isDecrypting ? (
              // Shimmer Skeleton State for SQLCipher PBKDF2 Processing
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/30 border border-white/20 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-black/5" />
                    <div className="flex flex-col gap-2">
                       <div className="h-4 w-32 bg-black/10 rounded" />
                       <div className="h-3 w-24 bg-black/5 rounded" />
                    </div>
                  </div>
                  <div className="h-10 w-24 bg-black/5 rounded-xl" />
                </div>
              ))
            ) : passwords.length === 0 ? (
              <div className="text-center py-10 opacity-50 text-sm italic">{categoryFilter === 'Trash' ? t('noTrashItems') : t('noPasswordsFound')}</div>
            ) : (
             passwords.slice(0, visibleCount).map((p) => {
              const isCopied = copiedId === p.id;
              return (
                <div key={p.id} className="flex items-center justify-between p-5 md:p-6 rounded-[1.25rem] bg-white/50 border border-white/30 hover:bg-white/80 hover:shadow-sm transition-all relative overflow-hidden group/item">
                  <div className="flex items-center gap-5 relative z-10 w-full overflow-hidden">
                    <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm">
                      <div className="scale-110 md:scale-125">
                        {getCategoryIcon(p.category)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-[var(--color-deep-navy)] truncate flex items-center gap-2">
                        {p.title}
                        {(p.pwned_count || 0) > 0 && (
                          <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black" title={t('pwnedWarning')}>
                            {t('pwned')}
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mt-1 text-sm">
                        <p className="opacity-60 font-[var(--font-geist-mono)] tracking-tight truncate flex items-center gap-2">
                           {p.username}
                           {p.tags && p.tags.length > 0 && (
                             <span className="hidden xl:flex items-center gap-1 opacity-70 border border-black/10 px-1.5 py-0.5 rounded text-[10px] ml-2">
                               <Tag className="w-2.5 h-2.5" /> {p.tags[0]} {p.tags.length > 1 && `+${p.tags.length - 1}`}
                             </span>
                           )}
                        </p>
                        <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />
                        <div className="flex items-center gap-2">
                           <span className={`pass-font text-sm rounded-md select-all transition-all duration-300 ${visiblePasswords.has(p.id) ? "bg-[rgba(255,255,255,0.6)] backdrop-blur-[20px] px-2 py-1 border border-white/50 text-[var(--color-deep-navy)]" : "tracking-[0.25em] opacity-40 select-none mt-1"}`}>
                             {visiblePasswords.has(p.id) ? p.pass : "••••••••"}
                           </span>
                           <button onClick={() => toggleVisibility(p.id)} className="p-1.5 rounded-md hover:bg-black/5 text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] transition-all" title={visiblePasswords.has(p.id) ? "Hide Password" : "Show liquid password"}>
                              {visiblePasswords.has(p.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                           </button>
                        </div>
                      </div>
                      
                      {/* Attachments Section */}
                      {p.attachments && p.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {p.attachments.map(att => (
                            <button
                              key={att.id}
                              onClick={() => handleDownloadAttachment(att.id, att.name)}
                              className="group flex items-center gap-1.5 bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] border border-[var(--color-sage-green)]/30 hover:bg-[var(--color-sage-green)]/20 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-sm transition-all relative overflow-hidden"
                              title={`Download ${att.name} (${(att.size / (1024 * 1024)).toFixed(2)}MB)`}
                            >
                              <Paperclip className="w-3 h-3 group-hover:scale-110 transition-transform" />
                              <span className="max-w-[150px] truncate">{att.name}</span>
                              <DownloadCloud className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password & Actions */}
                  <div className="flex items-center gap-8 relative z-10 ml-4 shrink-0">
                    <div className="hidden lg:flex items-center gap-3">
                      <div className="w-24 h-2 bg-black/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-sage-green)]" style={{ width: `${p.strength}%` }} />
                      </div>
                      <span className="text-[11px] uppercase font-bold text-[var(--color-sage-green)] opacity-80">{t('strong')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                       {/* Magic UI Glow effect & Micro Confetti on copy button */}
                       <div className="relative flex items-center gap-2">
                         {p && ((!p.pass || p.pass.length < 8) || (p.updated_at && (Date.now() - new Date(p.updated_at).getTime() > 1000 * 60 * 60 * 24 * 365)) || (p.pwned_count || 0) > 0) && (
                           <button 
                             onClick={() => {
                               setNewEntry({ ...p });
                               setIsAdding(true);
                               toast.info(t('updateNow'));
                             }}
                             className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-tighter hover:bg-red-500 hover:text-white transition-all animate-pulse"
                           >
                             {t('updateNow')}
                           </button>
                         )}
                         <button
                           onClick={() => {
                             setNewEntry({ ...p, pass: p.pass || '' });
                             setIsAdding(true);
                           }}
                           className="p-3 rounded-xl bg-white/60 hover:bg-white hover:shadow-md transition-all flex items-center justify-center text-[var(--color-deep-navy)]/70 hover:text-[var(--color-sage-green)]"
                           title={t('editEntry', 'Edit')}
                         >
                           <Edit2 className="w-5 h-5" />
                         </button>
                         <div className="relative">
                           <button
                             onClick={() => handleCopyItem(p.id, p.pass || '')}
                             className={`relative z-10 p-3 rounded-xl transition-all flex items-center justify-center ${
                               isCopied 
                                 ? 'bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] shadow-[0_0_15px_rgba(135,159,132,0.4)] scale-110' 
                                 : 'bg-white/60 hover:bg-white hover:shadow-md'
                             }`}
                           >
                             {isCopied ? <Check className="w-5 h-5 text-[var(--color-sage-green)] drop-shadow-[0_0_8px_rgba(135,159,132,0.8)]" /> : <Copy className="w-5 h-5 opacity-70" />}
                           </button>
                           {/* Confetti Particles */}
                           {isCopied && (
                              <div className="absolute inset-0 pointer-events-none flex justify-center items-center">
                                {[...Array(6)].map((_, i) => (
                                  <div key={i} className="absolute w-2 h-2 bg-[var(--color-sage-green)] rounded-full animate-float opacity-0" style={{ transform: `rotate(${i * 60}deg)`, animationDelay: `${i * 0.05}s` }} />
                                ))}
                              </div>
                           )}
                         </div>
                         
                         {categoryFilter === 'Trash' ? (
                           <>
                             <button
                               onClick={async () => {
                                 await vaultService.restoreFromTrash(p.id);
                                 toast.success(t('itemRestored'));
                                 loadPasswords();
                               }}
                               className="p-3 rounded-xl bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] hover:bg-[var(--color-sage-green)] hover:text-white transition-all shadow-sm"
                               title={t('restore')}
                             >
                               <FileUp className="w-5 h-5" />
                             </button>
                             <button
                               onClick={async () => {
                                 if (confirm(t('confirmDeleteCard'))) {
                                   await vaultService.deletePermanently(p.id);
                                   toast.success(t('itemDeleted'));
                                   loadPasswords();
                                 }
                               }}
                               className="p-3 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                               title={t('deletePermanently')}
                             >
                               <X className="w-5 h-5" />
                             </button>
                           </>
                         ) : (
                           <button
                             onClick={async () => {
                               await vaultService.moveToTrash(p.id);
                               toast.success(t('itemMovedToTrash'));
                               loadPasswords();
                             }}
                             className="p-3 rounded-xl bg-white/60 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center text-[var(--color-deep-navy)]/70"
                             title={t('moveToTrash')}
                           >
                             <Trash2 className="w-5 h-5" />
                           </button>
                         )}
                       </div>
                    </div>
                  </div>
                </div>
              )
             })
            )}
          </div>
        </GlowCard>

        {/* Liquid Glass Right Sidebar (Col Span 4 or 3) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6 xl:gap-8">
          
          {/* Security Audit / Watchtower Widget */}
          <GlowCard className="bg-[rgba(255,255,255,0.25)] backdrop-blur-[40px] -webkit-backdrop-filter:blur(40px) border border-white/40 rounded-3xl p-6 relative">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
             <div className="flex items-center gap-2 mb-4">
               <ShieldAlert className="w-4 h-4 text-[var(--color-deep-navy)]/60" />
               <h3 className="text-sm font-semibold opacity-60 uppercase tracking-widest">{t('watchtowerTitle')}</h3>
             </div>
             
             <div className="flex flex-col gap-3">
               <div className="flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/20">
                 <div className="flex items-center gap-2">
                   <AlertTriangle className={`w-4 h-4 ${watchtower.weak > 0 ? "text-red-500" : "text-[var(--color-sage-green)]"}`} />
                   <span className="text-sm font-semibold">{t('weakPasswords')}</span>
                 </div>
                 <span className={`font-bold ${watchtower.weak > 0 ? "text-red-500" : "text-black/50"}`}>{watchtower.weak}</span>
               </div>

               <div className="flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/20">
                 <div className="flex items-center gap-2">
                   <KeyRound className={`w-4 h-4 ${watchtower.reused > 0 ? "text-amber-500" : "text-[var(--color-sage-green)]"}`} />
                   <span className="text-sm font-semibold">{t('reusedPasswords')}</span>
                 </div>
                 <span className={`font-bold ${watchtower.reused > 0 ? "text-amber-500" : "text-black/50"}`}>{watchtower.reused}</span>
               </div>

               <div className="flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/20">
                 <div className="flex items-center gap-2">
                   <Clock4 className={`w-4 h-4 ${watchtower.old > 0 ? "text-blue-500" : "text-[var(--color-sage-green)]"}`} />
                   <span className="text-sm font-semibold">{t('oldPasswords')}</span>
                 </div>
                 <span className={`font-bold ${watchtower.old > 0 ? "text-blue-500" : "text-black/50"}`}>{watchtower.old}</span>
               </div>
               <div className="flex justify-between items-center bg-white/40 p-3 rounded-xl border border-white/20">
                 <div className="flex items-center gap-2">
                   <ShieldAlert className={`w-4 h-4 ${watchtower.pwned > 0 ? "text-red-500" : "text-[var(--color-sage-green)]"}`} />
                   <span className="text-sm font-semibold">{t('pwnedPasswords')}</span>
                 </div>
                 <span className={`font-bold ${watchtower.pwned > 0 ? "text-red-500" : "text-black/50"}`}>{watchtower.pwned}</span>
               </div>
             </div>

             <button 
               onClick={handleScanPwned}
               disabled={isPwnedScanning || passwords.length === 0}
               className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500/10 to-amber-500/10 hover:from-red-500/20 hover:to-amber-500/20 border border-red-500/20 text-red-600 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all relative overflow-hidden disabled:opacity-50"
             >
               {isPwnedScanning ? (
                 <>
                   <div className="absolute left-0 top-0 bottom-0 bg-red-500/20 transition-all duration-300" style={{ width: `${pwnedScanProgress}%` }} />
                   <span className="relative z-10 animate-pulse">{t('scanningProgress', { progress: pwnedScanProgress })}</span>
                 </>
               ) : (
                 <>
                   <Globe className="w-4 h-4" /> {t('hibpScan')}
                 </>
               )}
             </button>
          </GlowCard>

          {/* Categories */}
          <GlowCard className="bg-[rgba(255,255,255,0.25)] backdrop-blur-[40px] -webkit-backdrop-filter:blur(40px) border border-white/40 rounded-3xl p-6 flex-1 flex flex-col">
            <h3 className="text-sm font-semibold opacity-60 uppercase tracking-widest mb-4">{t('categoriesTitle')}</h3>
            <div className="flex flex-col gap-2">
               <button onClick={() => setCategoryFilter("")} className={`flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition-colors w-full text-left ${categoryFilter === "" ? 'bg-white/80 shadow-sm border border-white/40' : 'bg-transparent'}`}>
                 <div className="flex items-center gap-3">
                   <Hash className="w-5 h-5 text-gray-500" />
                   <span className="font-medium text-sm">{t('allVaults')}</span>
                 </div>
               </button>
               {['General', 'Cards', 'Identities', 'Notes', 'WiFi'].map(cat => (
                 <button key={cat} onClick={() => setCategoryFilter(cat)} className={`flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition-colors w-full text-left ${categoryFilter === cat ? 'bg-white/80 shadow-sm border border-white/40' : 'bg-transparent'}`}>
                   <div className="flex items-center gap-3">
                     {getCategoryIcon(cat)}
                     <span className="font-medium text-sm">{t(cat.toLowerCase())}</span>
                   </div>
                   <ChevronRight className="w-4 h-4 opacity-30" />
                 </button>
               ))}
               <div className="h-px bg-black/5 my-1 w-full" />
               <button onClick={() => setCategoryFilter("Trash")} className={`flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition-colors w-full text-left ${categoryFilter === 'Trash' ? 'bg-white/80 shadow-sm border border-white/40 text-red-600' : 'bg-transparent text-gray-500'}`}>
                 <div className="flex items-center gap-3">
                   <Trash2 className="w-5 h-5" />
                   <span className="font-medium text-sm">{t('trash')}</span>
                 </div>
                 <ChevronRight className="w-4 h-4 opacity-30" />
               </button>

               {/* Tags List */}
               {uniqueTags.length > 0 && (
                 <>
                   <div className="h-px bg-black/5 my-2 w-full" />
                   <div className="flex flex-wrap gap-2">
                     {uniqueTags.map(tag => (
                       <button 
                         key={tag} 
                         onClick={() => setCategoryFilter(categoryFilter === `#${tag}` ? "" : `#${tag}`)}
                         className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${categoryFilter === `#${tag}` ? 'bg-[var(--color-sage-green)] text-[var(--color-deep-navy)] border-transparent shadow-[0_0_10px_rgba(114,136,111,0.4)]' : 'bg-white/40 hover:bg-white border-black/10 text-[var(--color-deep-navy)]'}`}
                       >
                         <Tag className="w-3 h-3 opacity-70" /> {tag}
                       </button>
                     ))}
                   </div>
                 </>
               )}
            </div>
          </GlowCard>

          {/* Offline PWA & Emergency Kit */}
          <GlowCard className="bg-gradient-to-br from-[rgba(255,255,255,0.4)] to-[rgba(255,255,255,0.1)] backdrop-blur-[40px] border border-[var(--color-sage-green)]/30 rounded-3xl shadow-lg p-6">
            <div className="absolute inset-0 bg-[var(--color-sage-green)] opacity-0 group-hover/glow:opacity-5 transition-opacity rounded-3xl pointer-events-none" />
            <div className="flex flex-col items-center text-center gap-3 relative z-10">
              <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center shadow-inner">
                 <ShieldCheck className="w-6 h-6 text-[var(--color-sage-green)]" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">{t('offlinePwaActive')}</h4>
                <p className="text-xs opacity-60 mt-1">{t('airgappedSync')}</p>
              </div>
              
              <button 
                onClick={downloadEmergencyKit}
                disabled={showEmergencyKit}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-white/60 hover:bg-white text-[var(--color-deep-navy)] outline outline-1 outline-black/5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {showEmergencyKit ? (
                  <span className="animate-pulse">{t('generatingPdf')}</span>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> {t('emergencyKitButton')}
                  </>
                )}
              </button>
            </div>
          </GlowCard>

        </div>
      </main>

      {/* Settings & Data Management Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[var(--color-deep-navy)]/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <GlowCard className="bg-[rgba(255,255,255,0.9)] max-w-3xl w-full max-h-[90vh] overflow-y-auto backdrop-blur-[40px] border border-white/40 rounded-[2rem] p-8 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 slide-in-from-bottom-10 custom-scrollbar">
             <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-gray-500 transition-colors">
               <X className="w-5 h-5" />
             </button>
             
             <div className="flex items-center gap-4 mb-8">
               <div className="w-14 h-14 bg-gradient-to-br from-[var(--color-sage-green)] to-[#6b8268] text-white rounded-2xl flex items-center justify-center shadow-lg">
                 <Settings className="w-7 h-7" />
               </div>
               <div>
                 <h2 className="text-3xl font-bold tracking-tight text-[var(--color-deep-navy)]">{t('settingsTitle')}</h2>
                 <p className="opacity-60 text-sm mt-0.5">{t('settingsDesc')}</p>
               </div>
             </div>

             <div className="space-y-6 flex flex-col">

               {/* Advanced Generator Section */}
               <div className="border border-[var(--color-sage-green)]/30 bg-gradient-to-br from-[var(--color-sage-green)]/5 to-transparent rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col gap-6">
                 {/* Entropy Wave Visualizer */}
                 <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20 pointer-events-none overflow-hidden">
                   <div className="w-[200%] h-full flex" style={{ transform: `translateX(-${(genEntropy % 50)}%)` }}>
                     <svg className={`w-full h-full fill-[var(--color-sage-green)] ${genEntropy > 60 ? 'animate-wave-fast' : 'animate-wave'}`} viewBox="0 0 1440 320" preserveAspectRatio="none">
                        <path d="M0,160L40,170.7C80,181,160,203,240,192C320,181,400,139,480,133.3C560,128,640,160,720,181.3C800,203,880,213,960,197.3C1040,181,1120,139,1200,112C1280,85,1360,75,1400,69.3L1440,64L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"></path>
                     </svg>
                   </div>
                 </div>

                 <div className="flex items-center justify-between relative z-10">
                   <div className="flex items-center gap-2">
                     <Wand2 className="w-5 h-5 text-[var(--color-sage-green)]" />
                     <h3 className="text-lg font-semibold tracking-tight">{t('advancedGenTitle')}</h3>
                   </div>
                   <span className={`text-xs font-bold px-3 py-1 rounded-md ${genEntropy > 80 ? 'bg-[var(--color-sage-green)]/20 text-[var(--color-sage-green)]' : 'bg-red-500/10 text-red-500'}`}>
                      {t('entropyLabel', { entropy: genEntropy })}
                   </span>
                 </div>
                 
                 <div className="flex items-center justify-between bg-white/70 rounded-xl p-4 border border-[var(--color-sage-green)]/20 shadow-inner relative z-10">
                     <span className="pass-font text-lg font-semibold text-[var(--color-deep-navy)] tracking-widest truncate mr-3 select-all">
                       {standalonePassword}
                     </span>
                     <div className="flex gap-2">
                       <button onClick={handleGenerateStandalone} className="p-2.5 rounded-lg bg-white/80 hover:bg-white text-[var(--color-deep-navy)] hover:text-[var(--color-sage-green)] transition-all shadow active:scale-95" title={t('regenerateBtn')}>
                         <Wand2 className="w-5 h-5" />
                       </button>
                       <button onClick={copyStandalonePassword} className={`p-2.5 rounded-lg transition-all shadow ${isStandaloneCopied ? 'bg-[var(--color-sage-green)] text-white scale-110' : 'bg-white/80 hover:bg-white hover:text-[var(--color-sage-green)]'}`} title={t('copyPasswordBtn')}>
                         {isStandaloneCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                       </button>
                     </div>
                 </div>

                 {/* Generator Controls */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <div className="flex flex-col gap-2">
                       <label className="text-sm font-semibold opacity-70">{t('lengthLabel')}: <span className="text-[var(--color-sage-green)]">{genLength}</span></label>
                       <input type="range" min="8" max="64" value={genLength} onChange={(e) => setGenLength(parseInt(e.target.value))} className="w-full accent-[var(--color-sage-green)]" />
                    </div>
                    <div className="flex items-center justify-between md:justify-center gap-3 bg-white/40 p-3 rounded-xl border border-white">
                       <label className="text-sm font-semibold opacity-70">{t('numbersLabel')}</label>
                       <input type="checkbox" checked={genNumbers} onChange={(e) => setGenNumbers(e.target.checked)} className="accent-[var(--color-sage-green)] w-5 h-5 rounded cursor-pointer" />
                    </div>
                    <div className="flex items-center justify-between md:justify-center gap-3 bg-white/40 p-3 rounded-xl border border-white">
                       <label className="text-sm font-semibold opacity-70">{t('symbolsLabel')}</label>
                       <input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} className="accent-[var(--color-sage-green)] w-5 h-5 rounded cursor-pointer" />
                    </div>
                 </div>
               </div>

               {/* Watchtower Security Audit in Settings */}
               <div className="border border-red-500/20 bg-red-50/20 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <ShieldAlert className="w-5 h-5 text-red-500" />
                       <h3 className="text-lg font-semibold tracking-tight text-red-700">{t('watchtowerIssuesTitle')}</h3>
                    </div>
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                       {t('issuesFoundLabel', { count: watchtower.weak + watchtower.pwned })}
                    </span>
                  </div>
                  <p className="text-xs opacity-70 mb-4 text-red-900/80">{t('watchtowerIssuesDesc')}</p>
                  
                  <button 
                     onClick={() => setShowWeakPasswordsPopup(true)}
                     disabled={watchtower.weak + watchtower.pwned === 0}
                     className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                  >
                     {t('viewIssuesBtn')}
                  </button>
               </div>

               {/* Security & Sessions Section */}
               <div className="border border-black/5 bg-white/60 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <ShieldCheck className="w-5 h-5 text-[var(--color-sage-green)]" />
                    <h3 className="text-lg font-semibold tracking-tight">{t('securitySessionTitle')}</h3>
                  </div>

                  <div className="bg-white/80 p-5 rounded-2xl border border-white flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-inner mb-4">
                     <div>
                       <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t('autoLockTimerTitle')}</h4>
                       <p className="text-xs opacity-70 leading-relaxed max-w-md">{t('autoLockTimerDesc')}</p>
                     </div>
                     <select 
                       value={autoLockTime} 
                       onChange={e => setAutoLockTime(Number(e.target.value))}
                       className="rounded-xl border border-[var(--color-sage-green)]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-deep-navy)] shadow-sm outline-none focus:ring-2 focus:ring-[var(--color-sage-green)]/40 min-w-[140px]"
                     >
                        <option value={1}>{t('lockTime1')}</option>
                        <option value={2}>{t('lockTime2')}</option>
                        <option value={5}>{t('lockTime5')}</option>
                        <option value={30}>{t('lockTime30')}</option>
                        <option value={0}>{t('lockTime0')}</option>
                     </select>
                  </div>

                  {/* Donation Section in Settings */}
                  <div className="mt-4 p-6 bg-gradient-to-br from-[var(--color-sage-green)]/10 to-transparent rounded-3xl border border-[var(--color-sage-green)]/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[var(--color-sage-green)]">
                         <Heart className="w-6 h-6 fill-current" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--color-deep-navy)]">{t('donateTitle')}</h4>
                        <p className="text-xs opacity-70 max-w-sm">{t('donateDesc')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowDonation(true)}
                      className="px-6 py-2.5 bg-[var(--color-deep-navy)] text-white rounded-xl text-sm font-bold shadow-md hover:bg-opacity-90 transition-all active:scale-95 whitespace-nowrap"
                    >
                      {t('donateBtn')}
                    </button>
                  </div>
                </div>

                {/* Secret Menu Section - Duress Mode */}
                {showSecretMenu && (
                   <div className="border-2 border-red-500/20 bg-red-50/20 rounded-3xl p-6 shadow-sm animate-in zoom-in-95 duration-500">
                      <div className="flex items-center gap-2 mb-6">
                        <Lock className="w-5 h-5 text-red-600" />
                        <h3 className="text-lg font-extrabold tracking-tighter text-red-600 uppercase">{t('secretMenuTitle')}</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-white/80 p-5 rounded-2xl border border-red-100 shadow-inner">
                            <h4 className="font-bold text-sm mb-2 text-[var(--color-deep-navy)]">{t('hiddenVaultTitle')}</h4>
                            <p className="text-xs opacity-70 mb-4">{t('hiddenVaultDesc')}</p>
                            <input 
                              type="password" 
                              placeholder={t('duressPinPlaceholder')}
                              value={duressPin}
                              onChange={e => setDuressPin(e.target.value)}
                              className="w-full rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-red-400/20"
                            />
                         </div>
                         <div className="bg-white/80 p-5 rounded-2xl border border-red-100 shadow-inner">
                            <h4 className="font-bold text-sm mb-2 text-[var(--color-deep-navy)]">{t('silentWipeTitle')}</h4>
                            <p className="text-xs opacity-70 mb-4">{t('silentWipeDesc')}</p>
                            <input 
                              type="password" 
                              placeholder={t('killPinPlaceholder')}
                              value={killPin}
                              onChange={e => setKillPin(e.target.value)}
                              className="w-full rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-red-400/20"
                            />
                         </div>
                      </div>
                      <button 
                        onClick={saveSecretSettings}
                        className="mt-6 w-full py-3 rounded-xl bg-red-600 text-white font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95"
                      >
                        {t('saveSecretSettingsBtn')}
                      </button>
                   </div>
                )}

                {/* Data Management Section */}
                <div className="border border-black/5 bg-white/60 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <Database className="w-5 h-5 text-[var(--color-sage-green)]" />
                    <h3 className="text-lg font-semibold tracking-tight">{t('dataManagementTitle')}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Export */}
                    <div className="bg-white/80 p-5 rounded-2xl border border-white flex flex-col justify-between shadow-inner">
                       <div>
                         <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t('exportTitle')}</h4>
                         <p className="text-xs opacity-70 leading-relaxed mb-4">{t('exportDesc')}</p>
                       </div>
                       <div className="flex flex-col gap-2">
                         <button onClick={() => handleExport('vault')} className="w-full justify-center flex items-center gap-2 py-2 rounded-xl bg-[var(--color-deep-navy)] text-white text-xs font-semibold hover:bg-opacity-90 transition-all active:scale-95 shadow-md">
                           <FileDown className="w-4 h-4" /> {t('exportVaultBtn')}
                         </button>
                         <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleExport('csv')} className="w-full justify-center flex items-center gap-2 py-2 rounded-xl bg-white/60 border border-black/10 text-[var(--color-deep-navy)] text-xs font-semibold hover:bg-white transition-all active:scale-95 shadow-sm">
                              {t('exportCsvBtn')} 
                            </button>
                            <button onClick={() => handleExport('json')} className="w-full justify-center flex items-center gap-2 py-2 rounded-xl bg-white/60 border border-black/10 text-[var(--color-deep-navy)] text-xs font-semibold hover:bg-white transition-all active:scale-95 shadow-sm">
                              {t('exportJsonBtn')}
                            </button>
                         </div>
                       </div>
                    </div>

                     {/* Import */}
                    <div className="bg-white/80 p-5 rounded-2xl border border-white flex flex-col justify-between shadow-inner">
                       <div>
                         <h4 className="font-semibold text-sm mb-1 text-[var(--color-deep-navy)]">{t('importWizardTitle')}</h4>
                         <p className="text-xs opacity-70 leading-relaxed mb-4">{t('importWizardDesc')}</p>
                       </div>
                       
                       {importProgress && (
                         <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-top-1">
                           <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--color-deep-navy)]/60">
                             <span>{importProgress.status === 'parsing' ? t('importAnalyzing') : importProgress.status === 'importing' ? t('importEncrypting') : t('importCompleted')}</span>
                             <span>{Math.round((importProgress.processed / (importProgress.totalAnalyzed || 1)) * 100)}%</span>
                           </div>
                           <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-[var(--color-sage-green)] transition-all duration-300"
                               style={{ width: `${(importProgress.processed / (importProgress.totalAnalyzed || 1)) * 100}%` }}
                             />
                           </div>
                         </div>
                       )}

                       <label className={`cursor-pointer w-full justify-center flex items-center gap-2 py-2.5 rounded-xl border border-[var(--color-sage-green)]/30 bg-[var(--color-sage-green)]/10 text-[var(--color-sage-green)] text-sm font-semibold hover:bg-[var(--color-sage-green)] hover:text-white transition-all active:scale-95 shadow-sm ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                         <FileUp className="w-4 h-4" /> 
                         {isImporting ? t('importProcessing') : t('importBtn')}
                         <input type="file" accept=".csv,.json" className="hidden" onChange={handleImport} />
                       </label>
                    </div>
                  </div>

                  {/* P2P Device Sync Area */}
                  {syncMode === 'export' ? (
                     <div className="mt-8">
                        <QRExporter data={syncData} onCancel={() => setSyncMode('none')} />
                     </div>
                  ) : syncMode === 'import' ? (
                     <div className="mt-8">
                        <QRScanner onScanSuccess={handleSyncImportSuccess} onCancel={() => setSyncMode('none')} />
                     </div>
                  ) : (
                     <div className="mt-6 bg-[var(--color-sage-green)]/10 p-6 rounded-3xl border border-[var(--color-sage-green)]/20 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
                         <div>
                          <h4 className="font-bold text-[var(--color-deep-navy)] text-base mb-1">{t('qrSyncTitle')}</h4>
                          <p className="text-xs opacity-80 max-w-sm">{t('qrSyncDesc')}</p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                           <button onClick={handleSyncExportInit} className="px-5 py-2.5 bg-white border border-[var(--color-sage-green)]/40 rounded-xl text-[var(--color-deep-navy)] font-bold text-sm hover:bg-[var(--color-sage-green)] hover:text-white transition-all shadow-sm active:scale-95">
                             {t('qrExportBtn')}
                           </button>
                           <button onClick={() => setSyncMode('import')} className="px-5 py-2.5 bg-[var(--color-deep-navy)] rounded-xl text-white font-bold text-sm hover:bg-opacity-90 transition-all shadow-md active:scale-95">
                             {t('qrImportBtn')}
                           </button>
                        </div>
                      </div>
                  )}

                  {/* Validation Report Card */}
                  {importReport && (
                    <div className="mt-5 p-5 rounded-2xl border border-amber-200/50 bg-amber-50/50 animate-in fade-in zoom-in-95 duration-500 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0">
                           <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-800">{t('importReportTitle')}</h4>
                          <p className="text-xs text-gray-500 mt-1 mb-2">{t('importReportDesc')}</p>
                          
                          <div className="space-y-2 mt-3 font-[var(--font-geist-mono)] text-xs">
                            <div className="flex justify-between items-center py-1.5 border-b border-black/5">
                               <span className="text-gray-600">{t('totalValidEntries')}</span>
                               <span className="font-bold text-[var(--color-sage-green)]">{importReport.total}</span>
                            </div>
                            <div className="flex justify-between items-center py-1.5 border-b border-black/5">
                               <span className="text-gray-600">{t('weakPasswordsDetected')}</span>
                               <span 
                                 className={`font-bold ${importReport.weak > 0 ? "text-red-500 cursor-pointer hover:underline" : "text-gray-400"}`}
                                 onClick={() => { if (importReport.weak > 0) setShowWeakPasswordsPopup(true); }}
                                 title={importReport.weak > 0 ? t('viewIssuesBtnHover') : ""}
                               >
                                 {importReport.weak}
                               </span>
                            </div>
                            <div className="flex justify-between items-center py-1.5">
                               <span className="text-gray-600">{t('missingProperties')}</span>
                               <span className={`font-bold ${importReport.missingFields > 0 ? "text-amber-500" : "text-gray-400"}`}>{importReport.missingFields}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

               </div>
             </div>

          </GlowCard>
        </div>
      )}

      {/* Weak Passwords Popup */}
      {showWeakPasswordsPopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[var(--color-deep-navy)]/40 backdrop-blur-sm" onClick={() => setShowWeakPasswordsPopup(false)} />
          <GlowCard className="bg-[rgba(255,255,255,0.95)] max-w-2xl w-full max-h-[80vh] overflow-y-auto backdrop-blur-[40px] border border-red-500/20 rounded-[2rem] p-6 relative z-10 shadow-2xl custom-scrollbar">
             <button onClick={() => setShowWeakPasswordsPopup(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 text-gray-500 transition-colors">
               <X className="w-5 h-5" />
             </button>
             
             <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-red-100/50 rounded-xl text-red-500">
                 <AlertTriangle className="w-6 h-6" />
               </div>
               <div>
                 <h2 className="text-xl font-bold tracking-tight text-[var(--color-deep-navy)]">{t('weakPasswordsReportTitle')}</h2>
                 <p className="opacity-60 text-xs mt-0.5">{t('weakPasswordsReportDesc')}</p>
               </div>
             </div>

             <div className="flex flex-col gap-3">
               {passwords.filter(p => !p.pass || p.pass.length < 8 || (p.pwned_count || 0) > 0).map(p => (
                 <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-black/5 shadow-sm hover:shadow-md transition-all group">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                       {getCategoryIcon(p.category)}
                     </div>
                     <div className="flex flex-col">
                       <div className="flex items-center gap-2">
                         <span className="font-semibold text-sm text-[var(--color-deep-navy)]">{p.title}</span>
                         {(p.pwned_count || 0) > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">Pwned</span>}
                       </div>
                       <span className="text-xs opacity-60 font-mono">{p.username}</span>
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="flex items-center gap-1">
                       <span className={`pass-font text-xs rounded-md select-all transition-all duration-300 ${visiblePasswords.has(p.id) ? "bg-black/5 px-2 py-1 text-[var(--color-deep-navy)]" : "tracking-[0.25em] opacity-40 select-none mt-1"}`}>
                         {visiblePasswords.has(p.id) ? p.pass : "••••••••"}
                       </span>
                       <button onClick={() => toggleVisibility(p.id)} className="p-1.5 rounded-md hover:bg-black/5 text-[var(--color-deep-navy)]/40 hover:text-[var(--color-sage-green)] transition-all">
                         {visiblePasswords.has(p.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                       </button>
                     </div>
                     <div className="w-px h-6 bg-black/10 mx-1" />
                     <button 
                       onClick={() => {
                         setNewEntry({ ...p, pass: '' });
                         setIsAdding(true);
                         setShowWeakPasswordsPopup(false);
                         setShowSettings(false);
                       }}
                       className="p-1.5 rounded-md hover:bg-black/5 text-gray-500 hover:text-[var(--color-sage-green)] transition-all"
                       title={t('editUpdatePassword')}
                     >
                       <Wand2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
               ))}
               {passwords.filter(p => (!p.pass || p.pass.length < 8) || (p.pwned_count || 0) > 0).length === 0 && (
                 <div className="text-center py-8 opacity-50 text-sm italic">{t('noWeakPasswords')}</div>
               )}
             </div>
          </GlowCard>
        </div>
      )}

      <DonationModal isOpen={showDonation} onClose={() => setShowDonation(false)} />
    </div>
  );
}
