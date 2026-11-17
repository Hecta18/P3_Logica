<script lang="ts">
  import { generateTuples, tupleKey, tupleLabel } from '../logic/tuples';
  import type { SymbolDecl } from '../logic/types';
  import { form } from '../stores/form.svelte';

  let { symbol, domain }: { symbol: SymbolDecl; domain: string[] } = $props();

  const PAGE_SIZE = 40;
  let page = $state(0);

  const tuples = $derived(generateTuples(domain, symbol.arity));
  const pageCount = $derived(Math.max(1, Math.ceil(tuples.length / PAGE_SIZE)));
  const currentPage = $derived(Math.min(page, pageCount - 1));
  const visible = $derived(
    tuples.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  );
  const missing = $derived(
    tuples.filter((tuple) => !form.functionTables[symbol.id]?.[tupleKey(tuple)]).length
  );

  function setValue(key: string, value: string): void {
    if (!form.functionTables[symbol.id]) {
      form.functionTables[symbol.id] = {};
    }
    form.functionTables[symbol.id][key] = value;
  }
</script>

<div class="interpretation-table">
  <div class="table-heading">
    <div>
      <strong class="mono">{symbol.name}</strong>
      <span class="muted small"> · aridad {symbol.arity} · función</span>
    </div>
    <span class:solved={missing === 0} class:pending={missing > 0} class="table-count">
      {missing === 0 ? 'Completa' : `${missing} valor(es) pendiente(s)`}
    </span>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          {#each Array(symbol.arity) as _, index}
            <th>arg {index + 1}</th>
          {/each}
          <th>valor</th>
        </tr>
      </thead>
      <tbody>
        {#each visible as tuple (tupleKey(tuple))}
          {@const key = tupleKey(tuple)}
          <tr class:missing={!form.functionTables[symbol.id]?.[key]}>
            {#each tuple as element}
              <td class="mono">{element}</td>
            {/each}
            <td>
              <select
                class="table-select"
                value={form.functionTables[symbol.id]?.[key] ?? ''}
                onchange={(event) => setValue(key, event.currentTarget.value)}
                aria-label={`Valor de ${symbol.name}${tupleLabel(tuple)}`}
              >
                <option value="">—</option>
                {#each domain as element}
                  <option value={element}>{element}</option>
                {/each}
              </select>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if pageCount > 1}
    <div class="table-pagination">
      <button
        type="button"
        class="small-button"
        disabled={currentPage === 0}
        onclick={() => (page = currentPage - 1)}
      >
        Anterior
      </button>
      <span class="muted small">Página {currentPage + 1} de {pageCount}</span>
      <button
        type="button"
        class="small-button"
        disabled={currentPage >= pageCount - 1}
        onclick={() => (page = currentPage + 1)}
      >
        Siguiente
      </button>
    </div>
  {/if}
</div>
