# Musiyo Web

Frontend React + TypeScript para el catálogo público de Musiyo Bëtsknaté y la entrada al recorrido virtual. Consulta datos desde Musiyo API; el navegador solo presenta las fichas que la API autoriza.

## Inicio local

1. Instalar Node.js 24 y npm (las pruebas usan su soporte TypeScript).
2. Ejecutar `npm.cmd install` y `npm.cmd run dev`.
3. Iniciar Musiyo API en `http://127.0.0.1:8000`; Vite envía `/api` a ese servidor durante desarrollo.

`npm.cmd run build` verifica TypeScript y genera `dist/`. En producción se debe dirigir `/api/v1` a la API bajo el mismo origen o establecer `VITE_API_BASE_URL` en el build. Ver `.env.example`.

## Estado funcional

- Inicio, catálogo con búsqueda local sobre fichas públicas, detalle y estados vacíos.
- Vista de recorrido que consulta el contrato v1 en inglés; abre Unity en el punto solicitado y refleja en la URL la selección hecha con Tab.
- `npm.cmd run unity:sync` copia el build Unity local a `public/unity/`. La carpeta generada está ignorada por Git. `VITE_UNITY_WEBGL_URL` permite cambiar su ruta, siempre bajo el mismo origen.

`npm.cmd run contracts:check` verifica tipos generados y copias SHA-256; `npm.cmd test` valida ejemplos y mensajes v1. La selección de elementos, el cargador Unity en el mismo documento (T-36) y la edición autenticada siguen pendientes. No se incluyen contenidos culturales de ejemplo.

En PowerShell de este equipo, usa `npm.cmd`: el comando `npm` se está resolviendo hacia una instalación global incompleta.

## Probar recorrido local

Con la API iniciada y el recorrido sintético creado con `python -m app.seed`, genera el WebGL desde Unity y ejecuta `npm.cmd run unity:sync`. Abre `/recorrido?point=punto-02` en la web; Unity debe enfocar ese punto. Con `Tab` en Unity, la URL web debe mostrar el nuevo punto. El contrato y los archivos se consultan bajo el mismo origen.
