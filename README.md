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

Código y contratos en inglés; interfaz en español. El contenido y los recursos proceden de API; parámetros y estilos ajustables se centralizan en configuración. Figma es referencia visual, mientras Unity gobierna la visita y sus menús. Narraciones Studio, guía RAG y validación física Quest son tareas pendientes. Ramas `codex/`, commits por tarea y sin push por agentes. En el checkout local, consulta `AGENTS.md` y `.local_docs/REPORT_2026-10-08_HANDOFF.md`; estas notas y el preview externo no se incluyen en Git.
