<script lang="ts">
  import { textLatex, variableLatex } from '../logic/latex';
  import type { TraceRow } from '../logic/types';
  import Katex from './Katex.svelte';

  let { rows }: { rows: TraceRow[] } = $props();
</script>

<div class="trace-list">
  {#each rows as row, index (`${index}-${row.kind}-${row.depth}`)}
    <div
      class="trace-line"
      class:trace-line-certificate={row.kind === 'certificate'}
      class:trace-line-binding={row.kind === 'binding'}
      style={`--depth: ${row.depth}`}
    >
      {#if row.kind === 'trace'}
        <span class:is-true={row.value === true} class:is-false={row.value === false} class="value-badge">
          {row.value ? 'V' : 'F'}
        </span>
        <div class="trace-content">
          <div class="trace-formula">
            <Katex latex={row.formulaLatex ?? ''} />
          </div>
          {#if row.reason}
            <div class="trace-reason">{row.reason}</div>
          {/if}
          {#if row.detailLatex}
            <div class="trace-detail"><Katex latex={row.detailLatex} /></div>
          {/if}
        </div>
      {:else if row.kind === 'certificate'}
        <span class="certificate-badge">{row.label ?? 'Certificado'}</span>
        {#if row.detailLatex}
          <span class="trace-detail"><Katex latex={row.detailLatex} /></span>
        {/if}
      {:else if row.kind === 'binding'}
        <span class="binding-label">
          <Katex
            latex={`${variableLatex(row.bindingVariable ?? '')} = ${textLatex(row.bindingElement ?? '')}`}
          />
        </span>
      {/if}
    </div>
  {/each}
</div>
