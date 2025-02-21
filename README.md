# WebSocket Server Microservice

A standalone WebSocket server microservice for handling real-time communication between clients and services.

## Features

- WebSocket server with client ID management
- RPC endpoint for sending messages to specific clients
- IP whitelisting for security (localhost and Docker internal networks)
- Connection health monitoring with ping/pong
- Docker support for easy deployment
- Health check endpoint

## Environment Variables

- `PORT`: Server port (default: 3001)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up --build
```

Or build and run the Docker image directly:

```bash
docker build -t ws-server-app .
docker run -p 3001:3001 ws-server-app
```

## API Endpoints

### POST /emit
Send a message to a specific WebSocket client

Request body:
```json
{
  "wsClientId": "string",
  "payload": {
    "type": "string",
    "data": "any"
  }
}
```

### GET /health
Health check endpoint that returns server status

Response:
```json
{
  "status": "healthy",
  "connections": 0,
  "uptime": 0
}
```

## WebSocket Client Usage

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'connection') {
    // Store the clientId to use with your API calls
    const clientId = data.clientId;
  }
  // Handle other message types
};
```
