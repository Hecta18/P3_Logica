<script lang="ts">
  import { tick } from 'svelte';
  import type { FormulaAnalysis } from '../logic/compute';
  import { positionToLineColumn } from '../logic/lexer';
  import { variableLatex } from '../logic/latex';
  import { form } from '../stores/form.svelte';
  import Katex from './Katex.svelte';

  let {
    analysis,
    oncompute
  }: {
    analysis: FormulaAnalysis;
    oncompute: () => void;
  } = $props();

  let textarea: HTMLTextAreaElement | undefined = $state();

  const buttons = [
    { label: '¬', insert: '\\neg ', title: 'Negación (\\neg)', unary: true },
    { label: '∧', insert: '\\land ', title: 'Conjunción (\\land)' },
    { label: '∨', insert: '\\lor ', title: 'Disyunción (\\lor)' },
    { label: '→', insert: '\\to ', title: 'Implicación (\\to)' },
    { label: '∀', insert: '\\forall ', title: 'Cuantificador universal (\\forall)' },
    { label: '∃', insert: '\\exists ', title: 'Cuantificador existencial (\\exists)' },
    { label: '=', insert: ' = ', title: 'Igualdad' }
  ];

  async function setFormula(next: string, caret: number): Promise<void> {
    form.formula = next;
    await tick();
    textarea?.focus();
    textarea?.setSelectionRange(caret, caret);
  }

  function insert(button: (typeof buttons)[number]): void {
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? form.formula.length;
    const end = textarea.selectionEnd ?? start;
    const selected = form.formula.slice(start, end);

    if (button.unary && selected) {
      const inserted = `${button.insert}(${selected})`;
      void setFormula(form.formula.slice(0, start) + inserted + form.formula.slice(end), start + inserted.length);
      return;
    }

    const inserted = button.insert;
    void setFormula(form.formula.slice(0, start) + inserted + form.formula.slice(end), start + inserted.length);
  }

  function insertParenthesis(character: '(' | ')'): void {
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? form.formula.length;
    const end = textarea.selectionEnd ?? start;
    const selected = form.formula.slice(start, end);

    if (character === '(' && selected) {
      const inserted = `(${selected})`;
      void setFormula(form.formula.slice(0, start) + inserted + form.formula.slice(end), start + inserted.length);
      return;
    }

    void setFormula(
      form.formula.slice(0, start) + character + form.formula.slice(end),
      start + 1
    );
  }

  function handleKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      oncompute();
    }
  }

  const firstError = $derived(analysis.errors[0]);
  const errorPosition = $derived(
    firstError?.position === undefined
      ? null
      : positionToLineColumn(form.formula, firstError.position)
  );
</script>

<div class="formula-editor">
  <div class="toolbar" role="toolbar" aria-label="Símbolos lógicos">
    {#each buttons as button}
      <button
        type="button"
        class="toolbar-button"
        title={button.title}
        aria-label={button.title}
        onclick={() => insert(button)}
      >
        {button.label}
      </button>
    {/each}
    <span class="toolbar-separator" aria-hidden="true"></span>
    <button
      type="button"
      class="toolbar-button"
      title="Paréntesis de apertura"
      aria-label="Paréntesis de apertura"
      onclick={() => insertParenthesis('(')}
    >
      (
    </button>
    <button
      type="button"
      class="toolbar-button"
      title="Paréntesis de cierre"
      aria-label="Paréntesis de cierre"
      onclick={() => insertParenthesis(')')}
    >
      )
    </button>
  </div>

  <textarea
    bind:this={textarea}
    class="formula-input mono"
    bind:value={form.formula}
    onkeydown={handleKeydown}
    spellcheck="false"
    rows="4"
    placeholder="\\forall x (P(x) \\to Q(x))"
    aria-label="Fórmula de lógica de primer orden"
  ></textarea>

  <div class="formula-preview">
    <div class="preview-label">Vista previa</div>
    {#if analysis.formulaLatex}
      <div class="preview-math">
        <Katex latex={analysis.formulaLatex} display />
      </div>
    {:else}
      <p class="muted small">La vista previa aparecerá cuando la fórmula sea válida.</p>
    {/if}
  </div>

  {#if firstError}
    <p class="field-error">
      {firstError.message}
      {#if errorPosition}
        <span class="muted">(línea {errorPosition.line}, columna {errorPosition.column})</span>
      {/if}
    </p>
  {/if}

  {#if analysis.formula}
    <div class="free-variable-summary">
      <span class="muted small">Variables libres:</span>
      {#if analysis.freeVariables.length === 0}
        <span class="small">ninguna (fórmula cerrada)</span>
      {:else}
        {#each analysis.freeVariables as variable}
          <span class="variable-chip"><Katex latex={variableLatex(variable)} /></span>
        {/each}
      {/if}
    </div>
  {/if}

  <p class="hint">
    Acepta macros LaTeX y símbolos Unicode. El cuantificador afecta solo a la expresión
    inmediatamente siguiente: usa paréntesis para ampliar su alcance. Precedencia:
    <span class="mono">¬, ∀, ∃ &gt; ∧ &gt; ∨ &gt; →</span>. Usa
    <span class="mono">Ctrl/Cmd + Enter</span> para computar.
  </p>
</div>
