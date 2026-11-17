# Ejemplos para pruebas manuales

Todos los escenarios están disponibles en el selector **Cargar ejemplo** de la interfaz.
Para probar: elige un ejemplo, pulsa **Cargar ejemplo** y luego **Computar**. El
resultado queda numerado en el historial del visor derecho.

| Ejemplo | Dominio | Fórmula | Resultado esperado |
| --- | --- | --- | --- |
| Universal falso | `0, 1` | `\forall x (P(x) \to Q(x))` | **Falso** · contraejemplo `x = 1` (con `P` verdadero en todo el dominio y `Q` solo en `0`) |
| Existencial verdadero | `0, 1, 2` | `\exists x P(x)` | **Verdadero** · testigo `x = 1` |
| Universal verdadero | `0, 1, 2` | `\forall x P(x)` | **Verdadero** · comprobación completa de 3 elementos |
| Existencial falso | `0, 1` | `\exists x (P(x) \land \neg P(x))` | **Falso** · comprobación completa de 2 elementos |
| Fórmula abierta | `a, b` | `P(x) \to x = y` | **Falso** · entorno `x = a`, `y = b` |
| Función e igualdad | `0, 1, 2` | `\forall x (f(f(f(x))) = x)` | **Verdadero** · ciclo `0 → 1 → 2 → 0` |
| Cuantificadores anidados | `0, 1` | `\forall x \exists y R(x, y)` | **Verdadero** · cada `x` tiene testigo |
| Solo igualdad | `a, b` | `x = y` | **Verdadero** · entorno `x = a`, `y = a` |
| Error de aridad | `0, 1` | `P(x, y)` con `P` de aridad 1 | **Sin valor de verdad** · error de sintaxis/aridad |
| Relación vacía | `0, 1` | `P(x)` con `P` sin tuplas verdaderas | **Sin valor de verdad** · relación vacía |
| Función incompleta | `0, 1` | `f(x) = y` con un valor faltante | **Sin valor de verdad** · función total incompleta |

## Casos adicionales sugeridos

- Cambia el dominio de `0, 1` a `0, 1, 2` y observa que las tablas conservan los
  valores antiguos y dejan pendientes las tuplas nuevas.
- Declara un predicado binario `R` y comprueba que la tabla se pagina a partir de 40
  tuplas.
- Escribe una fórmula con variable libre y asigna su valor en **Entorno**; luego
  cuantifícala y verifica que el entorno deja de solicitarse.
- Prueba la igualdad con elementos diferentes y con el mismo elemento.
- Usa `Ctrl/Cmd + Enter` dentro del área de fórmula para computar sin usar el botón.

## Ejecución con Docker

```bash
docker compose up --build
```

La aplicación queda disponible en <http://localhost:8080>.
