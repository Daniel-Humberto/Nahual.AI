# Laboratorio de Investigación y Desarrollo de Agentes de IA V6 (Moonshot Edition)

---

## Visión Ejecutiva

**Agentic Lab V6 "Moonshot"** es la evolución definitiva hacia interfaces generativas y orquestación agentica de alto rendimiento. Esta versión marca la transición de componentes UI estáticos hacia una arquitectura **100% Server-Driven UI (SDUI)**, permitiendo que los agentes de IA no solo generen respuestas, sino que construyan interfaces complejas, anidadas y funcionales en tiempo real a través de un pipeline de streaming SSE directo.

### Arquitectura Moonshot

El sistema opera sobre una infraestructura de **21 servicios Docker** coordinados en **4 redes lógicas**, optimizados para baja latencia (<300ms TTFT en routing local) y soberanía total de datos.

| Red | Capa | Servicios Principales |
|---|---|---|
| `frontend-net` | Interfaces Generativas | Next.js 16 (SDUI), Open WebUI |
| `backend-net` | Orquestación & SDUI | FastAPI, Redis (Checkpointing), PostgreSQL, Neo4j, n8n |
| `ai-net` | Inferencia & RAG | Ollama (Gemma 3/2), Qdrant (Vectorial), Neo4j (Grafos), Gemini Flash |
| `observability-net` | MLOps & Telemetría | Prometheus, Grafana, Langfuse, NVIDIA DCGM |

### Pipeline SDUI Dinámico (Capa 4)

A diferencia de versiones anteriores, V6 implementa un sistema de renderizado recursivo:

```
User Query → [Router Agent] → [GraphRAG] → [Tool Exec] → [SDUI Generator] → [Dynamic UI]
     ↓              ↓              ↓             ↓                ↓                ↓
  Intención      Retrieval      Acciones      Esquema AST      Streaming SSE    Renderizado
  (Ollama)       (Multi-DB)     (Mutación)    (Gemini Flash)   (Recursivo)      (React 19)
```

---

## Stack Tecnológico de Nueva Generación

### Frontend & SDUI (Server-Driven UI)
- **Next.js 16 + React 19**: Uso intensivo de Server Actions y streaming SSE.
- **Recursive Dynamic Renderer**: Capacidad de renderizar componentes anidados (Container, Card, Row, Column, Text, Metric, etc.) basados en un AST generado por LLM.
- **Tailwind 4 + Framer Motion**: Micro-animaciones para una experiencia premium y fluida.
- **Direct SSE Pipeline**: Eliminación de intermediarios para reducir la latencia de actualización de UI.

### Backend AI Core
- **FastAPI + Python 3.12**: Arquitectura limpia con soporte nativo para streaming asíncrono.
- **LangGraph Moonshot**: Orquestación de 4 capas con **Redis Checkpointing** para persistencia de estado y **Semantic Caching**.
- **Recursive Pydantic Contracts**: Esquemas `UIElement` estrictos que garantizan la integridad de la interfaz generada.

### Capa de Inferencia & Modelos
- **Ollama Local (NVIDIA GPU)**: 
  - `gemma3:4b`: Router principal de baja latencia.
  - `gemma2:2b`: Clasificador de respaldo y tareas de extracción.
- **Google Gemini 2.0 Flash**: Motor de generación de UI (SDUI) por su alta velocidad y capacidad de razonamiento estructural.

### Bases de Datos Multimodales
- **PostgreSQL 15**: Persistencia relacional, sesiones y auditoría.
- **Redis (Alpine)**: Checkpointing de LangGraph, caché semántico y estado efímero.
- **Qdrant**: Búsqueda vectorial para RAG semántico.
- **Neo4j 5.12**: Grafos de conocimiento para relaciones complejas y razonamiento GraphRAG.

---

## Catálogo de Servicios y Endpoints V6

### Interfaces de Usuario

| Servicio | URL Local | Propósito | Características |
|---|---|---|---|
| **Portal SDUI** | <http://localhost:3000> | Chat Generativo + SDUI | Renderizado recursivo, streaming en tiempo real |
| **Open WebUI** | <http://localhost:8080> | Chat directo con Ollama | Gestión de modelos local y multimodal |
| **Grafana MLOps** | <http://localhost:3001> | Observabilidad Total | Dashboards de GPU, Ollama, DBs y Contenedores |
| **n8n Automation** | <http://localhost:5678> | Workflows Visuales | Automatización de tareas backend y externas |
| **Langfuse** | <http://localhost:3031> | Observabilidad LLM | Trazas, costos, latencia y evaluación de prompts |

### APIs y Protocolos Técnicos

| Servicio | Endpoint | Funcionalidad | Protocolo |
|---|---|---|---|
| **SDUI API** | `POST /api/v1/ui` | Pipeline SDUI completo | SSE Streaming |
| **Agent API** | `POST /api/v1/agent` | Pipeline conversacional | HTTP/REST + SSE |
| **Health Check** | `GET /health` | Estado del sistema V6 | HTTP |
| **Ollama API** | <http://localhost:11434> | Inferencia local | HTTP/REST |
| **Neo4j Bolt** | `bolt://localhost:7687` | Conector de grafos | Binario (Bolt) |

---

## Observabilidad MLOps Completa

V6 integra un stack de monitoreo de 21 servicios que permite supervisar cada aspecto del laboratorio:

- **Métricas de GPU**: Utilización, temperatura y memoria VRAM vía `dcgm-exporter`.
- **Métricas de Ollama**: Tokens/segundo, latencia TTFT y throughput por modelo.
- **Métricas de Base de Datos**: Estado de Postgres, Redis, Qdrant y Neo4j en tiempo real.
- **Trazas de Langfuse**: Trazabilidad completa de cada paso del grafo LangGraph, incluyendo costos de Gemini y latencia de Ollama.

---

## Operación y Despliegue

### Requisitos Mínimos
- **Ubuntu 24.04 LTS** (Altamente recomendado).
- **NVIDIA GPU** con 8GB+ VRAM (NVIDIA Container Toolkit instalado).
- **Docker + Docker Compose v2.20+**.
- **16GB RAM** de sistema.

### Instalación Rápida
```bash
# 1. Configurar variables de entorno
cp .env.example .env # Asegúrate de añadir tu GEMINI_API_KEY

# 2. Iniciar infraestructura
make up

# 3. Preparar modelos locales
make update-models
```

### Gestión con Makefile
- `make up`: Levanta los 21 servicios.
- `make build`: Reconstruye las imágenes de backend y frontend.
- `make logs`: Visualiza logs en tiempo real.
- `make status`: Verifica el estado de salud de todos los contenedores.

---

## Estado Actual & Roadmap Moonshot

| Hito | Estado | Detalle |
| :--- | :--- | :--- |
| **SDUI Engine** | ✅ Operativo | Motor de renderizado recursivo basado en Gemini Flash |
| **Redis Checkpointing** | ✅ Implementado | Persistencia de estado en LangGraph entre turnos |
| **MLOps Stack** | ✅ Completo | 21 servicios con dashboards preconfigurados |
| **Direct SSE Streaming** | ✅ Funcional | Pipeline sin intermediarios para latencia mínima |
| **GraphRAG real** | 🔶 En progreso | Integración de embeddings reales en Qdrant y Neo4j |
| **MCP Implementation** | 🔶 En progreso | Servidor MCP funcional para integración de herramientas |

**Desarrollado para el Laboratorio de IA de Vanguardia.**
