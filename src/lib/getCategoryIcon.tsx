import { CreditCard, Globe, KeyRound, User, FileText, WalletCards, Wifi } from 'lucide-react';

/**
 * getCategoryIcon — Kasa kategorilerine göre ikon döndüren yardımcı fonksiyon.
 * Tüm bileşenler tarafından paylaşılır.
 */
export function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'Bank':
      return <CreditCard className="w-5 h-5 text-blue-500" />;
    case 'Social':
      return <Globe className="w-5 h-5 text-pink-500" />;
    case 'Cards':
      return <CreditCard className="w-5 h-5 text-blue-600" />;
    case 'Identities':
      return <User className="w-5 h-5 text-yellow-500" />;
    case 'Notes':
      return <FileText className="w-5 h-5 text-gray-600" />;
    case 'WiFi':
      return <Wifi className="w-5 h-5 text-green-500" />;
    case 'CryptoWallet':
      return <WalletCards className="w-5 h-5 text-emerald-500" />;
    default:
      return <KeyRound className="w-5 h-5 text-purple-500" />;
  }
}
