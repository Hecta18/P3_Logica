<script lang="ts">
  import { untrack } from 'svelte';
  import { EXAMPLES } from '../examples';
  import { analyzeFormulaSource } from '../logic/compute';
  import { parseDomainInput, validateLanguage } from '../logic/validation';
  import {
    form,
    loadExampleIntoForm,
    resetForm,
    syncInterpretationTables
  } from '../stores/form.svelte';
  import EnvironmentEditor from './EnvironmentEditor.svelte';
  import FormulaEditor from './FormulaEditor.svelte';
  import InterpretationEditor from './InterpretationEditor.svelte';
  import LanguageEditor from './LanguageEditor.svelte';

  let {
    computing = false,
    oncompute
  }: {
    computing?: boolean;
    oncompute: () => void;
  } = $props();

  let selectedExampleId = $state(EXAMPLES[0]?.id ?? '');

  const parsedDomain = $derived(parseDomainInput(form.domainInput));
  const languageErrors = $derived(validateLanguage(form.functions, form.predicates));
  const analysis = $derived(
    analyzeFormulaSource(form.formula, form.functions, form.predicates)
  );

  $effect(() => {
    JSON.stringify({
      domain: form.domainInput,
      functions: form.functions.map(({ id, name, arity }) => ({ id, name, arity })),
      predicates: form.predicates.map(({ id, name, arity }) => ({ id, name, arity }))
    });
    untrack(() => syncInterpretationTables());
  });

  function loadSelectedExample(): void {
    const example = EXAMPLES.find((candidate) => candidate.id === selectedExampleId);
    if (example) {
      loadExampleIntoForm(example);
    }
  }

  function resetAll(): void {
    resetForm();
  }
</script>

<div class="input-pane">
  <div class="input-toolbar">
    <label class="example-picker">
      <span class="sr-only">Ejemplo</span>
      <select class="text-input" bind:value={selectedExampleId}>
        {#each EXAMPLES as example}
          <option value={example.id}>{example.title}</option>
        {/each}
      </select>
    </label>
    <button type="button" class="small-button" onclick={loadSelectedExample}>
      Cargar ejemplo
    </button>
    <button type="button" class="small-button" onclick={resetAll}>Limpiar</button>
  </div>

  <section class="panel-section">
    <div class="section-heading">
      <h2>1. Dominio</h2>
      <span class="muted small">
        {parsedDomain.domain.length}
        {parsedDomain.domain.length === 1 ? 'elemento' : 'elementos'}
      </span>
    </div>
    <input
      class="text-input"
      bind:value={form.domainInput}
      placeholder="0, 1, 2"
      aria-label="Elementos del dominio separados por comas"
    />
    <p class="hint">
      Dominio finito y no vacío. Separa los elementos con comas; el orden se usa para
      testigos y comprobaciones.
    </p>
    {#if parsedDomain.errors.length > 0}
      <ul class="inline-errors">
        {#each parsedDomain.errors.slice(0, 4) as error}
          <li>{error.message}</li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="panel-section">
    <div class="section-heading">
      <h2>2. Lenguaje</h2>
      <span class="muted small">nombres y aridades</span>
    </div>
    <LanguageEditor errors={languageErrors} />
  </section>

  <section class="panel-section">
    <div class="section-heading">
      <h2>3. Interpretación</h2>
      <span class="muted small">tablas completas</span>
    </div>
    <InterpretationEditor domain={parsedDomain.domain} />
  </section>

  <section class="panel-section">
    <div class="section-heading">
      <h2>4. Fórmula</h2>
      <span class="muted small">entrada LaTeX</span>
    </div>
    <FormulaEditor {analysis} {oncompute} />
  </section>

  <section class="panel-section">
    <div class="section-heading">
      <h2>5. Entorno</h2>
      <span class="muted small">variables libres</span>
    </div>
    <EnvironmentEditor
      freeVariables={analysis.freeVariables}
      domain={parsedDomain.domain}
      {analysis}
    />
  </section>

  <div class="compute-footer">
    <button type="button" class="primary-button" onclick={oncompute} disabled={computing}>
      {computing ? 'Computando…' : 'Computar'}
    </button>
    <span class="hint">Ctrl/Cmd + Enter desde la fórmula</span>
  </div>
</div>
