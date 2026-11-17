<script lang="ts">
  import { history } from '../stores/history.svelte';
  import HistorySidebar from './HistorySidebar.svelte';
  import ResultDocument from './ResultDocument.svelte';
</script>

<div class="viewer-pane">
  <HistorySidebar />
  <div class="viewer-document">
    {#if history.selected}
      <ResultDocument entry={history.selected} />
    {:else}
      <div class="empty-state">
        <div class="empty-state-mark">⊢</div>
        <h2>Visor de resultados</h2>
        <p class="muted">
          Configura el dominio, el lenguaje y la interpretación; escribe una fórmula y
          presiona <strong>Computar</strong>.
        </p>
        <p class="muted small">
          El resultado aparecerá aquí como un documento matemático y quedará numerado en
          el historial.
        </p>
      </div>
    {/if}
  </div>
</div>
