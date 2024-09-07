const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 8;
const mapWidth = 80;
const mapHeight = 80;

// Create the map
const map = [];
for (let y = 0; y < mapHeight; y++) {
  map[y] = [];
  for (let x = 0; x < mapWidth; x++) {
    map[y][x] = { type: 'plain', movementCost: 1 };
  }
}

// Function to draw the map
function drawMap() {
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = map[y][x];
      if (tile.type === 'plain') {
        ctx.fillStyle = '#00ff00'; // Green for plains
      } else if (tile.type === 'mountain') {
        ctx.fillStyle = '#808080'; // Gray for mountains
      } else if (tile.type === 'water') {
        ctx.fillStyle = '#0000ff'; // Blue for water
      }
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

drawMap(); // Initial map drawing

// Unit class
class Unit {
  constructor(name, x, y, health, attack, defense, movement) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.health = health;
    this.attack = attack;
    this.defense = defense;
    this.movement = movement; // Number of tiles this unit can move per turn
    this.isPlayer = true; // Default to player unit
  }

  // Draw unit on map
  draw() {
    ctx.fillStyle = this.isPlayer ? 'blue' : 'red'; // Blue for player, red for enemy
    ctx.fillRect(this.x * tileSize, this.y * tileSize, tileSize, tileSize);
  }

  // Show unit stats in the UI
  showStats() {
    const statsDiv = document.getElementById('stats');
    statsDiv.innerHTML = `
      <div class="stat"><strong>Name:</strong> ${this.name}</div>
      <div class="stat"><strong>Health:</strong> ${this.health}</div>
      <div class="stat"><strong>Attack:</strong> ${this.attack}</div>
      <div class="stat"><strong>Defense:</strong> ${this.defense}</div>
      <div class="stat"><strong>Movement:</strong> ${this.movement}</div>
    `;
  }
}

// Player and enemy units
let playerUnit = new Unit('Aric, the Forsaken Knight', 3, 3, 100, 15, 10, 10); // Moves 5 tiles per turn

// Enemy units array
let enemyUnits = [
  new Unit('Orc', 10, 10, 80, 12, 8, 4), // Orc moves 4 tiles per turn
  new Unit('Goblin', 15, 8, 60, 10, 5, 3), // Goblin moves 3 tiles per turn
  new Unit('Troll', 18, 15, 120, 20, 15, 2) // Troll moves 2 tiles per turn
];

// Mark all enemy units as enemies (isPlayer = false)
enemyUnits.forEach(enemy => enemy.isPlayer = false);

// Function to draw both player and all enemies
function drawUnits() {
  playerUnit.draw();
  enemyUnits.forEach(enemy => enemy.draw()); // Draw each enemy
}

// Initial draw and show player stats
drawUnits();
playerUnit.showStats();

// Teleport mechanic for when units reach the edge of the map
function checkTeleport(unit) {
  // Check for X-axis teleportation
  if (unit.x < 0) {
    unit.x = mapWidth - 1; // Teleport to the right edge
  } else if (unit.x >= mapWidth) {
    unit.x = 0; // Teleport to the left edge
  }

  // Check for Y-axis teleportation
  if (unit.y < 0) {
    unit.y = mapHeight - 1; // Teleport to the bottom edge
  } else if (unit.y >= mapHeight) {
    unit.y = 0; // Teleport to the top edge
  }
}

// Movement logic for player and enemy turns
let isPlayerTurn = true;

let keysPressed = {};

// Update movement logic to handle multiple key presses
document.addEventListener('keydown', (event) => {
  keysPressed[event.key] = true; // Mark the key as pressed

  if (isPlayerTurn) {
    let moved = false;
    let movement = playerUnit.movement; // Number of tiles to move per turn

    // Diagonal Up-Left
    if (keysPressed['ArrowUp'] && keysPressed['ArrowLeft']) {
      playerUnit.y -= movement;
      playerUnit.x -= movement;
      moved = true;
    }
    // Diagonal Up-Right
    else if (keysPressed['ArrowUp'] && keysPressed['ArrowRight']) {
      playerUnit.y -= movement;
      playerUnit.x += movement;
      moved = true;
    }
    // Diagonal Down-Left
    else if (keysPressed['ArrowDown'] && keysPressed['ArrowLeft']) {
      playerUnit.y += movement;
      playerUnit.x -= movement;
      moved = true;
    }
    // Diagonal Down-Right
    else if (keysPressed['ArrowDown'] && keysPressed['ArrowRight']) {
      playerUnit.y += movement;
      playerUnit.x += movement;
      moved = true;
    }
    // Single directional movements
    else if (keysPressed['ArrowUp']) {
      playerUnit.y -= movement;
      moved = true;
    } else if (keysPressed['ArrowDown']) {
      playerUnit.y += movement;
      moved = true;
    } else if (keysPressed['ArrowLeft']) {
      playerUnit.x -= movement;
      moved = true;
    } else if (keysPressed['ArrowRight']) {
      playerUnit.x += movement;
      moved = true;
    }

    // If the player moved, handle the post-movement actions
    if (moved) {
      // Check for teleport after movement
      checkTeleport(playerUnit);

      // Redraw the map and units after movement
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawMap();
      drawUnits();
      playerUnit.showStats();
      
      isPlayerTurn = false; // End player's turn
      enemyMove(); // Call enemy movement
    }
  }
});

// Remove keys from tracking when they are released
document.addEventListener('keyup', (event) => {
  delete keysPressed[event.key];
});

// Enemy movement function with diagonal movement support
function enemyMove() {
  enemyUnits.forEach(enemy => {
    let moved = false;
    let movement = enemy.movement; // Use each enemy's movement value

    // Diagonal movement for the enemy
    if (enemy.x < playerUnit.x && enemy.y < playerUnit.y) {
      enemy.x += movement;
      enemy.y += movement;
      moved = true;
    } else if (enemy.x < playerUnit.x && enemy.y > playerUnit.y) {
      enemy.x += movement;
      enemy.y -= movement;
      moved = true;
    } else if (enemy.x > playerUnit.x && enemy.y < playerUnit.y) {
      enemy.x -= movement;
      enemy.y += movement;
      moved = true;
    } else if (enemy.x > playerUnit.x && enemy.y > playerUnit.y) {
      enemy.x -= movement;
      enemy.y -= movement;
      moved = true;
    }
    // Single directional movements if not diagonal
    else if (enemy.x < playerUnit.x) {
      enemy.x += movement;
      moved = true;
    } else if (enemy.x > playerUnit.x) {
      enemy.x -= movement;
      moved = true;
    } else if (enemy.y < playerUnit.y) {
      enemy.y += movement;
      moved = true;
    } else if (enemy.y > playerUnit.y) {
      enemy.y -= movement;
      moved = true;
    }

    // If the enemy moved, check for teleport and update the canvas
    if (moved) {
      // Check for teleport after enemy movement
      checkTeleport(enemy);
    }
  });

  // Redraw map and units after enemy movement
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawUnits();

  isPlayerTurn = true; // Return control to the player
}
