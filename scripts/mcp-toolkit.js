#!/usr/bin/env node

/**
 * OpenClaw Native MCP Toolkit API
 * Exposes bash administration scripts as Model Context Protocol (MCP) tools.
 * Communication runs via standard input/output (stdio JSON-RPC),
 * allowing OpenClaw to natively call these tools.
 */

import { execFile } from 'child_process';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The list of exposed operations corresponding to our secure bash wrappers
const TOOLS = [
  { name: 'backup-workspace', description: 'Safely backup the workspace directory before a risky operation', args: ['checkpoint_name'] },
  { name: 'backup-db', description: 'Perform a non-destructive database backup checkpoint', args: [] },
  { name: 'deploy-preview', description: 'Trigger a preview deployment (placeholder script)', args: [] },
  { name: 'read-logs', description: 'Read recent system logs for debugging', args: [] },
  { name: 'smoke-test', description: 'Run basic health checks and directory validation', args: [] },
  { name: 'screenshot-evidence', description: 'Capture UI screenshot of a URL and save to artifacts', args: ['url'] }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function handleListTools(requestId) {
  const toolsList = TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: {
      type: 'object',
      properties: t.args.reduce((acc, arg) => {
        acc[arg] = { type: 'string' };
        return acc;
      }, {}),
    }
  }));

  sendResponse(requestId, { tools: toolsList });
}

function handleCallTool(requestId, name, parameters) {
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) {
    sendError(requestId, -32601, `Tool not found: ${name}`);
    return;
  }

  // Scripts are located in the same directory as this node file (in /usr/local/share/scripts mounted)
  const scriptPath = path.join(__dirname, `${name}.sh`);
  const args = tool.args.map(arg => parameters[arg] || '');

  execFile(scriptPath, args, (error, stdout, stderr) => {
    const textOutput = `--- STDOUT ---\n${stdout}\n--- STDERR ---\n${stderr}`;
    sendResponse(requestId, {
      content: [{ type: 'text', text: textOutput }],
      isError: !!error
    });
  });
}

function sendResponse(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function sendError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
}

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const message = JSON.parse(line);
    const { method, params, id } = message;

    if (method === 'tools/list') {
      handleListTools(id);
    } else if (method === 'tools/call') {
      handleCallTool(id, params.name, params.arguments || {});
    } else if (method === 'initialize') {
      // Basic MCP initialization response
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "openclaw-native-toolkit", version: "1.0.0" }
      });
    } else {
      // Ignore unsupported methods gracefully
      if (id) sendError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    // Malformed JSON is ignored over raw stdio parsing here
  }
});
