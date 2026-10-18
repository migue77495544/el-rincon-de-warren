import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CompanyAnalysis } from '../types';
import { useViewMode } from '../context/ViewModeContext';
import { BookOpen, CornerDownLeft, GraduationCap, LineChart, Loader2, Search, X } from 'lucide-react';
import { fetchJson, postJson, errorMessage } from '../utils/api';
import { marginLevel } from '../utils/verdict';

type Tab = 'fundamental' | 'simulator' | 'gamification' | 'impact' | 'methodology';

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyAnalysis[];
  onSelectCompany: (company: CompanyAnalysis) => void;
  /** Empresa nueva cargada desde la bolsa: se añade al catálogo y se abre */
  onCompanyImported: (company: CompanyAnalysis) => void;
  onNavigateTab: (tab: Tab) => void;
}

interface LiveResult {
  ticker: string;
  nombre: string;
  sector: string;
  inCatalog: boolean;
  price?: number;
}

type Item =
  | { kind: 'catalog'; key: string; company: CompanyAnalysis }
  | { kind: 'live'; key: string; result: LiveResult }
  | { kind: 'section'; key: string; label: string; hint: string; tab: Tab; icon: React.ComponentType<{ className?: string }> };

const NOTA: Record<string, { word: string; cls: string }> = {
  'A+': { word: 'muy buena', cls: 'text-emerald-800' },
  A: { word: 'muy buena', cls: 'text-emerald-800' },
  B: { word: 'buena', cls: 'text-emerald-800' },
  C: { word: 'regular', cls: 'text-amber-900' },
  D: { word: 'débil', cls: 'text-rose-800' },
  F: { word: 'débil', cls: 'text-rose-800' }
};

const PRECIO: Record<string, { word: string; cls: string }> = {
  amplio: { word: 'barata', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  estrecho: { word: 'precio justo', cls: 'bg-amber-50 text-amber-900 border-amber-200' },
  'sin-margen': { word: 'cara', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
  'sin-cobertura': { word: 'sin referencia', cls: 'bg-slate-100 text-slate-700 border-slate-200' }
};

const SECCIONES: Array<{ label: string; hint: string; tab: Tab; icon: React.ComponentType<{ className?: string }>; words: string; analyst?: boolean }> = [
  { label: 'Aprender', hint: 'Lecciones cortas, juegos y videos', tab: 'gamification', icon: GraduationCap, words: 'aprender juegos lecciones videos academia curso' },
  { label: 'Cómo se calcula', hint: 'Fórmulas y metodología de la nota', tab: 'methodology', icon: BookOpen, words: 'metodologia formulas como se calcula nota score' },
  { label: 'Simulador de cartera', hint: 'Practica con $100.000 sin riesgo', tab: 'simulator', icon: LineChart, words: 'simulador cartera markowitz practicar', analyst: true }
];

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({
  isOpen,
  onClose,
  companies,
  onSelectCompany,
  onCompanyImported,
  onNavigateTab
}) => {
  const { mode } = useViewMode();
  const [query, setQuery] = useState('');
  const [live, setLive] = useState<LiveResult[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Búsqueda en vivo en la bolsa (también tickers de una letra: V, F, T)
  useEffect(() => {
    const term = query.trim();
    setError(null);
    if (!term) {
      setLive([]);
      setBuscando(false);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const data = await fetchJson<{ results: LiveResult[] }>(`/api/market/search?q=${encodeURIComponent(term)}`, {}, 12000);
        if (!cancelado) setLive(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (!cancelado) setLive([]);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, 250);
    return () => { cancelado = true; clearTimeout(t); };
  }, [query]);

  const items: Item[] = useMemo(() => {
    const q = sinTildes(query.trim());
    const enCatalogo = companies.filter(c => {
      if (!q) return true;
      const t = c.ticker.toLowerCase();
      const n = sinTildes(c.nombre);
      // Con 1-2 letras solo cuenta el inicio: «V» no debe casar con medio catálogo
      return q.length <= 2 ? t.startsWith(q) || n.startsWith(q) : t.includes(q) || n.includes(q) || sinTildes(c.sector).includes(q);
    });
    const tickersCatalogo = new Set(companies.map(c => c.ticker.toUpperCase()));
    const enBolsa = live.filter(r => !tickersCatalogo.has(r.ticker.toUpperCase()));
    const secciones = q.length >= 3
      ? SECCIONES.filter(s => (!s.analyst || mode === 'analyst') && (sinTildes(s.label).includes(q) || s.words.includes(q)))
      : [];
    return [
      ...enCatalogo.map(c => ({ kind: 'catalog' as const, key: `c-${c.id}`, company: c })),
      ...enBolsa.map(r => ({ kind: 'live' as const, key: `l-${r.ticker}`, result: r })),
      ...secciones.map(s => ({ kind: 'section' as const, key: `s-${s.tab}`, label: s.label, hint: s.hint, tab: s.tab, icon: s.icon }))
    ];
  }, [companies, live, query, mode]);

  useEffect(() => { setActivo(0); }, [query, items.length]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activo]);

  if (!isOpen) return null;

  const abrirEmpresa = (c: CompanyAnalysis) => {
    onSelectCompany(c);
    onClose();
  };

  const cargarDeLaBolsa = async (ticker: string) => {
    setCargando(ticker);
    setError(null);
    try {
      // La primera descarga de estados financieros puede tardar varios segundos
      const data = await postJson<{ company: CompanyAnalysis }>('/api/market/import', { query: ticker, ticker }, 60000);
      onCompanyImported(data.company);
      onClose();
    } catch (err) {
      setError(errorMessage(err, `No se pudieron cargar los datos de ${ticker}. Prueba de nuevo en unos segundos.`));
    } finally {
      setCargando(null);
    }
  };

  const ejecutar = (item: Item | undefined) => {
    if (!item || cargando) return;
    if (item.kind === 'catalog') abrirEmpresa(item.company);
    else if (item.kind === 'live') cargarDeLaBolsa(item.result.ticker);
    else {
      onNavigateTab(item.tab);
      onClose();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo(i => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const term = query.trim();
      // Sin resultados: se intenta cargar lo escrito como ticker
      if (!items.length && term) cargarDeLaBolsa(term.toUpperCase());
      else ejecutar(items[activo]);
    }
  };

  const term = query.trim();
  const nCatalogo = items.filter(i => i.kind === 'catalog').length;
  const nBolsa = items.filter(i => i.kind === 'live').length;

  const fila = (item: Item, index: number) => {
    const activa = index === activo;
    const base = `w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${activa ? 'bg-slate-100' : 'hover:bg-slate-50'}`;
    if (item.kind === 'catalog') {
      const c = item.company;
      const nota = NOTA[c.scoreGrade] || NOTA.C;
      const precio = PRECIO[marginLevel(c)];
      return (
        <button type="button" role="option" aria-selected={activa} data-index={index} onMouseEnter={() => setActivo(index)} onClick={() => ejecutar(item)} className={base}>
          <span className={`w-11 shrink-0 text-center cifra text-2xl leading-none ${nota.cls}`} aria-hidden="true">{c.scoreGrade}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-slate-900 truncate">{c.nombre}</span>
            <span className="block text-sm text-slate-600 truncate">{c.ticker} · nota {c.scoreGrade}, {nota.word}</span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block tabular text-sm font-semibold text-slate-900">${c.raw.precioCotizacion.toFixed(2)}</span>
            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full border text-xs font-medium ${precio.cls}`}>{precio.word}</span>
          </span>
        </button>
      );
    }
    if (item.kind === 'live') {
      const r = item.result;
      const estaCargando = cargando === r.ticker;
      return (
        <button type="button" role="option" aria-selected={activa} data-index={index} onMouseEnter={() => setActivo(index)} onClick={() => ejecutar(item)} disabled={Boolean(cargando)}
          className={`${base} disabled:opacity-60`}>
          <span className="w-11 shrink-0 flex justify-center text-slate-500" aria-hidden="true">
            {estaCargando ? <Loader2 className="w-5 h-5 animate-spin text-amber-700" /> : <Search className="w-5 h-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-slate-900 truncate">{r.nombre}</span>
            <span className="block text-sm text-slate-600 truncate">{r.ticker} · {r.sector}</span>
          </span>
          <span className="shrink-0 text-sm font-medium text-amber-800">
            {estaCargando ? 'Analizando…' : 'Analizar'}
          </span>
        </button>
      );
    }
    const Icon = item.icon;
    return (
      <button type="button" role="option" aria-selected={activa} data-index={index} onMouseEnter={() => setActivo(index)} onClick={() => ejecutar(item)} className={base}>
        <span className="w-11 shrink-0 flex justify-center text-slate-500" aria-hidden="true"><Icon className="w-5 h-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-slate-900">{item.label}</span>
          <span className="block text-sm text-slate-600">{item.hint}</span>
        </span>
      </button>
    );
  };

  let index = 0;
  const grupo = (titulo: string, kind: Item['kind']) => {
    const lista = items.filter(i => i.kind === kind);
    if (!lista.length) return null;
    return (
      <li role="presentation">
        <p className="m-0 px-3 pt-3 pb-1.5 text-sm font-medium text-slate-600">{titulo}</p>
        <ul role="presentation" className="m-0 p-0 list-none">
          {lista.map(item => <li key={item.key} role="presentation">{fila(item, index++)}</li>)}
        </ul>
      </li>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] bg-slate-900/30 flex items-start justify-center sm:pt-20 animate-in fade-in duration-150"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar una empresa"
        className="bg-white w-full h-full sm:h-auto sm:max-w-xl sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-3 sm:p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2.5 h-12 px-4 rounded-full border border-slate-300 bg-white focus-within:border-amber-700 focus-within:ring-2 focus-within:ring-amber-700/20">
              <Search className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls="resultados-busqueda"
                aria-activedescendant={undefined}
                aria-label="Nombre o ticker de la empresa"
                placeholder="Apple, Coca-Cola, NVDA…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                // El foco se marca en la píldora entera (focus-within), no en el campo
                style={{ outline: 'none' }}
                className="flex-1 min-w-0 bg-transparent text-base text-slate-900 placeholder-slate-500 focus:outline-none focus-visible:outline-none"
              />
              {buscando && <Loader2 className="w-4 h-4 text-slate-500 animate-spin shrink-0" aria-label="Buscando" />}
              {query && !buscando && (
                <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="shrink-0 w-7 h-7 rounded-full text-slate-500 hover:bg-slate-100 flex items-center justify-center" aria-label="Borrar búsqueda">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button type="button" onClick={onClose} className="shrink-0 h-12 px-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-lg">
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 sm:max-h-[60vh] overflow-y-auto p-2">
          {error && (
            <p role="alert" className="m-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">{error}</p>
          )}

          {items.length > 0 ? (
            <ul id="resultados-busqueda" role="listbox" aria-label="Resultados" ref={listRef} className="m-0 p-0 list-none">
              {grupo(term ? `En tu lista (${nCatalogo})` : 'Empresas para empezar', 'catalog')}
              {grupo(`En la bolsa (${nBolsa})`, 'live')}
              {grupo('Ir a', 'section')}
            </ul>
          ) : (
            <div className="px-4 py-10 text-center">
              {buscando ? (
                <p className="m-0 text-sm text-slate-600">Buscando «{term}» en la bolsa…</p>
              ) : (
                <>
                  <p className="m-0 text-[15px] font-semibold text-slate-900">No encontramos «{term}»</p>
                  <p className="mt-1 mb-4 text-sm text-slate-600">Prueba con el nombre de la empresa o su ticker (por ejemplo, KO para Coca-Cola).</p>
                  <button type="button" onClick={() => cargarDeLaBolsa(term.toUpperCase())} disabled={Boolean(cargando)}
                    className="h-10 px-4 rounded-full bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-60">
                    {cargando ? 'Analizando…' : `Analizar «${term.toUpperCase()}» de todas formas`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 text-xs text-slate-600">
          <span>La nota resume la calidad del negocio; la etiqueta, si su precio está barato o caro.</span>
          <span className="flex items-center gap-1 shrink-0"><CornerDownLeft className="w-3.5 h-3.5" aria-hidden="true" /> abrir</span>
        </div>
      </div>
    </div>
  );
};
