<script lang="ts">
  import type { SymbolDecl, ValidationError } from '../logic/types';
  import { LIMITS } from '../logic/types';
  import { isValidSymbolName } from '../logic/validation';
  import {
    addFunction,
    addPredicate,
    form,
    removeFunction,
    removePredicate
  } from '../stores/form.svelte';

  let { errors = [] }: { errors?: ValidationError[] } = $props();

  function duplicateName(symbol: SymbolDecl): boolean {
    const count = [...form.functions, ...form.predicates].filter(
      (candidate) => candidate.name === symbol.name
    ).length;
    return count > 1;
  }

  function hint(symbol: SymbolDecl): string {
    if (!symbol.name.trim()) {
      return 'El nombre no puede estar vacío.';
    }
    if (!isValidSymbolName(symbol.name.trim())) {
      return 'Usa una letra inicial y solo letras o dígitos.';
    }
    if (duplicateName(symbol)) {
      return 'Este nombre está repetido.';
    }
    if (
      !Number.isInteger(symbol.arity) ||
      symbol.arity < 1 ||
      symbol.arity > LIMITS.maxArity
    ) {
      return `La aridad debe estar entre 1 y ${LIMITS.maxArity}.`;
    }
    return '';
  }

  function setArity(symbol: SymbolDecl, value: string): void {
    const parsed = Number(value);
    symbol.arity = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  }
</script>

<div class="language-editor">
  <div class="symbol-column">
    <div class="symbol-column-header">
      <h3>Símbolos funcionales</h3>
      <button type="button" class="small-button" onclick={addFunction}>+ Añadir</button>
    </div>
    {#if form.functions.length === 0}
      <p class="muted small">Sin funciones declaradas.</p>
    {/if}
    {#each form.functions as symbol (symbol.id)}
      <div class="symbol-row">
        <div class="symbol-fields">
          <label class="field compact-field">
            <span class="sr-only">Nombre de la función</span>
            <input
              class="text-input mono"
              bind:value={symbol.name}
              placeholder="f"
              aria-label={`Nombre de la función ${symbol.name || 'sin nombre'}`}
            />
          </label>
          <label class="field compact-field arity-field">
            <span class="sr-only">Aridad</span>
            <input
              class="text-input mono"
              type="number"
              min="1"
              max={LIMITS.maxArity}
              value={symbol.arity}
              oninput={(event) => setArity(symbol, event.currentTarget.value)}
              aria-label={`Aridad de ${symbol.name || 'la función'}`}
            />
          </label>
          <button
            type="button"
            class="icon-button"
            title="Eliminar función"
            aria-label={`Eliminar función ${symbol.name}`}
            onclick={() => removeFunction(symbol.id)}
          >
            ×
          </button>
        </div>
        {#if hint(symbol)}
          <p class="field-error">{hint(symbol)}</p>
        {/if}
      </div>
    {/each}
  </div>

  <div class="symbol-column">
    <div class="symbol-column-header">
      <h3>Símbolos de predicado</h3>
      <button type="button" class="small-button" onclick={addPredicate}>+ Añadir</button>
    </div>
    {#if form.predicates.length === 0}
      <p class="muted small">Sin predicados declarados.</p>
    {/if}
    {#each form.predicates as symbol (symbol.id)}
      <div class="symbol-row">
        <div class="symbol-fields">
          <label class="field compact-field">
            <span class="sr-only">Nombre del predicado</span>
            <input
              class="text-input mono"
              bind:value={symbol.name}
              placeholder="P"
              aria-label={`Nombre del predicado ${symbol.name || 'sin nombre'}`}
            />
          </label>
          <label class="field compact-field arity-field">
            <span class="sr-only">Aridad</span>
            <input
              class="text-input mono"
              type="number"
              min="1"
              max={LIMITS.maxArity}
              value={symbol.arity}
              oninput={(event) => setArity(symbol, event.currentTarget.value)}
              aria-label={`Aridad de ${symbol.name || 'el predicado'}`}
            />
          </label>
          <button
            type="button"
            class="icon-button"
            title="Eliminar predicado"
            aria-label={`Eliminar predicado ${symbol.name}`}
            onclick={() => removePredicate(symbol.id)}
          >
            ×
          </button>
        </div>
        {#if hint(symbol)}
          <p class="field-error">{hint(symbol)}</p>
        {/if}
      </div>
    {/each}
  </div>

  {#if errors.length > 0}
    <ul class="inline-errors">
      {#each errors.slice(0, 5) as error}
        <li>{error.message}</li>
      {/each}
    </ul>
  {/if}
</div>
