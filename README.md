# Evaluador semántico de lógica de primer orden

Aplicación web para evaluar fórmulas de lógica de primer orden en interpretaciones
finitas. Permite definir un dominio, declarar funciones y predicados, completar sus
tablas de interpretación, escribir fórmulas en LaTeX y obtener un resultado con
justificación, testigos, contraejemplos y comprobaciones completas.

## 1. Cómo correr y probar la aplicación

### Requisitos

- Node.js `>= 20.19` y npm.
- Docker y Docker Compose (solo para la ejecución en contenedor).

Si npm no está disponible directamente en el sistema, se puede usar
`corepack npm` en lugar de `npm` en todos los comandos.

### Instalación y desarrollo

```bash
npm install
npm run dev
```

La aplicación queda disponible en <http://localhost:5173>.

### Verificaciones

```bash
npm run check   # comprobación de tipos y componentes Svelte
npm test        # pruebas unitarias e integración de interfaz
npm run build   # compilación de producción en dist/
npm run preview # previsualización del build
```

### Ejecución con Docker

```bash
docker compose up --build
```

La aplicación queda disponible en <http://localhost:8080>. Para detenerla:

```bash
docker compose down
```

El contenedor incluye un `healthcheck` sobre NGINX; puede comprobarse con
`docker compose ps`.

### Prueba manual

Abre la aplicación, elige un escenario en **Cargar ejemplo**, pulsa **Cargar ejemplo**
y luego **Computar**. El resultado aparecerá en el visor derecho y quedará numerado en
el historial. Los escenarios y sus resultados esperados están descritos en
[`EJEMPLOS.md`](./EJEMPLOS.md).

## 2. Estructura y núcleo lógico

### Estructura del proyecto

```text
src/
  lib/
    logic/      # lexer, parser, AST, validación, evaluación, trazas y LaTeX
    stores/     # estado del formulario e historial persistente
    ui/         # componentes Svelte de entrada, tablas y visor
    examples.ts # escenarios de prueba manual
  App.svelte    # composición de la interfaz
  app.css       # estilos globales
  main.ts       # punto de entrada
```

El núcleo matemático está aislado en `src/lib/logic/` y no depende de Svelte:

- `types.ts`: AST, estructura, trazas, errores y límites.
- `lexer.ts` y `parser.ts`: lectura de macros LaTeX o símbolos Unicode y construcción
  del AST con precedencia.
- `validation.ts`: validación del dominio, lenguaje, interpretación y entorno.
- `evaluate.ts`: evaluación recursiva y generación de trazas.
- `explain.ts`: aplanado de trazas y resúmenes de certificados.
- `compute.ts`: orquestación de análisis, validación y evaluación.
- `latex.ts`: presentación canónica de fórmulas, términos y tuplas.

### Semántica

Sea un lenguaje de primer orden con funciones y predicados de aridad mayor o igual que
1, más la igualdad incorporada. Una interpretación finita consta de:

- Un dominio no vacío y finito `D`.
- Una función total `f^I: D^n → D` para cada símbolo funcional de aridad `n`.
- Una relación no vacía `P^I ⊆ D^n` para cada predicado de aridad `n`.
- La igualdad interpretada como identidad entre elementos de `D`.

Dada una asignación `ρ` para las variables libres, los términos se evalúan
recursivamente y las fórmulas se satisfacen de la forma habitual: negación,
conjunción, disyunción, implicación y cuantificadores. `∀x φ` es verdadera si todos
los elementos de `D` satisfacen `φ`; `∃x φ` es verdadera si algún elemento lo hace.
El alcance de un cuantificador es la expresión inmediatamente siguiente, por lo que
los paréntesis amplían su alcance.

La evaluación registra una traza para explicar el resultado. Cuando `∃x φ` es
verdadera se conserva un testigo; cuando `∀x φ` es falsa se conserva un
contraejemplo; cuando hay que revisar todo el dominio se conserva la comprobación
completa. Las conectivas aplican cortocircuito cuando el valor ya está determinado.
Las entradas inválidas no reciben valor de verdad y se agrupan por dominio, lenguaje,
sintaxis, interpretación, entorno o límites.

Para mantener la aplicación usable se aplican límites de dominio, aridad, tamaño de
tablas y pasos de evaluación. Las tablas de funciones deben ser totales y las
relaciones de los predicados no pueden quedar vacías.

## 3. Referencias

APA 7.ª edición.

Capricorn86. (2026). *happy-dom* (Versión 21.0.4) [Software de computación]. GitHub.
<https://github.com/capricorn86/happy-dom>

Docker Inc. (2026). *Docker Compose documentation*. <https://docs.docker.com/compose/>

Docker Inc. (2026). *Docker documentation*. <https://docs.docker.com/>

F5, Inc. (2026). *NGINX documentation*. <https://nginx.org/en/docs/>

KaTeX. (2026). *KaTeX documentation: API*. <https://katex.org/docs/api.html>

Node.js. (2026). *Node.js documentation*. <https://nodejs.org/docs/latest/api/>

npm. (2026). *npm documentation*. <https://docs.npmjs.com/>

Svelte. (2026). *Svelte documentation*. <https://svelte.dev/docs/svelte/overview>

Svelte. (2026). *sv check*. <https://svelte.dev/docs/cli/sv-check>

Svelte. (2026). *vite-plugin-svelte* [Software de computación]. GitHub.
<https://github.com/sveltejs/vite-plugin-svelte>

TypeScript. (2026). *TypeScript documentation*.
<https://www.typescriptlang.org/docs/>

Vite. (2026). *Vite documentation*. <https://vite.dev/guide/>

Vitest. (2026). *Vitest documentation*. <https://vitest.dev/guide/>
