<script lang="ts">
  import { certificateSummary, flattenTrace, structureLatexSummary } from '../logic/explain';
  import { positionToLineColumn } from '../logic/lexer';
  import { textLatex, variableLatex } from '../logic/latex';
  import type {
    ErrorSection,
    HistoryEntry,
    ValidationError
  } from '../logic/types';
  import Katex from './Katex.svelte';
  import TraceList from './TraceList.svelte';

  let { entry }: { entry: HistoryEntry } = $props();

  const traceRows = $derived(entry.trace ? flattenTrace(entry.trace) : []);
  const summary = $derived(entry.trace ? certificateSummary(entry.trace) : null);
  const structureSummary = $derived(
    entry.structure ? structureLatexSummary(entry.structure) : null
  );

  const sectionLabels: Record<ErrorSection, string> = {
    dominio: 'Dominio',
    lenguaje: 'Lenguaje',
    sintaxis: 'Sintaxis',
    tuplas: 'Interpretación',
    entorno: 'Entorno',
    limites: 'Límites'
  };

  const errorGroups = $derived.by(() => {
    const groups = new Map<ErrorSection, ValidationError[]>();
    for (const error of entry.errors) {
      const list = groups.get(error.section) ?? [];
      list.push(error);
      groups.set(error.section, list);
    }
    return [...groups.entries()];
  });

  const dateFormatter = new Intl.DateTimeFormat('es', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
  }

  function errorPosition(error: ValidationError): string {
    if (error.position === undefined) {
      return '';
    }
    const position = positionToLineColumn(entry.formulaSource, error.position);
    return `Línea ${position.line}, columna ${position.column}`;
  }
</script>

<article class="result-document">
  <header class="result-header">
    <div>
      <p class="eyebrow">Evaluación #{entry.id}</p>
      <h2>{entry.status === 'valid' ? 'Resultado de la fórmula' : 'Entrada no válida'}</h2>
      <p class="muted small">{formatDate(entry.createdAt)}</p>
    </div>
    <span
      class:true-badge={entry.status === 'valid' && entry.truth === true}
      class:false-badge={entry.status === 'valid' && entry.truth === false}
      class:error-badge={entry.status === 'invalid'}
      class="result-status"
    >
      {entry.status === 'invalid' ? 'Sin valor de verdad' : entry.truth ? 'Verdadero' : 'Falso'}
    </span>
  </header>

  {#if entry.status === 'valid'}
    <div class:true-panel={entry.truth === true} class:false-panel={entry.truth === false} class="result-banner">
      <div class="result-truth">{entry.truth ? 'Verdadero' : 'Falso'}</div>
      {#if summary}
        <div class="result-certificate">
          <span class="certificate-badge">{summary.label}</span>
          {#if summary.detailLatex}
            <Katex latex={summary.detailLatex} />
          {/if}
          {#if summary.detailText}
            <span class="small">{summary.detailText}</span>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <div class="result-banner invalid-panel">
      <div class="result-truth">Sin valor de verdad</div>
      <p class="small">
        La fórmula no se evaluó porque la entrada contiene errores de validación.
      </p>
    </div>
  {/if}

  <section class="doc-section">
    <h3>Fórmula</h3>
    {#if entry.formulaLatex}
      <div class="formula-display">
        <Katex latex={entry.formulaLatex} display />
      </div>
    {:else}
      <pre class="formula-source">{entry.formulaSource || '(vacía)'}</pre>
    {/if}
    {#if entry.formulaSource.trim()}
      <details class="doc-details">
        <summary>Fuente LaTeX</summary>
        <pre class="formula-source">{entry.formulaSource}</pre>
      </details>
    {/if}
  </section>

  {#if entry.freeVariables.length > 0}
    <section class="doc-section">
      <h3>Entorno</h3>
      <div class="environment-summary">
        {#each entry.freeVariables as variable}
          <span class="environment-assignment">
            <Katex latex={variableLatex(variable)} />
            <span class="muted"> = </span>
            <Katex latex={textLatex(entry.environment[variable] ?? '?')} />
          </span>
        {/each}
      </div>
    </section>
  {/if}

  {#if structureSummary}
    <section class="doc-section">
      <h3>Estructura</h3>
      <details class="doc-details">
        <summary>Dominio e interpretación</summary>
        <div class="structure-block">
          <div class="math-line">
            <Katex latex={`D = ${structureSummary.domainLatex}`} display />
          </div>
          {#if structureSummary.functions.length === 0}
            <p class="muted small">Sin símbolos funcionales declarados.</p>
          {/if}
          {#each structureSummary.functions as interpretation}
            <div class="math-line">
              <Katex latex={interpretation.latex} display />
            </div>
          {/each}
          {#if structureSummary.predicates.length === 0}
            <p class="muted small">Sin predicados declarados.</p>
          {/if}
          {#each structureSummary.predicates as interpretation}
            <div class="math-line">
              <Katex latex={interpretation.latex} display />
            </div>
          {/each}
          <p class="hint">
            La igualdad <span class="mono">=</span> se interpreta como identidad entre
            elementos del dominio.
          </p>
        </div>
      </details>
    </section>
  {/if}

  {#if entry.status === 'valid' && traceRows.length > 0}
    <section class="doc-section">
      <h3>Justificación</h3>
      <TraceList rows={traceRows} />
    </section>
  {/if}

  {#if errorGroups.length > 0}
    <section class="doc-section">
      <h3>Errores de validación</h3>
      {#each errorGroups as [section, errors]}
        <div class="error-group">
          <h4>{sectionLabels[section]}</h4>
          <ul class="error-list">
            {#each errors as error}
              <li>
                <span>{error.message}</span>
                {#if error.position !== undefined}
                  <span class="error-position">({errorPosition(error)})</span>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </section>
  {/if}
</article>
