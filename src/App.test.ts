// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import App from './App.svelte';
import { EXAMPLES } from './lib/examples';
import { loadExampleIntoForm, resetForm } from './lib/stores/form.svelte';
import { history } from './lib/stores/history.svelte';

let app: ReturnType<typeof mount> | undefined;

function findButton(text: string): HTMLButtonElement {
  const button = [...document.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`No se encontró el botón "${text}"`);
  }
  return button;
}

function selectExample(id: string): void {
  const select = document.querySelector<HTMLSelectElement>('.example-picker select');
  if (!select) {
    throw new Error('No se encontró el selector de ejemplos');
  }
  select.value = id;
  const selectedOption = select.options[select.selectedIndex] ?? null;
  const nativeQuerySelector = select.querySelector.bind(select);
  // happy-dom no implementa :checked para <option>; se emula el comportamiento
  // del navegador que usa el binding interno de Svelte.
  select.querySelector = ((selectors: string) => {
    if (selectors === ':checked') {
      return selectedOption;
    }
    return nativeQuerySelector(selectors);
  }) as typeof select.querySelector;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

async function settle(): Promise<void> {
  await tick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await tick();
}

async function computeCurrentExample(): Promise<void> {
  findButton('Computar').click();
  await settle();
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  history.clear();
  resetForm();
});

afterEach(() => {
  if (app) {
    unmount(app);
    app = undefined;
  }
});

describe('flujo de la aplicación', () => {
  it('evalúa el ejemplo inicial y lo añade al visor y al historial', async () => {
    const target = document.getElementById('app');
    if (!target) {
      throw new Error('Falta el contenedor de la aplicación');
    }
    app = mount(App, { target });
    await settle();

    const example = EXAMPLES.find((candidate) => candidate.id === 'universal-falso');
    if (!example) {
      throw new Error('Falta el ejemplo universal-falso');
    }
    loadExampleIntoForm(example);
    await settle();
    await computeCurrentExample();

    expect(history.entries).toHaveLength(1);
    expect(history.selected?.status).toBe('valid');
    expect(history.selected?.truth).toBe(false);
    expect(document.querySelector('.result-truth')?.textContent).toContain('Falso');
    expect(document.querySelector('.result-certificate')?.textContent).toContain(
      'Contraejemplo'
    );
    expect(document.querySelectorAll('.history-item')).toHaveLength(1);
  });

  it('carga un ejemplo desde el selector y computa una función con igualdad', async () => {
    const target = document.getElementById('app');
    if (!target) {
      throw new Error('Falta el contenedor de la aplicación');
    }
    app = mount(App, { target });
    await settle();

    selectExample('funcion-igualdad');
    await settle();
    findButton('Cargar ejemplo').click();
    await settle();

    const textarea = document.querySelector<HTMLTextAreaElement>('.formula-input');
    expect(textarea?.value).toContain('f(f(f(x)))');

    await computeCurrentExample();

    expect(history.selected?.status).toBe('valid');
    expect(history.selected?.truth).toBe(true);
    expect(document.querySelector('.result-truth')?.textContent).toContain('Verdadero');
  });

  it('no asigna valor de verdad cuando hay un error de aridad', async () => {
    const target = document.getElementById('app');
    if (!target) {
      throw new Error('Falta el contenedor de la aplicación');
    }
    app = mount(App, { target });
    await settle();

    selectExample('error-aridad');
    await settle();
    findButton('Cargar ejemplo').click();
    await settle();
    await computeCurrentExample();

    expect(history.selected?.status).toBe('invalid');
    expect(history.selected?.truth).toBeUndefined();
    expect(document.querySelector('.result-truth')?.textContent).toContain(
      'Sin valor de verdad'
    );
    expect(document.querySelector('.error-list')?.textContent).toContain('espera 1');
  });

  it('inserta símbolos lógicos desde la barra de herramientas', async () => {
    const target = document.getElementById('app');
    if (!target) {
      throw new Error('Falta el contenedor de la aplicación');
    }
    app = mount(App, { target });
    await settle();

    findButton('∧').click();
    await settle();

    const textarea = document.querySelector<HTMLTextAreaElement>('.formula-input');
    expect(textarea?.value).toContain('\\land');
  });
});
