#!/usr/bin/env python3
# ==========================================================
# ESCÁNER DE SUPEROPORTUNIDADES (Deep Value + Catalizadores)
# ==========================================================
# Recorre un universo de empresas líquidas del S&P 500 con datos de Yahoo Finance (yfinance),
# aplica cinco filtros estrictos y ordena las que los superan por un Opportunity Score (1-100).
# Se invoca desde finance_engine.py: `python finance_engine.py super-opportunities [--refresh]`.
# Solo devuelve un dict serializable; los logs van por stderr.

import json
import math
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout, as_completed
from datetime import datetime, timezone

import pandas as pd
import yfinance as yf

from finance_engine import (
    CACHE_DIR,
    _log,
    calcular_valoracion,
    get_histimpl_erp,
    get_risk_free_rate,
    is_cache_valid,
)

# Universo: empresas no financieras de gran capitalización y alta liquidez del S&P 500.
# Se excluyen bancos, aseguradoras, REIT y eléctricas: en ellas el FCF, el ROIC y el Altman Z
# no son comparables (el pasivo es su materia prima o el capex regulado domina el flujo).
UNIVERSO_SP500 = [
    # Tecnología
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AVGO', 'ORCL', 'CRM', 'ADBE', 'CSCO', 'ACN', 'IBM',
    'QCOM', 'TXN', 'AMD', 'INTU', 'AMAT', 'LRCX', 'KLAC', 'MU', 'ADI', 'NOW', 'PANW', 'ANET',
    'DELL', 'HPQ', 'CDNS', 'SNPS', 'NXPI', 'MCHP', 'FTNT', 'IT', 'CTSH', 'GDDY',
    # Comunicaciones
    'NFLX', 'CMCSA', 'T', 'VZ', 'TMUS', 'DIS', 'CHTR', 'EA', 'OMC',
    # Consumo discrecional
    'AMZN', 'TSLA', 'HD', 'LOW', 'MCD', 'NKE', 'SBUX', 'TJX', 'BKNG', 'CMG', 'ORLY', 'AZO', 'ROST',
    'GM', 'F', 'MAR', 'HLT', 'YUM', 'DPZ', 'LULU', 'DECK', 'ULTA', 'EBAY', 'BBY', 'DHI', 'LEN',
    'NVR', 'PHM', 'TPR',
    # Consumo básico
    'WMT', 'COST', 'PG', 'KO', 'PEP', 'PM', 'MO', 'MDLZ', 'CL', 'KMB', 'GIS', 'HSY', 'KR', 'TGT',
    'KHC', 'KDP', 'STZ', 'MNST', 'CHD', 'CLX',
    # Salud
    'LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'DHR', 'AMGN', 'GILD', 'BMY', 'VRTX',
    'REGN', 'ISRG', 'MDT', 'SYK', 'ZTS', 'CVS', 'CI', 'ELV', 'HCA', 'MCK', 'CAH', 'BIIB', 'IDXX',
    # Industria
    'CAT', 'DE', 'HON', 'GE', 'UNP', 'UPS', 'RTX', 'LMT', 'GD', 'NOC', 'MMM', 'ETN', 'EMR', 'ITW',
    'PH', 'CSX', 'NSC', 'FDX', 'WM', 'ROK', 'PCAR', 'CMI', 'GWW', 'FAST', 'OTIS', 'CTAS', 'PAYX', 'ADP',
    # Energía
    'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'MPC', 'VLO', 'OXY', 'DVN', 'FANG', 'HAL',
    # Materiales
    'LIN', 'SHW', 'APD', 'NUE', 'FCX', 'DOW', 'LYB', 'MLM', 'VMC', 'NEM',
]

# Umbrales de los filtros de Superoportunidad
UMBRALES = {
    'upsideMinPct': 30.0,          # a) Valor intrínseco al menos un 30 % sobre el precio
    'roicMinPct': 15.0,            # b) ROIC > 15 % ...
    'roeMinPct': 20.0,             #    ... o ROE > 20 %
    'piotroskiMin': 7,             # c) Piotroski F-Score >= 7 ...
    'altmanMin': 2.8,              #    ... o Altman Z-Score > 2.8
    'fcfYieldMinPct': 6.0,         # d) FCF / EV > 6 %
    'recompraMinPct': 3.0,         # e1) Reducción neta de acciones > 3 % anual
    'sorpresaEpsMinPct': 5.0,      # e2) Sorpresa de BPA > 5 % ...
    'sorpresasConsecutivasMin': 2,  #     ... en al menos 2 trimestres seguidos
    'expansionMargenMinPp': 1.0,   # e3) Margen operativo +1 punto porcentual interanual
    'volumenMinMM': 100.0,         # Liquidez: volumen medio diario >= 100 M USD
    'upsideAtipicoPct': 150.0,     # Por encima se avisa de posible dato atípico o evento corporativo
}

TOP_MAX = 10
CANDIDATAS_MAX = 5
MAX_WORKERS = 6
TICKER_CACHE_TTL = 86400   # 24 h por empresa
RESULT_CACHE_TTL = 86400   # 24 h para el escaneo completo
RESULT_CACHE_TTL_PARCIAL = 3600  # 1 h si faltaron empresas: se reintenta antes
PRESUPUESTO_SEG = 240      # Tope del escaneo: yfinance no tiene timeout y una petición colgada lo bloquearía
SCAN_CACHE_DIR = CACHE_DIR / 'scan'
RESULT_CACHE_FILE = CACHE_DIR / 'super_opportunities.json'


# ----------------------------------------------------------
# Utilidades de lectura de estados financieros
# ----------------------------------------------------------
def _num(v):
    try:
        v = float(v)
        return None if (math.isnan(v) or math.isinf(v)) else v
    except (TypeError, ValueError):
        return None


def _fila(df: pd.DataFrame, claves: list, col: int):
    """Valor de la primera partida disponible en la columna `col` (0 = último ejercicio)."""
    if df is None or df.empty or col >= df.shape[1]:
        return None
    for k in claves:
        if k in df.index:
            v = _num(df.loc[k].iloc[col])
            if v is not None:
                return v
    return None


def _div(a, b):
    return a / b if (a is not None and b not in (None, 0)) else None


def _redondear(v, d=2):
    return round(v, d) if v is not None else None


# ----------------------------------------------------------
# Piotroski F-Score (9 criterios, ejercicio actual vs anterior)
# ----------------------------------------------------------
def calcular_piotroski(inc: pd.DataFrame, bs: pd.DataFrame, cf: pd.DataFrame) -> dict:
    ni = lambda c: _fila(inc, ['Net Income', 'Net Income Common Stockholders'], c)
    ta = lambda c: _fila(bs, ['Total Assets'], c)
    cfo = lambda c: _fila(cf, ['Operating Cash Flow', 'Cash Flow From Continuing Operating Activities'], c)
    ltd = lambda c: _fila(bs, ['Long Term Debt', 'Long Term Debt And Capital Lease Obligation'], c) or 0.0
    ca = lambda c: _fila(bs, ['Current Assets'], c)
    cl = lambda c: _fila(bs, ['Current Liabilities'], c)
    acc = lambda c: _fila(bs, ['Ordinary Shares Number', 'Share Issued'], c)
    gp = lambda c: _fila(inc, ['Gross Profit'], c)
    rev = lambda c: _fila(inc, ['Total Revenue', 'Operating Revenue'], c)

    # ROA sobre activos al inicio del ejercicio (si no hay, activos al cierre)
    def roa(c):
        return _div(ni(c), ta(c + 1) or ta(c))

    def comparar(actual, anterior, mayor=True):
        if actual is None or anterior is None:
            return None
        return actual > anterior if mayor else actual < anterior

    criterios = [
        ('ROA positivo', (roa(0) > 0) if roa(0) is not None else None),
        ('Flujo operativo positivo', (cfo(0) > 0) if cfo(0) is not None else None),
        ('ROA creciente', comparar(roa(0), roa(1))),
        ('Flujo operativo > beneficio neto', (cfo(0) > ni(0)) if (cfo(0) is not None and ni(0) is not None) else None),
        ('Menor apalancamiento a largo plazo', comparar(_div(ltd(0), ta(0)), _div(ltd(1), ta(1)), mayor=False)
            if (ta(0) and ta(1)) else None),
        ('Mayor ratio de liquidez', comparar(_div(ca(0), cl(0)), _div(ca(1), cl(1)))),
        ('Sin emisión de acciones', (acc(0) <= acc(1)) if (acc(0) and acc(1)) else None),
        ('Mayor margen bruto', comparar(_div(gp(0), rev(0)), _div(gp(1), rev(1)))),
        ('Mayor rotación de activos', comparar(_div(rev(0), ta(1) or ta(0)), _div(rev(1), ta(2) or ta(1)))),
    ]
    evaluados = [c for c in criterios if c[1] is not None]
    return {
        'score': sum(1 for _, ok in evaluados if ok),
        'evaluados': len(evaluados),
        'detalle': [{'criterio': nombre, 'cumple': ok} for nombre, ok in criterios],
    }


# ----------------------------------------------------------
# Altman Z-Score (modelo original de 5 factores)
# ----------------------------------------------------------
def calcular_altman(inc: pd.DataFrame, bs: pd.DataFrame, market_cap: float):
    ta = _fila(bs, ['Total Assets'], 0)
    tl = _fila(bs, ['Total Liabilities Net Minority Interest', 'Total Liabilities'], 0)
    ca = _fila(bs, ['Current Assets'], 0)
    cl = _fila(bs, ['Current Liabilities'], 0)
    re_ = _fila(bs, ['Retained Earnings'], 0)
    ebit = _fila(inc, ['EBIT', 'Operating Income'], 0)
    ventas = _fila(inc, ['Total Revenue', 'Operating Revenue'], 0)
    if not ta or not tl or ca is None or cl is None or ebit is None or ventas is None or market_cap <= 0:
        return None
    z = (1.2 * (ca - cl) / ta + 1.4 * (re_ or 0.0) / ta + 3.3 * ebit / ta
         + 0.6 * market_cap / tl + 1.0 * ventas / ta)
    return round(z, 2)


# ----------------------------------------------------------
# Catalizadores activos
# ----------------------------------------------------------
def detectar_catalizadores(stock, inc: pd.DataFrame, bs: pd.DataFrame, cf: pd.DataFrame, market_cap: float) -> list:
    catalizadores = []

    # 1. Recompra acelerada: reducción neta del número de acciones en el último ejercicio
    acc0 = _fila(bs, ['Ordinary Shares Number', 'Share Issued'], 0)
    acc1 = _fila(bs, ['Ordinary Shares Number', 'Share Issued'], 1)
    reduccion = (1 - acc0 / acc1) * 100 if (acc0 and acc1) else None
    recompra = _fila(cf, ['Repurchase Of Capital Stock', 'Common Stock Payments'], 0)
    rendimiento_recompra = (-recompra / market_cap * 100) if (recompra is not None and market_cap > 0) else None
    if reduccion is None:
        detalle = 'Sin datos de acciones en circulación'
    else:
        detalle = f'Acciones en circulación {-reduccion:+.1f} % en el último ejercicio'
        if rendimiento_recompra and rendimiento_recompra > 0:
            detalle += f'; recompras equivalentes al {rendimiento_recompra:.1f} % de la capitalización'
    catalizadores.append({
        'tipo': 'recompra',
        'nombre': 'Recompra acelerada de acciones',
        'activo': reduccion is not None and reduccion > UMBRALES['recompraMinPct'],
        'valor': _redondear(reduccion, 2),
        'detalle': detalle,
        'rendimientoRecompraPct': _redondear(rendimiento_recompra, 2),
    })

    # 2. Sorpresas consecutivas en BPA (trimestres más recientes primero)
    consecutivas, sorpresas = 0, []
    try:
        eh = stock.earnings_history
        if eh is not None and not eh.empty:
            eh = eh.sort_index(ascending=False)
            for fecha, fila in eh.iterrows():
                real, est = _num(fila.get('epsActual')), _num(fila.get('epsEstimate'))
                if real is None or est is None or est == 0:
                    break
                s = (real - est) / abs(est) * 100
                sorpresas.append({'trimestre': str(fecha)[:10], 'sorpresaPct': round(s, 2)})
            for s in sorpresas:
                if s['sorpresaPct'] > UMBRALES['sorpresaEpsMinPct']:
                    consecutivas += 1
                else:
                    break
    except Exception as e:
        _log(f'[SCAN] earnings_history no disponible: {e}')
    catalizadores.append({
        'tipo': 'sorpresas_bpa',
        'nombre': 'Sorpresas consecutivas en BPA',
        'activo': consecutivas >= UMBRALES['sorpresasConsecutivasMin'],
        'valor': consecutivas,
        'detalle': (f'{consecutivas} trimestre(s) seguidos superando la estimación en más de un '
                    f'{UMBRALES["sorpresaEpsMinPct"]:.0f} %' if sorpresas else 'Sin historial de estimaciones'),
        'sorpresas': sorpresas[:4],
    })

    # 3. Expansión (y aceleración) del margen operativo anual
    def margen(c):
        m = _div(_fila(inc, ['Operating Income', 'EBIT'], c), _fila(inc, ['Total Revenue', 'Operating Revenue'], c))
        return m * 100 if m is not None else None
    m0, m1, m2 = margen(0), margen(1), margen(2)
    expansion = (m0 - m1) if (m0 is not None and m1 is not None) else None
    acelera = expansion is not None and m2 is not None and expansion > (m1 - m2)
    catalizadores.append({
        'tipo': 'margen_operativo',
        'nombre': 'Expansión del margen operativo',
        'activo': expansion is not None and expansion >= UMBRALES['expansionMargenMinPp'],
        'valor': _redondear(expansion, 2),
        'detalle': (f'Margen operativo {m1:.1f} % → {m0:.1f} % ({expansion:+.1f} pp)'
                    + (', y se acelera respecto al año anterior' if acelera and expansion > 0 else '')
                    if expansion is not None else 'Sin datos de margen operativo'),
        'margenActualPct': _redondear(m0, 2),
        'acelera': acelera,
    })
    return catalizadores


# ----------------------------------------------------------
# Valor intrínseco: Graham revisado + DCF del motor
# ----------------------------------------------------------
def valor_graham(info: dict, rf: float):
    """V = BPA × (8,5 + 2g) × 4,4 / Y. g = crecimiento esperado del BPA (0-10 %, conservador),
    Y = rendimiento de bonos AAA aproximado con el DGS10 + 1 pp."""
    eps = _num(info.get('trailingEps'))
    eps_fwd = _num(info.get('forwardEps'))
    if not eps or eps <= 0:
        return None
    g = ((eps_fwd / eps) - 1) * 100 if eps_fwd and eps_fwd > 0 else 5.0
    g = min(max(g, 0.0), 10.0)
    y = max(rf * 100 + 1.0, 4.4)
    return eps * (8.5 + 2 * g) * 4.4 / y


# ----------------------------------------------------------
# Análisis de una empresa
# ----------------------------------------------------------
def analizar_empresa(ticker: str, rf: float, refrescar: bool = False) -> dict:
    yf_symbol = ticker.replace('.', '-')
    cache_file = SCAN_CACHE_DIR / f'{yf_symbol}.json'
    if not refrescar and is_cache_valid(cache_file, TICKER_CACHE_TTL):
        try:
            return json.loads(cache_file.read_text(encoding='utf-8'))
        except Exception:
            pass

    stock = yf.Ticker(yf_symbol)
    info = stock.info or {}
    precio = _num(info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose'))
    if not precio:
        raise ValueError(f'Sin cotización para {ticker}')
    inc, bs, cf = stock.income_stmt, stock.balance_sheet, stock.cashflow
    if inc is None or bs is None or cf is None or inc.empty or bs.empty or cf.empty:
        raise ValueError(f'Sin estados financieros para {ticker}')

    market_cap = _num(info.get('marketCap')) or 0.0
    acciones = _num(info.get('sharesOutstanding')) or (market_cap / precio if market_cap else 0.0)
    volumen_mm = (_num(info.get('averageDailyVolume3Month')) or 0.0) * precio / 1e6

    ebit = _fila(inc, ['EBIT', 'Operating Income'], 0) or 0.0
    intereses = _fila(inc, ['Interest Expense', 'Interest Expense Non Operating'], 0) or 0.0
    patrimonio = _fila(bs, ['Stockholders Equity', 'Common Stock Equity'], 0) or 0.0

    valoracion = calcular_valoracion(info, inc, cf, precio, market_cap, acciones,
                                     ebit, abs(intereses), patrimonio, _num(info.get('beta')))
    dcf = (valoracion.get('dcf') or {}).get('valorPorAccion')
    graham = valor_graham(info, rf)
    # Valor intrínseco conservador: el menor de los métodos disponibles (margen de seguridad)
    metodos = [v for v in (dcf, graham) if v and v > 0]
    intrinseco = min(metodos) if metodos else None
    upside = (intrinseco / precio - 1) * 100 if intrinseco else None
    descuento = (1 - precio / intrinseco) * 100 if intrinseco else None

    roic = valoracion.get('roicPct')
    net_income = _fila(inc, ['Net Income', 'Net Income Common Stockholders'], 0)
    roe = net_income / patrimonio * 100 if (net_income is not None and patrimonio > 0) else None

    ev = _num(info.get('enterpriseValue'))
    fcf = _fila(cf, ['Free Cash Flow'], 0)
    fcf_yield = fcf / ev * 100 if (fcf is not None and ev and ev > 0) else None

    piotroski = calcular_piotroski(inc, bs, cf)
    altman = calcular_altman(inc, bs, market_cap)
    catalizadores = detectar_catalizadores(stock, inc, bs, cf, market_cap)

    datos = {
        'ticker': ticker,
        'nombre': info.get('longName') or info.get('shortName') or ticker,
        'sector': info.get('sector') or 'Sin sector',
        'industria': info.get('industry') or '',
        'precio': round(precio, 2),
        'valorIntrinseco': _redondear(intrinseco),
        'valorDcf': _redondear(dcf),
        'valorGraham': _redondear(graham),
        'upsidePct': _redondear(upside, 1),
        'descuentoPct': _redondear(descuento, 1),
        'metodoValoracion': ('min(DCF, Graham)' if len(metodos) == 2 else ('DCF' if dcf and dcf > 0 else 'Graham'))
                            if metodos else None,
        'roicPct': _redondear(roic, 1),
        'roePct': _redondear(roe, 1),
        'piotroski': piotroski['score'],
        'piotroskiEvaluados': piotroski['evaluados'],
        'piotroskiDetalle': piotroski['detalle'],
        'altmanZ': altman,
        'fcfYieldPct': _redondear(fcf_yield, 2),
        'fcfMM': _redondear(fcf / 1e6 if fcf is not None else None, 1),
        'evMM': _redondear(ev / 1e6 if ev else None, 1),
        'marketCapMM': round(market_cap / 1e6, 1),
        'volumenDiarioMM': round(volumen_mm, 1),
        'waccPct': valoracion.get('waccPct'),
        'catalizadores': catalizadores,
    }
    try:
        cache_file.write_text(json.dumps(datos, ensure_ascii=False), encoding='utf-8')
    except Exception as e:
        _log(f'[SCAN] No se pudo guardar {cache_file.name}: {e}')
    return datos


# ----------------------------------------------------------
# Filtros, score y tesis
# ----------------------------------------------------------
def evaluar_filtros(d: dict) -> list:
    u = UMBRALES
    calidad = ((d['roicPct'] is not None and d['roicPct'] > u['roicMinPct'])
               or (d['roePct'] is not None and d['roePct'] > u['roeMinPct']))
    balance = (d['piotroski'] >= u['piotroskiMin']
               or (d['altmanZ'] is not None and d['altmanZ'] > u['altmanMin']))
    activos = [c for c in d['catalizadores'] if c['activo']]
    return [
        {'id': 'descuento', 'nombre': 'Upside > 30 % sobre valor intrínseco',
         'cumple': d['upsidePct'] is not None and d['upsidePct'] > u['upsideMinPct']},
        {'id': 'rentabilidad', 'nombre': 'ROIC > 15 % o ROE > 20 %', 'cumple': bool(calidad)},
        {'id': 'balance', 'nombre': 'Piotroski >= 7 o Altman Z > 2,8', 'cumple': bool(balance)},
        {'id': 'fcf', 'nombre': 'FCF Yield (FCF / EV) > 6 %',
         'cumple': d['fcfYieldPct'] is not None and d['fcfYieldPct'] > u['fcfYieldMinPct']},
        {'id': 'catalizador', 'nombre': 'Al menos un catalizador activo', 'cumple': len(activos) > 0},
    ]


def calcular_score(d: dict) -> dict:
    """Opportunity Score 1-100: descuento 30, calidad 20, balance 15, FCF 15, catalizadores 20."""
    def tope(x):
        return max(0.0, min(1.0, x))
    descuento = 30 * tope((d['upsidePct'] or 0) / 100)
    calidad = 20 * max(tope((d['roicPct'] or 0) / 30), tope((d['roePct'] or 0) / 40))
    balance = 15 * (0.6 * d['piotroski'] / 9 + 0.4 * tope((d['altmanZ'] or 0) / 6))
    fcf = 15 * tope((d['fcfYieldPct'] or 0) / 12)
    catalizadores = 20 * sum(1 for c in d['catalizadores'] if c['activo']) / 3
    total = descuento + calidad + balance + fcf + catalizadores
    return {
        'score': int(max(1, min(100, round(total)))),
        'desglose': {
            'descuento': round(descuento, 1), 'calidad': round(calidad, 1), 'balance': round(balance, 1),
            'fcf': round(fcf, 1), 'catalizadores': round(catalizadores, 1),
        },
    }


def redactar_tesis(d: dict) -> str:
    partes = []
    for c in d['catalizadores']:
        if not c['activo']:
            continue
        if c['tipo'] == 'recompra':
            partes.append(f'Recompra de acciones del {c["valor"]:.1f} % anual')
        elif c['tipo'] == 'sorpresas_bpa':
            partes.append(f'{c["valor"]} trimestres seguidos batiendo el BPA estimado')
        elif c['tipo'] == 'margen_operativo':
            partes.append(f'margen operativo {c["valor"]:+.1f} pp' + (' y acelerando' if c.get('acelera') else ''))
    if d['roicPct'] is not None and d['roicPct'] > UMBRALES['roicMinPct']:
        partes.append(f'ROIC del {d["roicPct"]:.0f} %')
    elif d['roePct'] is not None:
        partes.append(f'ROE del {d["roePct"]:.0f} %')
    if d['fcfYieldPct'] is not None:
        partes.append(f'FCF Yield del {d["fcfYieldPct"]:.1f} %')
    tesis = ' + '.join(partes)
    if d['upsidePct'] is not None:
        tesis += (f'. Cotiza con un descuento del {d["descuentoPct"]:.0f} % sobre su valor intrínseco '
                  f'conservador (upside del {d["upsidePct"]:.0f} %).')
    return tesis[:1].upper() + tesis[1:]


# ----------------------------------------------------------
# Escaneo completo
# ----------------------------------------------------------
def escanear_superoportunidades(refrescar: bool = False) -> dict:
    if not refrescar and is_cache_valid(RESULT_CACHE_FILE, RESULT_CACHE_TTL):
        try:
            previo = json.loads(RESULT_CACHE_FILE.read_text(encoding='utf-8'))
            if previo.get('completo') or is_cache_valid(RESULT_CACHE_FILE, RESULT_CACHE_TTL_PARCIAL):
                return previo
        except Exception:
            pass

    inicio = time.time()
    SCAN_CACHE_DIR.mkdir(exist_ok=True)
    # Se calientan una vez las cachés de FRED y Damodaran antes de lanzar los hilos
    rf = get_risk_free_rate()
    get_histimpl_erp()

    analizadas, errores = [], []
    pool = ThreadPoolExecutor(max_workers=MAX_WORKERS)
    futuros = {pool.submit(analizar_empresa, t, rf, refrescar): t for t in UNIVERSO_SP500}
    pendientes = set(futuros.values())
    try:
        for fut in as_completed(futuros, timeout=PRESUPUESTO_SEG):
            t = futuros[fut]
            pendientes.discard(t)
            try:
                analizadas.append(fut.result())
            except Exception as e:
                errores.append(t)
                _log(f'[SCAN] {t}: {e}')
    except FuturesTimeout:
        _log(f'[SCAN] Presupuesto de {PRESUPUESTO_SEG} s agotado; sin respuesta de {len(pendientes)} empresas')
        errores.extend(pendientes)
    # Sin esperar a los hilos colgados: el CLI termina el proceso tras imprimir el JSON
    pool.shutdown(wait=False, cancel_futures=True)

    if len(analizadas) < len(UNIVERSO_SP500) * 0.5:
        return {
            'success': False,
            'error': (f'Yahoo Finance solo devolvió datos de {len(analizadas)} de {len(UNIVERSO_SP500)} empresas '
                      '(posible límite de peticiones). Reintenta en unos minutos.'),
        }

    liquidas = [d for d in analizadas if d['volumenDiarioMM'] >= UMBRALES['volumenMinMM']]
    superan, cercanas = [], []
    for d in liquidas:
        filtros = evaluar_filtros(d)
        alerta = None
        if d['upsidePct'] is not None and d['upsidePct'] > UMBRALES['upsideAtipicoPct']:
            alerta = ('Upside superior al 150 %: revisa si hay escisiones, partidas extraordinarias o '
                      'flujos no recurrentes que distorsionen el DCF antes de confiar en la cifra.')
        d = {**d, 'filtros': filtros, **calcular_score(d), 'tesis': redactar_tesis(d), 'alertaDatos': alerta}
        cumplidos = sum(1 for f in filtros if f['cumple'])
        if cumplidos == len(filtros):
            superan.append(d)
        elif cumplidos == len(filtros) - 1:
            cercanas.append(d)

    superan.sort(key=lambda d: d['score'], reverse=True)
    cercanas.sort(key=lambda d: d['score'], reverse=True)

    resultado = {
        'success': True,
        'source': 'yfinance + FRED DGS10 + Damodaran ERP',
        'generadoEn': datetime.now(timezone.utc).isoformat(),
        'duracionSeg': round(time.time() - inicio, 1),
        'universo': len(UNIVERSO_SP500),
        'analizadas': len(analizadas),
        'liquidas': len(liquidas),
        'sinDatos': sorted(errores),
        'completo': not errores,
        'superanFiltros': len(superan),
        'umbrales': UMBRALES,
        'oportunidades': superan[:TOP_MAX],
        'candidatasCercanas': cercanas[:CANDIDATAS_MAX],
    }
    try:
        RESULT_CACHE_FILE.write_text(json.dumps(resultado, ensure_ascii=False), encoding='utf-8')
    except Exception as e:
        _log(f'[SCAN] No se pudo guardar el resultado: {e}')
    return resultado
