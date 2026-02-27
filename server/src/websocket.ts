import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';

let wss: WebSocketServer;

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    console.log('WebSocket client connected');
    ws.on('close', () => console.log('WebSocket client disconnected'));
  });
}

export function broadcast(data: object): void {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
