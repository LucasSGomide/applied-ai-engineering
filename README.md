# Applied AI Engineering

A collection of AI/ML projects built while learning the craft. Not production-ready. Not trying to be. Each folder is a self-contained experiment — some classify things, some predict things, one just wants to help you lift heavier.

## Projects

| Folder | What it does | Node |
|---|---|---|
| `local_ai_assistent` | Privacy-first note-taking app with in-browser AI (yes, no cloud, no subscription, no excuse) | 24 |
| `spam_email_classifier` | Teaches a neural network what your inbox already knows | 22 |
| `next_lift_prediction` | TensorFlow.js predicts your next gym session so you don't have to think | 22 |
| `supplier_recommendation_system` | TF.js + pgvector recommends suppliers. Surprisingly useful. | 22 |

## Requirements

- [nvm](https://github.com/nvm-sh/nvm) — each project pins its own Node version via `.nvmrc`
- Docker — required for `supplier_recommendation_system` (Postgres + pgvector)
- Make — for running the commands below

## Setup

Install all packages at once (each picks the right Node version automatically):

```bash
make install
```

## Running

```bash
make dev-local-ai-assistent        # http://localhost:3001
make dev-spam-classifier           # logs predictions to stdout
make dev-next-lift-prediction      # logs predictions to stdout
make dev-supplier-recommendation   # spins up Docker + http://localhost:3000
```

> `dev-supplier-recommendation` runs `docker compose up -d` before starting the server. Make sure Docker is running or you'll get a very unhelpful error.
