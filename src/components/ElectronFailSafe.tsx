import React, {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

type DiagnosticEvent = {
  at?: string;
  code?: string;
  message?: string;
  detail?: string;
};

type StartupDiagnostics = {
  success?: boolean;
  language?: string;
  summary?: {
    isPackaged?: boolean;
    appVersion?: string;
    startupDiagnosticMode?: boolean;
    nativeBridgeServerActive?: boolean;
    nativeBridgeSocketPath?: string;
    pairingCount?: number;
    uiLanguage?: string;
    platform?: string;
  };
  checks?: Array<{
    key?: string;
    label?: string;
    status?: string;
    detail?: string;
  }>;
  recentEvents?: DiagnosticEvent[];
};

type ElectronApi = {
  getStartupDiagnostics?: () => Promise<StartupDiagnostics>;
  getUiLanguage?: () => Promise<{ success?: boolean; language?: string }>;
  reloadApp?: () => Promise<unknown>;
  quitApp?: () => Promise<unknown>;
  isElectron?: boolean;
};

type WindowWithElectronApi = Window &
  typeof globalThis & {
    aegisElectron?: ElectronApi;
  };

const MESSAGES = {
  en: {
    title: 'Aegis Vault recovery screen',
    subtitle:
      'A startup or renderer problem was detected. Review the diagnostics below and try reloading the app.',
    diagnostics: 'Diagnostics',
    summary: 'Summary',
    recentEvents: 'Recent events',
    noEvents: 'No recorded events.',
    reload: 'Reload app',
    quit: 'Quit app',
    packaged: 'Packaged mode',
    bridge: 'Local bridge',
    pairings: 'Pairing records',
    appVersion: 'App version',
    platform: 'Platform',
    fatalError: 'Captured error',
    checks: 'Startup checks',
  },
  tr: {
    title: 'Aegis Vault kurtarma ekrani',
    subtitle:
      'Baslangic veya renderer tarafinda bir sorun algilandi. Asagidaki tani bilgisini inceleyip uygulamayi yeniden yuklemeyi deneyin.',
    diagnostics: 'Tani bilgisi',
    summary: 'Ozet',
    recentEvents: 'Son olaylar',
    noEvents: 'Kayitli olay yok.',
    reload: 'Uygulamayi yeniden yukle',
    quit: 'Uygulamayi kapat',
    packaged: 'Paketli calisma',
    bridge: 'Yerel kopru',
    pairings: 'Eslesme kaydi',
    appVersion: 'Uygulama surumu',
    platform: 'Platform',
    fatalError: 'Yakalanan hata',
    checks: 'Baslangic kontrolleri',
  },
} as const;

const normalizeLanguage = (value?: string) =>
  (value || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';

function useFailSafeLanguage() {
  const [language, setLanguage] = useState<'en' | 'tr'>(
    () => normalizeLanguage(navigator.language) as 'en' | 'tr'
  );

  useEffect(() => {
    const electronApi = (window as WindowWithElectronApi).aegisElectron;
    void electronApi
      ?.getUiLanguage?.()
      .then((result) => {
        setLanguage(normalizeLanguage(result?.language) as 'en' | 'tr');
      })
      .catch(() => {
        setLanguage(normalizeLanguage(navigator.language) as 'en' | 'tr');
      });
  }, []);

  return { language, text: MESSAGES[language] };
}

function DiagnosticScreen({ error }: { error?: Error | null }) {
  const { text } = useFailSafeLanguage();
  const [diagnostics, setDiagnostics] = useState<StartupDiagnostics | null>(null);

  useEffect(() => {
    const electronApi = (window as WindowWithElectronApi).aegisElectron;
    void electronApi
      ?.getStartupDiagnostics?.()
      .then((result) => {
        setDiagnostics(result);
      })
      .catch(() => {
        setDiagnostics(null);
      });
  }, []);

  const summaryRows = useMemo(
    () => [
      { label: text.packaged, value: diagnostics?.summary?.isPackaged ? 'yes' : 'no' },
      { label: text.bridge, value: diagnostics?.summary?.nativeBridgeServerActive ? 'ok' : 'down' },
      { label: text.pairings, value: String(diagnostics?.summary?.pairingCount ?? 0) },
      { label: text.appVersion, value: diagnostics?.summary?.appVersion || '-' },
      { label: text.platform, value: diagnostics?.summary?.platform || '-' },
    ],
    [diagnostics, text]
  );

  const handleReload = () => {
    void (window as WindowWithElectronApi).aegisElectron?.reloadApp?.();
  };

  const handleQuit = () => {
    void (window as WindowWithElectronApi).aegisElectron?.quitApp?.();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl">
          <h1 className="text-3xl font-bold">{text.title}</h1>
          <p className="mt-3 text-sm text-slate-300">{text.subtitle}</p>

          {error && (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
              <div className="text-sm font-semibold text-amber-200">{text.fatalError}</div>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-amber-50">
                {error.stack || error.message}
              </pre>
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-slate-800/60 p-5">
              <h2 className="text-lg font-semibold">{text.summary}</h2>
              <div className="mt-4 space-y-3 text-sm">
                {summaryRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-xl bg-black/10 px-3 py-2"
                  >
                    <span className="text-slate-300">{row.label}</span>
                    <span className="font-medium text-slate-50">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-800/60 p-5">
              <h2 className="text-lg font-semibold">{text.checks}</h2>
              <div className="mt-4 space-y-3 text-sm">
                {(diagnostics?.checks || []).map((check) => (
                  <div key={check.key || check.label} className="rounded-xl bg-black/10 px-3 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-200">{check.label}</span>
                      <span
                        className={
                          check.status === 'ok'
                            ? 'text-emerald-300'
                            : check.status === 'warn'
                              ? 'text-amber-300'
                              : 'text-rose-300'
                        }
                      >
                        {check.status}
                      </span>
                    </div>
                    {check.detail && (
                      <div className="mt-1 break-all text-xs text-slate-400">{check.detail}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-white/10 bg-slate-800/60 p-5">
            <h2 className="text-lg font-semibold">{text.recentEvents}</h2>
            <div className="mt-4 space-y-3 text-sm">
              {(diagnostics?.recentEvents?.length ?? 0) === 0 && (
                <div className="rounded-xl bg-black/10 px-3 py-3 text-slate-300">
                  {text.noEvents}
                </div>
              )}
              {(diagnostics?.recentEvents || []).map((event, index) => (
                <div
                  key={`${event.code || 'event'}-${event.at || index}`}
                  className="rounded-xl bg-black/10 px-3 py-3"
                >
                  <div className="font-medium text-slate-100">{event.code || 'EVENT'}</div>
                  <div className="mt-1 text-slate-300">{event.message || '-'}</div>
                  <div className="mt-1 text-xs text-slate-400">{event.at || '-'}</div>
                  {event.detail && (
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-500">
                      {event.detail}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReload}
              className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              {text.reload}
            </button>
            <button
              type="button"
              onClick={handleQuit}
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-600"
            >
              {text.quit}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

class AppErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error);
  }

  render() {
    if (this.state.error) {
      return <DiagnosticScreen error={this.state.error} />;
    }

    return this.props.children;
  }
}

export function ElectronFailSafe({ children }: { children: ReactNode }) {
  const [fatalError, setFatalError] = useState<Error | null>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setFatalError(
        event.error instanceof Error ? event.error : new Error(event.message || 'WINDOW_ERROR')
      );
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      setFatalError(
        reason instanceof Error
          ? reason
          : new Error(typeof reason === 'string' ? reason : 'UNHANDLED_REJECTION')
      );
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  if (fatalError) {
    return <DiagnosticScreen error={fatalError} />;
  }

  return <AppErrorBoundary onError={setFatalError}>{children}</AppErrorBoundary>;
}
