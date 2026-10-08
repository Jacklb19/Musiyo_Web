# Musiyo Web

React y TypeScript para catálogo, fichas, recorrido libre y alternativa accesible en texto. El contenido procede de Musiyo API.

## Desarrollo local

- Node.js 24: `npm.cmd ci` y `npm.cmd run dev`.
- Inicia la API en `http://127.0.0.1:8000`; Vite conecta `/api` al servicio local. Para otro puerto, configura `MUSIYO_DEV_API_TARGET=http://127.0.0.1:8002` en `.env.local` y reinicia Vite; el navegador sigue usando `/api/v1` del mismo origen.
- Genera el museo con `Musiyo > Build Museum Web` en Unity y ejecuta `npm.cmd run unity:sync`. Los archivos generados permanecen ignorados.
- Abre `/recorrido`. Las consultas `point` y `element` seleccionan anclas y fichas disponibles; `VITE_TOUR_KEY` elige el recorrido. El cargador utiliza `/unity/unity-build.json` bajo el mismo origen.
- Celulares y equipos sin WebGL 2 disponen de `/recorrido/texto`. También existen `/acerca` y `/privacidad`.

## Verificación

`npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run contracts:check` y `npm.cmd run build` comprueban código, selecciones, contratos y compilación. En producción, sirve `/api/v1` bajo el mismo origen. Configuración en `.env.example`.

La ficha carga modelos GLB bajo demanda con acceso temporal a la variante Web y controles de rotación, zoom y restablecimiento. Los decodificadores Draco se sirven localmente y se preparan al iniciar o compilar. El validador dispone de ingreso y corrección de textos. El guía por voz sigue pendiente. Los repositorios no contienen material cultural ni claves.

## Coordinación

Código y contratos en inglés; interfaz en español. El contenido y los recursos proceden de API; parámetros y estilos ajustables se centralizan en configuración. Figma es referencia visual, mientras Unity gobierna la visita y sus menús. Narraciones Studio, guía RAG y validación física Quest son tareas pendientes. `main` estable y `dev` de integración; tareas desde `dev` en ramas profesionales (`feature/`, `fix/`, `docs/`, `refactor/`). Ramas y títulos de commit describen el cambio y no llevan nombres de asistentes o herramientas. Commits por tarea; el push lo hace el propietario. En el checkout local, consulta `AGENTS.md` y `.local_docs/REPORT_2026-10-08_HANDOFF.md`; estas notas y el preview externo no se incluyen en Git.

## Visual presentation

The React pages use shared tokens in `src/tokens.css` (Fraunces headings, DM Sans body, cream surfaces and gold actions) and neutral Spanish copy in `src/interface-copy.ts`. Cultural descriptions, counts, sources, credits and resources come from the API. Missing photographs have an explicit fallback; no cultural images or models are bundled in the source.

`VITE_EXHIBITION_CATEGORY` selects the published category displayed on the home page (default `mascaras`). This key and `VITE_TOUR_KEY` are validated. Models on the home page and detail pages load only after the visitor chooses to examine them, using the existing signed Web variant and local Draco decoder. Catalogue filters and search remain in the URL; Enter preserves search focus. Shared tour points have a selector for their available elements and a link to the full HTML detail.

Check the home page, `/catalogo?category=mascaras`, an API-provided element detail and `/recorrido/texto` at desktop, tablet and mobile widths, including keyboard, empty results and retry. At mobile/tablet widths the tour offers HTML and does not mount Unity. The Web loading wrapper does not duplicate the Unity game menu.

Do not run `unity:sync` while Unity is building or before its visible-browser keyboard/pointer review is closed. After that handoff, synchronize once and validate entry, welcome, deep links, shared point selection, pause/resume, return to catalogue and engine disposal in React. Public deployment and promotion to `main` remain separate release decisions.
