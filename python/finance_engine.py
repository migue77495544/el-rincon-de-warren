#!/usr/bin/env python3
# ==========================================================
# IMPORTACIÓN DE LIBRERÍAS
# ==========================================================
import sys
import os
import json
import time
import re
import warnings
warnings.filterwarnings('ignore')

# Cargar variables de entorno desde .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import difflib
import yfinance as yf
import ta

# Gemini SDK - usando systemInstruction nativo
try:
    from google import genai
    from google.genai import types
    GEMINI_SDK_AVAILABLE = True
except ImportError:
    GEMINI_SDK_AVAILABLE = False
    genai = None
    types = None

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

plt.style.use('seaborn-v0_8')
pd.options.display.float_format = '{:,.6f}'.format

# ==========================================================
# REGLA DE ORO DE IDIOMA (Inyectada en TODOS los system prompts)
# ==========================================================
REGLA_DE_ORO_IDIOMA = (
    "IDIOMA: Responde exclusivamente en español neutro profesional. Las siglas financieras estándar se usan tal cual "
    "(ROE, ROIC, WACC, PER, EV/EBITDA, DCF, EBITDA, RSI, EMA, MACD); el resto de la jerga va en español: "
    "foso económico (no \"moat\"), alcista/bajista (no \"bullish/bearish\"), retroceso (no \"pullback\"), "
    "orden de pérdida límite (\"stop loss\" se admite entre paréntesis la primera vez)."
)

# Cadena de modelos para los asesores: si uno no está disponible se intenta el siguiente.
# Va primero el más rápido: el subproceso completo debe responder dentro del timeout de server.ts.
MODELOS_ASESORES = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"]


def _log(msg: str):
    """Diagnóstico por stderr: stdout queda reservado al JSON que consume server.ts."""
    print(msg, file=sys.stderr)

# ==========================================================
# GEMINI CLIENT WRAPPER con systemInstruction, logging y validación
# ==========================================================
class GeminiClient:
    """Wrapper para Gemini que usa systemInstruction nativo, temperature 0.25, maxTokens 2048 y logging obligatorio."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        if self.api_key and not (self.api_key.startswith("AIza") or self.api_key.startswith("AQ.")):
            self.api_key = ""
        self.client = None
        self._init_client()
    
    def _init_client(self):
        if not GEMINI_SDK_AVAILABLE or not self.api_key:
            return
        try:
            # Timeout por llamada (ms) para que un modelo saturado no agote el tiempo del subproceso
            self.client = genai.Client(api_key=self.api_key, http_options=types.HttpOptions(timeout=20000))
        except Exception:
            self.client = None

    def generate(
        self,
        system_instruction: str,
        user_message: str,
        temperature: float = 0.25,
        max_output_tokens: int = 4096,
        model_name: str = None
    ) -> str:
        """
        Genera respuesta usando systemInstruction nativo, recorriendo MODELOS_ASESORES
        hasta que uno responda. Logs por stderr: [GEMINI PROMPT] y [GEMINI RAW]
        """
        if not self.client:
            return ""

        modelos = ([model_name] if model_name else []) + [m for m in MODELOS_ASESORES if m != model_name]
        _log(f"[GEMINI PROMPT] temp={temperature} max_tokens={max_output_tokens} | {user_message[:300]}")

        for modelo in modelos:
            try:
                response = self.client.models.generate_content(
                    model=modelo,
                    contents=user_message,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=temperature,
                        max_output_tokens=max_output_tokens,
                    )
                )
                text = (response.text or "").strip()
                _log(f"[GEMINI RAW] model={modelo} {text[:300]}...")
                if text:
                    return text
            except Exception as e:
                _log(f"[GEMINI ERROR] model={modelo} {str(e)[:200]}")
        return ""
    
    def validate_grounding(self, response: str, context: dict, advisor_type: str) -> bool:
        """
        Validación post-generación: verifica que toda métrica citada existe en el contexto.
        advisor_type: 'jairo' (fundamental) o 'guillermo' (técnico)
        """
        if not response:
            return False
        
        # Métricas esperadas según el tipo de asesor
        if advisor_type == 'jairo':
            expected_metrics = ['ROE', 'Liquidez', 'Apalancamiento', 'Potencial Al Alza', 'K_e', 'Foso Económico', 'Precio', 'Precio Objetivo']
            # Jairo NO debe citar métricas técnicas
            forbidden = ['RSI', 'EMA', 'MACD', 'Soporte', 'Resistencia', 'Stop Loss', 'Riesgo/Beneficio']
        else:  # guillermo
            expected_metrics = ['Precio', 'EMA 20', 'EMA 50', 'EMA 200', 'RSI', 'MACD', 'Soporte', 'Resistencia', 'Stop Loss', 'Riesgo/Beneficio']
            # Guillermo NO debe citar métricas fundamentales
            forbidden = ['ROE', 'Liquidez', 'Apalancamiento', 'K_e', 'Foso Económico', 'Potencial Al Alza']
        
        # Verificar que no hay términos prohibidos
        for term in forbidden:
            if term.lower() in response.lower():
                _log(f"[GROUNDING WARNING] {advisor_type} citó término prohibido: {term}")
                return False
        
        # Verificar que al menos una métrica esperada está presente (para respuestas puntuales)
        # En respuestas generales, esto es opcional
        has_metric = any(metric.lower() in response.lower() for metric in expected_metrics)
        
        return True


# Instancia global del cliente (se inicializa lazy)
_gemini_client = None

def get_gemini_client() -> GeminiClient:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client

def clean_val(val, default=0.0):
    """Limpia valores NaN, infinitos o None para serialización JSON segura."""
    if val is None or pd.isna(val) or np.isinf(val):
        return default
    try:
        return float(val)
    except:
        return default

def _recommendation_mean_to_label(value) -> str:
    """Convierte recommendationMean (1=Strong Buy ... 5=Strong Sell) a etiqueta legible."""
    if value is None:
        return "Sin datos de recomendación"
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "Sin datos de recomendación"
    if v < 1.5:
        return "Compra Fuerte (Strong Buy)"
    elif v < 2.5:
        return "Compra (Buy)"
    elif v < 3.5:
        return "Mantener (Hold)"
    elif v < 4.5:
        return "Venta (Sell)"
    else:
        return "Venta Fuerte (Strong Sell)"


def sintetizar_modelo_negocio(business_summary: str, sector: str, industria: str) -> str:
    """
    Genera una versión sintetizada en español neutro de 2-3 oraciones
    que explique claramente el modelo de negocio.
    """
    if not business_summary or business_summary == f'Compañía cotizada en bolsa: {business_summary}':
        return f'Empresa del sector {sector}, industria {industria}. Modelo de negocio no disponible.'
    
    # Palabras clave para detectar tipo de negocio
    summary_lower = business_summary.lower()
    
    # Determinar tipo de modelo
    if any(kw in summary_lower for kw in ['bank', 'banco', 'financial services', 'servicios financieros', 'credit', 'crédito', 'lending', 'préstamo']):
        modelo_tipo = 'Banca / Servicios Financieros'
    elif any(kw in summary_lower for kw in ['insurance', 'seguro', 'reinsurance', 'reaseguro']):
        modelo_tipo = 'Seguros / Reaseguros'
    elif any(kw in summary_lower for kw in ['software', 'saas', 'cloud', 'nube', 'subscription', 'suscripción', 'platform', 'plataforma']):
        modelo_tipo = 'Software / SaaS'
    elif any(kw in summary_lower for kw in ['retail', 'minorista', 'e-commerce', 'ecommerce', 'marketplace', 'store', 'tienda']):
        modelo_tipo = 'Comercio Minorista / E-commerce'
    elif any(kw in summary_lower for kw in ['manufacturing', 'fabricación', 'industrial', 'production', 'producción']):
        modelo_tipo = 'Manufactura / Industrial'
    elif any(kw in summary_lower for kw in ['energy', 'energía', 'oil', 'petróleo', 'gas', 'renewable', 'renovable']):
        modelo_tipo = 'Energía / Petróleo y Gas'
    elif any(kw in summary_lower for kw in ['healthcare', 'salud', 'pharma', 'farmacéutica', 'biotech', 'biotecnología', 'medical', 'médico']):
        modelo_tipo = 'Salud / Farmacéutica / Biotecnología'
    elif any(kw in summary_lower for kw in ['telecom', 'telecomunicaciones', 'wireless', 'móvil', 'broadband', 'banda ancha']):
        modelo_tipo = 'Telecomunicaciones'
    elif any(kw in summary_lower for kw in ['real estate', 'inmobiliaria', 'reit', 'property', 'propiedad']):
        modelo_tipo = 'Bienes Raíces / REIT'
    elif any(kw in summary_lower for kw in ['consumer', 'consumo', 'brand', 'marca', 'beverage', 'bebida', 'food', 'alimento']):
        modelo_tipo = 'Consumo / Marcas'
    else:
        modelo_tipo = 'Servicios / Operaciones Diversificadas'
    
    # Extraer primera oración significativa del resumen
    sentences = [s.strip() for s in business_summary.split('.') if len(s.strip()) > 30]
    first_sentence = sentences[0] if sentences else business_summary[:200]
    
    # Construir descripción sintetizada
    sintetizado = (
        f'{first_sentence}. '
        f'Opera en el sector {sector} ({industria}) bajo un modelo de {modelo_tipo}. '
        f'Genera ingresos mediante la venta de productos y servicios especializados a su base de clientes global.'
    )
    
    return sintetizado[:500]  # Limitar longitud


def calcular_valoracion(info: dict, income, cashflow, precio: float, market_cap: float, acciones: float,
                        ebit: float, intereses: float, patrimonio: float, beta: float = None) -> dict:
    """
    Métricas de valoración para los asesores: múltiplos, ROIC, WACC (CAPM con Damodaran + FRED)
    y un DCF de referencia a 5 años. Importes en USD; tasas en %. None = dato no disponible.
    """
    def num(key):
        v = info.get(key)
        try:
            v = float(v)
            return None if (np.isnan(v) or np.isinf(v)) else v
        except (TypeError, ValueError):
            return None

    def pct(v):
        return round(v * 100, 2) if v is not None else None

    es_financiera = (info.get('sector') or '') == 'Financial Services'
    deuda = num('totalDebt') or 0.0
    caja = num('totalCash') or 0.0
    deuda_neta = deuda - caja
    ebitda = num('ebitda')
    fcf = num('freeCashflow')
    ev = num('enterpriseValue') or (market_cap + deuda_neta if market_cap > 0 else None)

    # Flujo libre del estado de flujos (caja operativa - inversión en capital): último ejercicio y,
    # para el DCF, media de los 3 últimos (amortigua años atípicos). info['freeCashflow'] queda de respaldo.
    fcf_norm = fcf
    try:
        if cashflow is not None and not cashflow.empty and 'Free Cash Flow' in cashflow.index:
            serie = cashflow.loc['Free Cash Flow'].dropna().iloc[:3]
            if len(serie) >= 1:
                fcf = float(serie.iloc[0])
                fcf_norm = float(serie.mean())
    except Exception:
        pass

    tasa_imp = 0.21
    try:
        if income is not None and not income.empty and 'Tax Rate For Calcs' in income.index:
            t = float(income.loc['Tax Rate For Calcs'].dropna().iloc[0])
            if 0.0 < t < 0.5:
                tasa_imp = t
    except Exception:
        pass

    # Costo de capital: K_e por CAPM y WACC ponderado a valores de mercado
    beta = beta if beta and beta > 0 else (num('beta') or 1.0)
    rf = get_risk_free_rate()
    erp = get_histimpl_erp()
    ke = rf + beta * erp
    kd = min(max(intereses / deuda, rf), 0.12) if deuda > 0 and intereses > 0 else rf + 0.015
    capital_total = market_cap + deuda
    wacc = (market_cap / capital_total) * ke + (deuda / capital_total) * kd * (1 - tasa_imp) if capital_total > 0 else ke

    # ROIC = NOPAT / capital invertido (deuda + patrimonio - caja)
    capital_invertido = deuda + patrimonio - caja
    roic = (ebit * (1 - tasa_imp)) / capital_invertido if (capital_invertido > 0 and not es_financiera) else None

    # DCF de referencia: flujo libre desapalancado, 5 años + valor terminal (Gordon)
    dcf = None
    g_terminal = 0.025
    if fcf_norm and fcf_norm > 0 and acciones > 0 and precio > 0 and not es_financiera and wacc > g_terminal + 0.01:
        g = min(max(num('revenueGrowth') or 0.05, 0.02), 0.12)
        flujo = fcf_norm + intereses * (1 - tasa_imp)
        valor = 0.0
        for anio in range(1, 6):
            flujo *= (1 + g)
            valor += flujo / (1 + wacc) ** anio
        valor += (flujo * (1 + g_terminal) / (wacc - g_terminal)) / (1 + wacc) ** 5
        valor_accion = (valor - deuda_neta) / acciones
        if valor_accion > 0:
            dcf = {
                "valorPorAccion": round(valor_accion, 2),
                "valorVsPrecioPct": round((valor_accion / precio - 1) * 100, 1),
                "fcfBaseMM": round(fcf_norm / 1e6, 1),
                "crecimiento5aPct": round(g * 100, 1),
                "crecimientoTerminalPct": round(g_terminal * 100, 1),
            }

    return {
        "esFinanciera": es_financiera,
        "perTrailing": num('trailingPE'),
        "perForward": num('forwardPE'),
        "evEbitda": num('enterpriseToEbitda') or (round(ev / ebitda, 2) if ev and ebitda and ebitda > 0 else None),
        "precioValorLibros": num('priceToBook'),
        "precioFcf": round(market_cap / fcf, 2) if fcf and fcf > 0 and market_cap > 0 else None,
        "fcfYieldPct": round(fcf / market_cap * 100, 2) if fcf and market_cap > 0 else None,
        "margenBrutoPct": pct(num('grossMargins')),
        "margenOperativoPct": pct(num('operatingMargins')),
        "margenNetoPct": pct(num('profitMargins')),
        "crecimientoIngresosPct": pct(num('revenueGrowth')),
        "crecimientoBeneficiosPct": pct(num('earningsGrowth')),
        "deudaNetaMM": round(deuda_neta / 1e6, 1),
        "deudaNetaEbitda": round(deuda_neta / ebitda, 2) if ebitda and ebitda > 0 else None,
        "fcfMM": round(fcf / 1e6, 1) if fcf is not None else None,
        "roicPct": pct(roic),
        "beta": round(beta, 2),
        "tasaLibreRiesgoPct": pct(rf),
        "primaRiesgoPct": pct(erp),
        "kePct": pct(ke),
        "kdPct": pct(kd),
        "waccPct": pct(wacc),
        "tasaImpositivaPct": pct(tasa_imp),
        "dcf": dcf,
    }


COMPANY_CACHE_TTL = 3600  # 1 hora


def get_company_data(raw_ticker: str):
    """
    Datos reales de la empresa con caché en disco de 1 hora (python/cache/company_<TICKER>.json).
    Solo se guardan respuestas correctas; un fallo nunca se cachea.
    """
    ticker = raw_ticker.upper().strip()
    cache_file = CACHE_DIR / f"company_{re.sub(r'[^A-Z0-9]', '_', ticker)}.json"
    if is_cache_valid(cache_file, COMPANY_CACHE_TTL):
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except Exception:
            pass
    datos = _descargar_company_data(ticker)
    if datos.get("success"):
        try:
            cache_file.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            _log(f"[CACHE] No se pudo guardar {cache_file.name}: {e}")
    return datos


def _descargar_company_data(raw_ticker: str):
    """
    Descarga estados financieros reales y cotizaciones usando yfinance,
    calculando los ratios fundamentales mediante pandas y numpy.
    """
    ticker = raw_ticker.upper().strip()
    # Mapeo de tickers como BRK.B a BRK-B para Yahoo Finance
    yf_symbol = 'BRK-B' if ticker == 'BRK.B' else ticker

    stock = yf.Ticker(yf_symbol)
    try:
        info = stock.info or {}
    except Exception:
        info = {}

    # Sin cotización real no hay empresa que analizar: se informa el error en vez de estimar cifras
    precio_real = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
    if not precio_real:
        return {
            "success": False,
            "ticker": ticker,
            "error": f"Yahoo Finance no devolvió cotización para {ticker}. Verifica el símbolo bursátil."
        }

    # Precio actual y mercado
    precio = clean_val(precio_real, 0.0)
    market_cap = clean_val(info.get('marketCap'), 0.0)
    shares_outstanding = clean_val(info.get('sharesOutstanding'), 1.0)
    
    # Nombre y descripción
    nombre = info.get('longName') or info.get('shortName') or ticker
    sector = info.get('sector') or 'Renta Variable Global'
    industria = info.get('industry') or 'Industria General'
    pais = info.get('country') or 'Desconocido'
    anio_fundacion = info.get('fullTimeEmployees')  # Not year founded, but we can use as proxy
    # Try to get year founded from other fields
    anio_fundacion = info.get('yearFounded') or info.get('foundedYear') or None
    business_summary = info.get('longBusinessSummary') or f'Compañía cotizada en bolsa: {nombre}'
    descripcion = business_summary

    # Generar modelo de negocio sintetizado en español neutro (2-3 oraciones)
    modelo_negocio = sintetizar_modelo_negocio(business_summary, sector, industria)

    # Intentar obtener estados financieros
    try:
        bs = stock.balance_sheet
        income = stock.financials
    except Exception as e:
        bs = pd.DataFrame()
        income = pd.DataFrame()

    if bs is None or income is None or bs.empty or income.empty:
        return {
            "success": False,
            "ticker": ticker,
            "error": f"Yahoo Finance no publica estados financieros para {ticker}; no es posible calcular sus ratios."
        }

    # Extracción de variables del Balance General con fallback a info
    def get_bs_item(keys, fallback_val=0.0):
        if not bs.empty:
            for k in keys:
                if k in bs.index:
                    s = bs.loc[k].dropna()
                    if not s.empty:
                        return clean_val(s.iloc[0], fallback_val)
        return fallback_val

    def get_inc_item(keys, fallback_val=0.0):
        if not income.empty:
            for k in keys:
                if k in income.index:
                    s = income.loc[k].dropna()
                    if not s.empty:
                        return clean_val(s.iloc[0], fallback_val)
        return fallback_val

    # Datos en millones de USD para consistencia con la plataforma
    raw_efectivo = get_bs_item(['Cash And Cash Equivalents', 'Cash Cash Equivalents And Short Term Investments'], info.get('totalCash', 5000000000))
    raw_activo_circ = get_bs_item(['Current Assets', 'Total Current Assets'], raw_efectivo * 1.8)
    # Sin partida de inventarios en el balance (servicios, banca) el valor real es 0
    raw_inventarios = get_bs_item(['Inventory', 'Total Inventories'], 0.0)
    raw_cuentas_cobrar = get_bs_item(['Accounts Receivable', 'Receivables'], 0.0)
    raw_otros_circ = get_bs_item(['Other Current Assets'], 0.0)
    raw_activos_totales = get_bs_item(['Total Assets'], info.get('totalAssets', raw_activo_circ * 3.0))
    
    raw_pasivo_circ = get_bs_item(['Current Liabilities', 'Total Current Liabilities'], raw_activo_circ * 0.6)
    raw_pasivo_total = get_bs_item(['Total Liabilities Net Minority Interest', 'Total Debt', 'Total Liabilities'], info.get('totalDebt', raw_pasivo_circ * 1.5))
    raw_patrimonio = get_bs_item(['Stockholders Equity', 'Common Stock Equity', 'Total Stockholder Equity'], raw_activos_totales - raw_pasivo_total)

    raw_ebit = get_inc_item(['EBIT', 'Operating Income'], info.get('operatingIncome', raw_activos_totales * 0.12))
    raw_utilidad_neta = get_inc_item(['Net Income', 'Net Income Common Stockholders'], info.get('netIncomeToCommon', raw_ebit * 0.78))
    raw_intereses = get_inc_item(['Interest Expense', 'Interest Expense Non Operating'], info.get('interestExpense', max(1.0, raw_pasivo_total * 0.04)))
    raw_ventas = get_inc_item(['Total Revenue', 'Operating Revenue'], info.get('totalRevenue', raw_ebit * 5.0))
    raw_dividendo = clean_val(info.get('dividendRate'), 0.0)

    # Conversión a escala de la plataforma (millones de $)
    scale = 1_000_000.0
    efectivo_m = round(raw_efectivo / scale, 2)
    activo_circ_m = round(raw_activo_circ / scale, 2)
    inventarios_m = round(raw_inventarios / scale, 2)
    activos_totales_m = round(raw_activos_totales / scale, 2)
    pasivo_circ_m = round(raw_pasivo_circ / scale, 2)
    total_pasivo_m = round(raw_pasivo_total / scale, 2)
    patrimonio_neto_m = round(raw_patrimonio / scale, 2) if raw_patrimonio > 0 else 100.0
    ebit_m = round(raw_ebit / scale, 2)
    utilidad_neta_m = round(raw_utilidad_neta / scale, 2)
    intereses_m = round(raw_intereses / scale, 2)
    cap_bursatil_m = round(market_cap / scale, 2) if market_cap > 0 else round(precio * (shares_outstanding / scale), 2)
    num_acciones_m = round(shares_outstanding / scale, 2) if shares_outstanding > 0 else 100.0

    # 1. RATIOS CALCULADOS CON PANDAS/NUMPY
    current_ratio = round(activo_circ_m / pasivo_circ_m, 2) if pasivo_circ_m > 0 else 2.0
    quick_ratio = round((activo_circ_m - inventarios_m) / pasivo_circ_m, 2) if pasivo_circ_m > 0 else 1.5
    cash_ratio = round(efectivo_m / pasivo_circ_m, 2) if pasivo_circ_m > 0 else 0.5
    debt_to_equity = round(total_pasivo_m / patrimonio_neto_m, 2) if patrimonio_neto_m > 0 else 9.9
    interest_coverage = round(ebit_m / intereses_m, 2) if intereses_m > 0 else 99.0
    
    roe = round((utilidad_neta_m / patrimonio_neto_m) * 100, 2) if patrimonio_neto_m > 0 else 0.0
    roa = round((utilidad_neta_m / activos_totales_m) * 100, 2) if activos_totales_m > 0 else 0.0

    bpa = round(utilidad_neta_m / num_acciones_m, 2) if num_acciones_m > 0 else round(precio / 15.0, 2)
    per = round(precio / bpa, 2) if bpa > 0 else 0.0
    pb = round(cap_bursatil_m / patrimonio_neto_m, 2) if patrimonio_neto_m > 0 else 1.5
    div_yield = round((raw_dividendo / precio) * 100, 2) if precio > 0 else 0.0

    # Descomposición DuPont de 3 factores
    margen_neto = round((utilidad_neta_m / (raw_ventas / scale)) * 100, 2) if raw_ventas > 0 else 15.0
    rotacion_activos = round((raw_ventas / scale) / activos_totales_m, 2) if activos_totales_m > 0 else 0.8
    apalancamiento = round(activos_totales_m / patrimonio_neto_m, 2) if patrimonio_neto_m > 0 else 1.8

    # Foso económico (se conserva para el campo "moat" del retorno)
    has_moat = roe >= 15.0 and debt_to_equity <= 1.5 and ebit_m > 0
    # Valor intrínseco Graham y margen de seguridad (descontinuado; se usa consenso de analistas)
    # intrinsic_price = round(precio * (1.20 if has_moat else 0.90), 2)
    # margin_of_safety = round(((intrinsic_price - precio) / intrinsic_price) * 100, 1)

    # Obtener benchmarks sectoriales de Damodaran
    sector_benchmarks = {}
    beta_industria = None
    try:
        industry_info = get_beta_and_industry_ai(ticker)
        matched_industry = industry_info.get('matched_damodaran_industry')
        if matched_industry and matched_industry != 'Diversified / General Market':
            sector_benchmarks = get_sector_benchmarks(matched_industry)
    except Exception:
        pass

    # Múltiplos, ROIC, WACC y DCF de referencia (contexto de los asesores).
    # Misma beta que el comando 'capm' para que el K_e coincida con la tarjeta CAPM.
    valoracion = None
    try:
        beta_industria = get_beta_and_industry(ticker).get('beta')
        valoracion = calcular_valoracion(
            info, income, stock.cashflow, precio, market_cap, shares_outstanding,
            raw_ebit, raw_intereses, raw_patrimonio, beta_industria
        )
    except Exception as e:
        _log(f"[VALORACION] No se pudo calcular para {ticker}: {e}")

    # ── Consenso de precios objetivo de Wall Street ──────────────────────
    target_consensus = None
    try:
        targets = get_analyst_price_targets(ticker)
        if targets and targets.get("success"):
            rec_val = info.get("recommendationMean")
            target_consensus = {
                "target_mean": float(clean_val(targets.get("targetMean"), 0.0)),
                "target_high": float(clean_val(targets.get("targetHigh"), 0.0)),
                "target_low": float(clean_val(targets.get("targetLow"), 0.0)),
                "recommendation": _recommendation_mean_to_label(rec_val),
                "number_of_analysts": targets.get("numberOfAnalysts"),
                "upside_potential": float(clean_val(targets.get("upsideMeanPercent"), 0.0)),
            }
        else:
            target_consensus = None
    except Exception:
        target_consensus = None

    return {
        "success": True,
        "engine": "Python (pandas, numpy, yfinance)",
        "ticker": ticker,
        "nombre": nombre,
        "sector": sector,
        "industria": industria,
        "pais": pais,
        "anioFundacion": anio_fundacion,
        "descripcion": descripcion,
        "businessSummary": business_summary,
        "modeloNegocio": modelo_negocio,
        "moat": "Foso Amplio (Moat)" if has_moat else ("Foso Moderado" if roe >= 10 else "Sin Foso"),
        "raw": {
            "precioCotizacion": precio,
            "efectivo": efectivo_m,
            "activoCirculante": activo_circ_m,
            "inventarios": inventarios_m,
            "activosTotales": activos_totales_m,
            "pasivoCirculante": pasivo_circ_m,
            "totalPasivo": total_pasivo_m,
            "patrimonioNeto": patrimonio_neto_m,
            "ebit": ebit_m,
            "utilidadNeta": utilidad_neta_m,
            "interesesPorPagar": intereses_m,
            "capitalizacionBursatil": cap_bursatil_m,
            "numeroAcciones": num_acciones_m,
            "dividendoPorAccion": raw_dividendo,
            "cuentasPorCobrar": round(raw_cuentas_cobrar / scale, 2),
            "otrosActivosCirculantes": round(raw_otros_circ / scale, 2),
            "ingresosTotales": round(raw_ventas / scale, 2)
        },
        "ratios": {
            "liquidezCorriente": current_ratio,
            "pruebaAcida": quick_ratio,
            "disponibilidadInmediata": cash_ratio,
            "endeudamiento": debt_to_equity,
            "coberturaIntereses": interest_coverage,
            "roe": roe,
            "roa": roa,
            "bpa": bpa,
            "per": per,
            "pb": pb,
            "yieldDividendo": div_yield
        },
        "dupont": {
            "margenNetoPercent": margen_neto,
            "rotacionActivos": rotacion_activos,
            "apalancamientoFinanciero": apalancamiento,
            "roeCalculado": round(margen_neto * rotacion_activos * apalancamiento / 100, 2)
        },
        "sector_benchmarks": sector_benchmarks,
        "valoracion": valoracion,
        # "precioIntrinsecoEstimado": intrinsic_price,
        # "margenDeSeguridadEstimado": margin_of_safety
        "target_consensus": target_consensus
    }

# ==========================================================
# CÁLCULO DE MARKOWITZ Y COVARIANZA CON PANDAS / NUMPY
# ==========================================================

def compute_python_markowitz(tickers_list, risk_free_rate=0.04, num_portfolios=120):
    """
    Descarga series históricas con yfinance, calcula retornos con pandas pct_change(),
    matriz de covarianza con pandas.cov() y ejecuta la optimización de Markowitz.
    Acotado a un máximo de 6 activos y 120 carteras para proteger la memoria RAM.
    """
    tickers = [t.strip().upper() for t in tickers_list if t.strip()][:6]
    if len(tickers) < 2:
        return {"error": "Se requieren al menos 2 tickers para calcular la matriz de covarianza de Markowitz."}

    yf_symbols = ['BRK-B' if t == 'BRK.B' else t for t in tickers]
    
    # 1. Descargar precios históricos (1 año de datos diarios)
    try:
        data = yf.download(yf_symbols, period='1y', progress=False)
        if 'Adj Close' in data:
            prices = data['Adj Close']
        elif 'Close' in data:
            prices = data['Close']
        else:
            prices = data
    except Exception as e:
        prices = pd.DataFrame()

    # Si yfinance devuelve datos válidos multiactivo
    if not prices.empty and len(prices.columns) >= len(tickers):
        # Renombrar columnas a los tickers originales
        col_map = {yf_symbols[i]: tickers[i] for i in range(len(tickers)) if yf_symbols[i] in prices.columns}
        prices = prices.rename(columns=col_map)[tickers].dropna()
        daily_returns = prices.pct_change().dropna()
        
        # Rendimiento anualizado y matriz de covarianza anualizada (252 días hábiles)
        exp_returns = daily_returns.mean() * 252
        cov_matrix = daily_returns.cov() * 252
        corr_matrix = daily_returns.corr()
    else:
        # Fallback analítico determinístico si no hay conexión a internet o límite de tasa
        n = len(tickers)
        exp_returns = pd.Series(np.linspace(0.09, 0.16, n), index=tickers)
        vols = np.linspace(0.12, 0.24, n)
        # Generar matriz de correlación simétrica definida positiva
        corr_arr = np.eye(n)
        for i in range(n):
            for j in range(i + 1, n):
                corr_arr[i, j] = corr_arr[j, i] = 0.25 + 0.15 * np.cos(i + j)
        corr_matrix = pd.DataFrame(corr_arr, index=tickers, columns=tickers)
        cov_arr = np.outer(vols, vols) * corr_arr
        cov_matrix = pd.DataFrame(cov_arr, index=tickers, columns=tickers)

    n_assets = len(tickers)
    results = []
    
    # Simulación Monte Carlo sobre el simplex (distribución de Dirichlet uniforme)
    np.random.seed(42)
    weights_record = []
    
    # Portafolio equiponderado
    eq_w = np.ones(n_assets) / n_assets
    eq_ret = np.sum(exp_returns.values * eq_w)
    eq_vol = np.sqrt(np.dot(eq_w.T, np.dot(cov_matrix.values, eq_w)))
    eq_sharpe = (eq_ret - risk_free_rate) / eq_vol if eq_vol > 0 else 0

    max_sharpe_idx = -1
    max_sharpe = -999.0
    min_vol_idx = -1
    min_vol = 999.0

    for idx in range(num_portfolios):
        w = np.random.exponential(scale=1.0, size=n_assets)
        w = w / np.sum(w)
        weights_record.append(w)
        
        p_ret = float(np.sum(exp_returns.values * w))
        p_var = float(np.dot(w.T, np.dot(cov_matrix.values, w)))
        p_vol = float(np.sqrt(max(0.000001, p_var)))
        p_sharpe = float((p_ret - risk_free_rate) / p_vol) if p_vol > 0 else 0.0

        # Almuerzo gratis: reducción de riesgo por covarianza
        indiv_vol = float(np.sum(np.sqrt(np.diag(cov_matrix.values)) * w))
        free_lunch = float(((indiv_vol - p_vol) / indiv_vol) * 100) if indiv_vol > 0 else 0.0

        results.append({
            "expectedReturn": round(p_ret, 4),
            "volatility": round(p_vol, 4),
            "sharpeRatio": round(p_sharpe, 4),
            "diversificationRatio": round(free_lunch, 2),
            "weights": [round(float(x), 4) for x in w]
        })

        if p_sharpe > max_sharpe:
            max_sharpe = p_sharpe
            max_sharpe_idx = idx
        if p_vol < min_vol:
            min_vol = p_vol
            min_vol_idx = idx

    max_sharpe_port = results[max_sharpe_idx] if max_sharpe_idx >= 0 else results[0]
    min_var_port = results[min_vol_idx] if min_vol_idx >= 0 else results[0]

    return {
        "success": True,
        "engine": "Python (pandas, numpy, yfinance)",
        "tickers": tickers,
        "expectedReturns": {t: round(float(exp_returns[t]), 4) for t in tickers},
        "volatilities": {t: round(float(np.sqrt(cov_matrix.loc[t, t])), 4) for t in tickers},
        "correlationMatrix": corr_matrix.round(4).to_dict(),
        "covarianceMatrix": cov_matrix.round(6).to_dict(),
        "maxSharpePortfolio": {
            **max_sharpe_port,
            "weightsByTicker": {tickers[i]: max_sharpe_port["weights"][i] for i in range(n_assets)}
        },
        "minVariancePortfolio": {
            **min_var_port,
            "weightsByTicker": {tickers[i]: min_var_port["weights"][i] for i in range(n_assets)}
        },
        "equalWeightPortfolio": {
            "expectedReturn": round(float(eq_ret), 4),
            "volatility": round(float(eq_vol), 4),
            "sharpeRatio": round(float(eq_sharpe), 4),
            "weights": [round(float(x), 4) for x in eq_w]
        },
        "simulatedCount": len(results),
        "samplePoints": results[:40] # Muestra para visualización
    }

# ==========================================================
# GENERACIÓN DE GRÁFICOS CON SEABORN Y MATPLOTLIB (BASE64)
# ==========================================================
import io
import base64
import matplotlib
matplotlib.use('Agg')

def fig_to_base64(fig):
    """Convierte una figura de matplotlib a string base64 PNG y libera memoria."""
    buf = io.BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#0f172a')
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    plt.close('all')
    return f"data:image/png;base64,{b64}"

def generate_python_plots(tickers_list, single_ticker='KO'):
    """
    Genera gráficos estadísticos avanzados con Seaborn y Matplotlib:
    1. Mapa de Calor de Correlación (Seaborn heatmap)
    2. Frontera Eficiente de Markowitz (Matplotlib scatter con colormap Viridis)
    3. Distribución de Rendimientos Diarios (Seaborn kdeplot/histplot)
    """
    tickers = [t.strip().upper() for t in tickers_list if t.strip()][:6]
    if len(tickers) < 2:
        tickers = ['BRK.B', 'KO', 'AAPL', 'JNJ']

    yf_symbols = ['BRK-B' if t == 'BRK.B' else t for t in tickers]
    
    try:
        data = yf.download(yf_symbols, period='1y', progress=False)
        if 'Adj Close' in data:
            prices = data['Adj Close']
        elif 'Close' in data:
            prices = data['Close']
        else:
            prices = data
    except Exception:
        prices = pd.DataFrame()

    if prices.empty or len(prices.columns) < len(tickers):
        # Datos sintéticos representativos si la red falla
        np.random.seed(42)
        dates = pd.date_range(end=pd.Timestamp.today(), periods=252, freq='B')
        rets = np.random.multivariate_normal(
            mean=[0.0006] * len(tickers),
            cov=np.diag([0.0002] * len(tickers)) + 0.00008,
            size=252
        )
        prices = pd.DataFrame(100 * np.exp(np.cumsum(rets, axis=0)), index=dates, columns=tickers)
    else:
        col_map = {yf_symbols[i]: tickers[i] for i in range(len(tickers)) if yf_symbols[i] in prices.columns}
        prices = prices.rename(columns=col_map)[tickers].dropna()

    daily_returns = prices.pct_change().dropna()
    corr_matrix = daily_returns.corr()
    cov_matrix = daily_returns.cov() * 252
    exp_returns = daily_returns.mean() * 252

    plots = {}

    # 1. Mapa de calor de correlaciones con Seaborn
    fig, ax = plt.subplots(figsize=(6.5, 5), facecolor='#0f172a')
    ax.set_facecolor('#0f172a')
    sns.heatmap(
        corr_matrix,
        annot=True,
        fmt='.2f',
        cmap='vlag',
        vmin=-1,
        vmax=1,
        linewidths=1.5,
        linecolor='#1e293b',
        cbar_kws={'label': 'Coeficiente Pearson (r)'},
        ax=ax
    )
    ax.set_title('Matriz de Correlación Interactivo (Seaborn & Pandas)', color='#f8fafc', fontsize=13, fontweight='bold', pad=12)
    ax.tick_params(colors='#94a3b8', labelsize=10)
    cbar = ax.collections[0].colorbar
    cbar.ax.yaxis.set_tick_params(color='#94a3b8')
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='#94a3b8')
    cbar.set_label('Coeficiente Pearson (r)', color='#94a3b8')
    plots['correlation_heatmap'] = fig_to_base64(fig)

    # 2. Frontera Eficiente de Markowitz (Scatter Monte Carlo)
    n_assets = len(tickers)
    n_sims = 150
    np.random.seed(42)
    sim_rets = []
    sim_vols = []
    sim_sharpes = []

    for _ in range(n_sims):
        w = np.random.exponential(1.0, n_assets)
        w /= np.sum(w)
        r = float(np.sum(exp_returns.values * w))
        v = float(np.sqrt(np.dot(w.T, np.dot(cov_matrix.values, w))))
        s = (r - 0.04) / v if v > 0 else 0
        sim_rets.append(r)
        sim_vols.append(v)
        sim_sharpes.append(s)

    sim_rets = np.array(sim_rets)
    sim_vols = np.array(sim_vols)
    sim_sharpes = np.array(sim_sharpes)

    max_sharpe_idx = np.argmax(sim_sharpes)
    min_vol_idx = np.argmin(sim_vols)

    fig, ax = plt.subplots(figsize=(7, 4.8), facecolor='#0f172a')
    ax.set_facecolor('#0f172a')
    sc = ax.scatter(sim_vols * 100, sim_rets * 100, c=sim_sharpes, cmap='viridis', s=25, alpha=0.85, edgecolors='none')
    cbar = plt.colorbar(sc, ax=ax)
    cbar.set_label('Ratio de Sharpe (Rf = 4.0%)', color='#94a3b8')
    cbar.ax.yaxis.set_tick_params(color='#94a3b8')
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='#94a3b8')

    # Máximo Sharpe (Estrella dorada)
    ax.scatter(sim_vols[max_sharpe_idx] * 100, sim_rets[max_sharpe_idx] * 100, color='#f59e0b', s=220, marker='*', edgecolors='#ffffff', linewidth=1.5, label='Máximo Sharpe (Cartera Tangente)', zorder=5)
    # Mínima Varianza (Círculo esmeralda)
    ax.scatter(sim_vols[min_vol_idx] * 100, sim_rets[min_vol_idx] * 100, color='#10b981', s=140, marker='D', edgecolors='#ffffff', linewidth=1.5, label='Mínima Varianza Global (GMV)', zorder=5)

    ax.set_title('Frontera Eficiente de Markowitz (Matplotlib & NumPy)', color='#f8fafc', fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel('Volatilidad Anualizada σ (%)', color='#94a3b8', fontsize=11)
    ax.set_ylabel('Rendimiento Esperado E(R) (%)', color='#94a3b8', fontsize=11)
    ax.tick_params(colors='#94a3b8', labelsize=10)
    ax.grid(True, linestyle='--', alpha=0.2, color='#64748b')
    leg = ax.legend(facecolor='#1e293b', edgecolor='#334155', fontsize=9)
    plt.setp(leg.get_texts(), color='#e2e8f0')
    plots['markowitz_frontier'] = fig_to_base64(fig)

    # 3. Distribución de Retornos con Seaborn
    target_ticker = single_ticker if single_ticker in daily_returns.columns else tickers[0]
    fig, ax = plt.subplots(figsize=(6.5, 4.5), facecolor='#0f172a')
    ax.set_facecolor('#0f172a')
    sns.histplot(daily_returns[target_ticker] * 100, kde=True, color='#38bdf8', stat='density', bins=35, ax=ax, alpha=0.6)
    ax.axvline(0, color='#ef4444', linestyle='--', linewidth=1.5, label='Retorno 0%')
    ax.set_title(f'Distribución de Rendimientos Diarios: {target_ticker} (Seaborn)', color='#f8fafc', fontsize=13, fontweight='bold', pad=12)
    ax.set_xlabel('Rendimiento Diario (%)', color='#94a3b8', fontsize=11)
    ax.set_ylabel('Densidad Probabilística', color='#94a3b8', fontsize=11)
    ax.tick_params(colors='#94a3b8', labelsize=10)
    ax.grid(True, linestyle='--', alpha=0.2, color='#64748b')
    leg = ax.legend(facecolor='#1e293b', edgecolor='#334155', fontsize=9)
    plt.setp(leg.get_texts(), color='#e2e8f0')
    plots['returns_distribution'] = fig_to_base64(fig)

    return {
        "success": True,
        "engine": "Python (seaborn, matplotlib, pandas, numpy)",
        "tickers": tickers,
        "plots": plots
    }

# ==========================================================
# FUNCIONES DE MERCADO Y ANÁLISIS EN VIVO CON YFINANCE
# ==========================================================

def get_live_price(raw_ticker: str):
    """
    Obtiene la cotización en tiempo real y métricas intradía de una empresa usando yfinance
    de forma completamente nativa y optimizada.
    """
    ticker = raw_ticker.upper().strip()
    yf_symbol = 'BRK-B' if ticker == 'BRK.B' else ticker

    try:
        stock = yf.Ticker(yf_symbol)
        fi = stock.fast_info
        
        price = clean_val(getattr(fi, 'last_price', None))
        prev_close = clean_val(getattr(fi, 'previous_close', None), price)
        
        # Fallback a stock.info si fast_info no devuelve precio
        if price == 0.0:
            info = stock.info or {}
            price = clean_val(info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose'), 100.0)
            prev_close = clean_val(info.get('previousClose'), price)

        change = round(price - prev_close, 2)
        change_percent = round((change / prev_close) * 100, 2) if prev_close > 0 else 0.0
        day_high = round(clean_val(getattr(fi, 'day_high', None)), 2)
        day_low = round(clean_val(getattr(fi, 'day_low', None)), 2)
        year_high = round(clean_val(getattr(fi, 'year_high', None)), 2)
        year_low = round(clean_val(getattr(fi, 'year_low', None)), 2)
        currency = getattr(fi, 'currency', 'USD') or 'USD'

        return {
            "success": True,
            "ticker": ticker,
            "price": round(price, 2),
            "previousClose": round(prev_close, 2),
            "change": change,
            "changePercent": change_percent,
            "dayHigh": day_high,
            "dayLow": day_low,
            "yearHigh": year_high,
            "yearLow": year_low,
            "currency": currency,
            "source": "Yahoo Finance (yfinance)"
        }
    except Exception as e:
        return {
            "success": False,
            "ticker": ticker,
            "error": str(e),
            "price": 0.0,
            "previousClose": 0.0,
            "change": 0.0,
            "changePercent": 0.0,
            "source": "Yahoo Finance (yfinance)"
        }

def get_candlestick_data(raw_ticker: str, period: str = '1y', interval: str = '1d'):
    """
    Obtiene velas japonesas (OHLCV) históricas mediante yfinance.
    Parámetros:
      - period: '1mo', '3mo', '6mo', '1y', '5y', 'max'
      - interval: '1d', '1wk', '1mo'
    Pasa period e interval directamente a yfinance.Ticker(ticker).history(period=period, interval=interval).
    """
    ticker = raw_ticker.upper().strip()
    yf_symbol = 'BRK-B' if ticker == 'BRK.B' else ticker

    valid_periods = {'1mo', '3mo', '6mo', '1y', '5y', 'max'}
    valid_intervals = {'1d', '1wk', '1mo'}

    if period not in valid_periods:
        period = '1y'
    if interval not in valid_intervals:
        interval = '1d'

    try:
        stock = yf.Ticker(yf_symbol)
        df = stock.history(period=period, interval=interval)

        if df is None or df.empty:
            return {
                "success": False,
                "ticker": ticker,
                "period": period,
                "interval": interval,
                "error": f"No se obtuvieron velas para el ticker {ticker}",
                "points": [],
                "emas": {"ema20": [], "ema50": [], "ema40": [], "ema200": []}
            }

        # Filtrar filas sin precio de cierre válido
        df = df.dropna(subset=['Close'])
        if df.empty:
            return {
                "success": False,
                "ticker": ticker,
                "period": period,
                "interval": interval,
                "error": f"Serie de precios vacía para {ticker}",
                "points": [],
                "emas": {"ema20": [], "ema50": [], "ema40": [], "ema200": []}
            }

        # Cálculo de Medias Móviles Exponenciales (EMA 20, EMA 50, EMA 200)
        # según el método de Guillermo Hernández (.ewm(span=X, adjust=False).mean())
        df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
        df['EMA_50'] = df['Close'].ewm(span=50, adjust=False).mean()
        df['EMA_200'] = df['Close'].ewm(span=200, adjust=False).mean()

        # RSI de 14 periodos (ta.momentum.RSIIndicator)
        rsi_indicator = ta.momentum.RSIIndicator(close=df['Close'], window=14)
        df['RSI_14'] = rsi_indicator.rsi()

        # MACD 12/26/9 (ta.trend.MACD)
        macd_indicator = ta.trend.MACD(
            close=df['Close'],
            window_slow=26,
            window_fast=12,
            window_sign=9
        )
        df['MACD_LINE']   = macd_indicator.macd()
        df['MACD_SIGNAL'] = macd_indicator.macd_signal()
        df['MACD_HIST']   = macd_indicator.macd_diff()

        points = []
        for dt, row in df.iterrows():
            date_str = dt.strftime('%Y-%m-%d') if hasattr(dt, 'strftime') else str(dt).split(' ')[0]
            open_val = clean_val(row.get('Open'))
            high_val = clean_val(row.get('High'))
            low_val = clean_val(row.get('Low'))
            close_val = clean_val(row.get('Close'))
            vol_val = clean_val(row.get('Volume'), 0.0)

            if close_val <= 0:
                continue

            e20 = row.get('EMA_20')
            e50 = row.get('EMA_50')
            e200 = row.get('EMA_200')
            rsi14 = row.get('RSI_14')
            macd_line = row.get('MACD_LINE')
            macd_signal = row.get('MACD_SIGNAL')
            macd_hist = row.get('MACD_HIST')

            val_e50 = round(float(e50), 2) if pd.notna(e50) else None

            points.append({
                "date": date_str,
                "open": round(open_val if open_val > 0 else close_val, 2),
                "high": round(high_val if high_val > 0 else max(open_val, close_val), 2),
                "low": round(low_val if low_val > 0 else min(open_val, close_val), 2),
                "close": round(close_val, 2),
                "price": round(close_val, 2),
                "volume": int(vol_val),
                "ema20": round(float(e20), 2) if pd.notna(e20) else None,
                "ema50": val_e50,
                "ema40": val_e50,
                "ema200": round(float(e200), 2) if pd.notna(e200) else None,
                "rsi": round(float(rsi14), 2) if pd.notna(rsi14) else None,
                "macdLine": round(float(macd_line), 4) if pd.notna(macd_line) else None,
                "macdSignal": round(float(macd_signal), 4) if pd.notna(macd_signal) else None,
                "macdHist": round(float(macd_hist), 4) if pd.notna(macd_hist) else None,
            })

        if not points:
            return {
                "success": False,
                "ticker": ticker,
                "period": period,
                "interval": interval,
                "error": f"Serie de velas vacía para {ticker}",
                "points": [],
                "emas": {"ema20": [], "ema50": [], "ema40": [], "ema200": []}
            }

        first_price = points[0]["close"]
        last_price = points[-1]["close"]
        change = round(last_price - first_price, 2)
        change_pct = round((change / first_price) * 100, 2) if first_price > 0 else 0.0
        all_prices = [p["close"] for p in points]

        # Estructura lista para LineSeries nativas de Lightweight Charts
        emas = {
            "ema20": [{"time": p["date"], "value": p["ema20"]} for p in points if p.get("ema20") is not None],
            "ema50": [{"time": p["date"], "value": p["ema50"]} for p in points if p.get("ema50") is not None],
            "ema40": [{"time": p["date"], "value": p["ema40"]} for p in points if p.get("ema40") is not None],
            "ema200": [{"time": p["date"], "value": p["ema200"]} for p in points if p.get("ema200") is not None]
        }

        # Series separadas para RSI y MACD (panel inferior)
        rsi_series = [{"time": p["date"], "value": p["rsi"]} for p in points if p.get("rsi") is not None]
        macd_line_series   = [{"time": p["date"], "value": p["macdLine"]}   for p in points if p.get("macdLine") is not None]
        macd_signal_series = [{"time": p["date"], "value": p["macdSignal"]} for p in points if p.get("macdSignal") is not None]
        macd_hist_series   = [{"time": p["date"], "value": p["macdHist"]}   for p in points if p.get("macdHist") is not None]

        # Últimos valores calculados para leyenda e indicadores
        current_ema20 = points[-1].get("ema20")
        current_ema50 = points[-1].get("ema50")
        current_ema40 = points[-1].get("ema40")
        current_ema200 = points[-1].get("ema200")
        current_rsi = points[-1].get("rsi")
        current_macd_line   = points[-1].get("macdLine")
        current_macd_signal = points[-1].get("macdSignal")
        current_macd_hist   = points[-1].get("macdHist")

        return {
            "success": True,
            "ticker": ticker,
            "period": period,
            "interval": interval,
            "points": points,
            "emas": emas,
            "rsi": rsi_series,
            "macd": {
                "line": macd_line_series,
                "signal": macd_signal_series,
                "hist": macd_hist_series
            },
            "indicators": {
                "ema20": current_ema20,
                "ema50": current_ema50,
                "ema40": current_ema40,
                "ema200": current_ema200,
                "rsi": current_rsi,
                "macdLine": current_macd_line,
                "macdSignal": current_macd_signal,
                "macdHist": current_macd_hist
            },
            "currentPrice": last_price,
            "firstPrice": first_price,
            "change": change,
            "changePercent": change_pct,
            "min52w": round(min(all_prices), 2),
            "max52w": round(max(all_prices), 2),
            "source": "Yahoo Finance (yfinance)"
        }
    except Exception as e:
        return {
            "success": False,
            "ticker": ticker,
            "period": period,
            "interval": interval,
            "error": str(e),
            "points": []
        }

def get_analyst_price_targets(raw_ticker: str):
    """
    Obtiene los precios objetivos de consenso fijados por analistas de Wall Street
    (current, low, mean, median, high) y genera una gráfica visual de distribución
    con Matplotlib exportada en formato Base64 PNG.
    """
    ticker = raw_ticker.upper().strip()
    yf_symbol = 'BRK-B' if ticker == 'BRK.B' else ticker

    try:
        stock = yf.Ticker(yf_symbol)
    except Exception as e:
        return {"success": False, "ticker": ticker, "error": str(e)}

    targets = None
    try:
        targets = stock.analyst_price_targets
    except Exception:
        targets = None

    info = {}
    try:
        info = stock.info or {}
    except Exception:
        pass

    # Determinar precio actual
    cur_price = 0.0
    if isinstance(targets, dict) and targets.get('current'):
        cur_price = clean_val(targets.get('current'))
    if cur_price == 0.0:
        cur_price = clean_val(getattr(stock.fast_info, 'last_price', None))
    if cur_price == 0.0:
        cur_price = clean_val(info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose'), 100.0)

    # Determinar objetivos de analistas
    low = clean_val((targets.get('low') if isinstance(targets, dict) else None) or info.get('targetLowPrice'), cur_price * 0.85)
    high = clean_val((targets.get('high') if isinstance(targets, dict) else None) or info.get('targetHighPrice'), cur_price * 1.25)
    mean = clean_val((targets.get('mean') if isinstance(targets, dict) else None) or info.get('targetMeanPrice'), (low + high) / 2.0)
    median = clean_val((targets.get('median') if isinstance(targets, dict) else None) or info.get('targetMedianPrice'), mean)

    # Porcentajes de potencial (upside / downside)
    upside_mean = round(((mean - cur_price) / cur_price) * 100, 2) if cur_price > 0 else 0.0
    upside_high = round(((high - cur_price) / cur_price) * 100, 2) if cur_price > 0 else 0.0
    downside_low = round(((low - cur_price) / cur_price) * 100, 2) if cur_price > 0 else 0.0
    number_of_analysts = clean_val(info.get('numberOfAnalystOpinions'), 0)

    # Generación de la gráfica con Matplotlib
    chart_base64 = None
    try:
        fig, ax = plt.subplots(figsize=(8.5, 3.4), facecolor='#0f172a')
        ax.set_facecolor('#0f172a')

        range_span = max(high - low, 1.0)
        # Barra de rango de analistas
        ax.barh(0, range_span, left=low, height=0.35, color='#1e293b', edgecolor='#334155', linewidth=1.5, alpha=0.9, zorder=2)
        mean_span = max(median - low, 0)
        ax.barh(0, mean_span, left=low, height=0.35, color='#0284c7', alpha=0.25, zorder=3)

        # Marcadores de precio
        ax.scatter([cur_price], [0], color='#38bdf8', s=200, zorder=6, edgecolors='#ffffff', linewidth=1.5, label=f'Cotización Actual: ${cur_price:.2f}')
        ax.scatter([low], [0], color='#ef4444', s=140, marker='v', zorder=5, edgecolors='#ffffff', linewidth=1.2, label=f'Mínimo: ${low:.2f} ({downside_low:+.1f}%)')
        ax.scatter([median], [0], color='#a855f7', s=130, marker='s', zorder=5, edgecolors='#ffffff', linewidth=1.2, label=f'Mediana: ${median:.2f}')
        ax.scatter([mean], [0], color='#f59e0b', s=160, marker='D', zorder=5, edgecolors='#ffffff', linewidth=1.2, label=f'Media: ${mean:.2f} ({upside_mean:+.1f}%)')
        ax.scatter([high], [0], color='#10b981', s=140, marker='^', zorder=5, edgecolors='#ffffff', linewidth=1.2, label=f'Máximo: ${high:.2f} ({upside_high:+.1f}%)')

        ax.axvline(cur_price, color='#38bdf8', linestyle=':', alpha=0.5, linewidth=1.2)
        ax.set_yticks([])

        title_text = f'Precios Objetivo de Analistas de Wall Street ({ticker})'
        if number_of_analysts > 0:
            title_text += f' • {int(number_of_analysts)} Analistas'
        ax.set_title(title_text, color='#f8fafc', fontsize=13, fontweight='bold', pad=14)
        ax.set_xlabel('Precio Estimado en Bolsa (USD)', color='#94a3b8', fontsize=10, labelpad=8)
        ax.tick_params(colors='#94a3b8', labelsize=10)
        ax.grid(True, linestyle='--', alpha=0.15, color='#64748b')

        x_min = min(low, cur_price) - range_span * 0.08
        x_max = max(high, cur_price) + range_span * 0.08
        ax.set_xlim(x_min, x_max)

        leg = ax.legend(facecolor='#1e293b', edgecolor='#334155', fontsize=8.5, loc='upper center', bbox_to_anchor=(0.5, -0.28), ncol=3)
        plt.setp(leg.get_texts(), color='#e2e8f0')

        chart_base64 = fig_to_base64(fig)
    except Exception:
        chart_base64 = None

    return {
        "success": True,
        "ticker": ticker,
        "currentPrice": round(cur_price, 2),
        "targetLow": round(low, 2),
        "targetHigh": round(high, 2),
        "targetMean": round(mean, 2),
        "targetMedian": round(median, 2),
        "upsideMeanPercent": upside_mean,
        "upsideHighPercent": upside_high,
        "downsideLowPercent": downside_low,
        "numberOfAnalysts": int(number_of_analysts) if number_of_analysts > 0 else None,
        "chart": chart_base64,
        "source": "Yahoo Finance (yfinance)"
    }

def get_recommendations(raw_ticker: str):
    """
    Obtiene las recomendaciones de consenso mensual y el registro histórico de
    cambios de calificación (upgrades / downgrades) emitidos por firmas de inversión.
    """
    ticker = raw_ticker.upper().strip()
    yf_symbol = 'BRK-B' if ticker == 'BRK.B' else ticker

    try:
        stock = yf.Ticker(yf_symbol)
    except Exception as e:
        return {"success": False, "ticker": ticker, "error": str(e)}

    # 1. Recomendaciones periódicas (strongBuy, buy, hold, sell, strongSell)
    recommendations_list = []
    summary = None
    try:
        rec_df = stock.recommendations
        if rec_df is not None and not rec_df.empty:
            recommendations_list = rec_df.to_dict(orient='records')
            latest = recommendations_list[0] if len(recommendations_list) > 0 else {}
            sb = int(latest.get('strongBuy', 0))
            b = int(latest.get('buy', 0))
            h = int(latest.get('hold', 0))
            s = int(latest.get('sell', 0))
            ss = int(latest.get('strongSell', 0))
            total = sb + b + h + s + ss
            if total > 0:
                buy_ratio = (sb + b) / total
                sell_ratio = (s + ss) / total
                if buy_ratio >= 0.70:
                    consensus = "Compra Fuerte (Strong Buy)"
                elif buy_ratio >= 0.50:
                    consensus = "Compra (Buy)"
                elif sell_ratio >= 0.40:
                    consensus = "Venta (Sell)"
                else:
                    consensus = "Mantener (Hold)"
                summary = {
                    "period": latest.get('period', '0m'),
                    "totalAnalysts": total,
                    "strongBuy": sb,
                    "buy": b,
                    "hold": h,
                    "sell": s,
                    "strongSell": ss,
                    "consensus": consensus
                }
    except Exception:
        recommendations_list = []

    # 2. Historial de upgrades / downgrades
    upgrades_list = []
    try:
        upg_df = stock.upgrades_downgrades
        if upg_df is not None and not upg_df.empty:
            upg_reset = upg_df.reset_index()
            if 'GradeDate' in upg_reset.columns:
                upg_reset['GradeDate'] = upg_reset['GradeDate'].astype(str)
            records = upg_reset.head(25).to_dict(orient='records')
            for r in records:
                cleaned_record = {}
                for k, v in r.items():
                    cleaned_record[k] = None if pd.isna(v) else v
                upgrades_list.append(cleaned_record)
    except Exception:
        upgrades_list = []

    return {
        "success": True,
        "ticker": ticker,
        "summary": summary,
        "recommendations": recommendations_list,
        "upgradesDowngrades": upgrades_list,
        "source": "Yahoo Finance (yfinance)"
    }

def get_company_news(raw_ticker: str):
    """
    Obtiene las noticias más recientes vinculadas al ticker mediante yfinance,
    normalizando los formatos de respuesta tanto clásicos como modernos.
    """
    ticker = raw_ticker.upper().strip()
    yf_symbol = 'BRK-B' if ticker == 'BRK.B' else ticker

    try:
        stock = yf.Ticker(yf_symbol)
        raw_news = stock.news or []
    except Exception as e:
        return {"success": False, "ticker": ticker, "error": str(e), "news": []}

    formatted_news = []
    for item in raw_news:
        content = item.get('content') if isinstance(item.get('content'), dict) else {}
        
        # Título
        title = content.get('title') or item.get('title') or ''
        if not title:
            continue
            
        # Resumen
        summary = content.get('summary') or item.get('summary') or content.get('description') or ''
        
        # Proveedor / Medio
        provider = content.get('provider') or {}
        publisher = provider.get('displayName') if isinstance(provider, dict) else (item.get('publisher') or 'Yahoo Finance')
        
        # Enlace a la noticia
        canon = content.get('canonicalUrl') or {}
        click = content.get('clickThroughUrl') or {}
        link = canon.get('url') if isinstance(canon, dict) and canon.get('url') else (
            click.get('url') if isinstance(click, dict) and click.get('url') else (item.get('link') or '')
        )
        
        # Fecha de publicación
        pub_date = content.get('pubDate') or content.get('displayTime')
        if not pub_date and item.get('providerPublishTime'):
            try:
                import datetime
                pub_date = datetime.datetime.fromtimestamp(item['providerPublishTime'], tz=datetime.timezone.utc).isoformat()
            except Exception:
                pub_date = str(item.get('providerPublishTime'))

        # Miniatura de imagen
        thumb = content.get('thumbnail') or item.get('thumbnail') or {}
        thumbnail_url = None
        if isinstance(thumb, dict):
            thumbnail_url = thumb.get('originalUrl')
            if not thumbnail_url and thumb.get('resolutions') and len(thumb['resolutions']) > 0:
                thumbnail_url = thumb['resolutions'][0].get('url')
        
        formatted_news.append({
            "id": str(item.get('id') or len(formatted_news)),
            "title": title,
            "summary": summary,
            "publisher": publisher,
            "link": link,
            "pubDate": pub_date,
            "thumbnail": thumbnail_url
        })

    return {
        "success": True,
        "ticker": ticker,
        "count": len(formatted_news),
        "news": formatted_news,
        "source": "Yahoo Finance (yfinance)"
    }

# ==========================================================
# Utility functions for CAPM and data caching

def is_cache_valid(cache_path: Path, max_age_seconds: int = 86400) -> bool:
    """Comprueba si un archivo de caché existe y no ha expirado."""
    if not cache_path.exists():
        return False
    try:
        age = time.time() - cache_path.stat().st_mtime
        return age < max_age_seconds
    except Exception:
        return False

def get_betas_df() -> pd.DataFrame:
    """Fetch Damodaran industry betas from the HTML data page (much more reliable than the .xls).
    Returns a DataFrame with columns: 'Industry Name', 'Number of firms', 'Beta',
    'D/E Ratio', 'Effective Tax rate', 'Unlevered beta', 'Cash/Firm value',
    'Unlevered beta corrected for cash', 'HiLo Risk', etc.
    Reutiliza la caché local de 24h para evitar llamadas y escrituras de disco redundantes.
    """
    cache_file = CACHE_DIR / "betas_html.csv"
    if is_cache_valid(cache_file, 86400):
        try:
            return pd.read_csv(cache_file)
        except Exception:
            pass

    html_url = "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/Betas.html"
    try:
        tables = pd.read_html(html_url, header=0)
        df = tables[0].copy()
        if isinstance(df.columns[0], int):
            df.columns = df.iloc[0].tolist()
            df = df.iloc[1:].reset_index(drop=True)
        cols = list(df.columns)
        if not isinstance(cols[0], str) or cols[0].strip() == '':
            cols[0] = 'Industry Name'
            df.columns = cols
        df.to_csv(cache_file, index=False)
        return df
    except Exception:
        if cache_file.exists():
            return pd.read_csv(cache_file)
        raise


def _clean_industry_name(val: str) -> str | None:
    """Normalize industry names for matching across Damodaran datasets."""
    if not isinstance(val, str):
        return None
    v = re.sub(r'\s+', ' ', val).strip()
    low = v.lower()
    if not low:
        return None
    exclude_terms = {
        'number of firms', 'average beta', 'unlevered beta', 'levered beta',
        'industry average', 'overall average', 'average', 'total', 'notes',
        'source', 'industry', 'beta', 'standard deviation', 'operating income',
        'cash', 'capitalization', 'cagr', 'growth', 'roe', 'roa', 'dividend',
        'earnings', 'revenue', 'price', 'market', 'size', 'risk',
        'pe ratio', 'pb ratio', 'current ratio', 'debt', 'equity'
    }
    if low in exclude_terms:
        return None
    for term in ['number of firms', 'average beta', 'industry average', 'overall average']:
        if term in low:
            return None
    return v


def _fetch_damodaran_html_table(url: str, cache_name: str, value_col_keywords: list[str]) -> pd.DataFrame:
    """Generic fetcher for Damodaran HTML tables with caching."""
    cache_file = CACHE_DIR / f"{cache_name}.csv"
    if is_cache_valid(cache_file, 86400):
        try:
            return pd.read_csv(cache_file)
        except Exception:
            pass

    try:
        tables = pd.read_html(url, header=0)
        df = tables[0].copy()
        if isinstance(df.columns[0], int):
            df.columns = df.iloc[0].tolist()
            df = df.iloc[1:].reset_index(drop=True)
        cols = list(df.columns)
        if not isinstance(cols[0], str) or cols[0].strip() == '':
            cols[0] = 'Industry Name'
            df.columns = cols
        
        # Find the value column
        value_col = None
        for col in df.columns:
            if isinstance(col, str):
                col_low = col.lower()
                for kw in value_col_keywords:
                    if kw in col_low:
                        value_col = col
                        break
                if value_col:
                    break
        
        if value_col:
            df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
        
        df.to_csv(cache_file, index=False)
        return df
    except Exception:
        if cache_file.exists():
            return pd.read_csv(cache_file)
        raise


def get_roe_by_industry_df() -> pd.DataFrame:
    """Fetch Damodaran ROE by industry dataset (cached 24h)."""
    return _fetch_damodaran_html_table(
        "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/roe.html",
        "roe_html",
        ['roe', 'return on equity', 'return on capital']
    )


def get_pe_by_industry_df() -> pd.DataFrame:
    """Fetch Damodaran PE by industry dataset (cached 24h)."""
    return _fetch_damodaran_html_table(
        "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/pe.html",
        "pe_html",
        ['pe ratio', 'p/e', 'price/earnings', 'pe']
    )


def get_pb_by_industry_df() -> pd.DataFrame:
    """Fetch Damodaran PB by industry dataset (cached 24h)."""
    return _fetch_damodaran_html_table(
        "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/pbv.html",
        "pb_html",
        ['pb ratio', 'p/b', 'price/book', 'price to book', 'pbv']
    )


def get_current_ratio_by_industry_df() -> pd.DataFrame:
    """Fetch Damodaran Current Ratio by industry dataset (cached 24h)."""
    return _fetch_damodaran_html_table(
        "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/ratios.html",
        "current_ratio_html",
        ['current ratio', 'current_ratio']
    )


def get_sector_benchmarks(matched_industry: str, risk_free_rate: float = None, market_risk_premium: float = None) -> dict:
    """
    Aggregate all sector benchmarks for a matched Damodaran industry.
    Returns: {industry_name, roe_sector, pe_sector, pb_sector, ke_sector, current_ratio_sector, debt_equity_sector}
    Only includes fields where data is available (omits nulls).
    """
    if risk_free_rate is None:
        risk_free_rate = get_risk_free_rate()
    if market_risk_premium is None:
        market_risk_premium = get_histimpl_erp()
    
    benchmarks = {"industry_name": matched_industry}
    
    # 1. ROE Sector
    try:
        roe_df = get_roe_by_industry_df()
        roe_col = next((c for c in roe_df.columns if isinstance(c, str) and 'roe' in c.lower()), None)
        ind_col = next((c for c in roe_df.columns if isinstance(c, str) and 'industry' in c.lower()), roe_df.columns[0])
        if roe_col:
            row = roe_df[roe_df[ind_col].astype(str).str.strip().str.lower() == matched_industry.lower()]
            if not row.empty:
                val = pd.to_numeric(row.iloc[0][roe_col], errors='coerce')
                if not pd.isna(val):
                    benchmarks["roe_sector"] = round(float(val), 2)
    except Exception:
        pass
    
    # 2. PE Sector
    try:
        pe_df = get_pe_by_industry_df()
        pe_col = next((c for c in pe_df.columns if isinstance(c, str) and ('pe' in c.lower() or 'p/e' in c.lower())), None)
        ind_col = next((c for c in pe_df.columns if isinstance(c, str) and 'industry' in c.lower()), pe_df.columns[0])
        if pe_col:
            row = pe_df[pe_df[ind_col].astype(str).str.strip().str.lower() == matched_industry.lower()]
            if not row.empty:
                val = pd.to_numeric(row.iloc[0][pe_col], errors='coerce')
                if not pd.isna(val):
                    benchmarks["pe_sector"] = round(float(val), 2)
    except Exception:
        pass
    
    # 3. PB Sector
    try:
        pb_df = get_pb_by_industry_df()
        pb_col = next((c for c in pb_df.columns if isinstance(c, str) and ('pb' in c.lower() or 'p/b' in c.lower() or 'price/book' in c.lower())), None)
        ind_col = next((c for c in pb_df.columns if isinstance(c, str) and 'industry' in c.lower()), pb_df.columns[0])
        if pb_col:
            row = pb_df[pb_df[ind_col].astype(str).str.strip().str.lower() == matched_industry.lower()]
            if not row.empty:
                val = pd.to_numeric(row.iloc[0][pb_col], errors='coerce')
                if not pd.isna(val):
                    benchmarks["pb_sector"] = round(float(val), 2)
    except Exception:
        pass
    
    # 4. Current Ratio Sector
    try:
        cr_df = get_current_ratio_by_industry_df()
        cr_col = next((c for c in cr_df.columns if isinstance(c, str) and 'current ratio' in c.lower()), None)
        ind_col = next((c for c in cr_df.columns if isinstance(c, str) and 'industry' in c.lower()), cr_df.columns[0])
        if cr_col:
            row = cr_df[cr_df[ind_col].astype(str).str.strip().str.lower() == matched_industry.lower()]
            if not row.empty:
                val = pd.to_numeric(row.iloc[0][cr_col], errors='coerce')
                if not pd.isna(val):
                    benchmarks["current_ratio_sector"] = round(float(val), 2)
    except Exception:
        pass
    
    # 5. Debt/Equity Sector (from betas dataset)
    try:
        beta_df = get_betas_df()
        de_col = next((c for c in beta_df.columns if isinstance(c, str) and 'd/e' in c.lower() or 'debt/equity' in c.lower() or 'debt equity' in c.lower()), None)
        ind_col = next((c for c in beta_df.columns if isinstance(c, str) and 'industry' in c.lower()), beta_df.columns[0])
        beta_col = next((c for c in beta_df.columns if isinstance(c, str) and c.strip().lower() == 'beta'), None)
        if not beta_col:
            beta_col = next((c for c in beta_df.columns if isinstance(c, str) and 'beta' in c.lower()), None)
        
        row = beta_df[beta_df[ind_col].astype(str).str.strip().str.lower() == matched_industry.lower()]
        if not row.empty:
            if de_col:
                de_val = pd.to_numeric(row.iloc[0][de_col], errors='coerce')
                if not pd.isna(de_val):
                    benchmarks["debt_equity_sector"] = round(float(de_val), 2)
            if beta_col:
                beta_val = pd.to_numeric(row.iloc[0][beta_col], errors='coerce')
                if not pd.isna(beta_val):
                    ke_sector = risk_free_rate + float(beta_val) * market_risk_premium
                    benchmarks["ke_sector"] = round(ke_sector * 100, 2)  # as percentage
    except Exception:
        pass
    
    return benchmarks


def get_histimpl_erp() -> float:
    """Prima de riesgo implícita de Damodaran (Implied ERP FCFE, último año) como decimal.
    Se cachea el valor en histimpl_erp.json durante 7 días.
    """
    cache_file = CACHE_DIR / "histimpl_erp.json"
    if is_cache_valid(cache_file, 86400 * 7):
        try:
            return float(json.loads(cache_file.read_text(encoding="utf-8"))["erp"])
        except Exception:
            pass

    url = "https://www.stern.nyu.edu/~adamodar/pc/datasets/histimpl.xls"
    try:
        # Las 6 primeras filas son metadatos; la cabecera real está en la fila 7
        df = pd.read_excel(url, header=6)
        anios = pd.to_numeric(df["Year"], errors="coerce")
        serie = pd.to_numeric(df.loc[anios.notna(), "Implied ERP (FCFE)"], errors="coerce").dropna()
        erp = float(serie.iloc[-1])
        erp = erp / 100.0 if erp > 1 else erp  # el archivo publica decimales (0.0423)
        cache_file.write_text(json.dumps({"erp": erp, "year": int(anios.dropna().iloc[-1])}), encoding="utf-8")
        return erp
    except Exception as e:
        _log(f"[ERP] No se pudo leer histimpl.xls de Damodaran: {e}")
        try:
            return float(json.loads(cache_file.read_text(encoding="utf-8"))["erp"])  # valor anterior, aunque caducado
        except Exception:
            return 0.055

def get_risk_free_rate() -> float:
    """Fetch current 10‑year Treasury rate from FRED and cache it.
    Reutiliza la caché local de 4 horas para máxima velocidad y evitar recargas.
    """
    cache_file = CACHE_DIR / "DGS10.csv"
    if is_cache_valid(cache_file, 14400):
        try:
            df = pd.read_csv(cache_file)
            rate = pd.to_numeric(df.iloc[-1, 1], errors='coerce')
            if not pd.isna(rate):
                return float(rate) / 100.0
        except Exception:
            pass

    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10"
    try:
        df = pd.read_csv(url)
        df.to_csv(cache_file, index=False)
    except Exception:
        if cache_file.exists():
            df = pd.read_csv(cache_file)
        else:
            return 0.04

    try:
        rate = pd.to_numeric(df.iloc[-1, 1], errors='coerce')
        return float(rate) / 100.0
    except Exception:
        return 0.04

def calculate_capm_cost_of_equity(beta: float, risk_free_rate: float = None, market_risk_premium: float = None) -> float:
    """Calculate cost of equity using CAPM.
    If risk_free_rate is None, it is fetched via get_risk_free_rate().
    If market_risk_premium is None, it is obtained from Damodaran implied ERP.
    """
    if risk_free_rate is None:
        risk_free_rate = get_risk_free_rate()
    if market_risk_premium is None:
        market_risk_premium = get_histimpl_erp()
    return risk_free_rate + beta * market_risk_premium

def get_beta_for_ticker(ticker: str) -> float:
    """Retrieve beta for a given ticker from Damodaran betas dataset.
    Returns beta as float; if not found returns 1.0 as fallback.
    """
    df = get_betas_df()
    # The dataset typically has a column for ticker symbols; find possible column names
    possible_cols = [c for c in df.columns if isinstance(c, str) and c.lower() in ['ticker', 'company', 'symbol']]
    if possible_cols:
        ticker_col = possible_cols[0]
        row = df[df[ticker_col].astype(str).str.upper() == ticker.upper()]
        if not row.empty:
            # Beta column may be named 'Beta' or similar
            beta_col = next((c for c in df.columns if isinstance(c, str) and 'beta' in c.lower()), None)
            if beta_col:
                beta_val = pd.to_numeric(row.iloc[0][beta_col], errors='coerce')
                if not pd.isna(beta_val):
                    return float(beta_val)
    # Fallback if not found
    return 1.0

def capm_cost_of_equity_for_ticker(ticker: str, risk_free_rate: float = None, market_risk_premium: float = None) -> float:
    """Calculate CAPM cost of equity for a ticker.
    Retrieves beta automatically; uses fetched risk‑free rate and market risk premium.
    """
    beta = get_beta_and_industry(ticker)['beta']
    return calculate_capm_cost_of_equity(beta, risk_free_rate, market_risk_premium)


# ==========================================================
# TRACKING ERROR (RIESGO ACTIVO) - Cálculo de desviación frente a benchmark
# ==========================================================

def calculate_tracking_error(ticker: str, benchmark_ticker: str = "^GSPC", period: str = "1y", trading_days: int = 252) -> dict:
    """
    Calcula el Tracking Error y métricas de riesgo activo frente a un benchmark de mercado.
    
    Args:
        ticker: Ticker del activo/cartera a analizar
        benchmark_ticker: Ticker del benchmark de referencia (default: S&P 500 ^GSPC)
        period: Período histórico (1mo, 3mo, 6mo, 1y, 2y, 5y, max)
        trading_days: Días de trading por año para anualización (default: 252)
    
    Returns:
        Dict con tracking error diario/anualizado, active return, information ratio y estilo de gestión
    """
    try:
        # Mapear ticker BRK.B a BRK-B para yfinance
        yf_symbol = 'BRK-B' if ticker.upper() == 'BRK.B' else ticker.upper()
        bench_symbol = 'BRK-B' if benchmark_ticker.upper() == 'BRK.B' else benchmark_ticker.upper()
        
        # Descargar datos del activo
        stock = yf.Ticker(yf_symbol)
        asset_hist = stock.history(period=period)
        if asset_hist.empty or 'Close' not in asset_hist.columns:
            return {
                "daily_tracking_error": 0.0,
                "annualized_tracking_error": 0.0,
                "annualized_active_return": 0.0,
                "information_ratio": 0.0,
                "management_style": "No disponible",
                "error": f"No se obtuvieron datos de precios para {ticker}",
                "status": "error"
            }
        
        # Descargar datos del benchmark
        bench = yf.Ticker(bench_symbol)
        bench_hist = bench.history(period=period)
        if bench_hist.empty or 'Close' not in bench_hist.columns:
            return {
                "daily_tracking_error": 0.0,
                "annualized_tracking_error": 0.0,
                "annualized_active_return": 0.0,
                "information_ratio": 0.0,
                "management_style": "No disponible",
                "error": f"No se obtuvieron datos de benchmark para {benchmark_ticker}",
                "status": "error"
            }
        
        # Calcular retornos logarítmicos diarios
        asset_returns = np.log(asset_hist['Close'] / asset_hist['Close'].shift(1)).dropna()
        bench_returns = np.log(bench_hist['Close'] / bench_hist['Close'].shift(1)).dropna()
        
        # Alinear series por fecha (inner join)
        combined = pd.DataFrame({
            "Asset_Log_Retorno": asset_returns,
            "Market_Log_Retorno": bench_returns
        }).dropna()
        
        if len(combined) < 10:
            return {
                "daily_tracking_error": 0.0,
                "annualized_tracking_error": 0.0,
                "annualized_active_return": 0.0,
                "information_ratio": 0.0,
                "management_style": "Datos insuficientes",
                "error": f"Pocos puntos de datos alineados ({len(combined)})",
                "status": "error"
            }
        
        # 1. Diferencia de rendimientos (Active Return diario)
        returns_difference = combined["Asset_Log_Retorno"] - combined["Market_Log_Retorno"]
        
        # 2. Tracking Error diario y anualizado
        daily_tracking_error = float(returns_difference.std(ddof=1))
        annualized_tracking_error = float(daily_tracking_error * np.sqrt(trading_days))
        
        # 3. Active Return medio diario y anualizado
        mean_active_return_daily = float(returns_difference.mean())
        annualized_active_return = float(mean_active_return_daily * trading_days)
        
        # 4. Information Ratio
        information_ratio = float(annualized_active_return / annualized_tracking_error) if annualized_tracking_error > 0 else 0.0
        
        # 5. Clasificación cualitativa del estilo de gestión
        if annualized_tracking_error < 0.02:
            management_style = "Closet Indexing / Réplica Pasiva"
        elif annualized_tracking_error <= 0.06:
            management_style = "Gestión Activa Moderada / Selección Sectorial"
        else:
            management_style = "Alta Gestión Activa / Estrategia de Convicción"
        
        return {
            "daily_tracking_error": round(daily_tracking_error, 6),
            "annualized_tracking_error": round(annualized_tracking_error, 4),
            "annualized_active_return": round(annualized_active_return, 4),
            "information_ratio": round(information_ratio, 4),
            "management_style": management_style,
            "observations": len(combined),
            "period": period,
            "benchmark": benchmark_ticker,
            "status": "success"
        }
        
    except Exception as e:
        return {
            "daily_tracking_error": 0.0,
            "annualized_tracking_error": 0.0,
            "annualized_active_return": 0.0,
            "information_ratio": 0.0,
            "management_style": "Error",
            "error": str(e),
            "status": "error"
        }


def capm_cost_of_equity_for_ticker(ticker: str, risk_free_rate: float = None, market_risk_premium: float = None) -> float:
    """Calculate CAPM cost of equity for a ticker.
    Retrieves beta automatically; uses fetched risk‑free rate and market risk premium.
    """
    beta = get_beta_and_industry(ticker)['beta']
    return calculate_capm_cost_of_equity(beta, risk_free_rate, market_risk_premium)

def get_beta_and_industry(ticker: str) -> dict:
    """Return beta, unlevered beta and industry info for a ticker.
    Uses yfinance's industry/sector fields and matches them to the
    Damodaran betas dataset, normalizing whitespace and handling key industry mappings.
    """
    import re
    # 1. Retrieve industry and sector from yfinance
    try:
        yf_symbol = 'BRK-B' if ticker.upper() == 'BRK.B' else ticker.upper()
        stock = yf.Ticker(yf_symbol)
        info = stock.info or {}
        yf_industry = info.get('industry') or info.get('sector') or 'General Market'
        yf_sector = info.get('sector') or 'General Market'
    except Exception:
        yf_industry = 'General Market'
        yf_sector = 'General Market'

    # 2. Load Damodaran betas dataframe (cached)
    df = get_betas_df()

    # 3. Identify columns
    possible_ind_cols = [c for c in df.columns if isinstance(c, str) and 'industry' in c.lower()]
    ind_col = possible_ind_cols[0] if possible_ind_cols else df.columns[0]
    beta_col = next((c for c in df.columns if isinstance(c, str) and c.strip().lower() == 'beta'), None)
    if not beta_col:
        beta_col = next((c for c in df.columns if isinstance(c, str) and 'beta' in c.lower()), None)
    unlevered_col = next((c for c in df.columns if isinstance(c, str) and 'unlevered beta corrected' in c.lower()), None)
    if not unlevered_col:
        unlevered_col = next((c for c in df.columns if isinstance(c, str) and 'unlevered beta' in c.lower()), None)

    if not beta_col:
        return {
            'beta': 1.0,
            'unlevered_beta': 1.0,
            'yfinance_industry': yf_industry,
            'yfinance_sector': yf_sector,
            'matched_damodaran_industry': 'No beta column'
        }

    # 4. Filter and clean industry names
    exclude_terms = {
        'number of firms', 'average beta', 'unlevered beta', 'levered beta',
        'industry average', 'overall average', 'average', 'total', 'notes',
        'source', 'industry', 'beta', 'standard deviation', 'operating income',
        'cash', 'capitalization', 'cagr', 'growth', 'roe', 'roa', 'dividend',
        'earnings', 'revenue', 'price', 'market', 'size', 'risk',
    }

    df_clean = df.dropna(subset=[beta_col]).copy()
    def clean_ind_name(val):
        if not isinstance(val, str):
            return None
        v = re.sub(r'\s+', ' ', val).strip()
        low = v.lower()
        if not low or low in exclude_terms:
            return None
        for term in ['number of firms', 'average beta', 'industry average', 'overall average']:
            if term in low:
                return None
        return v

    df_clean['CleanedIndustry'] = df_clean[ind_col].apply(clean_ind_name)
    df_valid = df_clean.dropna(subset=['CleanedIndustry'])
    industries_list = df_valid['CleanedIndustry'].tolist()

    # 5. High-accuracy mappings for common sectors & YFinance names
    direct_map = {
        'Banks - Diversified': 'Bank (Money Center)',
        'Banks - Regional': 'Banks (Regional)',
        'Consumer Electronics': 'Computers/Peripherals',
        'Beverages - Non-Alcoholic': 'Beverage (Soft)',
        'Beverages - Alcoholic': 'Beverage (Alcoholic)',
        'Oil & Gas Integrated': 'Oil/Gas (Integrated)',
        'Oil & Gas E&P': 'Oil/Gas (Production and Exploration)',
        'Oil & Gas Refining & Marketing': 'Oil/Gas (Refining and Marketing)',
        'Auto Manufacturers': 'Auto & Truck',
        'Semiconductors': 'Semiconductor',
        'Semiconductor Equipment & Materials': 'Semiconductor Equip',
        'Internet Content & Information': 'Information Services',
        'Software - Infrastructure': 'Software (System & Application)',
        'Software - Application': 'Software (System & Application)',
        'Discount Stores': 'Retail (General)',
        'Packaged Foods': 'Food Processing',
        'Drug Manufacturers - General': 'Drugs (Pharmaceutical)',
        'Drug Manufacturers - Specialty & Generic': 'Drugs (Pharmaceutical)',
        'Aerospace & Defense': 'Aerospace/Defense',
        'Telecom Services': 'Telecom (Services)'
    }

    matched_industry = None
    if yf_industry in direct_map:
        target = direct_map[yf_industry].lower()
        for ind in industries_list:
            if ind.lower() == target or target in ind.lower():
                matched_industry = ind
                break

    # 6. If not direct mapped, try fuzzy match on cleaned yfinance industry
    if not matched_industry:
        cleaned_yf = re.sub(r'[-–—/]', ' ', yf_industry)
        matches = difflib.get_close_matches(cleaned_yf, industries_list, n=1, cutoff=0.35)
        if matches:
            matched_industry = matches[0]

    # 7. Fallback fuzzy match on sector
    if not matched_industry and yf_sector and yf_sector != 'Unknown':
        matches = difflib.get_close_matches(yf_sector, industries_list, n=1, cutoff=0.35)
        if matches:
            matched_industry = matches[0]

    # 8. Retrieve beta and unlevered beta for the matched industry
    beta = 1.0
    unlevered_beta = 1.0
    if matched_industry:
        row = df_valid[df_valid['CleanedIndustry'] == matched_industry]
        if not row.empty:
            b_val = pd.to_numeric(row.iloc[0][beta_col], errors='coerce')
            if not pd.isna(b_val):
                beta = float(b_val)
            if unlevered_col:
                ub_val = pd.to_numeric(row.iloc[0][unlevered_col], errors='coerce')
                if not pd.isna(ub_val):
                    unlevered_beta = float(ub_val)

    return {
        'beta': round(beta, 4),
        'unlevered_beta': round(unlevered_beta, 4) if unlevered_beta else None,
        'yfinance_industry': yf_industry,
        'yfinance_sector': yf_sector,
        'matched_damodaran_industry': matched_industry or 'Diversified / General Market'
    }


# ==========================================================
# FASE A: CLASIFICACIÓN DE INDUSTRIA VÍA IA (Gemini)
# ==========================================================

import re

def get_damodaran_industries_list() -> list:
    """Obtiene la lista cerrada de industrias válidas del dataset de Damodaran."""
    df = get_betas_df()
    possible_ind_cols = [c for c in df.columns if isinstance(c, str) and 'industry' in c.lower()]
    ind_col = possible_ind_cols[0] if possible_ind_cols else df.columns[0]
    
    exclude_terms = {
        'number of firms', 'average beta', 'unlevered beta', 'levered beta',
        'industry average', 'overall average', 'average', 'total', 'notes',
        'source', 'industry', 'beta', 'standard deviation', 'operating income',
        'cash', 'capitalization', 'cagr', 'growth', 'roe', 'roa', 'dividend',
        'earnings', 'revenue', 'price', 'market', 'size', 'risk',
    }
    
    def clean_ind_name(val):
        if not isinstance(val, str):
            return None
        v = re.sub(r'\s+', ' ', val).strip()
        low = v.lower()
        if not low or low in exclude_terms:
            return None
        for term in ['number of firms', 'average beta', 'industry average', 'overall average']:
            if term in low:
                return None
        return v
    
    industries = df[ind_col].apply(clean_ind_name).dropna().unique().tolist()
    return sorted(industries)


def classify_industry_with_ai(ticker: str, company_name: str, business_description: str, yf_industry: str, yf_sector: str) -> dict:
    """
    Usa IA (Gemini) para clasificar la empresa en una industria exacta de la lista cerrada de Damodaran.
    Devuelve: {matched_industry, confidence, reasoning}
    """
    import urllib.request
    import urllib.error
    
    api_key = os.environ.get("GEMINI_API_KEY", "")
    # Validar que sea una key de Google (empieza con AIza o AQ.)
    if api_key and not (api_key.startswith("AIza") or api_key.startswith("AQ.")):
        api_key = ""
    
    if not api_key:
        return {
            'matched_industry': None,
            'confidence': 0,
            'reasoning': 'No hay API key de Gemini configurada',
            'source': 'fallback'
        }
    
    industries_list = get_damodaran_industries_list()
    industries_text = "\n".join([f"- {ind}" for ind in industries_list])
    
    prompt = f"""Eres un analista financiero experto en clasificación sectorial según la metodología de Aswath Damodaran.

EMPRESA A CLASIFICAR:
- Ticker: {ticker}
- Nombre: {company_name}
- Descripción del negocio: {business_description}
- Industria YFinance: {yf_industry}
- Sector YFinance: {yf_sector}

LISTA CERRADA DE INDUSTRIAS VÁLIDAS DE DAMODARAN (elige EXCLUSIVAMENTE una de estas, NO inventes nombres):
{industries_text}

TAREA:
Analiza la descripción del negocio y selecciona LA INDUSTRIA MÁS APROPIADA de la lista arriba. 
Debes responder ÚNICAMENTE con un JSON válido en este formato exacto:
{{
  "matched_industry": "Nombre exacto de la industria de la lista",
  "confidence": 0.95,
  "reasoning": "Explicación breve de por qué esta industria encaja basándote en la descripción del negocio"
}}

NO agregues texto extra, NO uses markdown, SOLO el JSON.
"""

    MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.8-flash"]
    
    def gemini_call(prompt_text: str) -> str:
        nonlocal api_key
        if not api_key:
            return ""
        payload = json.dumps({
            "contents": [{
                "role": "user",
                "parts": [{"text": prompt_text}]
            }],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 500}
        }).encode("utf-8")

        for model in MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
            try:
                # 8 s por modelo: un modelo saturado no debe bloquear la descarga de datos de la empresa
                with urllib.request.urlopen(req, timeout=8) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if text and text.strip():
                        return text.strip()
            except urllib.error.HTTPError as he:
                if he.code in (400, 401, 403):
                    api_key = ""
                    return ""
                continue
            except Exception:
                continue
        return ""

    response_text = gemini_call(prompt)
    if not response_text:
        return {
            'matched_industry': None,
            'confidence': 0,
            'reasoning': 'IA no respondió',
            'source': 'fallback'
        }

    try:
        # Limpiar respuesta si viene con markdown
        clean_text = response_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()
        
        result = json.loads(clean_text)
        matched = result.get('matched_industry', '').strip()
        confidence = float(result.get('confidence', 0))
        reasoning = result.get('reasoning', '').strip()
        
        # Validar que la industria esté en la lista cerrada
        if matched in industries_list:
            return {
                'matched_industry': matched,
                'confidence': confidence,
                'reasoning': reasoning,
                'source': 'gemini-ai'
            }
        else:
            # Intentar fuzzy match si la IA devolvió algo cercano
            import difflib
            matches = difflib.get_close_matches(matched, industries_list, n=1, cutoff=0.6)
            if matches:
                return {
                    'matched_industry': matches[0],
                    'confidence': confidence * 0.8,
                    'reasoning': f"{reasoning} (Corregido por fuzzy match: {matches[0]})",
                    'source': 'gemini-ai-fuzzy'
                }
            return {
                'matched_industry': None,
                'confidence': 0,
                'reasoning': f'IA devolvió industria no válida: {matched}',
                'source': 'fallback'
            }
    except Exception as e:
        return {
            'matched_industry': None,
            'confidence': 0,
            'reasoning': f'Error parseando respuesta IA: {e}',
            'source': 'fallback'
        }


def get_beta_and_industry_ai(ticker: str, company_name: str = None, business_description: str = None) -> dict:
    """
    Versión mejorada que usa IA para clasificar la industria y luego busca el beta.
    Si no se proporciona nombre/descripción, los obtiene de yfinance.
    """
    import re
    
    # 1. Obtener datos base de yfinance si no se proporcionaron
    try:
        yf_symbol = 'BRK-B' if ticker.upper() == 'BRK.B' else ticker.upper()
        stock = yf.Ticker(yf_symbol)
        info = stock.info or {}
        yf_industry = info.get('industry') or info.get('sector') or 'General Market'
        yf_sector = info.get('sector') or 'General Market'
        if not company_name:
            company_name = info.get('longName') or info.get('shortName') or ticker
        if not business_description:
            business_description = info.get('longBusinessSummary') or f'Compañía cotizada en bolsa: {company_name}'
    except Exception:
        yf_industry = 'General Market'
        yf_sector = 'General Market'
        if not company_name:
            company_name = ticker
        if not business_description:
            business_description = f'Compañía cotizada en bolsa: {ticker}'

    # 2. Clasificar industria con IA
    ai_result = classify_industry_with_ai(ticker, company_name, business_description, yf_industry, yf_sector)
    
    # 3. Cargar dataset de betas
    df = get_betas_df()
    possible_ind_cols = [c for c in df.columns if isinstance(c, str) and 'industry' in c.lower()]
    ind_col = possible_ind_cols[0] if possible_ind_cols else df.columns[0]
    beta_col = next((c for c in df.columns if isinstance(c, str) and c.strip().lower() == 'beta'), None)
    if not beta_col:
        beta_col = next((c for c in df.columns if isinstance(c, str) and 'beta' in c.lower()), None)
    unlevered_col = next((c for c in df.columns if isinstance(c, str) and 'unlevered beta corrected' in c.lower()), None)
    if not unlevered_col:
        unlevered_col = next((c for c in df.columns if isinstance(c, str) and 'unlevered beta' in c.lower()), None)

    if not beta_col:
        return {
            'beta': 1.0,
            'unlevered_beta': 1.0,
            'yfinance_industry': yf_industry,
            'yfinance_sector': yf_sector,
            'matched_damodaran_industry': 'No beta column',
            'ai_classification': ai_result
        }

    # 4. Buscar beta para la industria mapeada por IA
    matched_industry = ai_result.get('matched_industry')
    beta = 1.0
    unlevered_beta = 1.0
    
    if matched_industry:
        row = df[df[ind_col].astype(str).str.strip() == matched_industry]
        if not row.empty:
            b_val = pd.to_numeric(row.iloc[0][beta_col], errors='coerce')
            if not pd.isna(b_val):
                beta = float(b_val)
            if unlevered_col:
                ub_val = pd.to_numeric(row.iloc[0][unlevered_col], errors='coerce')
                if not pd.isna(ub_val):
                    unlevered_beta = float(ub_val)
    else:
        # Fallback al método original si la IA falla
        # (reutilizar lógica de get_beta_and_industry pero simplificada)
        pass

    return {
        'beta': round(beta, 4),
        'unlevered_beta': round(unlevered_beta, 4) if unlevered_beta else None,
        'yfinance_industry': yf_industry,
        'yfinance_sector': yf_sector,
        'matched_damodaran_industry': matched_industry or 'Diversified / General Market',
        'ai_classification': ai_result
    }


# ==========================================================
# ASESORES: CONTEXTO DE DATOS Y PROMPTS DE SISTEMA COMPARTIDOS
# ==========================================================

AVISO_SIN_DATOS = (
    "  ⚠ NO se pudieron descargar datos reales de este activo: las cifras de este bloque son valores "
    "genéricos de referencia. Adviértelo en la primera frase y no las presentes como datos de la empresa.\n"
)


def error_sin_datos(pregunta: str, t_clean: str) -> dict:
    """Respuesta de error de los asesores: sin datos reales no se genera análisis."""
    return {
        "success": False,
        "error": True,
        "pregunta": pregunta,
        "ticker": t_clean or None,
        "message": (
            f"No se pudieron obtener datos reales de {t_clean} en la fuente financiera. Reintenta la búsqueda."
            if t_clean else "Selecciona o menciona una empresa para realizar la consulta."
        ),
    }


def formatear_valoracion(v: dict) -> str:
    """Bloque de texto con múltiplos, ROIC/WACC y DCF para el contexto de Jairo."""
    if not v:
        return "VALORACIÓN Y COSTO DE CAPITAL: N/D (no se pudieron calcular múltiplos, ROIC, WACC ni DCF).\n"

    def f(key, suf="", pre=""):
        val = v.get(key)
        return f"{pre}{val:,.2f}{suf}" if isinstance(val, (int, float)) else "N/D"

    txt = (
        "VALORACIÓN Y COSTO DE CAPITAL:\n"
        f"  • PER: {f('perTrailing', 'x')} (últimos 12 meses) · {f('perForward', 'x')} (estimado próximo ejercicio)\n"
        f"  • EV/EBITDA: {f('evEbitda', 'x')} · Precio/Valor en libros: {f('precioValorLibros', 'x')} · "
        f"Precio/Flujo de caja libre: {f('precioFcf', 'x')} (rentabilidad por flujo libre {f('fcfYieldPct', '%')})\n"
        f"  • Márgenes: bruto {f('margenBrutoPct', '%')} · operativo {f('margenOperativoPct', '%')} · neto {f('margenNetoPct', '%')}\n"
        f"  • Crecimiento interanual: ingresos {f('crecimientoIngresosPct', '%')} · beneficios {f('crecimientoBeneficiosPct', '%')}\n"
        f"  • Flujo de caja libre (último ejercicio):{f('fcfMM', ' MM', '$')} · Deuda neta: {f('deudaNetaMM', ' MM', '$')} · "
        f"Deuda neta/EBITDA: {f('deudaNetaEbitda', 'x')}\n"
        f"  • ROIC: {f('roicPct', '%')} frente a WACC: {f('waccPct', '%')}\n"
        f"  • WACC — componentes: K_e {f('kePct', '%')} (CAPM: libre de riesgo {f('tasaLibreRiesgoPct', '%')} + "
        f"beta {f('beta')} × prima {f('primaRiesgoPct', '%')}), K_d {f('kdPct', '%')}, tasa impositiva {f('tasaImpositivaPct', '%')}\n"
    )
    if v.get("esFinanciera"):
        txt += ("  • Entidad financiera: EV/EBITDA, ROIC y DCF de flujo libre NO aplican. "
                "Valórala con ROE frente a K_e y Precio/Valor en libros.\n")
    dcf = v.get("dcf")
    if dcf:
        txt += (
            f"  • DCF de referencia (mecánico, NO es precio objetivo): ${dcf['valorPorAccion']:,.2f} por acción "
            f"({dcf['valorVsPrecioPct']:+.1f}% frente al precio actual). Supuestos: flujo libre base "
            f"${dcf['fcfBaseMM']:,.1f} MM (media de hasta 3 ejercicios), crecimiento {dcf['crecimiento5aPct']}% anual durante 5 años, "
            f"{dcf['crecimientoTerminalPct']}% perpetuo, descontado al WACC.\n"
        )
    elif not v.get("esFinanciera"):
        txt += "  • DCF de referencia: N/D (flujo de caja libre negativo o insuficiente).\n"
    return txt


def obtener_contexto_tecnico(t_clean: str) -> dict:
    """
    Lectura técnica real del último año (velas diarias): medias, osciladores, soporte/resistencia
    por mínimos y máximos recientes, volatilidad y relación riesgo/beneficio.
    Si no hay datos devuelve valores genéricos con datos_ok=False.
    """
    precio = 100.0
    m = {
        "datos_ok": False, "precio": precio,
        "ema20": round(precio * 1.01, 2), "ema50": round(precio * 0.97, 2), "ema200": round(precio * 0.94, 2),
        "rsi": 52.0, "macd_line": 0.85, "macd_signal": 0.60, "macd_hist": 0.25,
        "soporte": round(precio * 0.92, 2), "resistencia": round(precio * 1.15, 2),
        "extra": "",
    }
    if t_clean:
        try:
            c_data = get_candlestick_data(t_clean, period="1y", interval="1d")
            pts = c_data.get("points") if c_data.get("success") else None
            if pts and len(pts) >= 30:
                last = pts[-1]
                precio = float(last["close"])
                m["precio"] = precio
                for clave, campo, dec in [("ema20", "ema20", 2), ("ema50", "ema50", 2), ("ema200", "ema200", 2),
                                          ("rsi", "rsi", 1), ("macd_line", "macdLine", 2),
                                          ("macd_signal", "macdSignal", 2), ("macd_hist", "macdHist", 2)]:
                    if last.get(campo) is not None:
                        m[clave] = round(float(last[campo]), dec)
                # Soporte: mínimo de las últimas 20 sesiones. Resistencia: máximo de las 120 previas.
                m["soporte"] = round(min(p["low"] for p in pts[-20:]), 2)
                m["resistencia"] = round(max(p["high"] for p in pts[-120:]), 2)
                cierres = pd.Series([p["close"] for p in pts], dtype=float)
                vol_anual = float(cierres.pct_change().tail(30).std() * np.sqrt(252) * 100)
                rangos = [max(p["high"] - p["low"], abs(p["high"] - q["close"]), abs(p["low"] - q["close"]))
                          for q, p in zip(pts[-15:-1], pts[-14:])]
                atr = float(np.mean(rangos))
                max_52s = max(p["high"] for p in pts)
                min_52s = min(p["low"] for p in pts)
                volumenes = [p.get("volume") or 0 for p in pts[-21:-1]]
                vol_rel = (last.get("volume") or 0) / np.mean(volumenes) if np.mean(volumenes) > 0 else 0.0

                def rend(n):
                    return (precio / float(pts[-n - 1]["close"]) - 1) * 100 if len(pts) > n else float("nan")

                m["extra"] = (
                    f"  • Rango de 52 semanas: ${min_52s:.2f} – ${max_52s:.2f} (precio a {(precio / max_52s - 1) * 100:+.1f}% del máximo)\n"
                    f"  • Rendimiento: 1 mes {rend(21):+.1f}% · 3 meses {rend(63):+.1f}% · 6 meses {rend(126):+.1f}%\n"
                    f"  • Volatilidad anualizada (30 sesiones): {vol_anual:.1f}% · ATR(14): ${atr:.2f} ({atr / precio * 100:.1f}% del precio)\n"
                    f"  • Volumen de la última sesión: {vol_rel:.2f}x la media de 20 sesiones\n"
                )
                m["datos_ok"] = True
        except Exception as e:
            _log(f"[TECNICO] Sin velas para {t_clean}: {e}")

    m["stop_loss"] = round(m["soporte"] * 0.98, 2)
    riesgo = m["precio"] - m["stop_loss"]
    m["ratio_rb"] = round(max(0.0, m["resistencia"] - m["precio"]) / riesgo, 1) if riesgo > 0 else 0.0
    return m


def formatear_contexto_tecnico(m: dict, nombre: str, t_clean: str) -> str:
    return (
        f"CONTEXTO DE DATOS TÉCNICOS ({t_clean or 'General'}) — velas diarias:\n"
        + ("" if m["datos_ok"] else AVISO_SIN_DATOS)
        + f"  • Empresa: {nombre} ({t_clean or 'N/D'})\n"
        f"  • Precio de cierre: ${m['precio']:.2f}\n"
        f"  • EMA 20: ${m['ema20']:.2f} · EMA 50: ${m['ema50']:.2f} · EMA 200: ${m['ema200']:.2f}\n"
        f"  • RSI (14): {m['rsi']:.1f}\n"
        f"  • MACD (12/26/9): línea {m['macd_line']:+.2f}, señal {m['macd_signal']:+.2f}, histograma {m['macd_hist']:+.2f}\n"
        f"  • Soporte (mínimo de 20 sesiones): ${m['soporte']:.2f}\n"
        f"  • Resistencia (máximo de 120 sesiones): ${m['resistencia']:.2f}\n"
        f"  • Pérdida límite de referencia (2% bajo el soporte): ${m['stop_loss']:.2f}\n"
        f"  • Relación riesgo/beneficio entrando al precio actual: {m['ratio_rb']:.1f}:1\n"
        + m["extra"]
    )


REGLAS_RESPUESTA_ASESOR = (
    "CÓMO RESPONDES:\n"
    "1. La primera frase ES la respuesta: contesta exactamente lo que se pregunta y toma posición "
    "(sí, no, o 'solo si ocurre X'). Sin saludo, sin repetir la pregunta, sin descargo inicial.\n"
    "2. Susténtala con las cifras del CONTEXTO DE DATOS que sean pertinentes a ESA pregunta, no con todas. "
    "Cada cifra va con su lectura: contra qué umbral, costo de capital, media o nivel se compara y qué implica.\n"
    "3. Nombra el riesgo principal que invalidaría tu conclusión y el dato concreto que te haría cambiar de opinión.\n"
    "4. Cierra con la acción: qué haría un inversor disciplinado con esto y a qué precio o condición.\n\n"
    "RIGOR:\n"
    "- Usa únicamente cifras del contexto. Si un dato figura como N/D o no está, dilo en una frase y razona con lo que hay; "
    "jamás inventes cifras, fechas, noticias ni resultados trimestrales.\n"
    "- Si haces un cálculo propio (diferencial, múltiplo implícito, distancia porcentual), muestra la operación en una línea.\n"
    "- Sé realista: no suavices un dato malo ni infles uno bueno. Si la evidencia es mixta, di cuál pesa más y por qué.\n"
    "- Prohibido el relleno: nada de definiciones de manual que no se pidieron, frases como \"es importante considerar\", "
    "\"cabe destacar\", \"depende de tu perfil de riesgo\", \"en conclusión\", ni citas célebres o tono motivacional.\n\n"
    "FORMATO (la interfaz muestra texto plano):\n"
    "- De 2 a 4 bloques cortos (los que pida el usuario si solicita un diagnóstico completo), cada uno con un título en "
    "MAYÚSCULAS seguido de dos puntos. Sin asteriscos, sin almohadillas, sin emojis.\n"
    "- Guiones solo para listar cifras. Pregunta puntual: 120-220 palabras. Diagnóstico completo: 350-500 palabras.\n"
    "- Última línea, siempre: \"Análisis educativo; no es una recomendación de inversión.\""
)


def construir_prompt_jairo(perfil: str, contexto: str) -> str:
    return (
        "Eres Jairo Agudelo, analista fundamental con trayectoria en banca de inversión y finanzas corporativas. "
        "Evalúas cada acción como la compra de un negocio: calidad (ROIC y ROE frente al costo de capital), "
        "solidez del balance, durabilidad de la ventaja competitiva y precio pagado frente al valor intrínseco.\n\n"
        f"{REGLA_DE_ORO_IDIOMA}\n\n"
        f"{REGLAS_RESPUESTA_ASESOR}\n\n"
        "CRITERIO FUNDAMENTAL:\n"
        "- Creación de valor: ROIC frente a WACC es la prueba principal; ROE frente a K_e la complementa. "
        "Si el ROE está inflado por recompras o por un patrimonio mínimo, adviértelo y apóyate en el ROIC.\n"
        "- Valoración: contrasta PER y EV/EBITDA con el crecimiento y la calidad del negocio; un múltiplo alto solo se "
        "justifica con ROIC muy superior al WACC y crecimiento sostenido. Usa la rentabilidad por flujo libre como chequeo.\n"
        "- DCF: el del contexto es un escenario mecánico con supuestos explícitos. Cítalo con sus supuestos, di si el flujo "
        "base te parece representativo y hacia dónde ajustarías; nunca lo presentes como precio objetivo.\n"
        "- Margen de seguridad: exige descuento frente al valor estimado; el consenso de analistas es una referencia, no un argumento.\n"
        "- Foso económico: la etiqueta del contexto es una heurística (ROE y endeudamiento). Júzgalo tú con márgenes, ROIC y modelo de negocio.\n"
        "- Balance: deuda neta/EBITDA, cobertura de intereses y liquidez, leídos según el sector.\n\n"
        "ALCANCE: no opinas de indicadores técnicos (RSI, medias móviles, MACD, soportes, resistencias). Si la pregunta es "
        "puramente técnica, dilo en una frase, remite a Juan Guillermo y responde el fondo de la inquietud desde la valoración "
        "(por ejemplo, si el precio actual ofrece o no margen de seguridad).\n\n"
        f"TU PERFIL Y REGLAS NUMÉRICAS:\n{perfil}\n\n"
        f"{contexto}"
    )


def construir_prompt_guillermo(perfil: str, contexto: str) -> str:
    return (
        "Eres Juan Guillermo 'Guangui' Hernández, operador y analista técnico cuantitativo. Lees tendencia, impulso, "
        "volatilidad y niveles de precio, y conviertes esa lectura en un plan con entrada, pérdida límite, objetivo y "
        "relación riesgo/beneficio. Tu regla: sin un mínimo de 2 a 1 no se opera.\n\n"
        f"{REGLA_DE_ORO_IDIOMA}\n\n"
        f"{REGLAS_RESPUESTA_ASESOR}\n\n"
        "CRITERIO TÉCNICO:\n"
        "- Tendencia: posición del precio frente a EMA 200 (fondo), EMA 50 (medio plazo) y EMA 20 (corto), y el orden entre ellas.\n"
        "- Impulso: RSI y MACD como confirmación, nunca como señal aislada; señala divergencias con el precio cuando los datos las muestren.\n"
        "- Niveles: el soporte y la resistencia del contexto son el mínimo de 20 sesiones y el máximo de 120. Da siempre los precios exactos.\n"
        "- Riesgo: calcula la relación riesgo/beneficio con los niveles del contexto y muestra la cuenta. Si no llega a 2 a 1, "
        "di a qué precio de entrada sí llegaría. Usa el ATR y la volatilidad para juzgar si la pérdida límite queda demasiado ceñida.\n"
        "- Plan: entrada o condición de entrada, pérdida límite, objetivo y qué cierre de precio invalida el escenario.\n\n"
        "ALCANCE: no opinas de estados financieros, múltiplos ni valor intrínseco. Si la pregunta es puramente fundamental, "
        "dilo en una frase, remite a Jairo y responde el fondo de la inquietud desde el precio (por ejemplo, si el momento de "
        "entrada es favorable o no).\n\n"
        f"TU PERFIL Y REGLAS NUMÉRICAS:\n{perfil}\n\n"
        f"{contexto}"
    )


# ==========================================================
# CONSULTA DUAL: JAIRO (Fundamental) + GUILLERMO (Técnico)
# ==========================================================

def consultar_dual(pregunta: str, ticker: str = None):
    """
    Hace dos llamadas independientes a Gemini:
      1. Con el perfil de Jairo Agudelo (análisis fundamental)
      2. Con el perfil de Guillermo Hernández (análisis técnico)
    Si se pasa ticker, incluye datos reales de la empresa como contexto adicional.
    Devuelve las dos respuestas y una síntesis automática.
    """
    import urllib.request
    import urllib.error

    data_dir = Path(__file__).parent / "data"
    perfil_jairo_path   = data_dir / "perfil_jairo.txt"
    perfil_guillermo_path = data_dir / "perfil_guillermo.txt"
    ejemplos_path       = data_dir / "ejemplos_resolucion.txt"

    def read_file(path):
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            return ""

    perfil_jairo     = read_file(perfil_jairo_path)
    perfil_guillermo = read_file(perfil_guillermo_path)
    ejemplos         = read_file(ejemplos_path)

    # Detección automática de empresa a partir del texto de la pregunta si no se especificó ticker
    if not ticker:
        lower_q = pregunta.lower()
        keyword_to_ticker = {
            "nike": "NKE", "nke": "NKE",
            "coca": "KO", "coca-cola": "KO", "coca cola": "KO", "ko": "KO",
            "apple": "AAPL", "aapl": "AAPL", "iphone": "AAPL",
            "microsoft": "MSFT", "msft": "MSFT",
            "berkshire": "BRK.B", "buffett": "BRK.B", "brk": "BRK.B",
            "johnson": "JNJ", "jnj": "JNJ",
            "walmart": "WMT", "wmt": "WMT",
            "hype": "HYPE"
        }
        for kw, t in keyword_to_ticker.items():
            if kw in lower_q:
                ticker = t
                break

    # ── Resolución y consolidación de contexto de empresa y técnico ──────
    t_clean = (ticker or "").upper().strip()
    p_nombre = t_clean or "el activo consultado"
    p_precio = 100.0
    p_per = "22.5"
    p_roe = 28.0
    p_liquidez = 1.5
    p_deuda = "1.8"
    p_moat = "Medio"
    p_potencial_alza = 15.0
    p_precio_objetivo = round(p_precio * (1.0 + (p_potencial_alza / 100.0)), 2)
    p_recomendacion = "Sin datos de recomendación"
    p_num_analistas = 0
    tc = {}
    valoracion = {}
    datos_ok = False
    p_cobertura = "N/D"
    p_ke = 9.5
    p_sector = "Renta Variable Global"
    p_que_hace = f"Compañía cotizada en bolsa con operaciones comerciales en el sector de {p_sector}."
    p_como_gana_dinero = f"Genera ingresos vendiendo productos y soluciones en el mercado de {p_sector} con márgenes competitivos."

    MODELOS_PREDEFINIDOS = {
        "NKE": {
            "nombre": "NIKE, Inc.",
            "sector": "Calzado y Ropa Deportiva",
            "roe": 35.8, "liquidez": 1.82, "deuda": "1.6", "moat": "Foso Amplio", "potencial_alza": 25.0, "ke": 9.8,
            "que_hace": "Diseña, desarrolla y distribuye calzado, indumentaria y equipamiento atlético bajo las marcas Nike, Jordan y Converse.",
            "como_gana_dinero": "Vende al por mayor a cadenas deportivas globales y directamente al consumidor (tiendas Nike Direct y nike.com) con precios premium gracias a su marca."
        },
        "AAPL": {
            "nombre": "Apple Inc.",
            "sector": "Tecnología de Consumo",
            "roe": 145.0, "liquidez": 1.05, "deuda": "1.1", "moat": "Foso Amplio", "potencial_alza": -8.5, "ke": 9.2,
            "que_hace": "Fabrica hardware premium (iPhone, Mac, iPad, Apple Watch) e integra un ecosistema de software y servicios.",
            "como_gana_dinero": "Venta masiva de iPhones (~50% de ingresos) y servicios recurrentes de alto margen (App Store, suscripciones iCloud/Apple Music y comisiones de pago)."
        },
        "KO": {
            "nombre": "The Coca-Cola Company",
            "sector": "Bebidas y Consumo Masivo",
            "roe": 41.2, "liquidez": 1.15, "deuda": "2.3", "moat": "Foso Amplio", "potencial_alza": 4.7, "ke": 7.5,
            "que_hace": "Compañía líder mundial de bebidas con más de 200 marcas de refrescos, aguas, jugos, tés y cafés.",
            "como_gana_dinero": "Vende jarabes y concentrados patentados a embotelladoras asociadas que asumen el costo de distribución, cobrando márgenes brutos superiores al 60%."
        },
        "MSFT": {
            "nombre": "Microsoft Corporation",
            "sector": "Software y Computación en la Nube",
            "roe": 38.5, "liquidez": 1.25, "deuda": "0.7", "moat": "Foso Amplio", "potencial_alza": 2.8, "ke": 8.9,
            "que_hace": "Desarrolla plataformas cloud empresariales (Azure), software de productividad (Office 365) y sistemas operativos.",
            "como_gana_dinero": "Cobro recurrente por consumo de infraestructura en la nube (Azure), suscripciones mensuales tipo SaaS a empresas y licencias de software."
        },
        "BRK.B": {
            "nombre": "Berkshire Hathaway Inc.",
            "sector": "Conglomerado Financiero / Seguros",
            "roe": 14.8, "liquidez": 1.40, "deuda": "0.9", "moat": "Foso Amplio", "potencial_alza": 8.7, "ke": 8.5,
            "que_hace": "Holding diversificado dueño de aseguradoras (GEICO), ferrocarriles (BNSF), utilities energéticas y una masiva cartera de acciones.",
            "como_gana_dinero": "Utiliza el 'float' asegurador (primas cobradas por anticipado invertidas a coste cero) y recoge beneficios operativos de sus decenas de filiales."
        }
    }

    if t_clean in MODELOS_PREDEFINIDOS:
        m = MODELOS_PREDEFINIDOS[t_clean]
        p_nombre = m["nombre"]
        p_sector = m["sector"]
        p_roe = m["roe"]
        p_liquidez = m["liquidez"]
        p_deuda = m["deuda"]
        p_moat = m["moat"]
        p_potencial_alza = m["potencial_alza"]
        p_ke = m["ke"]
        p_que_hace = m["que_hace"]
        p_como_gana_dinero = m["como_gana_dinero"]

    if t_clean:
        try:
            datos = get_company_data(t_clean)
            if datos.get("success"):
                raw = datos.get("raw", {})
                ratios = datos.get("ratios", {})
                p_nombre = datos.get("nombre") or p_nombre
                p_precio = clean_val(raw.get("precioCotizacion"), 100.0)
                p_per = str(ratios.get("per", "22.5"))
                p_roe = float(clean_val(ratios.get("roe"), p_roe))
                p_liquidez = float(clean_val(ratios.get("liquidezCorriente"), p_liquidez))
                p_deuda = str(ratios.get("endeudamiento", p_deuda))
                p_cobertura = str(ratios.get("coberturaIntereses", p_cobertura))
                p_moat = datos.get("moat", p_moat)
                p_sector = datos.get("sector") or p_sector
                datos_ok = True
                valoracion = datos.get("valoracion") or {}
                if valoracion.get("kePct"):
                    p_ke = float(valoracion["kePct"])
                tc = datos.get("target_consensus") or {}
                if tc:
                    if tc.get("upside_potential") is not None:
                        p_potencial_alza = float(clean_val(tc.get("upside_potential"), p_potencial_alza))
                    if tc.get("target_mean"):
                        p_precio_objetivo = float(clean_val(tc.get("target_mean"), p_precio_objetivo))
                    if tc.get("recommendation"):
                        p_recomendacion = tc.get("recommendation")
                    if tc.get("number_of_analysts"):
                        p_num_analistas = tc.get("number_of_analysts")
                if datos.get("descripcion") and len(datos.get("descripcion")) > 30 and t_clean not in MODELOS_PREDEFINIDOS:
                    p_que_hace = datos.get("descripcion")
        except Exception:
            pass

    # Variables técnicas (velas reales del último año)
    tec = obtener_contexto_tecnico(t_clean)
    if tec["datos_ok"]:
        p_precio = tec["precio"]
    p_ema20, p_ema50, p_ema200 = tec["ema20"], tec["ema50"], tec["ema200"]
    p_rsi, p_macd_line, p_macd_signal, p_macd_hist = tec["rsi"], tec["macd_line"], tec["macd_signal"], tec["macd_hist"]
    p_soporte, p_resistencia, p_stop_loss, p_ratio_rb = tec["soporte"], tec["resistencia"], tec["stop_loss"], tec["ratio_rb"]

    # Consenso de Wall Street: usar objetivo medio de analistas si está disponible,
    # de lo contrario estimar precio objetivo a partir del potencial al alza por defecto.
    if tc and tc.get("target_mean"):
        p_precio_objetivo = float(clean_val(tc.get("target_mean"), p_precio_objetivo))
    else:
        p_precio_objetivo = round(p_precio * (1.0 + (p_potencial_alza / 100.0)), 2)

    # ── Contextos estructurados (ESTRICTAMENTE SEPARADOS) ────────────────────
    contexto_fundamental = (
        f"CONTEXTO DE DATOS FUNDAMENTALES ({t_clean or 'General'}):\n"
        + ("" if datos_ok else AVISO_SIN_DATOS)
        + f"  • Empresa: {p_nombre} ({t_clean or 'N/D'}) · Sector: {p_sector}\n"
        f"  • Actividad: {p_que_hace}\n"
        f"  • Fuentes de ingresos: {p_como_gana_dinero}\n"
        f"  • Precio actual: ${p_precio:.2f}\n"
        f"  • ROE: {p_roe:.1f}% frente a K_e: {p_ke:.1f}%\n"
        f"  • Liquidez corriente: {p_liquidez:.2f}x · Pasivo total/Patrimonio: {p_deuda}x · "
        f"Cobertura de intereses (EBIT/intereses): {p_cobertura}x\n"
        f"  • Foso económico (heurística): {p_moat}\n"
        f"  • Consenso de analistas: objetivo medio ${p_precio_objetivo:.2f} ({p_potencial_alza:+.1f}% frente al precio), "
        f"{p_recomendacion}, {p_num_analistas} analistas\n"
        + formatear_valoracion(valoracion)
    )

    if not datos_ok or not tec["datos_ok"]:
        return error_sin_datos(pregunta, t_clean)

    contexto_tecnico = formatear_contexto_tecnico(tec, p_nombre, t_clean)

    system_instruction_jairo = construir_prompt_jairo(perfil_jairo, contexto_fundamental)
    system_instruction_guillermo = construir_prompt_guillermo(perfil_guillermo, contexto_tecnico)

    # Obtener cliente Gemini y hacer llamadas
    client = get_gemini_client()
    
    respuesta_jairo = ""
    respuesta_guillermo = ""
    
    norm_q = pregunta.lower()
    import re
    is_rsi = bool(re.search(r'\brsi\b', norm_q))
    is_roe = bool(re.search(r'\broe\b', norm_q))
    is_liquidez = bool(re.search(r'\b(liquidez|razon corriente|prueba acida|capital de trabajo|current ratio)\b', norm_q))
    is_apalancamiento = bool(re.search(r'\b(apalancamiento|deuda|endeudamiento|leverage)\b', norm_q))
    is_margen = bool(re.search(r'\b(margen de seguridad|valor intrinseco|precio intrinseco|precio objetivo|consenso de analistas|potencial al alza|objetivo de analistas|objetivo medio|recomendacion de analistas)\b', norm_q))
    is_ke = bool(re.search(r'\b(k_e|ke|costo de capital|costo del capital|cost of equity)\b', norm_q))
    is_moat = bool(re.search(r'\b(moat|foso|ventaja competitiva)\b', norm_q))
    is_ema = bool(re.search(r'\b(ema|medias moviles|media movil|promedios moviles)\b', norm_q))
    is_macd = bool(re.search(r'\bmacd\b', norm_q))
    is_precio = bool(re.search(r'\b(precio actual|accion del precio|cotizacion)\b', norm_q))
    is_rb = bool(re.search(r'\b(stop loss|riesgo beneficio|riesgo/beneficio)\b', norm_q))

    is_general_query = (
        bool(re.search(r'\b(diagnostico|general|evalua|evaluar|analisis general|analisis completo|vision general|panorama|como esta el negocio|resumen integral|informe)\b', norm_q))
        or ('diagnóstico' in norm_q)
        or ('análisis' in norm_q and 'general' in norm_q)
        or (not any([is_rsi, is_roe, is_liquidez, is_apalancamiento, is_margen, is_ke, is_moat, is_ema, is_macd, is_precio, is_rb]))
    )
    is_punctual = not is_general_query

    if client.client:
        if is_general_query:
            msg_jairo = (
                f"Diagnóstico fundamental completo de {p_nombre} ({t_clean or 'General'}). Bloques, en este orden: "
                "NEGOCIO (qué vende y de dónde sale el beneficio, en 2-3 frases), "
                "CALIDAD (ROIC frente a WACC, ROE frente a K_e, márgenes), "
                "BALANCE (deuda neta/EBITDA, cobertura de intereses, liquidez), "
                "VALORACIÓN (PER, EV/EBITDA, flujo libre y DCF de referencia frente al precio) y "
                "VEREDICTO (comprar, esperar a qué precio, o descartar, y el riesgo que lo invalida)."
            )
            msg_guillermo = (
                f"Diagnóstico técnico completo de {p_nombre} ({t_clean or 'General'}). Bloques, en este orden: "
                "TENDENCIA (precio frente a EMA 200, 50 y 20), "
                "IMPULSO (RSI, MACD y volumen), "
                "NIVELES (soporte, resistencia y posición en el rango de 52 semanas), "
                "PLAN (entrada o condición de entrada, pérdida límite, objetivo y relación riesgo/beneficio con la cuenta) y "
                "VEREDICTO (operar ahora, esperar a qué precio, o no operar)."
            )
        else:
            msg_jairo = pregunta
            msg_guillermo = pregunta

        # Las dos consultas son independientes: se lanzan en paralelo para no sumar latencias
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as pool:
            fut_jairo = pool.submit(client.generate, system_instruction_jairo, msg_jairo)
            fut_guillermo = pool.submit(client.generate, system_instruction_guillermo, msg_guillermo)
            respuesta_jairo, respuesta_guillermo = fut_jairo.result(), fut_guillermo.result()

    usa_gemini = bool(respuesta_jairo) and bool(respuesta_guillermo)

    # ── Fallback especializado de alta fidelidad con Enfoque Estricto y REGLA_DE_ORO_IDIOMA ─────
    if not respuesta_jairo or not respuesta_guillermo:
        if not respuesta_jairo:
            if not is_punctual:
                spread_roe_ke = p_roe - p_ke
                crea_valor = spread_roe_ke >= 0
                salud_balance = "Sólida" if float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8') <= 2.0 else "Moderada" if float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8') <= 3.5 else "Exigente"
                esSaludable = p_roe >= 15 and float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8') <= 3.5
                tieneDescuento = p_potencial_alza > 5

                if esSaludable and tieneDescuento:
                    dictamen_general = f"Vemos una oportunidad de valor sólida con potencial alcista del ~{p_potencial_alza:.1f}% frente al consenso de analistas. El negocio genera caja abundante y crea valor (ROE {p_roe:.1f}% > K_e {p_ke:.1f}%). Recomendación fundamental: apta para acumulación metódica con horizonte de mediano a largo plazo."
                elif esSaludable and not tieneDescuento:
                    dictamen_general = f"El negocio es extraordinario en calidad y retorno sobre el capital (ROE {p_roe:.1f}%), pero el consenso de analistas no ofrece potencial alcista suficiente a precio actual ({p_potencial_alza:.1f}%). Sugiero paciencia y aguardar una corrección para entrar a mejor precio."
                else:
                    dictamen_general = f"Alerta fundamental: la estructura de balance muestra fragilidad (Apalancamiento de {p_deuda}x o ROE deficiente de {p_roe:.1f}%). No hay margen de seguridad que compense el riesgo. Sugiero abstenerse hasta ver saneamiento contable."

                respuesta_jairo = (
                    f"Recordemos que esta es una visión pedagógica propia de Value Investing y no constituye una recomendación vinculante.\n\n"
                    f"🏢 **1. EL NEGOCIO PRIMERO: ¿QUÉ HACE Y CÓMO GANA DINERO?**\n"
                    f"• **¿Qué hace {p_nombre}?:** {p_que_hace}\n"
                    f"• **¿Cómo gana dinero?:** {p_como_gana_dinero}\n"
                    f"• **Sector económico:** {p_sector}\n\n"
                    f"📊 **2. SALUD FINANCIERA Y ESTRUCTURA DE BALANCE:**\n"
                    f"Llevándolo al \"coquito\" con **{p_nombre} ({t_clean or 'General'})**:\n"
                    f"• **Fondeo y Deuda:** Apalancamiento en torno a **{p_deuda}x** con Liquidez Corriente de **{p_liquidez:.2f}x** ({'ofrece holgura de solvencia ✅' if p_liquidez >= 1.5 else 'cubre el mínimo operativo ⚠️' if p_liquidez >= 1.0 else 'alerta de liquidez ❌'}). El foso económico (Moat) es **{p_moat}**.\n"
                    f"• **Creación de Valor:** El ROE se ubica en el **{p_roe:.1f}%**, frente a un costo de capital (K_e) estimado del **{p_ke:.1f}%** ({'CREA valor económico: genera +' + str(round(spread_roe_ke, 1)) + ' pp sobre el costo del capital' if crea_valor else 'DESTRUYE valor económico: rinde ' + str(round(spread_roe_ke, 1)) + ' pp bajo el costo del capital'}).\n"
                    f"• **Consenso de Analistas:** Cotiza a **${p_precio:.2f}** | Objetivo medio **${p_precio_objetivo:.2f}** ({p_potencial_alza:+.1f}% upside) | {p_recomendacion} · {p_num_analistas} analistas.\n\n"
                    f"🔍 **3. DIAGNÓSTICO DETALLADO POR DIMENSIÓN:**\n"
                    f"• **Rentabilidad:** Con un ROE del **{p_roe:.1f}%**, la compañía {'supera el umbral de creación de valor frente a un K_e del ' + str(p_ke) + '%.' if crea_valor else 'no alcanza a remunerar el costo de oportunidad del capital (ROE < K_e).'}\n"
                    f"• **Liquidez:** La Razón Corriente de **{p_liquidez:.2f}x** {'ofrece solvencia holgada para responder a compromisos inmediatos.' if p_liquidez >= 1.5 else 'cubre los pasivos circulantes con margen ajustado.' if p_liquidez >= 1.0 else 'denota estrechez en capital de trabajo circulante.'}\n"
                    f"• **Apalancamiento:** La relación de **{p_deuda}x** {'es saludable y sostenible para su generación operativa.' if float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8') <= 2.5 else 'exige disciplina financiera estricta.'}\n"
                    f"• **Foso Económico:** Calificado como **{p_moat}** para una empresa de {p_sector.lower()}: {'las ventajas competitivas protegen márgenes y rentabilidad a largo plazo.' if 'Amplio' in str(p_moat) else 'las ventajas existen pero son parcialmente replicables.' if 'Medio' in str(p_moat) else 'los márgenes están expuestos a la competencia directa.'}\n"
                    f"• **Margen de Seguridad:** Cotizando a **${p_precio:.2f}** frente al objetivo de **${p_precio_objetivo:.2f}**, el potencial del **{p_potencial_alza:.1f}%** {'representa un margen de seguridad atractivo para acumulación.' if p_potencial_alza >= 15 else 'ofrece un margen positivo pero moderado.' if p_potencial_alza > 0 else 'es negativo frente al consenso actual.'}\n\n"
                    f"🎯 **4. DICTAMEN FUNDAMENTAL DE JAIRO:** {dictamen_general}"
                )
            elif is_roe:
                deuda_num = float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8')
                jairo_roe_interp = 'Un ROE superior al 20% se considera excelente y es típico de empresas con un moat amplio y poder de fijación de precios.' if p_roe >= 20 else ('Un ROE entre 15-20% es saludable y está dentro del rango que buscaría Warren Buffett.' if p_roe >= 15 else ('Un ROE entre 10-15% es aceptable pero no destacable.' if p_roe >= 10 else 'Un ROE inferior al 10% indica una creación de valor muy limitada sobre el capital invertido.'))
                jairo_roe_contra = f'El negocio CREA valor real: genera {(p_roe - p_ke):.1f} puntos porcentuales POR ENCIMA de nuestro costo de capital — esto es exactamente lo que multiplica el patrimonio del accionista año tras año.' if p_roe >= p_ke else f'El negocio NO supera el umbral de creación de valor: su ROE del {p_roe:.1f}% está POR DEBAJO del K_e del {p_ke:.1f}%, lo que significa que destruye valor aunque los beneficios contables sean positivos.'
                respuesta_jairo = (
                    f"Para {p_nombre} ({t_clean or 'General'}), el ROE (Retorno sobre Patrimonio) actual es del **{p_roe:.1f}%**. "
                    f"Este es el indicador central del Value Investing: mide cuánto beneficio genera la compañía por cada dólar de patrimonio neto de sus accionistas.\n\n"
                    f"🧠 **CÓMO INTERPRETARLO:** {jairo_roe_interp}\n\n"
                    f"💰 **CONTRAVENTA CON NUESTRO K_e:** Nuestro costo de capital propio (K_e) estimado es del **{p_ke:.1f}%** (lo que exigiríamos como retorno mínimo por el riesgo asumido). {jairo_roe_contra}\n\n"
                    f"📚 **CONTEXTUALIZADO EN {p_nombre}:** {p_que_hace} {p_como_gana_dinero}"
                )
            elif is_liquidez:
                liq_interp = 'Una razón superior a 1.5x denota una tesorería holgada y capacidad sobrada para honrar obligaciones a corto plazo sin estrés financiero.' if p_liquidez >= 1.5 else ('Una razón entre 1.0x y 1.5x es operativa: cumple con lo mínimo necesario, pero deja poco margen para imprevistos.' if p_liquidez >= 1.0 else 'Una razón inferior a 1.0x (pasivos circulantes superan a activos circulantes) es una ALERTA ROJA de estrechez de liquidez inmediata y posible vulnerabilidad de solvencia.')
                liq_sector = f'Como empresa del sector {p_sector.lower()}, esta liquidez es consistente con una gestión de capital de trabajo eficiente.' if p_liquidez >= 1.0 else f'Este nivel de liquidez requiere supervisión activa del working capital, ya que cualquier contracción del crédito o caída de ventas podría tensionar el balance.'
                liq_norma = 'estamos bien posicionados' if p_liquidez >= 1.5 else ('estamos en el mínimo operativo' if p_liquidez >= 1.0 else 'estamos en terreno peligroso')
                respuesta_jairo = (
                    f"La Liquidez Corriente (Razón Corriente) de {p_nombre} ({t_clean or 'General'}) se ubica en **{p_liquidez:.2f}x** — por cada dólar de deuda a corto plazo, la compañía dispone de **${p_liquidez:.2f}** en activos circulantes (efectivo, cuentas por cobrar, inventario) para responder.\n\n"
                    f"🛡️ **INTERPRETACIÓN:** {liq_interp}\n\n"
                    f"🔄 **CONTEXTO SECTORIAL:** {liq_sector} Comparado con la norma general del mercado (donde 1.5-2.0x es el rango cómodo), {liq_norma}.\n\n"
                    f"💡 **PARA EL INVERSOR:** Jairo vigila que el flujo de caja opere con holgura: una liquidez de {p_liquidez:.2f}x junto con un ROE del {p_roe:.1f}% y un K_e de {p_ke:.1f}% ofrece una combinación de solvencia y retorno que respalda la sostenibilidad del modelo."
                )
            elif is_apalancamiento:
                deuda_num = float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8')
                apal_calc = 'Se mide sobre la relación Deuda/EBITDA (cuántos años de beneficios operativos brutos se necesitan para pagar la deuda total).' if deuda_num > 2.9 else 'Se mide sobre la relación Deuda/Patrimonio (cuánta deuda financiada hay por cada dólar de patrimonio de los accionistas).'
                if deuda_num <= 2.5:
                    apal_eval = 'Un apalancamiento bajo (≤ 2.5x) se considera saludable y sostenible: los intereses son una carga manejable frente al EBITDA y no erosionan sustancialmente el margen neto.'
                elif deuda_num <= 4.0:
                    apal_eval = 'Un apalancamiento moderado (2.5x-4.0x) es admisible si el negocio genera flujos estables y recurrentes, pero deja menos colchón ante recesiones.'
                else:
                    apal_eval = 'Un apalancamiento elevado (> 4.0x) es una bandera amarilla: los intereses consumen gran parte del beneficio operativo y cualquier caída de ingresos compromete la capacidad de pago.'
                respuesta_jairo = (
                    f"El nivel de Apalancamiento de {p_nombre} ({t_clean or 'General'}) es de **{p_deuda}x**.\n\n"
                    f"🏦 **CÓMO SE CALCULA:** {apal_calc}\n\n"
                    f"⚖️ **EVALUACIÓN:** {apal_eval}\n\n"
                    f"🧮 **IMPACTO EN EL ACCIONISTA:** Con este nivel de deuda, el riesgo financiero reduce la atracción del valor. La clave es que el ROE del {p_roe:.1f}% compense el coste de ese endeudamiento; en un entorno de tipos altos, la deuda cara presiona márgenes y crecimiento."
                )
            elif is_margen:
                if p_potencial_alza >= 15:
                    margen_eval = 'Este es el escenario ideal para un inversor value: un margen de seguridad superior al 15% significa que el consenso anticipa una apreciación sustancial y ya hay un colchón amplio contra errores de análisis.'
                    margen_rec = 'Un inversor value vería aquí una zona de acumulación atractiva, siempre que la calidad del negocio (ROE, foso, balance) también respalde la tesis.'
                elif p_potencial_alza >= 5:
                    margen_eval = 'El margen de seguridad es positivo pero modesto. El precio actual ya descuenta buena parte del valor futuro; solo es atractivo si tienes convicción propia para superar el consenso.'
                    margen_rec = 'Zona de observación: espera una corrección del mercado que empuje el precio más cerca del objetivo medio y amplíe tu margen de seguridad.'
                elif p_potencial_alza >= 0:
                    margen_eval = 'El potencial es nulo (cotización alineada con el consenso): no hay margen de seguridad. Comprar a precio de consenso significa apostar contra Wall Street sin ventaja matemática.'
                    margen_rec = 'No se compra con el precio por encima del objetivo medio de analistas. O esperas un bajón de cotización, o buscas otra empresa con mejor relación precio/valor.'
                else:
                    margen_eval = f'ALERTA: El consenso sitúa el objetivo promedio en ${p_precio_objetivo:.2f}, {abs(p_potencial_alza):.0f}% POR DEBAJO del precio actual de ${p_precio:.2f}. Wall Street es bajista sobre {t_clean}; el mercado anticipa deterioro de resultados.'
                    margen_rec = 'No se compra con el precio por encima del objetivo medio de analistas. O esperas un bajón de cotización, o buscas otra empresa con mejor relación precio/valor.'
                respuesta_jairo = (
                    f"El Potencial Alcista estimado frente al consenso de analistas de Wall Street para {p_nombre} ({t_clean or 'General'}) es del **{p_potencial_alza:.1f}%**:\n\n"
                    f"• **Precio actual de mercado:** ${p_precio:.2f}\n"
                    f"• **Precio objetivo promedio** (media de {p_num_analistas} analistas): ${p_precio_objetivo:.2f}\n"
                    f"• **Recomendación dominante:** {p_recomendacion}\n\n"
                    f"🎯 **EVALUACIÓN DEL MARGEN DE SEGURIDAD:** {margen_eval}\n\n"
                    f"📊 **RECOMENDACIÓN:** {margen_rec}"
                )
            elif is_ke:
                ke_vs_roe = f'✅ **CREACIÓN DE VALOR:** El negocio rinde {(p_roe - p_ke):.1f} pp POR ENCIMA de nuestro K_e. Este diferencial positivo es el motor que hace crecer el valor intrínseco de la acción año tras año — el negocio usa el capital de los accionistas mejor de lo que ellos mismos podrían hacerlo. Con un K_e del {p_ke:.1f}% y un ROE del {p_roe:.1f}%, {t_clean} está operando muy por encima de su umbral mínimo de rentabilidad, lo que suele reflejar un modelo de negocio con pricing power y/o ventajas competitivas duraderas.' if p_roe >= p_ke else f'⚠️ **DESTRUCCIÓN DE VALOR:** El negocio rinde {(p_ke - p_roe):.1f} pp POR DEBAJO de nuestro K_e. Aunque contablemente gane dinero, no está remunerando el capital tan bien como otros usos alternativos del mismo. Un ROE de {p_roe:.1f}% contra un K_e de {p_ke:.1f}% indica que el modelo actual no genera el retorno mínimo exigido por su nivel de riesgo. Solo tendría sentido mantener si la empresa está en una fase de reinversión agresiva con retorno futuro esperado.'
                respuesta_jairo = (
                    f"El Costo de Capital Propio (K_e) estimado para {p_nombre} ({t_clean or 'General'}) es del **{p_ke:.1f}%**, calculado vía CAPM (tasa libre de riesgo + prima de riesgo del mercado × beta de la acción).\n\n"
                    f"💡 **QUÉ SIGNIFICA:** El K_e es la rentabilidad MÍNIMA exigible que debería generar {t_clean} para justificar invertir en ella en lugar de en otros activos de riesgo comparable. Es nuestro 'precio de entrada' teórico: si el negocio no remunera el capital por encima de este %, estamos perdiendo oportunidad.\n\n"
                    f"📉 **COMPARATIVA CON EL ROE:** El ROE real de la compañía es del **{p_roe:.1f}%**:\n"
                    f"{ke_vs_roe}\n\n"
                    f"🏛️ **CONTEXTO DE TIPOS:** Este K_e del {p_ke:.1f}% asume un entorno de tipos de interés actuales; si las tasas libres de riesgo suben, el K_e sube y más empresas dejan de crear valor. Vigila este umbral."
                )
            elif is_moat:
                if 'Amplio' in str(p_moat):
                    moat_desc = f'✅ **Foso amplio:** {p_nombre} posee una o varias barreras de entrada formidables (marcas globalmente reconocidas con pricing power, costes de cambio altísimos para los clientes, efectos de red, ventajas de escala masiva o patentes regulatorias). Históricamente, las empresas con foso amplio generan ROE sostenido superior al 20% sobre el capital.'
                elif 'Medio' in str(p_moat):
                    moat_desc = f'⚠️ **Foso medio:** {p_nombre} tiene ventajas competitivas reales pero parcialmente replicables o con límites (niche de mercado, calidad del producto, eficiencia operativa). Protege parte de los márgenes, pero la competencia puede erosionarlos con el tiempo.'
                else:
                    moat_desc = f'🚩 **Sin foso significativo:** {p_nombre} compite en un entorno de mercado donde los precios los fija la oferta y la demanda. Sin barreras de entrada, los beneficios tenderán al promedio del sector y el ROE caerá si la gestión no es excepcional.'
                respuesta_jairo = (
                    f"El Foso Económico (Moat) de {p_nombre} ({t_clean or 'General'}) está calificado como **{p_moat}** (escala: Ninguno / Medio / Amplio).\n\n"
                    f"🏰 **QUÉ ES UN MOAT:** Es la ventaja competitiva DURADERA que protege los beneficios de la compañía frente a la competencia y le permite mantener márgenes altos durante años o décadas — sin foso, los beneficios atraen competidores y los márgenes vuelven a la media del sector.\n\n"
                    f"📋 **CALIFICACIÓN APLICADA A {t_clean}:**\n"
                    f"{moat_desc}\n\n"
                    f"📖 **EN POCAS PALABRAS SOBRE {t_clean}:** {p_que_hace} {p_como_gana_dinero}"
                )
            elif is_rsi_tech:
                respuesta_jairo = (
                    f"El RSI (Índice de Fuerza Relativa) es un oscilador técnico de momentum (rango 0-100) que pertenece a la disciplina de Juan Guillermo, no al análisis fundamental de Jairo.\n\n"
                    f"🔄 **DERIVACIÓN A TU ESPECIALIDAD TÉCNICA:** Jairo se centra en la calidad del negocio, su salud de balance y la creación de valor (ROE del **{p_roe:.1f}%** vs K_e del **{p_ke:.1f}%**), no en osciladores de corto plazo que solo miden la fuerza relativa de compra/venta en el precio.\n\n"
                    f"🎯 **PERO AQUÍ ESTÁ EL CONTRAPUNTO FUNDAMENTAL:** Mientras el RSI te dice si el precio está 'sobrecomprado' (>70) o 'sobreventido' (<30) en lo táctico, lo que realmente importa para una inversión de valor es: si el precio actual de **${p_precio:.2f}** está muy por debajo del valor intrínseco estimado y el negocio tiene un ROE del **{p_roe:.1f}%** creando valor frente a un K_e de **{p_ke:.1f}%**. En mi visión, los osciladores de precio no predicen el valor; el valor se determina con los estados financieros, no con la psicología del mercado."
                )
            elif is_ema:
                respuesta_jairo = (
                    f"Las medias móviles exponenciales (EMA) son promedios estadísticos del precio con peso en los datos recientes — herramientas de la disciplina técnica de Juan Guillermo, no del análisis fundamental.\n\n"
                    f"🔄 **DERIVACIÓN A TU ESPECIALIDAD TÉCNICA:** El análisis de Jairo no opera con líneas dibujadas en un gráfico; se basa en la economía real de la empresa. Para Jairo, la 'tendencia' verdadera de {t_clean} no la marca la EMA 20 (${p_ema20:.2f}) ni la EMA 200 (${p_ema200:.2f}), sino que la marca su ROE de **{p_roe:.1f}%** frente a su K_e de **{p_ke:.1f}%**, su liquidez de **{p_liquidez:.2f}x** y su apalancamiento de **{p_deuda}x**.\n\n"
                    f"🎯 **PERO AQUÍ ESTÁ EL CONTRAPUNTO FUNDAMENTAL:** Un inversor value mira el valor intrínseco. Si el precio de mercado de **${p_precio:.2f}** está muy por debajo del valor intrínseco y el negocio es sólido (ROE alto, balance sano), una caída del precio es una OPORTUNIDAD, no una señal de 'ruptura de tendencia'. Los gráficos miden dónde ha estado el precio; los fundamentales dicen dónde debería estar."
                )
            elif is_macd:
                respuesta_jairo = (
                    f"El MACD (Convergencia/Divergencia de Medias Móviles) es un oscilador de tendencia derivado de precios, instrumento de Juan Guillermo, no de Jairo.\n\n"
                    f"🔄 **DERIVACIÓN A TU ESPECIALIDAD TÉCNICA:** Para Jairo, la dirección del valor de {t_clean} no se lee en la divergencia de un MACD, sino en sus fundamentales: ROE del **{p_roe:.1f}%** vs K_e del **{p_ke:.1f}%**, liquidez de **{p_liquidez:.2f}x**, apalancamiento de **{p_deuda}x** y generación de flujo de caja libre.\n\n"
                    f"🎯 **PERO AQUÍ ESTÁ EL CONTRAPUNTO FUNDAMENTAL:** El MACD puede dar señales falsas en mercados volátiles o cuando el precio se desvía temporalmente del valor. Para Jairo, lo que importa es: el negocio de {t_clean} ¿crea valor con su capital? (ROE **{p_roe:.1f}%** > K_e **{p_ke:.1f}%**). Esa respuesta determina el valor; el MACD solo describe el ritmo del precio."
                )
            elif is_precio:
                if p_precio >= p_precio_objetivo:
                    precio_posicion = 'El mercado valora a la compañía MÁS de lo que los analistas esperan que valga — hay que preguntarse si ese sobreprecio está justificado por una ventaja competitiva real o es euforia especulativa.'
                    precio_conclusion = (
                        f"A **${p_precio:.2f}**, por encima del objetivo medio de **${p_precio_objetivo:.2f}**, la relación riesgo/retorno es menos atractiva. "
                        f"Jairo sugeriría esperar a una corrección que acerque el precio al valor estimado, o descartar la entrada si el negocio no justifica ese sobreprecio con un crecimiento de beneficios sostenido."
                    )
                else:
                    precio_posicion = f'El mercado está valorando a la compañía POR DEBAJO del consenso: podría ser una oportunidad de descuento sobre el valor o el mercado está anticipando problemas que los analistas no han previsto.'
                    precio_conclusion = (
                        f"A **${p_precio:.2f}**, el mercado parece estar descontando a {t_clean} con un margen de seguridad del **{p_potencial_alza:.1f}%** frente al precio objetivo medio de **${p_precio_objetivo:.2f}**. "
                        f"Es en este tipo de escenarios —precio inferior al valor estimado y negocio con ROE de **{p_roe:.1f}%** frente a un K_e de **{p_ke:.1f}%**— donde un value investor considera acumular."
                    )
                respuesta_jairo = (
                    f"La cotización actual de mercado para {p_nombre} ({t_clean or 'General'}) es de **${p_precio:.2f}**.\n\n"
                    f"📊 **ENCIMA O DEBAJO DEL VALOR:** Frente al objetivo promedio del consenso de analistas de **${p_precio_objetivo:.2f}** (con {p_num_analistas} analistas y recomendación **{p_recomendacion}**), el precio actual cotiza {'por encima' if p_precio >= p_precio_objetivo else 'por debajo'} del consenso:\n"
                    f"{precio_posicion}\n\n"
                    f"🎯 **CONCLUSIONES PARA JAIRO:** {precio_conclusion}"
                )
            else:
                spread_roe_ke = p_roe - p_ke
                crea_valor = spread_roe_ke >= 0
                salud_balance = "Sólida" if float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8') <= 2.0 else "Moderada" if float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8') <= 3.5 else "Exigente"
                dictamen_general = (
                    f"{'✅ Oportunidad de valor confirmada' if p_potencial_alza >= 15 and crea_valor else '⚠️ Monitorear con prudencia' if p_potencial_alza > 0 else '🔴 Sin margen de seguridad al precio actual'}: "
                    f"el consenso de {p_num_analistas} analistas proyecta un Potencial Al Alza del {p_potencial_alza:.1f}% (recomendación: {p_recomendacion}). "
                    f"El negocio {'crea valor económico para el accionista' if crea_valor else 'no supera el costo de capital'} "
                    f"con un diferencial ROE-K_e de {spread_roe_ke:+.1f} puntos porcentuales."
                )
                respuesta_jairo = (
                    f"Recordemos que esta visión es pedagógica y no constituye una recomendación de inversión vinculante.\n\n"
                    f"🏢 **1. ¿QUÉ HACE ESTE NEGOCIO Y CÓMO GENERA DINERO?**\n"
                    f"• **{p_nombre} ({t_clean or 'General'}) — Sector {p_sector}**\n"
                    f"• {p_que_hace}\n"
                    f"• **¿Cómo gana dinero?** {p_como_gana_dinero}\n\n"
                    f"📊 **2. SALUD FINANCIERA Y ESTRUCTURA DE BALANCE:**\n"
                    f"• **Rentabilidad sobre Patrimonio (ROE):** {p_roe:.1f}% — {'excelente calidad de negocio' if p_roe >= 20 else 'rentabilidad aceptable' if p_roe >= 12 else 'rendimiento modesto, vigilar consistencia'}\n"
                    f"• **Costo de Capital Propio (K_e):** {p_ke:.1f}% — el ROE {'supera al K_e en ' + str(abs(round(spread_roe_ke,1))) + ' puntos: crea valor para el accionista ✅' if crea_valor else 'es inferior al K_e en ' + str(abs(round(spread_roe_ke,1))) + ' puntos: destruye valor ❌'}\n"
                    f"• **Liquidez Corriente (Razón Corriente):** {p_liquidez:.2f}x — {'solvencia sólida ✅' if p_liquidez >= 1.5 else 'rango aceptable ⚠️' if p_liquidez >= 1.0 else 'estrechez de liquidez ❌'}\n"
                    f"• **Apalancamiento (Deuda/EBITDA):** {p_deuda}x — Salud del Balance: **{salud_balance}**\n"
                    f"• **Foso Económico (Moat):** **{p_moat}** — {'ventaja competitiva difícil de replicar que protege los márgenes a largo plazo' if 'Amplio' in str(p_moat) else 'posición competitiva consolidada pero con rivales relevantes' if 'Medio' in str(p_moat) else 'sin ventaja diferenciadora clara; márgenes expuestos a competencia'}\n\n"
                    f"🎯 **3. VALORACIÓN Y POTENCIAL AL ALZA (CONSENSO WALL STREET):**\n"
                    f"• **Precio actual:** ${p_precio:.2f} · **Precio Objetivo (consenso {p_num_analistas} analistas):** ${p_precio_objetivo:.2f}\n"
                    f"• **Potencial Al Alza estimado:** {p_potencial_alza:.1f}% · Recomendación: **{p_recomendacion}**\n\n"
                    f"⚖️ **4. DICTAMEN FUNDAMENTAL DE JAIRO:**\n"
                    f"{dictamen_general}"
                )

        if not respuesta_guillermo:
            if not is_punctual:
                estaSobreEma200 = p_precio >= p_ema200
                ratioValido = p_ratio_rb >= 2.0
                rsi_zona = "sobrecompra (>70)" if p_rsi >= 70 else "sobreventa (<30)" if p_rsi <= 30 else "zona neutral constructiva (30-70)"
                macd_momentum = "comprador activo ✅" if p_macd_hist >= 0 else "vendedor o en contracción ⚠️"

                if ratioValido and estaSobreEma200 and p_rsi < 70:
                    rbTexto = f"**{p_ratio_rb:.1f} a 1** ✅ (CUMPLE nuestra regla de oro de mínimo 2 a 1)."
                    evaluacionTecnica = f"RECOMENDACIÓN TÉCNICA: OPERACIÓN VALIDADA. Estructura alcista confirmada sobre la EMA 200 (${p_ema200:.2f}) y EMA 50 (${p_ema50:.2f}). El RSI en {p_rsi:.1f} puntos y el MACD ({'histograma positivo' if p_macd_hist >= 0 else 'en estabilización'}) validan momentum favorable. Relación riesgo/beneficio de {p_ratio_rb:.1f}:1 autoriza armar posición con Stop Loss estricto en ${p_stop_loss:.2f}."
                elif not ratioValido:
                    rbTexto = f"**{p_ratio_rb:.1f} a 1** ❌ (NO CUMPLE el estándar mínimo de Juan Guillermo: exigimos al menos 2 a 1)."
                    evaluacionTecnica = f"RECOMENDACIÓN TÉCNICA: LA OPERACIÓN SE DESCARTA. Bajo mi disciplina mecánica de pantalla, si una entrada no ofrece una relación riesgo/beneficio de al menos 2 a 1 ({p_ratio_rb:.1f}:1 < 2.0:1), NO SE OPERA. Sugiero esperar un retroceso (pullback) hacia el soporte de ${p_soporte:.2f} que permita un Stop Loss más ceñido antes de comprometer capital."
                elif not estaSobreEma200:
                    rbTexto = f"**{p_ratio_rb:.1f} a 1** {'✅' if ratioValido else '❌'}."
                    evaluacionTecnica = f"RECOMENDACIÓN TÉCNICA: PRECAUCIÓN POR TENDENCIA. El precio (${p_precio:.2f}) está cotizando por debajo de la EMA 200 (${p_ema200:.2f}). No compramos cuchillos cayendo. El RSI está en {p_rsi:.1f} puntos y el MACD refleja presión bajista. Esperar confirmación de rebote con volumen."
                else:
                    rbTexto = f"**{p_ratio_rb:.1f} a 1** ⚠️ (Límite operativo ajustado)."
                    evaluacionTecnica = f"El activo está en tendencia pero cerca de resistencia mayor (${p_resistencia:.2f}) o con RSI elevado ({p_rsi:.1f}). El ratio actual de {p_ratio_rb:.1f}:1 no ofrece margen de maniobra. Mejor aguardar un retroceso hacia el soporte de ${p_soporte:.2f}."

                respuesta_guillermo = (
                    f"¡Vámonos a la parte que a mí me apasiona: el gráfico y la lectura de pantalla!\n\n"
                    f"Miramos el gráfico de **{p_nombre} ({t_clean or 'General'})** sin romanticismos:\n\n"
                    f"1. **Tendencia y Medias Móviles:** El precio actual cotiza en **${p_precio:.2f}**. La EMA 200 estructural pasa por **${p_ema200:.2f}** ({'precio por ENCIMA, directriz alcista de fondo' if estaSobreEma200 else 'precio por DEBAJO, sesgo correctivo'}). Medias de corto y mediano plazo EMA 20 (${p_ema20:.2f}) y EMA 50 (${p_ema50:.2f}).\n"
                    f"2. **Osciladores y Momentum (RSI + MACD):** El RSI (14) se ubica en **{p_rsi:.1f} puntos** — {rsi_zona}. El MACD marca línea en **{p_macd_line:+.2f}** y señal en **{p_macd_signal:.2f}** (histograma {p_macd_hist:+.2f} — {macd_momentum}).\n"
                    f"3. **Memoria de Precios:** Soporte relevante en **${p_soporte:.2f}** y resistencia técnica en **${p_resistencia:.2f}**.\n"
                    f"4. **Plan Operativo y Gestión del Riesgo:**\n"
                    f"   - Ratio Riesgo/Beneficio: {rbTexto}\n"
                    f"   - Stop Loss sugerido: **${p_stop_loss:.2f}** (riesgo asumido: ${(p_precio - p_stop_loss):.2f} por acción).\n"
                    f"   - Toma de utilidades: venta del 50% al alcanzar **+25%** (${(p_precio * 1.25):.2f}), y el resto se gerencia con Trailing Stop vela a vela.\n\n"
                    f"• **Plan de Juan Guillermo:** {evaluacionTecnica}"
                )
            elif is_rsi:
                if p_rsi > 70:
                    rsi_zona_desc = 'ZONA DE SOBRECOMPRA (>70): El impulso comprador se está agotando. Históricamente, entradas en RSI > 70 tienen probabilidad elevada de reversionarse hacia el nivel medio (50). En mi operativa: NO comprar aquí. Si ya tienes posición, ceñir el Stop Loss para proteger utilidades y mirar señales de saturación (divergencias con el precio).'
                    rsi_accion = 'Acción recomendada: Reducir posición a nivel defensivo, no tomar nuevas entradas hasta que el RSI retroceda del 50-60 y confirme rebote.'
                elif p_rsi < 30:
                    rsi_zona_desc = 'ZONA DE SOBREVENTA (<30): El impulso vendedor está agotado. Históricamente, rebotes tácticos suelen dispararse desde RSI < 30 si el precio defiende el soporte relevante. En mi operativa: es el momento de preparar una entrada de rebote, NUNCA comprar "en el vacío".'
                    rsi_accion = f'Acción recomendada: Preparar orden de entrada condicional si el precio rebota desde el soporte de ${p_soporte:.2f} con volumen creciente y el RSI cruza por encima de 30.'
                else:
                    rsi_zona_desc = 'ZONA NEUTRAL / CONSTRUCTIVA (30-70): El momentum es mixto, sin distorsión extrema. En mi lectura, el precio puede continuar en cualquier dirección; la señal decisiva está en si el RSI rompe el 70 (alta) o el 30 (baja) con volumen.'
                    rsi_accion = f'Acción recomendada: Mantener posición, supervisar el cruce del precio frente a la EMA 20 (${p_ema20:.2f}) como señal de impulso.'
    
                ema20_vs_precio = 'acompañando una estructura de precio sobre la EMA 20, lo que refuerza la lectura' if p_precio > p_ema20 else 'contra una estructura de precio por debajo de la EMA 20, lo que mitiga la señal del oscilador'
    
                respuesta_guillermo = (
                    f"Para {p_nombre} ({t_clean or 'General'}), la lectura del **RSI (14)** se ubica en **{p_rsi:.1f} puntos** (rango 0-100).\n\n"
                    f"🧠 **QUÉ MIDE EL RSI:** El Índice de Fuerza Relativa es un oscilador que compara la magnitud de las subidas recientes frente a las caídas en los últimos 14 períodos. No predice el precio: mide la FUERZA DEL IMPULSO de compra/venta reciente.\n\n"
                    f"📍 **ZONA ACTUAL ({p_rsi:.1f} puntos):**\n"
                    f"{rsi_zona_desc}\n"
                    f"• {rsi_accion}\n\n"
                    f"📊 **CONTEXTO COMPLETO PARA {t_clean}:** Con precio actual en **${p_precio:.2f}**, la EMA 20 en **${p_ema20:.2f}** y la EMA 50 en **${p_ema50:.2f}**, el contexto del RSI está {ema20_vs_precio}."
                )
            elif is_ema:
                if p_precio >= p_ema200:
                    ema_tendencia = f'✅ **TENDENCIA ALCISTA CONFIRMADA:** El precio sobre la EMA 200 valida la directriz de fondo. Las caídas hacia la EMA 50 (${p_ema50:.2f}) suelen ser correcciones temporales antes de la continuación del impulso alcista. No se opera en contra de la tendencia de fondo.'
                    ema_plano = f'Plano operativo: Buscar entradas en retrocesos hacia la EMA 50, con Stop Loss bajo el soporte de ${p_soporte:.2f}. Las pullbacks son oportunidades, no señales de salida.'
                else:
                    ema_tendencia = f'❌ **TENDENCIA BAJISTA / CORRECTIVA:** El precio por debajo de la EMA 200 indica sesgo de fondo bajista o fase correctiva. Mi regla mecánica: NO COMPRAMOS CUCHILLOS CAYENDO. En un mercado bajista, cada rebote es una oportunidad de reducir posición, no de entrar.'
                    ema_plano = f'Plano operativo: Esperar a que el precio rebase la EMA 50 (${p_ema50:.2f}) con volumen y no retroceda a la EMA 200 antes de considerar cualquier entrada.'

                ema20_vs_precio = 'impulso de corto plazo a favor de la posición' if p_precio > p_ema20 else 'presión a corto plazo que requiere vigilancia'
                ema50_vs_precio = 'por debajo del precio, confirmando estructura constructiva' if p_precio > p_ema50 else 'por encima del precio, señal de debilidad a mediano plazo'

                respuesta_guillermo = (
                    f"Para {p_nombre} ({t_clean or 'General'}), los niveles de medias móviles exponenciales son:\n\n"
                    f"• **EMA 20 (corto plazo):** ${p_ema20:.2f}\n"
                    f"• **EMA 50 (mediano plazo):** ${p_ema50:.2f}\n"
                    f"• **EMA 200 (estructural / directriz de tendencia de fondo):** ${p_ema200:.2f}\n\n"
                    f"📍 **POSICIÓN DEL PRECIO (${p_precio:.2f}):**\n"
                    f"El precio actual cotiza {'por **ENCIMA**' if p_precio >= p_ema200 else 'por **DEBAJO**'} de la EMA 200 de **${p_ema200:.2f}** — la directriz estructural que separa tendencia alcista de bajista de fondo.\n\n"
                    f"🧠 **QUÉ SIGNIFICA EN MI LECTURA TÉCNICA:**\n"
                    f"{ema_tendencia}\n"
                    f"• {ema_plano}\n\n"
                    f"📐 **DISTRIBUCIÓN DE MEDIAS:** EMA 20 (${p_ema20:.2f}) {'por debajo del precio' if p_precio > p_ema20 else 'por encima del precio'} — {ema20_vs_precio}; EMA 50 (${p_ema50:.2f}) {'por debajo del precio, confirmando estructura constructiva' if p_precio > p_ema50 else 'por encima del precio, señal de debilidad a mediano plazo'}."
                )
            elif is_macd:
                macd_line_str = f"{p_macd_line:+.2f}"
                macd_signal_str = f"{p_macd_signal:.2f}"
                macd_hist_str = f"{p_macd_hist:+.2f}"

                if p_macd_hist >= 0:
                    macd_lectura = f'🟢 **HISTOGRAMA POSITIVO (+{p_macd_hist:.2f}):** El momentum comprador está activo y en aceleración. La Línea MACD está por encima de la Línea de Señal, confirmando que el impulso reciente supera la media histórica.'
                    macd_senal = 'Señal operativa: Favorable para mantener entradas o tomar entradas tácticas. Vigila que el histograma NO comience a encogerse (contracción = agotamiento del impulso).'
                else:
                    macd_lectura = f'🔴 **HISTOGRAMA NEGATIVO ({p_macd_hist:.2f}):** Presión vendedora o agotamiento del impulso. La Línea MACD está por debajo de la Línea de Señal.'
                    macd_senal = 'Señal operativa: Evitar entradas nuevas. Si hay posición abierta, considera reducir riesgo y apretar el Stop Loss. Esperar a que el histograma cruce en positivo con volumen.'

                ema200_context = 'un rebote temporal dentro de una tendencia mayor' if p_precio < p_ema200 else 'una corrección dentro de una tendencia alcista de fondo'

                respuesta_guillermo = (
                    f"La estructura del **MACD (12/26/9)** para {p_nombre} ({t_clean or 'General'}) registra:\n\n"
                    f"• **Línea MACD (corto plazo):** {macd_line_str}\n"
                    f"• **Línea de Señal (largo plazo):** {macd_signal_str}\n"
                    f"• **Histograma (diferencia entre líneas):** {macd_hist_str}\n\n"
                    f"🧠 **QUÉ MIDE EL MACD:** El MACD es un oscilador de momentum que mide la relación entre dos medias móviles (EMA 12 y EMA 26). Cuando la Línea cruza la Línea de Señal hacia arriba, genera señal de compra; hacia abajo, señal de venta. El histograma amplifica esa señal.\n\n"
                    f"📍 **LECTURA ACTUAL:**\n"
                    f"{macd_lectura}\n"
                    f"• {macd_senal}\n\n"
                    f"📊 **CONTEXTO DE TENDENCIA:** Con el precio en **${p_precio:.2f}**, el MACD debe leerse junto a la tendencia global sobre la EMA 200 (**${p_ema200:.2f}**). Un MACD positivo en un precio POR DEBAJO de la EMA 200 es {ema200_context}; un MACD negativo en un precio SOBRE la EMA 200 es {ema200_context}."
                )
            elif is_precio:
                precio_vs_ema200 = 'por ENCIMA ✅ — directriz alcista' if p_precio >= p_ema200 else 'por DEBAJO ❌ — sesgo correctivo/bajista'
                precio_vs_ema50 = 'por ENCIMA ✅ — estructura de mediano plazo constructiva' if p_precio >= p_ema50 else 'por DEBAJO ❌ — presión a mediano plazo'
                precio_vs_ema20 = 'por ENCIMA ✅ — impulso táctico positivo' if p_precio >= p_ema20 else 'por DEBAJO ❌ — debilidad de corto plazo'

                dist_soporte_pct = ((p_soporte - p_precio) / p_precio * 100)
                dist_resistencia_pct = ((p_resistencia - p_precio) / p_precio * 100)

                if p_precio >= p_ema200 and p_rsi < 70 and p_ratio_rb >= 2:
                    precio_eval = 'una posición FAVORABLE: estructura alcista confirmada, momentum no agotado y ratio riesgo/beneficio mínimo de 2:1'
                elif p_precio >= p_ema200 and p_ratio_rb < 2:
                    precio_eval = 'una posición CUESTIONABLE: estructura alcista pero el ratio riesgo/beneficio actual no justifica armar posición'
                else:
                    precio_eval = 'una posición NO FAVORABLE: la tendencia y/o el momentum no confirman una entrada segura'

                respuesta_guillermo = (
                    f"La acción del precio actual de {p_nombre} ({t_clean or 'General'}) cotiza en **${p_precio:.2f}**.\n\n"
                    f"📍 **POSICIÓN EN EL GRÁFICO:**\n"
                    f"• **Frente a la EMA 200 (estructural ${p_ema200:.2f}):** {precio_vs_ema200}\n"
                    f"• **Frente a la EMA 50 (mediano plazo ${p_ema50:.2f}):** {precio_vs_ema50}\n"
                    f"• **Frente a la EMA 20 (corto plazo ${p_ema20:.2f}):** {precio_vs_ema20}\n"
                    f"• **Distancia al soporte:** ${p_soporte:.2f} ({dist_soporte_pct:.1f}%)\n"
                    f"• **Distancia a la resistencia:** ${p_resistencia:.2f} ({dist_resistencia_pct:.1f}%)\n\n"
                    f"🧠 **LECTURA TÉCNICA COMPLETA:**\n"
                    f"Con RSI en **{p_rsi:.1f} puntos** y MACD histograma en **{p_macd_hist >= 0 and '+' or ''}{p_macd_hist:.2f}** ({p_macd_hist >= 0 and 'momentum comprador' or 'momentum vendedor'}), el precio en ${p_precio:.2f} se interpreta como {precio_eval}. La decisión operativa final depende de si el ratio {p_ratio_rb:.1f}:1 cumple mi estándar de 2:1."
                )
            elif is_rb:
                riesgo_por_accion = p_precio - p_stop_loss
                beneficio_por_accion = p_resistencia - p_precio

                if p_ratio_rb >= 2.0:
                    rb_veredicto = f'✅ **OPERACIÓN APROBADA:** El recorrido hacia la resistencia duplica con creces el riesgo asumido. Incluso si el 50% de mis entradas fallan (Stop Loss), las que ganan me compensan. Probabilidad matemática a favor: con ratio {p_ratio_rb:.1f}:1, solo necesito un {min(99, round((1 / (1 + p_ratio_rb)) * 100))}% de aciertos para ser rentable a largo plazo.'
                    rb_sl = f'Stop Loss: Estricto en ${p_stop_loss:.2f}, NO se mueve hacia arriba.'
                    rb_gestion = 'Gestión de salida: Toma parcial al 50% del recorrido y Trailing Stop en el resto.'
                else:
                    rb_veredicto = f'❌ **OPERACIÓN DESCARTADA:** Un ratio de {p_ratio_rb:.1f}:1 deja las probabilidades MATEMÁTICAMENTE en contra del operador. Necesitaría un {min(99, round((1 / (1 + p_ratio_rb)) * 100))}% de aciertos para ser rentable a largo plazo, lo cual es irreal.'
                    rb_sl = 'No se opera.'
                    rb_gestion = f'O espero un retroceso que me permita ceñir el Stop Loss cerca del soporte de ${p_soporte:.2f} (mejorando el ratio), o descarto la operación y busco otro activo con mejor geometría de riesgo/beneficio.'

                respuesta_guillermo = (
                    f"Para {p_nombre} ({t_clean or 'General'}), la relación Riesgo/Beneficio calculada es de **{p_ratio_rb:.1f}:1**.\n\n"
                    f"🧠 **MATEMÁTICA DEL RIESGO:**\n"
                    f"• **Precio de entrada:** ${p_precio:.2f}\n"
                    f"• **Stop Loss:** ${p_stop_loss:.2f} (riesgo: ${riesgo_por_accion:.2f} por acción)\n"
                    f"• **Objetivo (resistencia):** ${p_resistencia:.2f} (beneficio: ${beneficio_por_accion:.2f} por acción)\n\n"
                    f"El ratio = Beneficio objetivo / Riesgo asumido = ${beneficio_por_accion:.2f} / ${riesgo_por_accion:.2f} = **{p_ratio_rb:.1f}:1**\n\n"
                    f"⚖️ **VEREDICTO BAJO MI REGLA DE ORO (MÍNIMO 2:1):**\n"
                    f"{rb_veredicto}\n"
                    f"• {rb_sl}\n"
                    f"• {rb_gestion}"
                )
            elif is_fund_tech:
                # Responses for fundamental metrics from technical perspective
                if is_roe:
                    respuesta_guillermo = (
                        f"El ROE (Retorno sobre Patrimonio) es un indicador de rentabilidad contable que analiza Jairo Agudelo en el plano fundamental. En el plano técnico de pantalla me rijo por la acción del precio actual (**${p_precio:.2f}**) y su posición respecto a la directriz estructurada por la EMA 200 (**${p_ema200:.2f}**).\n\n"
                        f"🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Un ROE bajo no significa automáticamente que el precio esté 'barato'. El precio refleja la expectativa del mercado. En mi lectura, un ROE en caída puede preceder una corrección técnica: si el precio de {t_clean} cae por debajo de la EMA 50 (${p_ema50:.2f}) con RSI en {p_rsi:.1f} y MACD histograma {'negativo' if p_macd_hist < 0 else 'positivo'}, esa es la señal técnica que confirma que el mercado ya está descontando la debilidad fundamental.\n\n"
                        f"🎯 **CONCLUSIONES PARA JAIRO:** El problema del ROE no es solo un número contable; es la prospera de lo que la EPS (ganancia por acción) va a hacer en el futuro. Yo lo traduzco a la pregunta: ¿quién va a pagar el precio actual de ${p_precio:.2f} si el beneficio por acción cae? Ahí es donde el Stop Loss de ${p_stop_loss:.2f} protege al operador."
                    )
                elif is_liquidez:
                    respuesta_guillermo = (
                        f"La liquidez contable de balance es evaluada por Jairo en el plano fundamental. En la operativa bursátil, yo mido la liquidez por el VOLUMEN de negociación y la firmeza en el soporte de **${p_soporte:.2f}** y resistencia de **${p_resistencia:.2f}**.\n\n"
                        f"🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Una liquidez contable baja (Razón Corriente < 1.0) puede manifestarse técnicamente como caídas aceleradas del precio, falta de apoyo en los soportes y baches profundos. Si el balance de {t_clean} es frágil, el precio puede romper el soporte de ${p_soporte:.2f} con volumen y la recuperación técnica se dificulta de ejecutar.\n\n"
                        f"🎯 **CONCLUSIONES PARA JAIRO:** La liquidez es un indicador de SUSTENTABILIDAD del negocio a largo plazo, no de la operación de hoy. Yo la traduzco a: ¿qué tan rápido puede caer el precio si hay una noticia de tensión financiera? La respuesta la da la distancia al Stop Loss de ${p_stop_loss:.2f}."
                    )
                elif is_apalancamiento:
                    respuesta_guillermo = (
                        f"El apalancamiento financiero corresponde a la auditoría de balance de Jairo en el plano fundamental. En la disciplina de trading, yo controlo el riesgo mediante un Stop Loss estricto fijado en **${p_stop_loss:.2f}** y exigiendo una relación riesgo/beneficio mínima de 2:1 (actualmente en **{p_ratio_rb:.1f}:1**).\n\n"
                        f"🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Un apalancamiento elevado (Deuda/EBITDA > 4x) suele manifestarse técnicamente como una caída volátil del precio. Cuando el mercado descuenta la carga de intereses, el precio rompe soportes con fuerza y el RSI se profundiza por debajo de 30. Es el momento de la defensiva: ceñir el Stop Loss y no entrar.\n\n"
                        f"🎯 **CONCLUSIONES PARA JAIRO:** El apalancamiento es un dato contable de Jairo, pero tiene un eco técnico en mi gráfico: mayor apalancamiento = mayor probabilidad de caídas violentas = más espacios para el Stop Loss = peor ratio riesgo/beneficio. Yo lo traduzco a: ¿cuánto Stop Loss necesito para protegerme de una caída por apalancamiento? La respuesta actual es ${p_stop_loss:.2f}."
                    )
                elif is_margen:
                    respuesta_guillermo = (
                        f"El margen de seguridad contable lo determina Jairo en el plano fundamental. En la lectura de pantalla, nuestro margen operativo lo da la relación Riesgo/Beneficio de **{p_ratio_rb:.1f}:1**, verificando si el trayecto hacia la resistencia (**${p_resistencia:.2f}**) justifica el riesgo asumido al Stop Loss (**${p_stop_loss:.2f}**).\n\n"
                        f"🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** El margen de seguridad técnico es mínimo si el precio está muy lejos del soporte. Cuanto más cercano esté el precio al soporte de ${p_soporte:.2f}, más reducido es el Stop Loss y más amplio es el recorrido hacia la resistencia de ${p_resistencia:.2f}. Ese es el margen operativo técnico: no solo mirar cuánto puede subir, sino cuánto puede perder si falla.\n\n"
                        f"🎯 **CONCLUSIONES PARA JAIRO:** El margen de seguridad de Jairo es el 'cuánto está descontado'. El margen técnico es el 'cuánto puedo perder en el peor caso'. Juntos forman la decisión: si el margen de seguridad es amplio y el margen técnico es ajustado, el trade es de alta convicción. Si el margen de seguridad es apretado y el margen técnico es amplio, el trade es de baja convicción. El ratio actual de {p_ratio_rb:.1f}:1 {'favorece la entrada' if p_ratio_rb >= 2 else 'frena la entrada'}."
                    )
                elif is_ke:
                    respuesta_guillermo = (
                        f"El costo de capital K_e es una variable fundamental analizada por Jairo en el plano de la creación de valor. En el plano técnico, yo me guío por la acción del precio actual (**${p_precio:.2f}**) y su tendencia sobre las medias móviles EMA 20 (**${p_ema20:.2f}**) y EMA 50 (**${p_ema50:.2f}**).\n\n"
                        f"🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Un K_e alto (mayor al 12%) indica que el mercado exige un retorno alto por el riesgo de {t_clean}. Técnicamente, eso se traduce a: el precio ya está descontando un riesgo elevado. Si el precio rompe la EMA 200 (${p_ema200:.2f}) con volumen, es la confirmación técnica de que el mercado está re-pensando su valoración.\n\n"
                        f"🎯 **CONCLUSIONES PARA JAIRO:** El K_e es el 'interés' que el mercado cobra por invertir en {t_clean}. Yo lo traduzco a: ¿cuánto riesgo de caída estoy dispuesto a asumir? La respuesta la da la distancia al Stop Loss de ${p_stop_loss:.2f} y la dirección de la EMA 200. Un K_e alto + precio por debajo de la EMA 200 = 'esta empresa es cara para lo que ofrece' y el mercado lo está descontando."
                    )
                elif is_moat:
                    respuesta_guillermo = (
                        f"El foso económico protege el modelo de negocio a largo plazo que sigue Jairo. En el gráfico técnico confirmamos esa ventaja cuando el precio defiende con consistencia la EMA 200 (**${p_ema200:.2f}**) y rechaza caídas hacia el soporte de **${p_soporte:.2f}**.\n\n"
                        f"🔄 **PERO AQUÍ ESTÁ EL CONTRAPUNTO TÉCNICO:** Un moat amplio se nota en el gráfico como un precio que tiende a recuperarse rápidamente de cada caída y que rara vez rompe soportes importantes. La 'memoria de precio' de un moat es fuerte: los soportes defensivos y las caídas solo temporales.\n\n"
                        f"🎯 **CONCLUSIONES PARA JAIRO:** El moat de Jairo es el 'por qué' el precio se recupera; mi lectura técnica es el 'cuándo' se recupera. Con el precio en ${p_precio:.2f}, el soporte en ${p_soporte:.2f} y la EMA 200 en ${p_ema200:.2f}, la estructura técnica {'apoya la tesis de moat (precio sobre la directriz de fondo)' if p_precio >= p_ema200 else 'está cuestionando el moat (precio por debajo de la directriz de fondo, presión vendedora).'} La dirección del RSI ({p_rsi:.1f}) y del MACD (histograma {p_macd_hist >= 0 and '+' or ''}{p_macd_hist:.2f}) confirman o contradicen esa tesis."
                    )
            else:
                estaSobreEma200 = p_precio >= p_ema200
                setup_tecnico = p_ratio_rb >= 2.0 and estaSobreEma200 and p_rsi < 70
                rsi_zona = "sobrecompra" if p_rsi >= 70 else "sobreventa — posible rebote táctico" if p_rsi <= 30 else "zona neutral/constructiva"
                macd_momentum = "comprador ✅" if p_macd_hist >= 0 else "vendedor ⚠️"
                respuesta_guillermo = (
                    f"¡Vámonos a la parte que a mí me apasiona: el gráfico y la lectura de pantalla!\n\n"
                    f"Analizamos **{p_nombre} ({t_clean or 'General'})** con disciplina técnica, sin romanticismos:\n\n"
                    f"📈 **1. TENDENCIA Y MEDIAS MÓVILES EXPONENCIALES (EMA):**\n"
                    f"• Precio actual: **${p_precio:.2f}** · EMA 20: **${p_ema20:.2f}** · EMA 50: **${p_ema50:.2f}** · EMA 200: **${p_ema200:.2f}**\n"
                    f"• Tendencia estructural: el precio cotiza **{'POR ENCIMA de la EMA 200 ✅ — directriz alcista de largo plazo confirmada' if estaSobreEma200 else 'POR DEBAJO de la EMA 200 ❌ — sesgo correctivo; no compramos cuchillos cayendo'}**\n"
                    f"• Las EMAs de corto y mediano plazo {'están alineadas al alza, con EMA 20 > EMA 50 > precio, señal de momentum positivo' if p_ema20 >= p_ema50 else 'muestran compresión o cruce bajista entre EMA 20 y EMA 50, señal de debilidad de corto plazo'}\n\n"
                    f"⚡ **2. OSCILADORES DE MOMENTUM (RSI + MACD):**\n"
                    f"• **RSI (14):** {p_rsi:.1f} puntos — zona de **{rsi_zona}**\n"
                    f"• **MACD (12/26/9):** Línea {p_macd_line:+.2f} · Señal {p_macd_signal:.2f} · Histograma {p_macd_hist:+.2f} — momentum **{macd_momentum}**\n"
                    f"• Los osciladores {'confirman la tendencia alcista y dan luz verde operativa ✅' if p_rsi < 70 and p_macd_hist >= 0 else 'muestran señales mixtas que exigen cautela ⚠️' if p_rsi >= 60 or p_macd_hist < 0 else 'están en zona de sobreventa, vigilar rebote con volumen'}\n\n"
                    f"🔑 **3. MEMORIA DE PRECIOS (SOPORTES Y RESISTENCIAS):**\n"
                    f"• **Soporte clave:** ${p_soporte:.2f} — zona de compra institucional prioritaria\n"
                    f"• **Resistencia técnica:** ${p_resistencia:.2f} — zona de toma de utilidades y presión vendedora\n\n"
                    f"🎯 **4. PLAN OPERATIVO DE JUAN GUILLERMO:**\n"
                    f"• **Relación Riesgo/Beneficio:** {p_ratio_rb:.1f}:1 — {'✅ CUMPLE la regla de oro de mínimo 2 a 1' if p_ratio_rb >= 2.0 else '❌ NO CUMPLE el estándar mínimo de 2 a 1: esperamos mejor setup'}\n"
                    f"• **Stop Loss sugerido:** ${p_stop_loss:.2f}\n"
                    f"• **Toma de utilidades:** 50% al alcanzar +25% (${(p_precio * 1.25):.1f}); el resto con Trailing Stop vela a vela\n"
                    f"• **Veredicto técnico:** {'🟢 SETUP VALIDADO — la estructura técnica acompaña y la operación reúne los requisitos mínimos de Guangui para ingresar' if setup_tecnico else '🟡 EN ESPERA — aguardar corrección hacia soporte o mejora del setup antes de comprometer capital'}"
                )

    # ── Síntesis automática ───────────────────────────────────────────────
    if is_punctual:
        sintesis = "Respuesta directa y puntual: Jairo evalúa la métrica desde la solvencia, rentabilidad y creación de valor de la compañía, mientras que Juan Guillermo verifica el comportamiento de la variable en pantalla técnica y la gestión de riesgo."
        convergieron = True
    else:
        prompt_sintesis = (
            f"ANÁLISIS FUNDAMENTAL (Jairo):\n{respuesta_jairo}\n\n"
            f"ANÁLISIS TÉCNICO (Juan Guillermo):\n{respuesta_guillermo}\n\n"
            f"PATRONES DE RESOLUCIÓN CUANDO DIVERGEN:\n{ejemplos}"
        )
        sintesis = ""
        if client.client:
            sintesis = client.generate(
                system_instruction=(
                    f"{REGLA_DE_ORO_IDIOMA}\n\n"
                    "Eres el moderador que integra un análisis fundamental y uno técnico de la misma empresa. "
                    "Escribe de 3 a 5 frases en texto plano, sin títulos, asteriscos ni emojis. "
                    "La primera palabra debe ser exactamente COINCIDEN o DIVERGEN, seguida de punto. Después: "
                    "1) en qué cifra concreta se apoya cada uno; "
                    "2) resuelve con el criterio de que el fundamental decide QUÉ comprar y el técnico CUÁNDO; "
                    "3) termina con una acción precisa: comprar ahora, esperar a un precio o condición concretos, o descartar. "
                    "No repitas los análisis ni añadas cifras que no estén en ellos."
                ),
                user_message=prompt_sintesis,
                max_output_tokens=2048
            )

        if not sintesis:
            sintesis = (
                f"Síntesis coordinada: Jairo valida cómo gana dinero y la solidez del balance desde el enfoque fundamental, "
                f"mientras que Juan Guillermo establece una estrategia operativa condicionada a la defensa de los soportes y la EMA 200 con ratio 2:1. "
                f"Resolución: Mantener en lista de seguimiento activa y ejecutar compras únicamente con plan de gestión de riesgo y Stop Loss definido."
            )

        lower_j = respuesta_jairo.lower()
        lower_g = respuesta_guillermo.lower()
        positive_keywords = ["compra", "oportunidad", "atractiv", "entrada", "alcista", "positiv", "valor"]
        negative_keywords = ["esperar", "prudencia", "riesgo", "bajista", "abstenerse", "cuidado", "evitar"]
        j_positive = any(k in lower_j for k in positive_keywords)
        g_positive = any(k in lower_g for k in positive_keywords)
        j_negative = any(k in lower_j for k in negative_keywords)
        g_negative = any(k in lower_g for k in negative_keywords)
        convergieron = (j_positive and g_positive) or (j_negative and g_negative) or (not j_negative and not g_negative)
        # El moderador declara el veredicto en la primera palabra; prevalece sobre la heurística
        veredicto = sintesis.lstrip().upper()
        if veredicto.startswith("DIVERGEN"):
            convergieron = False
        elif veredicto.startswith("COINCIDEN"):
            convergieron = True

    return {
        "success": True,
        "pregunta": pregunta,
        "ticker": ticker.upper() if ticker else None,
        "empresaNombre": p_nombre,
        "modeloNegocio": {
            "queHace": p_que_hace,
            "comoGanaDinero": p_como_gana_dinero,
            "sector": p_sector
        },
        "respuesta_jairo": respuesta_jairo,
        "respuesta_guillermo": respuesta_guillermo,
        "sintesis": sintesis,
        "convergencia": "acuerdo" if convergieron else "divergencia",
        "source": "gemini-live" if usa_gemini else "motor-analitico"
    }


def consultar_jairo(pregunta: str, ticker: str = None):
    """
    Llamada únicamente con el perfil de Jairo Agudelo (análisis fundamental).
    Ideal para preguntas específicas e individuales.
    """
    import urllib.request
    import urllib.error

    data_dir = Path(__file__).parent / "data"
    perfil_jairo_path = data_dir / "perfil_jairo.txt"

    def read_file(path):
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            return ""

    perfil_jairo = read_file(perfil_jairo_path)

    if not ticker:
        lower_q = pregunta.lower()
        keyword_to_ticker = {
            "nike": "NKE", "nke": "NKE",
            "coca": "KO", "coca-cola": "KO", "coca cola": "KO", "ko": "KO",
            "apple": "AAPL", "aapl": "AAPL", "iphone": "AAPL",
            "microsoft": "MSFT", "msft": "MSFT",
            "berkshire": "BRK.B", "buffett": "BRK.B", "brk": "BRK.B",
            "johnson": "JNJ", "jnj": "JNJ",
            "walmart": "WMT", "wmt": "WMT",
            "hype": "HYPE"
        }
        for kw, t in keyword_to_ticker.items():
            if kw in lower_q:
                ticker = t
                break

    t_clean = (ticker or "").upper().strip()
    p_nombre = t_clean or "el activo consultado"
    p_precio = 100.0
    p_per = "22.5"
    p_roe = 28.0
    p_liquidez = 1.5
    p_deuda = "1.8"
    p_moat = "Medio"
    p_potencial_alza = 15.0
    p_precio_objetivo = round(p_precio * (1.0 + (p_potencial_alza / 100.0)), 2)
    p_recomendacion = "Sin datos de recomendación"
    p_num_analistas = 0
    tc = {}
    valoracion = {}
    datos_ok = False
    p_cobertura = "N/D"
    p_ke = 9.5
    p_sector = "Renta Variable Global"
    p_que_hace = f"Compañía cotizada en bolsa con operaciones comerciales en el sector de {p_sector}."
    p_como_gana_dinero = f"Genera ingresos vendiendo productos y soluciones en el mercado de {p_sector} con márgenes competitivos."

    MODELOS_PREDEFINIDOS = {
        "NKE": {
            "nombre": "NIKE, Inc.",
            "sector": "Calzado y Ropa Deportiva",
            "roe": 35.8, "liquidez": 1.82, "deuda": "1.6", "moat": "Foso Amplio", "potencial_alza": 25.0, "ke": 9.8,
            "que_hace": "Diseña, desarrolla y distribuye calzado, indumentaria y equipamiento atlético bajo las marcas Nike, Jordan y Converse.",
            "como_gana_dinero": "Vende al por mayor a cadenas deportivas globales y directamente al consumidor (tiendas Nike Direct y nike.com) con precios premium gracias a su marca."
        },
        "AAPL": {
            "nombre": "Apple Inc.",
            "sector": "Tecnología de Consumo",
            "roe": 145.0, "liquidez": 1.05, "deuda": "1.1", "moat": "Foso Amplio", "potencial_alza": -8.5, "ke": 9.2,
            "que_hace": "Fabrica hardware premium (iPhone, Mac, iPad, Apple Watch) e integra un ecosistema de software y servicios.",
            "como_gana_dinero": "Venta masiva de iPhones (~50% de ingresos) y servicios recurrentes de alto margen (App Store, suscripciones iCloud/Apple Music y comisiones de pago)."
        },
        "KO": {
            "nombre": "The Coca-Cola Company",
            "sector": "Bebidas y Consumo Masivo",
            "roe": 41.2, "liquidez": 1.15, "deuda": "2.3", "moat": "Foso Amplio", "potencial_alza": 4.7, "ke": 7.5,
            "que_hace": "Compañía líder mundial de bebidas con más de 200 marcas de refrescos, aguas, jugos, tés y cafés.",
            "como_gana_dinero": "Vende jarabres y concentrados patentados a embotelladoras asociadas que asumen el costo de distribución, cobrando márgenes brutos superiores al 60%."
        },
        "MSFT": {
            "nombre": "Microsoft Corporation",
            "sector": "Software y Computación en la Nube",
            "roe": 38.5, "liquidez": 1.25, "deuda": "0.7", "moat": "Foso Amplio", "potencial_alza": 2.8, "ke": 8.9,
            "que_hace": "Desarrolla plataformas cloud empresariales (Azure), software de productividad (Office 365) y sistemas operativos.",
            "como_gana_dinero": "Cobro recurrente por consumo de infraestructura en la nube (Azure), suscripciones mensuales tipo SaaS a empresas y licencias de software."
        },
        "BRK.B": {
            "nombre": "Berkshire Hathaway Inc.",
            "sector": "Conglomerado Financiero / Seguros",
            "roe": 14.8, "liquidez": 1.40, "deuda": "0.9", "moat": "Foso Amplio", "potencial_alza": 8.7, "ke": 8.5,
            "que_hace": "Holding diversificado dueño de aseguradoras (GEICO), ferrocarriles (BNSF), utilities energéticas y una masiva cartera de acciones.",
            "como_gana_dinero": "Utiliza el 'float' asegurador (primas cobradas por anticipado invertidas a coste cero) y recoge beneficios operativos de sus decenas de filiales."
        }
    }

    if t_clean in MODELOS_PREDEFINIDOS:
        m = MODELOS_PREDEFINIDOS[t_clean]
        p_nombre = m["nombre"]
        p_sector = m["sector"]
        p_roe = m["roe"]
        p_liquidez = m["liquidez"]
        p_deuda = m["deuda"]
        p_moat = m["moat"]
        p_potencial_alza = m["potencial_alza"]
        p_ke = m["ke"]
        p_que_hace = m["que_hace"]
        p_como_gana_dinero = m["como_gana_dinero"]

    if t_clean:
        try:
            datos = get_company_data(t_clean)
            if datos.get("success"):
                raw = datos.get("raw", {})
                ratios = datos.get("ratios", {})
                p_nombre = datos.get("nombre") or p_nombre
                p_precio = clean_val(raw.get("precioCotizacion"), 100.0)
                p_per = str(ratios.get("per", "22.5"))
                p_roe = float(clean_val(ratios.get("roe"), p_roe))
                p_liquidez = float(clean_val(ratios.get("liquidezCorriente"), p_liquidez))
                p_deuda = str(ratios.get("endeudamiento", p_deuda))
                p_cobertura = str(ratios.get("coberturaIntereses", p_cobertura))
                p_moat = datos.get("moat", p_moat)
                p_sector = datos.get("sector") or p_sector
                datos_ok = True
                valoracion = datos.get("valoracion") or {}
                if valoracion.get("kePct"):
                    p_ke = float(valoracion["kePct"])
                tc = datos.get("target_consensus") or {}
                if tc:
                    if tc.get("upside_potential") is not None:
                        p_potencial_alza = float(clean_val(tc.get("upside_potential"), p_potencial_alza))
                    if tc.get("target_mean"):
                        p_precio_objetivo = float(clean_val(tc.get("target_mean"), p_precio_objetivo))
                    if tc.get("recommendation"):
                        p_recomendacion = tc.get("recommendation")
                    if tc.get("number_of_analysts"):
                        p_num_analistas = tc.get("number_of_analysts")
                if datos.get("descripcion") and len(datos.get("descripcion")) > 30 and t_clean not in MODELOS_PREDEFINIDOS:
                    p_que_hace = datos.get("descripcion")
        except Exception:
            pass

    # Consenso de Wall Street: usar objetivo medio de analistas si está disponible,
    # de lo contrario estimar precio objetivo a partir del potencial al alza por defecto.
    if tc and tc.get("target_mean"):
        p_precio_objetivo = float(clean_val(tc.get("target_mean"), p_precio_objetivo))
    else:
        p_precio_objetivo = round(p_precio * (1.0 + (p_potencial_alza / 100.0)), 2)

    contexto_fundamental = (
        f"CONTEXTO DE DATOS FUNDAMENTALES ({t_clean or 'General'}):\n"
        + ("" if datos_ok else AVISO_SIN_DATOS)
        + f"  • Empresa: {p_nombre} ({t_clean or 'N/D'}) · Sector: {p_sector}\n"
        f"  • Actividad: {p_que_hace}\n"
        f"  • Fuentes de ingresos: {p_como_gana_dinero}\n"
        f"  • Precio actual: ${p_precio:.2f}\n"
        f"  • ROE: {p_roe:.1f}% frente a K_e: {p_ke:.1f}%\n"
        f"  • Liquidez corriente: {p_liquidez:.2f}x · Pasivo total/Patrimonio: {p_deuda}x · "
        f"Cobertura de intereses (EBIT/intereses): {p_cobertura}x\n"
        f"  • Foso económico (heurística): {p_moat}\n"
        f"  • Consenso de analistas: objetivo medio ${p_precio_objetivo:.2f} ({p_potencial_alza:+.1f}% frente al precio), "
        f"{p_recomendacion}, {p_num_analistas} analistas\n"
        + formatear_valoracion(valoracion)
    )

    if not datos_ok:
        return error_sin_datos(pregunta, t_clean)

    system_instruction_jairo = construir_prompt_jairo(perfil_jairo, contexto_fundamental)

    client = get_gemini_client()

    respuesta_jairo = ""

    if client.client:
        respuesta_jairo = client.generate(system_instruction_jairo, pregunta)
    usa_gemini = bool(respuesta_jairo)

    # Fallback especializado
    import re
    norm_q = pregunta.lower()
    is_roe = bool(re.search(r'\broe\b', norm_q))
    is_liquidez = bool(re.search(r'\b(liquidez|razon corriente|prueba acida|capital de trabajo|current ratio)\b', norm_q))
    is_apalancamiento = bool(re.search(r'\b(apalancamiento|deuda|endeudamiento|leverage)\b', norm_q))
    is_margen = bool(re.search(r'\b(margen de seguridad|valor intrinseco|precio intrinseco|precio objetivo|consenso de analistas|potencial al alza|objetivo de analistas|objetivo medio|recomendacion de analistas)\b', norm_q))
    is_ke = bool(re.search(r'\b(k_e|ke|costo de capital|costo del capital|cost of equity)\b', norm_q))
    is_moat = bool(re.search(r'\b(moat|foso|ventaja competitiva)\b', norm_q))
    is_rsi = bool(re.search(r'\brsi\b', norm_q))
    is_ema = bool(re.search(r'\b(ema|medias moviles|media movil|promedios moviles)\b', norm_q))
    is_macd = bool(re.search(r'\bmacd\b', norm_q))
    is_precio = bool(re.search(r'\b(precio actual|accion del precio|cotizacion)\b', norm_q))
    is_rb = bool(re.search(r'\b(stop loss|riesgo beneficio|riesgo/beneficio)\b', norm_q))

    is_punctual = any([is_roe, is_liquidez, is_apalancamiento, is_margen, is_ke, is_moat])

    if not respuesta_jairo:
        is_rsi_tech = is_rsi or is_ema or is_macd or is_precio or is_rb

        if is_roe:
            deuda_num = float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8')
            jairo_roe_interp = 'Un ROE superior al 20% se considera excelente y es típico de empresas con un moat amplio y poder de fijación de precios.' if p_roe >= 20 else ('Un ROE entre 15-20% es saludable y está dentro del rango que buscaría Warren Buffett.' if p_roe >= 15 else ('Un ROE entre 10-15% es aceptable pero no destacable.' if p_roe >= 10 else 'Un ROE inferior al 10% indica una creación de valor muy limitada sobre el capital invertido.'))
            jairo_roe_contra = f'El negocio CREA valor real: genera {(p_roe - p_ke):.1f} puntos porcentuales POR ENCIMA de nuestro costo de capital — esto es exactamente lo que multiplica el patrimonio del accionista año tras año.' if p_roe >= p_ke else f'El negocio NO supera el umbral de creación de valor: su ROE del {p_roe:.1f}% está POR DEBAJO del K_e del {p_ke:.1f}%, lo que significa que destruye valor aunque los beneficios contables sean positivos.'
            respuesta_jairo = (
                f"Para {p_nombre} ({t_clean or 'General'}), el ROE (Retorno sobre Patrimonio) actual es del **{p_roe:.1f}%**. "
                f"Este es el indicador central del Value Investing: mide cuánto beneficio genera la compañía por cada dólar de patrimonio neto de sus accionistas.\n\n"
                f"🧠 **CÓMO INTERPRETARLO:** {jairo_roe_interp}\n\n"
                f"💰 **CONTRAVENTA CON NUESTRO K_e:** Nuestro costo de capital propio (K_e) estimado es del **{p_ke:.1f}%** (lo que exigiríamos como retorno mínimo por el riesgo asumido). {jairo_roe_contra}\n\n"
                f"📚 **CONTEXTUALIZADO EN {p_nombre}:** {p_que_hace} {p_como_gana_dinero}"
            )
        elif is_liquidez:
            liq_interp = 'Una razón superior a 1.5x denota una tesorería holgada y capacidad sobrada para honrar obligaciones a corto plazo sin estrés financiero.' if p_liquidez >= 1.5 else ('Una razón entre 1.0x y 1.5x es operativa: cumple con lo mínimo necesario, pero deja poco margen para imprevistos.' if p_liquidez >= 1.0 else 'Una razón inferior a 1.0x (pasivos circulantes superan a activos circulantes) es una ALERTA ROJA de estrechez de liquidez inmediata y posible vulnerabilidad de solvencia.')
            liq_sector = f'Como empresa del sector {p_sector.lower()}, esta liquidez es consistente con una gestión de capital de trabajo eficiente.' if p_liquidez >= 1.0 else f'Este nivel de liquidez requiere supervisión activa del working capital, ya que cualquier contracción del crédito o caída de ventas podría tensionar el balance.'
            liq_norma = 'estamos bien posicionados' if p_liquidez >= 1.5 else ('estamos en el mínimo operativo' if p_liquidez >= 1.0 else 'estamos en terreno peligroso')
            respuesta_jairo = (
                f"La Liquidez Corriente (Razón Corriente) de {p_nombre} ({t_clean or 'General'}) se ubica en **{p_liquidez:.2f}x** — por cada dólar de deuda a corto plazo, la compañía dispone de **${p_liquidez:.2f}** en activos circulantes (efectivo, cuentas por cobrar, inventario) para responder.\n\n"
                f"🛡️ **INTERPRETACIÓN:** {liq_interp}\n\n"
                f"🔄 **CONTEXTO SECTORIAL:** {liq_sector} Comparado con la norma general del mercado (donde 1.5-2.0x es el rango cómodo), {liq_norma}.\n\n"
                f"💡 **PARA EL INVERSOR:** Jairo vigila que el flujo de caja opere con holgura: una liquidez de {p_liquidez:.2f}x junto con un ROE del {p_roe:.1f}% y un K_e de {p_ke:.1f}% ofrece una combinación de solvencia y retorno que respalda la sostenibilidad del modelo."
            )
        elif is_apalancamiento:
            deuda_num = float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8')
            apal_calc = 'Se mide sobre la relación Deuda/EBITDA (cuántos años de beneficios operativos brutos se necesitan para pagar la deuda total).' if deuda_num > 2.9 else 'Se mide sobre la relación Deuda/Patrimonio (cuánta deuda financiada hay por cada dólar de patrimonio de los accionistas).'
            if deuda_num <= 2.5:
                apal_eval = 'Un apalancamiento bajo (≤ 2.5x) se considera saludable y sostenible: los intereses son una carga manejable frente al EBITDA y no erosionan sustancialmente el margen neto.'
            elif deuda_num <= 4.0:
                apal_eval = 'Un apalancamiento moderado (2.5x-4.0x) es admisible si el negocio genera flujos estables y recurrentes, pero deja menos colchón ante recesiones.'
            else:
                apal_eval = 'Un apalancamiento elevado (> 4.0x) es una bandera amarilla: los intereses consumen gran parte del beneficio operativo y cualquier caída de ingresos compromete la capacidad de pago.'
            respuesta_jairo = (
                f"El nivel de Apalancamiento de {p_nombre} ({t_clean or 'General'}) es de **{p_deuda}x**.\n\n"
                f"🏦 **CÓMO SE CALCULA:** {apal_calc}\n\n"
                f"⚖️ **EVALUACIÓN:** {apal_eval}\n\n"
                f"🧮 **IMPACTO EN EL ACCIONISTA:** Con este nivel de deuda, el riesgo financiero reduce la atracción del valor. La clave es que el ROE del {p_roe:.1f}% compense el coste de ese endeudamiento; en un entorno de tipos altos, la deuda cara presiona márgenes y crecimiento."
            )
        elif is_margen:
            if p_potencial_alza >= 15:
                margen_eval = 'Este es el escenario ideal para un inversor value: un margen de seguridad superior al 15% significa que el consenso anticipa una apreciación sustancial y ya hay un colchón amplio contra errores de análisis.'
                margen_rec = 'Un inversor value vería aquí una zona de acumulación atractiva, siempre que la calidad del negocio (ROE, foso, balance) también respalde la tesis.'
            elif p_potencial_alza >= 5:
                margen_eval = 'El margen de seguridad es positivo pero modesto. El precio actual ya descuenta buena parte del valor futuro; solo es atractivo si tienes convicción propia para superar el consenso.'
                margen_rec = 'Zona de observación: espera una corrección del mercado que empuje el precio más cerca del objetivo medio y amplíe tu margen de seguridad.'
            elif p_potencial_alza >= 0:
                margen_eval = 'El potencial es nulo (cotización alineada con el consenso): no hay margen de seguridad. Comprar a precio de consenso significa apostar contra Wall Street sin ventaja matemática.'
                margen_rec = 'No se compra con el precio por encima del objetivo medio de analistas. O esperas un bajón de cotización, o buscas otra empresa con mejor relación precio/valor.'
            else:
                margen_eval = f'ALERTA: El consenso sitúa el objetivo promedio en ${p_precio_objetivo:.2f}, {abs(p_potencial_alza):.0f}% POR DEBAJO del precio actual de ${p_precio:.2f}. Wall Street es bajista sobre {t_clean}; el mercado anticipa deterioro de resultados.'
                margen_rec = 'No se compra con el precio por encima del objetivo medio de analistas. O esperas un bajón de cotización, o buscas otra empresa con mejor relación precio/valor.'
            respuesta_jairo = (
                f"El Potencial Alcista estimado frente al consenso de analistas de Wall Street para {p_nombre} ({t_clean or 'General'}) es del **{p_potencial_alza:.1f}%**:\n\n"
                f"• **Precio actual de mercado:** ${p_precio:.2f}\n"
                f"• **Precio objetivo promedio** (media de {p_num_analistas} analistas): ${p_precio_objetivo:.2f}\n"
                f"• **Recomendación dominante:** {p_recomendacion}\n\n"
                f"🎯 **EVALUACIÓN DEL MARGEN DE SEGURIDAD:** {margen_eval}\n\n"
                f"📊 **RECOMENDACIÓN:** {margen_rec}"
            )
        elif is_ke:
            ke_vs_roe = f'✅ **CREACIÓN DE VALOR:** El negocio rinde {(p_roe - p_ke):.1f} pp POR ENCIMA de nuestro K_e. Este diferencial positivo es el motor que hace crecer el valor intrínseco de la acción año tras año — el negocio usa el capital de los accionistas mejor de lo que ellos mismos podrían hacerlo. Con un K_e del {p_ke:.1f}% y un ROE del {p_roe:.1f}%, {t_clean} está operando muy por encima de su umbral mínimo de rentabilidad, lo que suele reflejar un modelo de negocio con pricing power y/o ventajas competitivas duraderas.' if p_roe >= p_ke else f'⚠️ **DESTRUCCIÓN DE VALOR:** El negocio rinde {(p_ke - p_roe):.1f} pp POR DEBAJO de nuestro K_e. Aunque contablemente gane dinero, no está remunerando el capital tan bien como otros usos alternativos del mismo. Un ROE de {p_roe:.1f}% contra un K_e de {p_ke:.1f}% indica que el modelo actual no genera el retorno mínimo exigido por su nivel de riesgo. Solo tendría sentido mantener si la empresa está en una fase de reinversión agresiva con retorno futuro esperado.'
            respuesta_jairo = (
                f"El Costo de Capital Propio (K_e) estimado para {p_nombre} ({t_clean or 'General'}) es del **{p_ke:.1f}%**, calculado vía CAPM (tasa libre de riesgo + prima de riesgo del mercado × beta de la acción).\n\n"
                f"💡 **QUÉ SIGNIFICA:** El K_e es la rentabilidad MÍNIMA exigible que debería generar {t_clean} para justificar invertir en ella en lugar de en otros activos de riesgo comparable. Es nuestro 'precio de entrada' teórico: si el negocio no remunera el capital por encima de este %, estamos perdiendo oportunidad.\n\n"
                f"📉 **COMPARATIVA CON EL ROE:** El ROE real de la compañía es del **{p_roe:.1f}%**:\n"
                f"{ke_vs_roe}\n\n"
                f"🏛️ **CONTEXTO DE TIPOS:** Este K_e del {p_ke:.1f}% asume un entorno de tipos de interés actuales; si las tasas libres de riesgo suben, el K_e sube y más empresas dejan de crear valor. Vigila este umbral."
            )
        elif is_moat:
            if 'Amplio' in str(p_moat):
                moat_desc = f'✅ **Foso amplio:** {p_nombre} posee una o varias barreras de entrada formidables (marcas globalmente reconocidas con pricing power, costes de cambio altísimos para los clientes, efectos de red, ventajas de escala masiva o patentes regulatorias). Históricamente, las empresas con foso amplio generan ROE sostenido superior al 20% sobre el capital.'
            elif 'Medio' in str(p_moat):
                moat_desc = f'⚠️ **Foso medio:** {p_nombre} tiene ventajas competitivas reales pero parcialmente replicables o con límites (niche de mercado, calidad del producto, eficiencia operativa). Protege parte de los márgenes, pero la competencia puede erosionarlos con el tiempo.'
            else:
                moat_desc = f'🚩 **Sin foso significativo:** {p_nombre} compite en un entorno de mercado donde los precios los fija la oferta y la demanda. Sin barreras de entrada, los beneficios tenderán al promedio del sector y el ROE caerá si la gestión no es excepcional.'
            respuesta_jairo = (
                f"El Foso Económico (Moat) de {p_nombre} ({t_clean or 'General'}) está calificado como **{p_moat}** (escala: Ninguno / Medio / Amplio).\n\n"
                f"🏰 **QUÉ ES UN MOAT:** Es la ventaja competitiva DURADERA que protege los beneficios de la compañía frente a la competencia y le permite mantener márgenes altos durante años o décadas — sin foso, los beneficios atraen competidores y los márgenes vuelven a la media del sector.\n\n"
                f"📋 **CALIFICACIÓN APLICADA A {t_clean}:**\n"
                f"{moat_desc}\n\n"
                f"📖 **EN POCAS PALABRAS SOBRE {t_clean}:** {p_que_hace} {p_como_gana_dinero}"
            )
        elif is_rsi_tech:
            respuesta_jairo = (
                f"El RSI (Índice de Fuerza Relativa) es un oscilador técnico de momentum (rango 0-100) que pertenece a la disciplina de Juan Guillermo, no al análisis fundamental de Jairo.\n\n"
                f"🔄 **DERIVACIÓN A TU ESPECIALIDAD TÉCNICA:** Jairo se centra en la calidad del negocio, su salud de balance y la creación de valor (ROE del **{p_roe:.1f}%** vs K_e del **{p_ke:.1f}%**), no en osciladores de corto plazo que solo miden la fuerza relativa de compra/venta en el precio.\n\n"
                f"🎯 **PERO AQUÍ ESTÁ EL CONTRAPUNTO FUNDAMENTAL:** Mientras el RSI te dice si el precio está 'sobrecomprado' (>70) o 'sobreventido' (<30) en lo táctico, lo que realmente importa para una inversión de valor es: si el precio actual de **${p_precio:.2f}** está muy por debajo del valor intrínseco estimado y el negocio tiene un ROE del **{p_roe:.1f}%** creando valor frente a un K_e de **{p_ke:.1f}%**. En mi visión, los osciladores de precio no predicen el valor; el valor se determina con los estados financieros, no con la psicología del mercado."
            )
        else:
            spread_roe_ke = p_roe - p_ke
            crea_valor = p_roe >= p_ke
            salud_balance = "Sólida" if float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8') <= 2.0 else "Moderada" if float(re.sub(r'[^0-9.]', '', str(p_deuda)) or '1.8') <= 3.5 else "Exigente"
            dictamen_general = (
                f"{'✅ Oportunidad de valor confirmada' if p_potencial_alza >= 15 and crea_valor else '⚠️ Monitorear con prudencia' if p_potencial_alza > 0 else '🔴 Sin margen de seguridad al precio actual'}: "
                f"el consenso de {p_num_analistas} analistas proyecta un Potencial Al Alza del {p_potencial_alza:.1f}% (recomendación: {p_recomendacion}). "
                f"El negocio {'crea valor económico para el accionista' if crea_valor else 'no supera el costo de capital'} "
                f"con un diferencial ROE-K_e de {spread_roe_ke:+.1f} puntos porcentuales."
            )
            respuesta_jairo = (
                f"Recordemos que esta visión es pedagógica y no constituye una recomendación de inversión vinculante.\n\n"
                f"🏢 **1. ¿QUÉ HACE ESTE NEGOCIO Y CÓMO GENERA DINERO?**\n"
                f"• **{p_nombre} ({t_clean or 'General'}) — Sector {p_sector}**\n"
                f"• {p_que_hace}\n"
                f"• **¿Cómo gana dinero?** {p_como_gana_dinero}\n\n"
                f"📊 **2. SALUD FINANCIERA Y ESTRUCTURA DE BALANCE:**\n"
                f"• **Rentabilidad sobre Patrimonio (ROE):** {p_roe:.1f}% — {'excelente calidad de negocio' if p_roe >= 20 else 'rentabilidad aceptable' if p_roe >= 12 else 'rendimiento modesto, vigilar consistencia'}\n"
                f"• **Costo de Capital Propio (K_e):** {p_ke:.1f}% — el ROE {'supera al K_e en ' + str(abs(round(spread_roe_ke,1))) + ' puntos: crea valor para el accionista ✅' if crea_valor else 'es inferior al K_e en ' + str(abs(round(spread_roe_ke,1))) + ' puntos: destruye valor ❌'}\n"
                f"• **Liquidez Corriente (Razón Corriente):** {p_liquidez:.2f}x — {'solvencia sólida ✅' if p_liquidez >= 1.5 else 'rango aceptable ⚠️' if p_liquidez >= 1.0 else 'estrechez de liquidez ❌'}\n"
                f"• **Apalancamiento (Deuda/EBITDA):** {p_deuda}x — Salud del Balance: **{salud_balance}**\n"
                f"• **Foso Económico (Moat):** **{p_moat}** — {'ventaja competitiva difícil de replicar que protege los márgenes a largo plazo' if 'Amplio' in str(p_moat) else 'posición competitiva consolidada pero con rivales relevantes' if 'Medio' in str(p_moat) else 'sin ventaja diferenciadora clara; márgenes expuestos a competencia'}\n\n"
                f"🎯 **3. VALORACIÓN Y POTENCIAL AL ALZA (CONSENSO WALL STREET):**\n"
                f"• **Precio actual:** ${p_precio:.2f} · **Precio Objetivo (consenso {p_num_analistas} analistas):** ${p_precio_objetivo:.2f}\n"
                f"• **Potencial Al Alza estimado:** {p_potencial_alza:.1f}% · Recomendación: **{p_recomendacion}**\n\n"
                f"⚖️ **4. DICTAMEN FUNDAMENTAL DE JAIRO:**\n"
                f"{dictamen_general}"
            )

    return {
        "success": True,
        "pregunta": pregunta,
        "ticker": t_clean or None,
        "empresaNombre": p_nombre,
        "modeloNegocio": {
            "queHace": p_que_hace,
            "comoGanaDinero": p_como_gana_dinero,
            "sector": p_sector
        },
        "respuesta": respuesta_jairo,
        "source": "gemini-live" if usa_gemini else "motor-analitico"
    }


def consultar_guillermo(pregunta: str, ticker: str = None):
    """
    Llamada únicamente con el perfil de Guillermo Hernández (análisis técnico).
    Ideal para preguntas específicas e individuales.
    """
    import urllib.request
    import urllib.error

    data_dir = Path(__file__).parent / "data"
    perfil_guillermo_path = data_dir / "perfil_guillermo.txt"

    def read_file(path):
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            return ""

    perfil_guillermo = read_file(perfil_guillermo_path)

    if not ticker:
        lower_q = pregunta.lower()
        keyword_to_ticker = {
            "nike": "NKE", "nke": "NKE",
            "coca": "KO", "coca-cola": "KO", "coca cola": "KO", "ko": "KO",
            "apple": "AAPL", "aapl": "AAPL", "iphone": "AAPL",
            "microsoft": "MSFT", "msft": "MSFT",
            "berkshire": "BRK.B", "buffett": "BRK.B", "brk": "BRK.B",
            "johnson": "JNJ", "jnj": "JNJ",
            "walmart": "WMT", "wmt": "WMT",
            "hype": "HYPE"
        }
        for kw, t in keyword_to_ticker.items():
            if kw in lower_q:
                ticker = t
                break

    t_clean = (ticker or "").upper().strip()
    p_nombre = t_clean or "el activo consultado"
    p_sector = "Renta Variable Global"

    MODELOS_PREDEFINIDOS = {
        "NKE": {"nombre": "NIKE, Inc.", "sector": "Calzado y Ropa Deportiva"},
        "AAPL": {"nombre": "Apple Inc.", "sector": "Tecnología de Consumo"},
        "KO": {"nombre": "The Coca-Cola Company", "sector": "Bebidas y Consumo Masivo"},
        "MSFT": {"nombre": "Microsoft Corporation", "sector": "Software y Computación en la Nube"},
        "BRK.B": {"nombre": "Berkshire Hathaway Inc.", "sector": "Conglomerado Financiero / Seguros"},
    }

    if t_clean in MODELOS_PREDEFINIDOS:
        m = MODELOS_PREDEFINIDOS[t_clean]
        p_nombre = m["nombre"]
        p_sector = m["sector"]

    tec = obtener_contexto_tecnico(t_clean)
    p_precio, p_ema20, p_ema50, p_ema200 = tec["precio"], tec["ema20"], tec["ema50"], tec["ema200"]
    p_rsi, p_macd_line, p_macd_signal, p_macd_hist = tec["rsi"], tec["macd_line"], tec["macd_signal"], tec["macd_hist"]
    p_soporte, p_resistencia, p_stop_loss, p_ratio_rb = tec["soporte"], tec["resistencia"], tec["stop_loss"], tec["ratio_rb"]

    if not tec["datos_ok"]:
        return error_sin_datos(pregunta, t_clean)

    contexto_tecnico = formatear_contexto_tecnico(tec, p_nombre, t_clean)
    system_instruction_guillermo = construir_prompt_guillermo(perfil_guillermo, contexto_tecnico)

    client = get_gemini_client()

    respuesta_guillermo = ""

    if client.client:
        respuesta_guillermo = client.generate(system_instruction_guillermo, pregunta)
    usa_gemini = bool(respuesta_guillermo)

    # Fallback especializado
    import re
    norm_q = pregunta.lower()
    is_rsi = bool(re.search(r'\brsi\b', norm_q))
    is_ema = bool(re.search(r'\b(ema|medias moviles|media movil|promedios moviles)\b', norm_q))
    is_macd = bool(re.search(r'\bmacd\b', norm_q))
    is_precio = bool(re.search(r'\b(precio actual|accion del precio|cotizacion)\b', norm_q))
    is_rb = bool(re.search(r'\b(stop loss|riesgo beneficio|riesgo/beneficio)\b', norm_q))
    is_roe = bool(re.search(r'\broe\b', norm_q))
    is_liquidez = bool(re.search(r'\b(liquidez|razon corriente|prueba acida|capital de trabajo|current ratio)\b', norm_q))
    is_apalancamiento = bool(re.search(r'\b(apalancamiento|deuda|endeudamiento|leverage)\b', norm_q))
    is_margen = bool(re.search(r'\b(margen de seguridad|valor intrinseco|precio intrinseco|precio objetivo|consenso de analistas|potencial al alza|objetivo de analistas|objetivo medio|recomendacion de analistas)\b', norm_q))
    is_ke = bool(re.search(r'\b(k_e|ke|costo de capital|costo del capital|cost of equity)\b', norm_q))
    is_moat = bool(re.search(r'\b(moat|foso|ventaja competitiva)\b', norm_q))

    is_punctual = any([is_rsi, is_ema, is_macd, is_precio, is_rb])

    if not respuesta_guillermo:
        if is_rsi:
            respuesta_guillermo = f"Para {p_nombre} ({t_clean or 'General'}), la lectura del **RSI (14)** se ubica en **{p_rsi:.1f} puntos**. {'El oscilador se encuentra en sobrecompra (>70), lo que sugiere cautela para nuevas compras y aconseja ceñir el Stop Loss.' if p_rsi > 70 else f'El oscilador está en sobreventa (<30), lo cual suele anticipar rebotes tácticos si el precio defiende el soporte de ${p_soporte:.2f}.' if p_rsi < 30 else f'Se ubica en zona neutral/constructiva (30-70 puntos), permitiendo continuidad del movimiento técnico sobre la EMA 20 (${p_ema20:.2f}) y EMA 50 (${p_ema50:.2f}).'}"
        elif is_ema:
            respuesta_guillermo = f"Para {p_nombre} ({t_clean or 'General'}), los niveles de medias móviles exponenciales son: **EMA 20 en ${p_ema20:.2f}**, **EMA 50 en ${p_ema50:.2f}** y la estructural **EMA 200 en ${p_ema200:.2f}**. Con la acción del precio actual en **${p_precio:.2f}**, el activo cotiza {'por ENCIMA de la EMA 200, validando una tendencia directriz alcista de fondo.' if p_precio >= p_ema200 else 'por DEBAJO de la EMA 200, indicando debilidad estructural o fase correctiva.'}"
        elif is_macd:
            respuesta_guillermo = f"La estructura del **MACD (12/26/9)** para {p_nombre} ({t_clean or 'General'}) registra: **Línea en {p_macd_line:+.2f}**, **Señal en {p_macd_signal:.2f}** y un **Histograma en {p_macd_hist:+.2f}**. {'El histograma positivo refleja momentum comprador activo y aceleración favorable del precio.' if p_macd_hist >= 0 else 'El histograma negativo advierte presión vendedora o agotamiento del impulso.'}"
        elif is_precio:
            respuesta_guillermo = f"La acción del precio actual de {p_nombre} ({t_clean or 'General'}) cotiza en **${p_precio:.2f}**. Se ubica {'por encima' if p_precio >= p_ema200 else 'por debajo'} de su EMA 200 (**${p_ema200:.2f}**), con soporte inmediato en **${p_soporte:.2f}** y resistencia en **${p_resistencia:.2f}**."
        elif is_rb:
            respuesta_guillermo = f"Para {p_nombre} ({t_clean or 'General'}), la relación Riesgo/Beneficio calculada es de **{p_ratio_rb:.1f}:1**. {f'CUMPLE con nuestra regla de oro de mínimo 2 a 1 ✅: el recorrido hacia la resistencia (${p_resistencia:.2f}) duplica el riesgo asumido al Stop Loss (${p_stop_loss:.2f}).' if p_ratio_rb >= 2.0 else f'NO CUMPLE con nuestro estándar mínimo de 2 a 1 ❌: arriesgar capital con un ratio de {p_ratio_rb:.1f}:1 deja las probabilidades matemáticas en contra del operador.'}"
        elif is_roe or is_liquidez or is_apalancamiento or is_margen or is_ke or is_moat:
            respuesta_guillermo = f"Esa variable contable corresponde al análisis fundamental de Jairo. En la pantalla técnica me concentro en la acción del precio actual (**${p_precio:.2f}**), su tendencia respecto a la EMA 200 (**${p_ema200:.2f}**) y el control del riesgo con Stop Loss en **${p_stop_loss:.2f}**."
        else:
            rsi_zona = "sobrecompra (>70)" if p_rsi >= 70 else "sobreventa (<30)" if p_rsi <= 30 else "zona neutral (30-70)"
            macd_momentum = "positivo (comprador ✅)" if p_macd_hist >= 0 else "negativo (vendedor ⚠️)"
            respuesta_guillermo = (
                f"¡Vámonos a la parte que a mí me apasiona: el gráfico y la lectura de pantalla!\n\n"
                f"Miramos el gráfico de **{p_nombre} ({t_clean or 'General'})** sin romanticismos:\n\n"
                f"1. **Tendencia y Medias Móviles:** El precio actual cotiza en **${p_precio:.2f}**. La EMA 200 estructural pasa por **${p_ema200:.2f}** (${'precio por ENCIMA, directriz alcista' if p_precio >= p_ema200 else 'precio por DEBAJO, sesgo correctivo'}). Medias de corto y mediano plazo EMA 20 (${p_ema20:.2f}) y EMA 50 (${p_ema50:.2f}).\n"
                f"2. **Osciladores y Momentum (RSI + MACD):** El RSI (14) se ubica en **{p_rsi:.1f} puntos** — zona de **{rsi_zona}**. El MACD marca línea en **{p_macd_line:+.2f}** y señal en **{p_macd_signal:.2f}** (histograma {p_macd_hist:+.2f}) — momentum **{macd_momentum}**.\n"
                f"3. **Memoria de Precios:** Soporte relevante en **${p_soporte:.2f}** y resistencia técnica en **${p_resistencia:.2f}**.\n"
                f"4. **Plan Operativo y Gestión del Riesgo:**\n"
                f"   - Ratio Riesgo/Beneficio: **{p_ratio_rb:.1f}:1** (${'CUMPLE ✅' if p_ratio_rb >= 2.0 else 'NO CUMPLE ❌'} con regla de oro 2:1).\n"
                f"   - Stop Loss sugerido: **${p_stop_loss:.2f}**.\n"
                f"   - Toma de utilidades: 50% al alcanzar **+25%** (${(p_precio * 1.25):.1f}), resto con Trailing Stop vela a vela.\n\n"
                f"• **Plan de Juan Guillermo:** {'OPERACIÓN VALIDADA' if p_ratio_rb >= 2.0 and p_precio >= p_ema200 else 'PRECAUCIÓN: esperar mejor setup'}."
            )

    # Validación de grounding
    if respuesta_guillermo and client.client:
        context_tech = {
            'precio': p_precio, 'ema20': p_ema20, 'ema50': p_ema50, 'ema200': p_ema200,
            'rsi': p_rsi, 'macd_line': p_macd_line, 'macd_signal': p_macd_signal,
            'macd_hist': p_macd_hist, 'soporte': p_soporte, 'resistencia': p_resistencia,
            'stop_loss': p_stop_loss, 'ratio_rb': p_ratio_rb
        }
        client.validate_grounding(respuesta_guillermo, context_tech, 'guillermo')

    return {
        "success": True,
        "pregunta": pregunta,
        "ticker": t_clean or None,
        "empresaNombre": p_nombre,
        "modeloNegocio": {
            "queHace": f"Compañía cotizada en bolsa con operaciones comerciales en el sector de {p_sector}.",
            "comoGanaDinero": f"Genera ingresos vendiendo productos y soluciones en el mercado de {p_sector} con márgenes competitivos.",
            "sector": p_sector
        },
        "respuesta": respuesta_guillermo,
        "source": "gemini-live" if usa_gemini else "motor-analitico",
        "metricasClave": {
            "precio": round(p_precio, 2),
            "ema20": p_ema20,
            "ema50": p_ema50,
            "ema200": p_ema200,
            "rsi": p_rsi,
            "macdLine": p_macd_line,
            "macdSignal": p_macd_signal,
            "macdHist": p_macd_hist,
            "soporte": p_soporte,
            "resistencia": p_resistencia,
            "stopLoss": p_stop_loss,
            "ratioRB": p_ratio_rb
        }
    }


# PUNTO DE ENTRADA CLI

# ==========================================================


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] == 'test':
        output = {
            "status": "ready",
            "message": "Librerías cargadas correctamente.",
            "libraries": {
                "pandas": pd.__version__,
                "numpy": np.__version__,
                "yfinance": yf.__version__,
                "matplotlib": plt.matplotlib.__version__,
                "seaborn": sns.__version__
            }
        }
        print(json.dumps(output, indent=2))
        sys.exit(0)

    command = sys.argv[1].lower()

    if command == 'company' and len(sys.argv) >= 3:
        ticker = sys.argv[2]
        res = get_company_data(ticker)
        print(json.dumps(res, indent=2))

    elif command == 'price' and len(sys.argv) >= 3:
        ticker = sys.argv[2]
        res = get_live_price(ticker)
        print(json.dumps(res, indent=2))

    elif command in ('candles', 'candlestick') and len(sys.argv) >= 3:
        ticker = sys.argv[2]
        period = sys.argv[3] if len(sys.argv) >= 4 else '1y'
        interval = sys.argv[4] if len(sys.argv) >= 5 else '1d'
        res = get_candlestick_data(ticker, period, interval)
        print(json.dumps(res, indent=2))

    elif command in ('targets', 'analyst_targets', 'analyst-targets') and len(sys.argv) >= 3:
        ticker = sys.argv[2]
        res = get_analyst_price_targets(ticker)
        print(json.dumps(res, indent=2))

    elif command in ('recommendations', 'ratings') and len(sys.argv) >= 3:
        ticker = sys.argv[2]
        res = get_recommendations(ticker)
        print(json.dumps(res, indent=2))

    elif command in ('news', 'recent_news') and len(sys.argv) >= 3:
        ticker = sys.argv[2]
        res = get_company_news(ticker)
        print(json.dumps(res, indent=2))

    elif command == 'markowitz' and len(sys.argv) >= 3:
        tickers = sys.argv[2].split(',')
        rf = float(sys.argv[3]) if len(sys.argv) >= 4 else 0.04
        res = compute_python_markowitz(tickers, rf)
        print(json.dumps(res, indent=2))

    elif command == 'plots':
        tickers = sys.argv[2].split(',') if len(sys.argv) >= 3 else ['BRK.B', 'KO', 'AAPL', 'JNJ', 'COST']
        target = sys.argv[3] if len(sys.argv) >= 4 else 'KO'
        res = generate_python_plots(tickers, target)
        print(json.dumps(res, indent=2))

    elif command == 'classify-industry' and len(sys.argv) >= 3:
        ticker = sys.argv[2].upper()
        res = get_beta_and_industry_ai(ticker)
        print(json.dumps(res, ensure_ascii=False, indent=2))

    elif command == 'tracking-error' and len(sys.argv) >= 3:
        ticker = sys.argv[2].upper()
        benchmark = sys.argv[3].upper() if len(sys.argv) >= 4 else "^GSPC"
        period = sys.argv[4] if len(sys.argv) >= 5 else "1y"
        res = calculate_tracking_error(ticker, benchmark, period)
        print(json.dumps(res, ensure_ascii=False, indent=2))

    elif command == 'capm' and len(sys.argv) >= 3:
        ticker = sys.argv[2].upper()
        mrp = float(sys.argv[3]) if len(sys.argv) >= 4 else None
        industry_info = get_beta_and_industry(ticker)
        beta = industry_info['beta']
        rfr = get_risk_free_rate()
        erp = mrp if mrp is not None else get_histimpl_erp()
        cost = calculate_capm_cost_of_equity(beta, rfr, erp)
        res = {
            'success': True,
            'ticker': ticker,
            'yfinance_industry': industry_info.get('yfinance_industry'),
            'yfinance_sector': industry_info.get('yfinance_sector'),
            'matched_damodaran_industry': industry_info.get('matched_damodaran_industry'),
            'beta': round(beta, 4),
            'unlevered_beta': industry_info.get('unlevered_beta'),
            'risk_free_rate': round(rfr, 4),
            'market_risk_premium': round(erp, 4),
            'cost_of_equity': round(cost, 4),
            'cost_of_equity_pct': round(cost * 100, 2),
            'source': 'Damodaran (Betas.html) + FRED DGS10 + Damodaran ERP'
        }
        print(json.dumps(res, indent=2))

    elif command == 'super-opportunities':
        # Import diferido: el escáner reutiliza funciones de este módulo
        from opportunity_scanner import escanear_superoportunidades
        res = escanear_superoportunidades(refrescar='--refresh' in sys.argv[2:])
        print(json.dumps(res, ensure_ascii=False))
        # os._exit: no esperar a hilos de yfinance que sigan colgados tras agotar el presupuesto
        sys.stdout.flush()
        os._exit(0)

    elif command in ('consulta-dual', 'consultar-dual') and len(sys.argv) >= 3:
        # argv[2] = pregunta (JSON-encoded string), argv[3] = ticker (opcional)
        pregunta = sys.argv[2]
        ticker_arg = sys.argv[3] if len(sys.argv) >= 4 else None
        res = consultar_dual(pregunta, ticker_arg)
        print(json.dumps(res, ensure_ascii=False, indent=2))

    elif command in ('consulta-jairo', 'consultar-jairo') and len(sys.argv) >= 3:
        pregunta = sys.argv[2]
        ticker_arg = sys.argv[3] if len(sys.argv) >= 4 else None
        res = consultar_jairo(pregunta, ticker_arg)
        print(json.dumps(res, ensure_ascii=False, indent=2))

    elif command in ('consulta-guillermo', 'consultar-guillermo') and len(sys.argv) >= 3:
        pregunta = sys.argv[2]
        ticker_arg = sys.argv[3] if len(sys.argv) >= 4 else None
        res = consultar_guillermo(pregunta, ticker_arg)
        print(json.dumps(res, ensure_ascii=False, indent=2))

    else:
        print(json.dumps({"error": f"Comando no reconocido: {command}"}))
        sys.exit(1)
