# Musiyo Web

React y TypeScript para catálogo, fichas, recorrido libre y alternativa accesible en texto. El contenido procede de Musiyo API.

## Desarrollo local

- Node.js 24: `npm.cmd ci` y `npm.cmd run dev`.
- Inicia la API en `http://127.0.0.1:8000`; Vite conecta `/api` al servicio local.
- Genera el museo con `Musiyo > Build Museum Web` en Unity y ejecuta `npm.cmd run unity:sync`. Los archivos generados permanecen ignorados.
- Abre `/recorrido`. Las consultas `point` y `element` seleccionan anclas y fichas disponibles; `VITE_TOUR_KEY` elige el recorrido. El cargador utiliza `/unity/unity-build.json` bajo el mismo origen.
- Celulares y equipos sin WebGL 2 disponen de `/recorrido/texto`. También existen `/acerca` y `/privacidad`.

## Verificación

`npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run contracts:check` y `npm.cmd run build` comprueban código, selecciones, contratos y compilación. En producción, sirve `/api/v1` bajo el mismo origen. Configuración en `.env.example`.

El guía por voz, la edición autenticada y el visor de modelos remotos siguen pendientes. Los repositorios no contienen material cultural ni claves.
