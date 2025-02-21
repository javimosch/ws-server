const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;
const clients = new Map();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to validate origin
app.use((req, res, next) => {
  if (req.path === '/emit') {
    const allowedReferers = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
    const referer = req.get('referer') || req.get('origin') || req.ip; //if no referer we assume trigger was a backend: In that case, grab the IP

    if (allowedReferers.includes('*')) {
      console.log(`Authorized access attempt from referer: ${referer} (whitelisted due to *)`);
      return next();
    } else if (referer && allowedReferers.some(allowed => referer.startsWith(allowed))) {
      console.log(`Authorized access attempt from referer: ${referer} (whitelisted)`);
      return next();
    }

    if (process.env.API_KEY) {
      const authHeader = req.get('Authorization');
      if (!authHeader) {
        console.log(`Unauthorized access attempt: No Authorization header provided`);
        return res.status(401).json({ error: 'Unauthorized - API key required' });
      }

      const apiKey = authHeader.replace('Bearer ', '');
      const validKeys = (process.env.API_KEY||"").split(',');
      if (validKeys.includes(apiKey)) {
        console.log(`Authorized access attempt (API key matched)`);
        return next();
      } else {
        console.log(`Unauthorized access attempt (API key provided but does not match)`);
        return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
      }
    } else {
      console.log(`Unauthorized access attempt (API key not configured)`, {
        allowedReferers
      });
      return res.status(401).json({ error: 'Unauthorized - No API key configured' });
    }
  }

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    connections: clients.size,
    uptime: process.uptime()
  });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substring(7);
  clients.set(clientId, ws);

  console.log(`Client connected with ID: ${clientId}`);

  // Send the clientId to the client
  ws.send(JSON.stringify({ type: 'connection', clientId }));

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    clients.delete(clientId);
  });

  // Handle ping-pong for connection health monitoring
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// RPC endpoint to emit messages to specific clients
app.post('/emit', (req, res) => {
  const { wsClientId, payload } = req.body;

  if (!wsClientId || !payload) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const client = clients.get(wsClientId);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  try {
    client.send(JSON.stringify(payload));
    console.log(`Message sent to client ${wsClientId}:`, payload);
    res.json({ success: true });
  } catch (error) {
    console.error(`Error sending message to client ${wsClientId}:`, error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Connection health monitoring
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
