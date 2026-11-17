<script lang="ts">
  import { history } from '../stores/history.svelte';

  let listElement: HTMLDivElement | undefined = $state();

  const timeFormatter = new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit'
  });

  function formatTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : timeFormatter.format(date);
  }

  function clearHistory(): void {
    if (history.entries.length === 0) {
      return;
    }
    if (window.confirm('¿Borrar todo el historial de resultados?')) {
      history.clear();
    }
  }

  $effect(() => {
    const selected = history.selectedId;
    if (!listElement || selected === null) {
      return;
    }
    const item = listElement.querySelector<HTMLElement>(`[data-entry-id="${selected}"]`);
    item?.scrollIntoView?.({ block: 'nearest' });
  });
</script>

<aside class="history-sidebar" aria-label="Historial de resultados">
  <div class="history-header">
    <div>
      <h2>Historial</h2>
      <span class="muted small">{history.entries.length} resultado(s)</span>
    </div>
    <button
      type="button"
      class="small-button"
      onclick={clearHistory}
      disabled={history.entries.length === 0}
    >
      Borrar
    </button>
  </div>

  <div class="history-list" bind:this={listElement}>
    {#if history.entries.length === 0}
      <p class="muted small history-empty">Aún no hay evaluaciones.</p>
    {:else}
      {#each history.entries as entry (entry.id)}
        <button
          type="button"
          class:active={entry.id === history.selectedId}
          class="history-item"
          data-entry-id={entry.id}
          onclick={() => history.select(entry.id)}
          aria-current={entry.id === history.selectedId ? 'true' : undefined}
        >
          <span class="history-number">#{entry.id}</span>
          <span class="history-content">
            <span class="history-formula">
              {entry.formulaSource.trim() || '(fórmula vacía)'}
            </span>
            <span class="history-meta">
              {formatTime(entry.createdAt)}
              {#if entry.freeVariables.length > 0}
                · libres: {entry.freeVariables.join(', ')}
              {/if}
            </span>
          </span>
          <span
            class:true-badge={entry.status === 'valid' && entry.truth === true}
            class:false-badge={entry.status === 'valid' && entry.truth === false}
            class:error-badge={entry.status === 'invalid'}
            class="history-status"
          >
            {entry.status === 'invalid' ? '!' : entry.truth ? 'V' : 'F'}
          </span>
        </button>
      {/each}
    {/if}
  </div>
</aside>
