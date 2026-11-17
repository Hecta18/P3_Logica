<script lang="ts">
  import { tupleCount } from '../logic/tuples';
  import type { SymbolDecl } from '../logic/types';
  import { LIMITS } from '../logic/types';
  import { isValidSymbolName } from '../logic/validation';
  import { form } from '../stores/form.svelte';
  import FunctionTable from './FunctionTable.svelte';
  import PredicateTable from './PredicateTable.svelte';

  let { domain }: { domain: string[] } = $props();

  function isUsable(symbol: SymbolDecl): boolean {
    return (
      isValidSymbolName(symbol.name.trim()) &&
      Number.isInteger(symbol.arity) &&
      symbol.arity >= 1 &&
      symbol.arity <= LIMITS.maxArity &&
      domain.length > 0
    );
  }

  function exceedsLimit(symbol: SymbolDecl): boolean {
    return (
      domain.length > 0 &&
      Number.isInteger(symbol.arity) &&
      symbol.arity >= 1 &&
      tupleCount(domain.length, symbol.arity) > LIMITS.maxTuplesPerSymbol
    );
  }
</script>

<div class="interpretation-editor">
  {#if domain.length === 0}
    <p class="muted">Define un dominio válido para generar las tablas de interpretación.</p>
  {:else if form.functions.length === 0 && form.predicates.length === 0}
    <p class="muted">
      No hay símbolos declarados. Puedes evaluar fórmulas que solo usen igualdad.
    </p>
  {:else}
    {#if form.functions.length > 0}
      <h3 class="table-group-title">Funciones</h3>
      {#each form.functions as symbol (symbol.id)}
        {#if isUsable(symbol)}
          {#if exceedsLimit(symbol)}
            <p class="field-error">
              La tabla de <span class="mono">{symbol.name}</span> excede el límite práctico
              de {LIMITS.maxTuplesPerSymbol} tuplas.
            </p>
          {:else}
            <FunctionTable {symbol} {domain} />
          {/if}
        {/if}
      {/each}
    {/if}

    {#if form.predicates.length > 0}
      <h3 class="table-group-title">Predicados</h3>
      {#each form.predicates as symbol (symbol.id)}
        {#if isUsable(symbol)}
          {#if exceedsLimit(symbol)}
            <p class="field-error">
              La tabla de <span class="mono">{symbol.name}</span> excede el límite práctico
              de {LIMITS.maxTuplesPerSymbol} tuplas.
            </p>
          {:else}
            <PredicateTable {symbol} {domain} />
          {/if}
        {/if}
      {/each}
    {/if}
  {/if}
</div>
