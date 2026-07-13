# AaryanAI

**Think clearer. Build faster.**

AaryanAI is a multi-agent AI platform for chat, coding, search, PDF/PPT generation, vision, image generation, and billing — with a React frontend and a microservices backend behind an API gateway.

**Repo:** [aaryansrawat18/AaryanAI-MultiAgent](https://github.com/aaryansrawat18/AaryanAI-MultiAgent)

---

## Features

| Capability | Description |
| --- | --- |
| Chat | General conversation and explanations |
| Coding | Code generation, debugging, architecture help |
| Search | Live web lookup (Tavily) for current events |
| PDF / PPT | Document and slide generation |
| Vision / Image | Image understanding and generation |
| PDF RAG | Ask questions over uploaded PDFs |
| Billing | Plans, credits, and Razorpay payments |
| Auth | Firebase-backed authentication |

---

## Project structure

```
AaryanAI-MultiAgent/
├── frontend/                 # React + Vite + Redux client
└── backend/
    ├── gateway/              # API gateway (auth + proxy)
    ├── shared/redis/         # Shared Redis helper
    ├── docker-compose.yml    # Local Redis
    └── services/
        ├── auth/             # Users + Firebase
        ├── chat/             # Conversations + messages
        ├── agent/            # LangGraph supervisor + agents
        └── billing/          # Credits + Razorpay
```

---

## High-level architecture

```mermaid
flowchart TB
  subgraph Client
    UI[AaryanAI Frontend<br/>React + Vite]
  end

  subgraph Gateway
    GW[API Gateway<br/>Express · CORS · Auth middleware]
  end

  subgraph Services
    AUTH[Auth Service]
    CHAT[Chat Service]
    AGENT[Agent Service<br/>LangGraph]
    BILL[Billing Service]
  end

  subgraph Data
    MONGO[(MongoDB Atlas)]
    REDIS[(Redis)]
    S3[(AWS S3)]
    QDRANT[(Qdrant)]
  end

  subgraph External
    FB[Firebase Auth]
    LLM[LLM Providers]
    TAVILY[Tavily Search]
    RP[Razorpay]
  end

  UI -->|HTTPS / cookies| GW
  UI --> FB
  GW -->|/api/auth| AUTH
  GW -->|/api/chat| CHAT
  GW -->|/api/agent| AGENT
  GW -->|/api/billing| BILL
  AUTH --> MONGO
  AUTH --> FB
  CHAT --> MONGO
  AGENT --> MONGO
  AGENT --> REDIS
  AGENT --> S3
  AGENT --> QDRANT
  AGENT --> LLM
  AGENT --> TAVILY
  BILL --> MONGO
  BILL --> RP
```

---

## Request flow

End-to-end path when a signed-in user sends a message:

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant FE as Frontend
  participant GW as Gateway
  participant Auth as Auth Service
  participant Chat as Chat Service
  participant Agent as Agent Service
  participant Graph as LangGraph Router

  User->>FE: Send message / upload file
  FE->>GW: POST /api/agent (auth cookie)
  GW->>Auth: Validate session / user
  Auth-->>GW: User context
  GW->>Agent: Proxy with user headers
  Agent->>Graph: Invoke supervisor graph
  Graph->>Graph: Route to specialist agent
  Graph-->>Agent: Agent result
  Agent->>Chat: Persist conversation / messages
  Agent-->>GW: Response + artifacts
  GW-->>FE: JSON / file URLs
  FE-->>User: Render reply in chat UI
```

---

## Multi-agent (LangGraph) flow

The agent service uses a **supervisor graph**: every request starts at the **router**, then moves to one specialist agent.

```mermaid
flowchart LR
  START([User request]) --> R[Router]

  R -->|chat| CHAT[Chat Agent]
  R -->|coding| CODE[Coding Agent]
  R -->|search| SEARCH[Search Agent]
  R -->|pdf| PDF[PDF Agent]
  R -->|ppt| PPT[PPT Agent]
  R -->|image| IMG[Image Gen Agent]
  R -->|vision| VIS[Vision Agent]
  R -->|pdf_rag| RAG[PDF RAG Agent]

  SEARCH --> CHAT
  CHAT --> END([Response])
  CODE --> END
  PDF --> END
  PPT --> END
  IMG --> END
  VIS --> END
  RAG --> END
```

### Routing rules (simplified)

| Input signal | Routed agent |
| --- | --- |
| Image file | `vision` |
| PDF file | `pdf_rag` |
| Explicit agent selected | That agent |
| Otherwise | LLM router chooses: `chat`, `search`, `coding`, `pdf`, `ppt`, or `image` |

`search` results are handed to `chat` for a final natural-language answer.

---

## Gateway API map

```mermaid
flowchart LR
  C[Client] --> G[Gateway :5000]

  G -->|/api/auth| A[Auth]
  G -->|/api/me| ME[Current user]
  G -->|/api/chat| CH[Chat]
  G -->|/api/agent| AG[Agent]
  G -->|/api/billing| BI[Billing]
  G -.->|/api/auth/internal| X[Blocked · 403]
```

Protected routes (`/api/me`, `/api/chat`, `/api/agent`, `/api/billing`) require auth middleware. Internal auth routes are never exposed through the gateway.

---

## Tech stack

**Frontend:** React 19, Vite, Redux Toolkit, Tailwind CSS, Firebase, Framer Motion, Monaco Editor  

**Backend:** Node.js, Express, MongoDB, Redis, LangGraph / LangChain, Multer, AWS S3, Qdrant, Razorpay, Docker  

---

## Getting started

### Prerequisites

- Node.js 18+
- Redis (or `docker compose` in `backend/`)
- MongoDB connection string
- Firebase project
- API keys for the LLM providers you enable
- (Optional) AWS S3, Qdrant, Tavily, Razorpay, Cloudinary

### 1. Clone

```bash
git clone https://github.com/aaryansrawat18/AaryanAI-MultiAgent.git
cd AaryanAI-MultiAgent
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env   # if present; otherwise create .env
npm install
npm run dev
```

Runs at `http://localhost:5173` (or the next free Vite port).

### 3. Backend services

Start Redis:

```bash
cd backend
docker compose up -d
```

Create a `.env` in each service (`gateway`, `auth`, `chat`, `agent`, `billing`) with the required secrets, then in each service folder:

```bash
npm install
npm run dev   # or npm start
```

Typical local ports (confirm in each `.env`):

| Service | Role |
| --- | --- |
| Gateway | Public API entry |
| Auth | Firebase + users |
| Chat | Conversations |
| Agent | Multi-agent graph |
| Billing | Plans + payments |

Point the frontend API base URL at the gateway.

### 4. Environment notes

- Never commit `.env` or Firebase `serviceAccount.json` (already gitignored).
- Keep `INTERNAL_SERVICE_SECRET` identical across services that call each other.
- Gateway `AUTH_SERVICE`, `CHAT_SERVICE`, `AGENT_SERVICE`, `BILLING_SERVICE` must point at the running service URLs.

---

## Security

- Secrets and service accounts stay local / in a secret manager — not in git.
- Gateway blocks `/api/auth/internal`.
- User-facing agent/chat/billing routes go through auth middleware.

---

## License

ISC — see package manifests for details.
