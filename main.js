"use strict";

/**
 * Graph Filter Chips
 * ------------------
 * Transforma o filtro do grafo (Obsidian) em chips removíveis.
 *
 * Comportamento:
 *  - ESC: apenas sai da edição do texto (blur). Não apaga o filtro.
 *  - ENTER: converte o texto digitado em um chip, que pode ser removido no "x".
 *  - Clicar no texto de um chip devolve o termo para a caixa de edição.
 *
 * Como funciona por dentro (internals do Obsidian, versão estável):
 *  - O filtro é um input[type="search"] dentro de
 *      .graph-controls .setting-item.mod-search-setting
 *  - O Obsidian lê o valor efetivo via `filterOptions.search.getValue()` e
 *    aplica com `engine.updateSearch()`.
 *  - O ESC apaga porque <input type="search"> limpa sozinho no Chromium.
 *
 * Estratégia:
 *  - Mantemos os chips como fonte de verdade e sobrescrevemos `getValue`
 *    (retorna chips + texto em edição) e `setValue` (tokeniza o valor
 *    persistido em chips) apenas na instância do filtro.
 *  - Interceptamos keydown em fase de captura num ancestral do input, antes
 *    dos listeners nativos do Obsidian.
 */

const { Plugin: ObsidianPlugin, setIcon } = require("obsidian");

/** Divide uma query em termos, respeitando aspas. Ex.: path:"a b" -> ['path:"a b"'] */
const tokenizeQuery = function tokenizeQuery(query) {
  const tokens = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (ch === '"') {
      inQuote = !inQuote;
      current += ch;
    } else if (!inQuote && /\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
};

module.exports = class GraphFilterChips extends ObsidianPlugin {
  async onload() {
    /** @type {Set<any>} estados ativos, para limpar no unload */
    this._states = new Set();

    this._scan = this._scan.bind(this);

    // O grafo pode ser aberto a qualquer momento; varremos de forma barata.
    this.app.workspace.onLayoutReady(this._scan);
    this.registerEvent(this.app.workspace.on("layout-change", this._scan));
    this.registerEvent(this.app.workspace.on("active-leaf-change", this._scan));
    this.registerInterval(window.setInterval(this._scan, 1500));
  }

  onunload() {
    for (const state of this._states) this._detach(state);
    this._states.clear();
  }

  _scan() {
    // Descarta estados de grafos que já foram fechados.
    for (const state of Array.from(this._states)) {
      if (!state.input || !state.input.isConnected) {
        this._detach(state);
        this._states.delete(state);
      }
    }

    for (const type of ["graph", "localgraph"]) {
      for (const leaf of this.app.workspace.getLeavesOfType(type)) {
        try {
          this._attach(leaf.view);
        } catch (err) {
          // Nunca deixa o plugin quebrar a view do grafo.
          console.error("[Graph Filter Chips] falha ao anexar ao grafo", err);
        }
      }
    }
  }

  _attach(view) {
    const engine = view && (view.dataEngine || view.engine);
    const filterOptions = engine && engine.filterOptions;
    const search = filterOptions && filterOptions.search;
    const input = search && search.inputEl;

    if (!input || !input.isConnected || input.__graphFilterChips) return;

    const settingEl = input.closest(".setting-item");
    const controlEl = settingEl && settingEl.querySelector(".setting-item-control");
    if (!settingEl || !controlEl) return;

    const state = {
      engine,
      search,
      input,
      settingEl,
      controlEl,
      chips: [],
      container: null,
      onKeyDown: null,
      originalGetValue: null,
      originalSetValue: null,
    };

    // Guarda os métodos originais uma única vez por instância de filtro
    // (evita capturar como "original" uma função já patchada).
    if (!search.__gfcOriginals) {
      search.__gfcOriginals = {
        getValue: search.getValue.bind(search),
        setValue: search.setValue.bind(search),
      };
    }
    state.originalGetValue = search.__gfcOriginals.getValue;
    state.originalSetValue = search.__gfcOriginals.setValue;

    // Marca cedo para evitar anexo duplo.
    input.__graphFilterChips = state;
    this._states.add(state);

    // ---- Container de chips (acima do input) ----
    const container = controlEl.createDiv({ cls: "graph-filter-chips" });
    controlEl.insertBefore(container, controlEl.firstChild);
    state.container = container;

    // ---- Patch de getValue/setValue (fonte de verdade = chips + rascunho) ----
    search.getValue = () => {
      const parts = state.chips.slice();
      const draft = state.input.value.trim();
      if (draft) parts.push(draft);
      return parts.join(" ");
    };

    search.setValue = (value) => {
      // Chamado pelo Obsidian ao carregar opções / restaurar o filtro.
      if (typeof value === "string") {
        state.chips = tokenizeQuery(value);
        state.input.value = "";
        this._render(state);
      }
      return search;
    };

    // ---- Interceptação de teclado (captura, antes do Obsidian) ----
    state.onKeyDown = (evt) => {
      if (evt.target !== state.input) return;

      if (evt.key === "Escape") {
        // Não deixa o Chromium limpar o input; só sai da edição.
        evt.preventDefault();
        evt.stopPropagation();
        if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
        state.input.blur();
        return;
      }

      // Shift+Enter é usado pelo autocomplete do filtro: não interceptar.
      if (evt.key === "Enter" && !evt.shiftKey && !evt.isComposing && evt.keyCode !== 229) {
        evt.preventDefault();
        evt.stopPropagation();
        if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
        this._commit(state);
      }
    };
    settingEl.addEventListener("keydown", state.onKeyDown, true);

    // ---- Estado inicial: tokeniza filtro já persistido ----
    const initial = state.input.value.trim();
    if (initial) {
      state.chips = tokenizeQuery(initial);
      state.input.value = "";
    }
    this._render(state);
  }

  _detach(state) {
    try {
      state.settingEl.removeEventListener("keydown", state.onKeyDown, true);
    } catch {
      /* noop */
    }
    try {
      state.search.getValue = state.originalGetValue;
      state.search.setValue = state.originalSetValue;
      if (state.search.__gfcOriginals) delete state.search.__gfcOriginals;
    } catch {
      /* noop */
    }
    if (state.container && state.container.parentNode) {
      state.container.parentNode.removeChild(state.container);
    }
    if (state.input && state.input.__graphFilterChips === state) {
      delete state.input.__graphFilterChips;
    }
  }

  /** Aplica o filtro no grafo (imediato, com fallback). */
  _apply(state) {
    const engine = state.engine;
    if (engine && typeof engine.updateSearch === "function") {
      engine.updateSearch();
    } else if (engine && engine.requestUpdateSearch && typeof engine.requestUpdateSearch.run === "function") {
      engine.requestUpdateSearch.run();
    }
  }

  /** ENTER: transforma o rascunho em chip e aplica o filtro. */
  _commit(state) {
    const text = state.input.value.trim();
    if (!text) return;
    state.chips.push(text);
    state.input.value = "";
    this._render(state);
    this._apply(state);
  }

  /** Remove o chip de índice `index` e reaplica o filtro. */
  _removeChip(state, index) {
    state.chips.splice(index, 1);
    this._render(state);
    this._apply(state);
  }

  /** Devolve o termo do chip para a caixa de edição (para editar). */
  _editChip(state, index) {
    const text = state.chips[index];
    state.chips.splice(index, 1);
    state.input.value = text;
    this._render(state);
    state.input.focus();
    const len = text.length;
    try {
      state.input.setSelectionRange(len, len);
    } catch {
      /* noop */
    }
    this._apply(state);
  }

  _render(state) {
    const container = state.container;
    if (!container) return;
    container.empty();

    state.chips.forEach((text, index) => {
      const chip = container.createSpan({ cls: "graph-filter-chip" });

      const label = chip.createSpan({ cls: "graph-filter-chip-text", text });
      label.setAttribute("title", text);
      label.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        this._editChip(state, index);
      });

      const remove = chip.createSpan({
        cls: "graph-filter-chip-remove",
        attr: { "aria-label": "Remover filtro", role: "button" },
      });
      setIcon(remove, "x");
      remove.addEventListener("mousedown", (evt) => evt.preventDefault());
      remove.addEventListener("click", (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        this._removeChip(state, index);
      });
    });
  }
};
