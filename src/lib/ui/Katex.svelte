<script lang="ts">
  import katex from 'katex';

  /*
   * Uso de la API pública de KaTeX según su documentación:
   * KaTeX. (2026). KaTeX documentation: API. https://katex.org/docs/api.html
   */
  let { latex = '', display = false }: { latex?: string; display?: boolean } = $props();
  let element: HTMLSpanElement | undefined = $state();

  $effect(() => {
    if (!element) {
      return;
    }
    try {
      katex.render(latex, element, {
        displayMode: display,
        throwOnError: true,
        strict: 'ignore',
        trust: false,
        maxExpand: 1000,
        output: 'htmlAndMathml'
      });
    } catch {
      element.textContent = latex;
    }
  });
</script>

<span bind:this={element} class:display={display} class:katex-block={display}></span>
