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
  const clientIp = req.ip || req.connection.remoteAddress;
  // Handle IPv6-mapped IPv4 addresses by converting them to IPv4 format
  const ipv4 = clientIp.replace('::ffff:', '');
  const isLocalhost = ipv4 === '127.0.0.1' || clientIp === '::1';
  const isDockerInternal = ipv4.startsWith('172.') || ipv4.startsWith('192.168.');
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
  
  if (!isLocalhost && !isDockerInternal && !allowedOrigins.includes(req.get('origin'))) {
    console.log(`Unauthorized access attempt from IP: ${clientIp}`);
    return res.status(401).json({ error: 'Unauthorized' });
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
