const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let players = {};

// Synchronization interval in milliseconds (e.g., 33ms for ~30 frames per second)
const SYNC_INTERVAL = 33;

wss.on('connection', (ws) => {
  const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;
  const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

  // Initialize new player with random position and color
  players[playerId] = {
    x: Math.random() * 500 + 100,
    y: Math.random() * 500 + 100,
    angle: 0,
    bullets: [],
    color: randomColor,
    health: 100
  };

  // Send initial data to the player who connected
  ws.send(JSON.stringify({ type: 'assignId', playerId, playerData: players[playerId] }));

  // Broadcast to all players the updated list of players
  broadcastPlayersUpdate();

  // Handle incoming messages from players
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'update') {
      players[data.playerId] = data.playerData;
    }
    if (data.type === 'shoot') {
      players[data.playerId].bullets = data.bullets;
    }

    // Broadcast the player's action to other clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  // Handle player disconnect
  ws.on('close', () => {
    delete players[playerId];
    broadcastPlayerDisconnected(playerId);
  });
});

// Broadcast all players' positions to every connected client
function broadcastPlayersUpdate() {
  const data = {
    type: 'playersUpdate',
    players
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Broadcast when a player disconnects
function broadcastPlayerDisconnected(playerId) {
  const data = {
    type: 'playerDisconnected',
    playerId
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Sync loop to periodically broadcast all players' state
setInterval(() => {
  broadcastPlayersUpdate();
}, SYNC_INTERVAL);

console.log('WebSocket server is running on ws://localhost:8080');