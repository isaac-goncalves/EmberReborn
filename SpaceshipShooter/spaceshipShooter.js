const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = new WebSocket('ws://localhost:8080');

let playerId = null;
let players = {};

// Player's spaceship
let playerShip = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  width: 40,
  height: 40,
  angle: 0,
  speed: 0,
  acceleration: 0.2,
  maxSpeed: 5,
  friction: 0.98,
  bullets: [],
  color: 'blue',
  health: 100
};

// Handle keys
let keysPressed = {};
document.addEventListener('keydown', (e) => keysPressed[e.key] = true);
document.addEventListener('keyup', (e) => delete keysPressed[e.key]);

// Shoot a bullet
function shootBullet(ship) {
  const bulletSpeed = 6;
  const bullet = {
    x: ship.x + Math.cos(ship.angle) * ship.width / 2,
    y: ship.y + Math.sin(ship.angle) * ship.height / 2,
    angle: ship.angle,
    speed: bulletSpeed,
    exploded: false
  };
  ship.bullets.push(bullet);

  // Send bullet update to the server
  socket.send(JSON.stringify({
    type: 'shoot',
    playerId,
    bullets: ship.bullets
  }));
}

// Move bullets, handle collisions
function moveBullets(ship) {
  for (let i = 0; i < ship.bullets.length; i++) {
    const bullet = ship.bullets[i];
    bullet.x += Math.cos(bullet.angle) * bullet.speed;
    bullet.y += Math.sin(bullet.angle) * bullet.speed;

    if (bullet.exploded || bullet.x <= 0 || bullet.x >= canvas.width || bullet.y <= 0 || bullet.y >= canvas.height) {
      ship.bullets.splice(i, 1); // Remove bullet after it explodes or hits the wall
      i--;
    }
  }
}

// Main game loop
function gameLoop() {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Update player movement
  if (keysPressed['ArrowLeft']) playerShip.angle -= 0.05;
  if (keysPressed['ArrowRight']) playerShip.angle += 0.05;
  if (keysPressed[' ']) {
    playerShip.speed = Math.min(playerShip.speed + playerShip.acceleration, playerShip.maxSpeed);
  } else {
    playerShip.speed *= playerShip.friction;
  }

  playerShip.x += Math.cos(playerShip.angle) * playerShip.speed;
  playerShip.y += Math.sin(playerShip.angle) * playerShip.speed;

  // Wrap spaceship around the canvas
  if (playerShip.x < 0) playerShip.x = canvas.width;
  if (playerShip.x > canvas.width) playerShip.x = 0;
  if (playerShip.y < 0) playerShip.y = canvas.height;
  if (playerShip.y > canvas.height) playerShip.y = 0;

  // Send updated player position to server
  if (playerId) {
    socket.send(JSON.stringify({
      type: 'update',
      playerId,
      playerData: playerShip
    }));
  }

  // Draw all players
  for (const id in players) {
    const ship = players[id];
    drawSpaceship(ship, id);
    moveBullets(ship);

    // Draw bullets
    ship.bullets.forEach(bullet => {
      if (!bullet.exploded) {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw life bar
    drawLifeBar(ship);
  }

  requestAnimationFrame(gameLoop);
}

// Helper function to draw a rounded rectangle
function drawRoundedRect(x, y, width, height, radius, fillColor, borderColor) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  
  // Fill with background color
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  // Draw border
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3; // Adjust border width if needed
    ctx.stroke();
  }
}
// Draw spaceship with white border and rounded corners
function drawSpaceship(ship, playerId) {
    const borderRadius = 10; // Adjust the radius for the rounded corners
    
    ctx.save(); // Save the current context state
  
    // Move to the spaceship's position
    ctx.translate(ship.x, ship.y);
    
    // Rotate the context based on the spaceship's angle
    ctx.rotate(ship.angle);
  
    // Draw the white border with rounded corners around the spaceship
    drawRoundedRect(
      -ship.width / 2 - 5,  // x position (relative to the rotated context)
      -ship.height / 2 - 5, // y position (relative to the rotated context)
      ship.width + 10,       // width (adjusted for the border)
      ship.height + 10,      // height (adjusted for the border)
      borderRadius,          // border radius
      null,                  // no fill color for the border itself
      'white'                // white border color
    );
  
    // Draw the actual spaceship inside the border
    drawRoundedRect(
      -ship.width / 2,       // x position (relative to the rotated context)
      -ship.height / 2,      // y position (relative to the rotated context)
      ship.width,            // width of the spaceship
      ship.height,           // height of the spaceship
      borderRadius,          // border radius
      ship.color,            // fill color of the spaceship
      null                   // no border on the spaceship itself
    );
  
    ctx.restore(); // Restore the original context state (before rotation)
  
    // Draw player indicator (ID) above the spaceship
    drawIndicator(ship, playerId);
  }
// Draw player ID or indicator above the spaceship
function drawIndicator(ship, playerId) {
  ctx.fillStyle = 'white';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  // Draw the player's ID above the ship
  ctx.fillText(playerId, ship.x, ship.y - ship.height / 2 - 10);
}

// Draw life bar
function drawLifeBar(ship) {
  ctx.fillStyle = 'red';
  ctx.fillRect(ship.x - ship.width / 2, ship.y - ship.height - 10, ship.width, 5);
  ctx.fillStyle = 'green';
  ctx.fillRect(ship.x - ship.width / 2, ship.y - ship.height - 10, (ship.health / 100) * ship.width, 5);
}

// WebSocket events
socket.onmessage = async (event) => {
  let message = event.data instanceof Blob ? await event.data.text() : event.data;
  const data = JSON.parse(message);

  if (data.type === 'assignId') {
    playerId = data.playerId;
    playerShip = { ...playerShip, ...data.playerData };
    players[playerId] = playerShip;
  }

  if (data.type === 'playersUpdate') {
    // Sync all player positions
    players = data.players;
  }

  if (data.type === 'playerDisconnected') {
    delete players[data.playerId];
  }
};

// Start game loop
gameLoop();
