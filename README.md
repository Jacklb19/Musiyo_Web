# Musiyo Web

Frontend React + TypeScript para el catálogo público de Musiyo Bëtsknaté y la entrada al recorrido virtual. Consulta datos desde Musiyo API; el navegador solo presenta las fichas que la API autoriza.

## Inicio local

1. Instalar Node.js 20.19+ (o 22.12+) y npm.
2. Ejecutar `npm.cmd install` y `npm.cmd run dev`.
3. Iniciar Musiyo API en `http://127.0.0.1:8000`; Vite envía `/api` a ese servidor durante desarrollo.

`npm.cmd run build` verifica TypeScript y genera `dist/`. En producción se debe dirigir `/api/v1` a la API bajo el mismo origen o establecer `VITE_API_BASE_URL` en el build. Ver `.env.example`.

## Estado funcional

- Inicio, catálogo con búsqueda local sobre fichas públicas, detalle y estados vacíos.
- Vista de recorrido que consulta el contrato v1 de salas, puntos y elementos.
- Opción `VITE_UNITY_WEBGL_URL` para incrustar un build WebGL publicado por separado. El build Unity no se versiona aquí.

Aún falta implementar el puente de navegación bidireccional con Unity y la edición autenticada del Validador Cultural. No se incluyen contenidos culturales de ejemplo.

En PowerShell de este equipo, usa `npm.cmd`: el comando `npm` se está resolviendo hacia a una instalación global incompleta.
