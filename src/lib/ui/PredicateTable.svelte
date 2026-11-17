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
  const trueCount = $derived(
    tuples.filter((tuple) => form.predicateTables[symbol.id]?.[tupleKey(tuple)] === true)
      .length
  );

  function setValue(key: string, value: boolean): void {
    if (!form.predicateTables[symbol.id]) {
      form.predicateTables[symbol.id] = {};
    }
    form.predicateTables[symbol.id][key] = value;
  }

  function setPage(value: boolean): void {
    for (const tuple of visible) {
      setValue(tupleKey(tuple), value);
    }
  }
</script>

<div class="interpretation-table">
  <div class="table-heading">
    <div>
      <strong class="mono">{symbol.name}</strong>
      <span class="muted small"> · aridad {symbol.arity} · predicado</span>
    </div>
    <span class:empty-relation={trueCount === 0} class="table-count">
      {trueCount} tupla(s) verdadera(s)
    </span>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          {#each Array(symbol.arity) as _, index}
            <th>arg {index + 1}</th>
          {/each}
          <th>verdadero</th>
        </tr>
      </thead>
      <tbody>
        {#each visible as tuple (tupleKey(tuple))}
          {@const key = tupleKey(tuple)}
          <tr class:true-row={form.predicateTables[symbol.id]?.[key] === true}>
            {#each tuple as element}
              <td class="mono">{element}</td>
            {/each}
            <td>
              <input
                type="checkbox"
                checked={form.predicateTables[symbol.id]?.[key] === true}
                onchange={(event) => setValue(key, event.currentTarget.checked)}
                aria-label={`${symbol.name}${tupleLabel(tuple)} es verdadero`}
              />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="table-pagination">
    {#if pageCount > 1}
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
    {/if}
    <span class="pagination-spacer"></span>
    <button type="button" class="small-button" onclick={() => setPage(true)}>
      Marcar página
    </button>
    <button type="button" class="small-button" onclick={() => setPage(false)}>
      Limpiar página
    </button>
  </div>

  {#if trueCount === 0}
    <p class="field-error">La relación no puede ser vacía: marca al menos una tupla.</p>
  {/if}
</div>
