# Musiyo Web

Frontend React + TypeScript para el catálogo público de Musiyo Bëtsknaté y la entrada al recorrido virtual. Consulta datos desde Musiyo API; el navegador solo presenta las fichas que la API autoriza.

## Inicio local

1. Instalar Node.js 20.19+ (o 22.12+) y npm.
2. Ejecutar `npm.cmd install` y `npm.cmd run dev`.
3. Iniciar Musiyo API en `http://127.0.0.1:8000`; Vite envía `/api` a ese servidor durante desarrollo.

`npm.cmd run build` verifica TypeScript y genera `dist/`. En producción se debe dirigir `/api/v1` a la API bajo el mismo origen o establecer `VITE_API_BASE_URL` en el build. Ver `.env.example`.

## Estado funcional

- Inicio, catálogo con búsqueda local sobre fichas públicas, detalle y estados vacíos.
- Vista de recorrido que consulta el contrato v1 de salas, puntos y elementos; abre Unity en el punto solicitado y refleja en la URL la selección hecha con Tab.
- `npm.cmd run unity:sync` copia el build Unity local a `public/unity/`. La carpeta generada está ignorada por Git. `VITE_UNITY_WEBGL_URL` permite cambiar su ruta, siempre bajo el mismo origen.

El puente de puntos funciona con el contrato de prueba. La selección de elementos y la edición autenticada del Validador Cultural siguen pendientes. No se incluyen contenidos culturales de ejemplo.

En PowerShell de este equipo, usa `npm.cmd`: el comando `npm` se está resolviendo hacia una instalación global incompleta.

## Probar recorrido local

Con la API iniciada y el recorrido sintético creado con `python -m app.seed`, genera el WebGL desde Unity y ejecuta `npm.cmd run unity:sync`. Abre `/recorrido?punto=punto-02` en la web; Unity debe enfocar ese punto. Con `Tab` en Unity, la URL web debe mostrar el nuevo punto. El contrato y los archivos se consultan bajo el mismo origen.
