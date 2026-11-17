<script lang="ts">
  import { evaluateInput } from './lib/logic/compute';
  import { form } from './lib/stores/form.svelte';
  import { history } from './lib/stores/history.svelte';
  import InputPanel from './lib/ui/InputPanel.svelte';
  import ViewerPanel from './lib/ui/ViewerPanel.svelte';

  let computing = $state(false);
  let unexpectedError = $state<string | null>(null);

  async function compute(): Promise<void> {
    if (computing) {
      return;
    }
    computing = true;
    unexpectedError = null;
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const result = evaluateInput({
        domainInput: form.domainInput,
        functions: form.functions.map((symbol) => ({ ...symbol })),
        predicates: form.predicates.map((symbol) => ({ ...symbol })),
        functionTables: Object.fromEntries(
          Object.entries(form.functionTables).map(([key, table]) => [key, { ...table }])
        ),
        predicateTables: Object.fromEntries(
          Object.entries(form.predicateTables).map(([key, table]) => [key, { ...table }])
        ),
        formula: form.formula,
        environment: { ...form.environment }
      });
      history.add(result);
    } catch (error) {
      unexpectedError = error instanceof Error ? error.message : String(error);
    } finally {
      computing = false;
    }
  }
</script>

<div class="app-shell">
  <header class="app-header">
    <div>
      <p class="eyebrow">Lógica de primer orden</p>
      <h1>Evaluador semántico</h1>
      <p class="muted">
        Verdad de fórmulas en interpretaciones finitas, con testigos, contraejemplos y
        comprobaciones completas.
      </p>
    </div>
    <div class="header-note">
      <span class="mono">Svelte · KaTeX</span>
      <span class="muted small">Docker · nginx</span>
    </div>
  </header>

  {#if unexpectedError}
    <div class="alert alert-error">
      <strong>Error inesperado:</strong> {unexpectedError}
    </div>
  {/if}

  <main class="panes">
    <InputPanel {computing} oncompute={compute} />
    <ViewerPanel />
  </main>
</div>
