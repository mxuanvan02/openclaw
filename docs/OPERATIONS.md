# OpenClaw Operations Runbook

## Getting Started

1. Copy `.env.example` to `.env` and configure your API keys and tokens.
2. Start the stack: `docker compose up -d`
3. Check the status: `docker compose ps`

## Execution and Automation Workflow

We have provided wrapper scripts in `scripts/` to handle common platform actions safely and consistently. These scripts use the configured artifact, log, and workspace directories mounted into the containers.

### Scripts

- **backup-workspace.sh**: Creates a `.tar.gz` snapshot of your current workspace in `artifacts/` folder. Use before making major file modifications.
- **backup-db.sh**: A mock entry for backing up database state structure. Use before performing a migration or dropping data.
- **deploy-preview.sh**: A script designed to trigger deployments using Vercel/GitHub actions.
- **read-logs.sh**: Fetches recent log outputs from `logs/`.
- **smoke-test.sh**: Validates gateway config, check for open ports, and checks directories.
- **run-browser.sh**: Mock execution to start a Playwright workflow.

## Running Browser Automations and Debugging

The `browser-worker` container uses the official Playwright Docker image for script executions.
Additionally, we provide a **`vnc-debug-browser`** container. This container allows a human operator to watch the AI navigate web applications in real-time, greatly improving debug loops for complex UI interactions. 

- **noVNC Web Viewer:** Access via `http://localhost:6080`
- **Raw VNC Port:** `5900`
- **CDP Debugging Port:** `9222`

Example manual run in the headless worker:
```bash
docker compose exec browser-worker bash scripts/run-browser.sh
```

## MCP Native Toolkit API

The placeholder scripts have been elevated into a proper Model Context Protocol (MCP) server. 
An AI Agent connected to the OpenClaw Gateway or CLI can directly natively call the administration tools over `stdio`. 

To use the scripts natively inside an agent configuration, simply bind:
```json
{
  "command": "node",
  "args": ["scripts/mcp-toolkit.js"]
}
```

## Logs and Artifacts

- **logs/:** Runtime service output should be directed here.
- **artifacts/:** Any large generated files, screenshots, or backups should be saved here. This folder persists across runs.

## Constraints and Safety

- Destructive actions should only be performed once a workspace backup is taken.
- Browser worker currently runs idle and waits for specific tool triggers.
- Ensure API tokens aren't committed to version control.
