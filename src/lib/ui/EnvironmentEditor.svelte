<script lang="ts">
  import { variableLatex } from '../logic/latex';
  import type { FormulaAnalysis } from '../logic/compute';
  import { form } from '../stores/form.svelte';
  import Katex from './Katex.svelte';

  let {
    freeVariables,
    domain,
    analysis
  }: {
    freeVariables: string[];
    domain: string[];
    analysis: FormulaAnalysis;
  } = $props();

  function setValue(name: string, value: string): void {
    form.environment[name] = value;
  }
</script>

<div class="environment-editor">
  {#if analysis.errors.length > 0}
    <p class="muted">Corrige la fórmula para identificar y asignar sus variables libres.</p>
  {:else if freeVariables.length === 0}
    <p class="muted">Fórmula cerrada: no requiere entorno.</p>
  {:else if domain.length === 0}
    <p class="muted">Define un dominio para asignar las variables libres.</p>
  {:else}
    {#each freeVariables as variable}
      <label class="environment-row">
        <span class="environment-variable"><Katex latex={variableLatex(variable)} /></span>
        <select
          class="table-select"
          value={form.environment[variable] ?? ''}
          onchange={(event) => setValue(variable, event.currentTarget.value)}
          aria-label={`Valor para la variable libre ${variable}`}
        >
          <option value="">—</option>
          {#each domain as element}
            <option value={element}>{element}</option>
          {/each}
        </select>
      </label>
    {/each}
  {/if}
</div>
