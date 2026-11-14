# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Despliegue

En producción no existe el proxy de Vite (`/api`), por lo que las llamadas se resuelven contra `VITE_API_URL` (leída en `src/api/client.ts`). **Sin `VITE_API_URL` definido, las llamadas a la API fallan en producción.**

- **Render (backend):** `Cors__AllowedOrigins__0=https://panpaya.netlify.app` y `Cors__AllowedOrigins__1=http://localhost:5173`.
- **Netlify (frontend):** `VITE_API_URL=https://panpayafron.onrender.com`. El build usa `netlify.toml` en la raíz del repositorio (`base = frontend`, Node 22, redirect SPA `/* -> /index.html` 200).
