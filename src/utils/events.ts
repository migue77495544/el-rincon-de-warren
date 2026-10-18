// Eventos globales de la interfaz (se emiten con window.dispatchEvent)

/** Abre el buscador de empresas de la barra superior */
export const OPEN_SEARCH_EVENT = 'warren:open-search';

export function abrirBuscador(): void {
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
}
