# AURA UI Agents

Generador visual de interfaces con Next.js, OpenAI y validación segura de
componentes renderizables.

## Producción

Configura estas variables en tu proveedor de despliegue:

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=tu_api_key
OPENROUTER_MODEL=openrouter/free
ALLOW_DEMO_FALLBACK=false
```

`ALLOW_DEMO_FALLBACK=false` hace que producción falle claramente si OpenAI no
está configurado, en vez de mostrar datos demo.

Proveedores soportados:

- `openrouter`: usa `OPENROUTER_API_KEY` y `OPENROUTER_MODEL=openrouter/free`.
- `groq`: usa `GROQ_API_KEY` y `GROQ_MODEL=llama-3.1-8b-instant`.
- `openai`: usa `OPENAI_API_KEY` y `OPENAI_MODEL=gpt-5.4-mini`.

## Verificación

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Desarrollo

```bash
npm run dev
```

La API expone:

- `GET /api/agent`: estado del servicio y modelo configurado.
- `POST /api/agent`: genera una pantalla visual desde `{ "prompt": "..." }`.

## Despliegue

El proyecto está listo para proveedores compatibles con Next.js App Router,
como Vercel, Docker/Node o cualquier plataforma que ejecute:

```bash
npm ci
npm run build
npm run start
```

## Seguridad

La aplicación no renderiza HTML, React ni JavaScript generado por el modelo.
El servidor normaliza la salida a un conjunto cerrado de componentes visuales y
el cliente vuelve a validar antes de renderizar.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
