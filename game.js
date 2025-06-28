const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bgImage = new Image();
bgImage.src = "galaxy.png";


brickTexture.onload = function () {
  brickPattern = ctx.createPattern(brickTexture, 'repeat');
};



canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
const BASE_WIDTH = 480;
const BASE_HEIGHT = 360;
const scaleX = canvas.width / BASE_WIDTH;
const scaleY = canvas.height / BASE_HEIGHT;


let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let brickBuffer = null;


// Sounds
const paddleSound = document.getElementById("paddleSound");
const loseSound = document.getElementById("loseSound");
const winSound = document.getElementById("winSound");
const failSound = document.getElementById("failSound");

fetch("sounds/brick.wav")
  .then(response => response.arrayBuffer())
  .then(data => audioCtx.decodeAudioData(data))
  .then(buffer => {
    brickBuffer = buffer;
    console.log("Brick sound loaded");
  })
  .catch(err => console.error("Failed to load brick sound:", err));

// Game settings
let level = 1;
const brickRowCount = 5;
const brickColumnCount = 7;
let bricksRemaining = brickRowCount*brickColumnCount;
const bricks = [];
const baseBrickPadding = 10;
const brickPadding = baseBrickPadding * scaleX;
const brickWidth = (canvas.width - (brickColumnCount - 1) * brickPadding - 2 * brickPadding) / brickColumnCount;
const brickHeight = 20 * scaleY
const brickOffsetTop = 30;
const totalBricksWidth = brickColumnCount * brickWidth + (brickColumnCount - 1) * brickPadding;
const brickOffsetLeft = (canvas.width - totalBricksWidth) / 2;
const paddleHeight = 10 * scaleY;
const paddleWidth = 55 * scaleX;
const paddleMarginBottom = paddleHeight * 2;
const paddleY = canvas.height - paddleHeight - paddleMarginBottom;
const paddleCollisionY = canvas.height - paddleMarginBottom - paddleHeight;
const ballRadius = 8 * (scaleX + scaleY) / 2;
const startDelay = 2000; // 2000 ms = 2 seconds pause
let messageText = "";
let messageTimer = 0;
const messageFadeDuration = 120; // in frames (2 seconds)
const messageFadeDelay = 60; // show fully opaque for first messageFadeDelay frames
let gameStarted = false;
let lives = 3;





// Game state
let score = 0;
let highScore = localStorage.getItem("breakoutHighScore") || 0;
let startTime = Date.now();
let soundEnabled = false;
let gameState = 'playing'; // 'playing', 'waiting', 'paused'


// Ball variables
let x = canvas.width * (0.4 + Math.random() * 0.2);
let y = canvas.height - 100;
let dx = 2 * scaleX;
let dy = -2 * scaleY

let paddleX = (canvas.width - paddleWidth) / 2;

// Input tracking
let rightPressed = false;
let leftPressed = false;

// Make our bricks a bit bumpy
function generateBumpyRect(x, y, width, height) {
  const path = new Path2D();
  const bumpiness = 3; // pixel variation
  const segments = 4; // number of segments per edge

  // Top edge
  path.moveTo(x, y + Math.random() * bumpiness);
  for (let i = 1; i <= segments; i++) {
    const px = x + (i * width) / segments;
    const py = y + Math.random() * bumpiness;
    path.lineTo(px, py);
  }

  // Right edge
  for (let i = 1; i <= segments; i++) {
    const px = x + width + Math.random() * bumpiness;
    const py = y + (i * height) / segments;
    path.lineTo(px, py);
  }

  // Bottom edge
  for (let i = 1; i <= segments; i++) {
    const px = x + width - (i * width) / segments;
    const py = y + height - Math.random() * bumpiness;
    path.lineTo(px, py);
  }

  // Left edge
  for (let i = 1; i <= segments; i++) {
    const px = x - Math.random() * bumpiness;
    const py = y + height - (i * height) / segments;
    path.lineTo(px, py);
  }

  path.closePath();
  return path;
}



function initBricks() {
  // Brick data structure (2D array)
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
      const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;

      bricks[c][r] = {
        x: brickX,
        y: brickY,
        status: 1,
        shapePath: generateBumpyRect(brickX, brickY, brickWidth, brickHeight)
      };
    }
  }
  bricksRemaining = brickRowCount*brickColumnCount;
}




function drawBricks() {
  const textureImg = document.getElementById("brickTexture");

  // Ensure texture is loaded
  if (!textureImg.complete) {
    textureImg.onload = () => drawBricks();
    return;
  }

  const pattern = ctx.createPattern(textureImg, "repeat");
  const hue = (level * 34) % 360;

  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (bricks[c][r].status === 1) {

        const lightness = 75 - r * 7;
        const overlayColor = `hsla(${hue}, 80%, ${lightness}%, 0.6)`;

        ctx.save();
        ctx.fillStyle = pattern;
        ctx.fill(b.shapePath);
        ctx.restore();

        ctx.fillStyle = overlayColor;
        ctx.fill(b.shapePath);

      }
    }
  }
}




function lightenColor(hsl, amount) {
  const match = hsl.match(/^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/);
  if (!match) return hsl; // fallback

  let [_, h, s, l] = match.map(Number);
  l = Math.min(100, l + amount);
  return `hsl(${h}, ${s}%, ${l}%)`;
}


// Particle effect for disintegrating bricks
const particles = [];
const trailParticles = [];



function createParticles(brick, hue) {
  const particleCount = 10;
  const brickCenterX = brick.x + brickWidth / 2;
  const brickCenterY = brick.y + brickHeight / 2;

  for (let i = 0; i < particleCount; i++) {
    const hueVariation = hue + (Math.random() * 20 - 10); // ±10 degrees
    const lightness = 60 + Math.random() * 20; // lighter glow
    const alpha = 0.6 + Math.random() * 0.3; // some transparency

    particles.push({
      x: brickCenterX,
      y: brickCenterY,
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      life: 30,
      color: `hsla(${hueVariation}, 100%, ${lightness}%, ${alpha})`,
      size: 2 + Math.random() * 2
    });
  }
}



function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.life -= 1;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;

    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;  // glow size

    ctx.fill();
    ctx.closePath();

    ctx.shadowBlur = 0; // reset for next draw
    ctx.shadowColor = "transparent";

    p.x += p.dx;
    p.y += p.dy;
    p.life--;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}


function playBrickSoundWithPitch(row) {
  if (!brickBuffer || !soundEnabled) return;

  const source = audioCtx.createBufferSource();
  source.buffer = brickBuffer;

  const maxPitch = 1.6;
  const pitch = maxPitch - row * 0.15;
  source.playbackRate.value = Math.max(0.7, pitch);  // Clamp to avoid extremes

  source.connect(audioCtx.destination);

  if (audioCtx.state === "suspended") {
    audioCtx.resume().then(() => source.start());
  } else {
    source.start();
  }
}


function collisionDetection() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        if (
          x > b.x &&
          x < b.x + brickWidth &&
          y > b.y &&
          y < b.y + brickHeight
        ) {
          if (soundEnabled) {
            playBrickSoundWithPitch(r);
          }
          dy = -dy;
          b.status = 0;
          let hue = (level * 34) % 360;
          createParticles(b, hue);
          bricksRemaining--;
          score = score + 5 - r;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem("breakoutHighScore", highScore);
          }
          if (bricksRemaining === 0) {
            if (soundEnabled) {
                winSound.currentTime = 0;
                winSound.play();
            }
            messageText = `Level ${level} Complete!`;
            messageTimer = messageFadeDuration;
            gameState = 'paused';
            setTimeout(() => {
              startNextLevel();
            }, 2000);
          }
        }
      }
    }
  }
}





// Event listeners
document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("mousemove", mouseMoveHandler);
document.addEventListener("keydown", () => {
  soundEnabled = true;
});
document.addEventListener("click", () => {
  soundEnabled = true;
});
window.addEventListener('load', () => {
  const intro = document.getElementById("introScreen");
  intro.style.opacity = '0';
  setTimeout(() => {
    intro.style.opacity = '1';
  }, 50); // slight delay so transition applies
});

canvas.addEventListener("touchstart", handleTouchMove, { passive: false });
canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

document.getElementById("startButton").addEventListener("click", () => {
  const intro = document.getElementById("introScreen");
  intro.style.opacity = '0';

  setTimeout(() => {
    intro.style.display = 'none';
    gameStarted = true;
    requestAnimationFrame((timeStamp) => {
      lastTime = timeStamp;
      gameLoop(timeStamp);
    });
  }, 800); // matches transition time
});



// Support for mobile devices
function handleTouchMove(e) {
  e.preventDefault();

  if (e.touches.length > 0) {
    const touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;

    if (touchX > 0 && touchX < canvas.width) {
      paddleX = touchX - paddleWidth / 2;

      // Keep paddle inside bounds
      paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, paddleX));
    }
  }
  soundEnabled = true;
}



function mouseMoveHandler(e) {
  // Get mouse X relative to the canvas
  soundEnabled = true;
  const relativeX = e.clientX - canvas.getBoundingClientRect().left;

  if (relativeX > 0 && relativeX < canvas.width) {
    paddleX = relativeX - paddleWidth / 2;

    // Keep paddle inside the canvas boundaries
    if (paddleX < 0) {
      paddleX = 0;
    } else if (paddleX > canvas.width - paddleWidth) {
      paddleX = canvas.width - paddleWidth;
    }
  }
}

function keyDownHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = true;
  }
}

function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = false;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = false;
  }
}

function drawBall() {
  const texture = document.getElementById("ballTexture");

  // Create a circular clip for the ball shape
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // Fill the ball area with the texture
  ctx.drawImage(texture, x - ballRadius, y - ballRadius, ballRadius * 2, ballRadius * 2);

  ctx.restore();

  // Optional: add a subtle highlight overlay for extra shine
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, ballRadius);
  gradient.addColorStop(0, "rgba(255,255,255,0.4)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fill();
}



function drawPaddle() {
  const paddleImage = document.getElementById("paddleTexture");

  // Create a repeating pattern from the image
  const pattern = ctx.createPattern(paddleImage, "repeat");

  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(paddleX, paddleY, paddleWidth, paddleHeight);
  } else {
    // fallback in case the image isn't loaded yet
    ctx.fillStyle = "#0095DD";
    ctx.fillRect(paddleX, paddleY, paddleWidth, paddleHeight);
  }
}


// This will output any messaging that appears on the screen during the game
function gameMessaging() {
  if (messageTimer > 0) {
    let alpha = 1;

    if (messageTimer < (messageFadeDuration - messageFadeDelay)) {
      const fadeRatio = messageTimer / (messageFadeDuration - messageFadeDelay);
      alpha = Math.max(0, fadeRatio);
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.fillText(messageText, canvas.width / 2, canvas.height / 2);

    if (gameState === 'gameover') {
      ctx.font = "20px Arial";
      ctx.fillStyle = "#00ff00";
      ctx.fillText("Tap or click to play again", canvas.width / 2, canvas.height / 2 + 40);
    }

    ctx.globalAlpha = 1.0;
    if (gameState !== 'gameover') {
      messageTimer--;
    }
  }
}


function loseLife() {
    lives--;
    if (lives <= 0) {
      // game over
      if (soundEnabled) {
        loseSound.currentTime = 0;
        loseSound.play();
      }
      messageText = "Game Over";
      messageTimer = 9999;
      gameState = 'gameover';
    } else {
      // still have lives left
      if (soundEnabled) {
        failSound.currentTime = 0;
        failSound.play();
      }
      messageText = "Life Lost";
      messageTimer = 120;
      x = canvas.width * (0.4 + Math.random() * 0.2);
      y = canvas.height - 100;
      dy = -Math.abs(dy);  // Make it go up upon restart so user has a chance
      paddleX = (canvas.width - paddleWidth) / 2;
      gameState = 'waiting';
      startTime = Date.now();
    }
}

function drawParticleTrails() {

  // Emit a trail particle
  trailParticles.push({
    x: x,
    y: y,
    alpha: 1,
    size: 3 + Math.random() * 2,
    dx: (Math.random() - 0.5) * 0.5,
    dy: (Math.random() - 0.5) * 0.5
  });

  // Update and draw trail particles
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const p = trailParticles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.alpha -= 0.02;
    p.size *= 0.96;

    if (p.alpha <= 0 || p.size <= 0.5) {
      trailParticles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = "#ffffaa";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
  }

}

function draw(delta) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

  drawPaddle();
  drawBricks();
  updateParticles();
  drawParticles();
  drawScore();
  drawParticleTrails();

  if (gameState === 'playing')
    drawBall();
  if (gameState === 'waiting') {
    if (Date.now() - startTime >= startDelay) {
      gameState = 'playing';
    }
    drawBall();
}


  // Paddle movement
  if (rightPressed && paddleX < canvas.width - paddleWidth) {
    paddleX += 7;
  } else if (leftPressed && paddleX > 0) {
    paddleX -= 7;
  }

  collisionDetection();

  // Wall collisions
  if (x + dx > canvas.width - ballRadius) 
    // too far to the right
    dx = - Math.abs(dx);
  else if (x + dx < ballRadius)
    // too far to the left
    dx = Math.abs(dx);

  const ballWithinPaddleZone = y + dy > paddleCollisionY && y + dy < paddleCollisionY + paddleHeight;

  if (y + dy < ballRadius) {
    dy = Math.abs(dy);
  } else if (ballWithinPaddleZone) {
    // Paddle collision
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -Math.abs(dy);
      if (soundEnabled) {
        paddleSound.currentTime = 0;
        paddleSound.play();
      }
    }
  } else if (y + dy > canvas.height && gameState !== 'gameover') {
    loseLife();
  }

  if (gameState === 'playing') {
    x += dx * (delta / 10.0);
    y += dy * (delta / 10.0);
  }

  gameMessaging();
}



function drawScore() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffffff";

  const w = canvas.width;

  // Score (left)
  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 8, 20);

  // Lives (25%)
  ctx.fillText("Lives: " + lives, w * 0.25, 20);

  // Level (50%)
  ctx.fillText("Level: " + level, w * 0.5, 20);

  // High Score (75%)
  ctx.fillText("High Score: " + highScore, w * 0.75, 20);
}



function startNextLevel() {
  // Increase ball speed slightly
  dx *= 1.1;
  dy *= 1.1;
  // always make the ball go upward at the start so player has a chance
  if (dy > 0)
    dy = -dy

  // Reset ball and paddle
  x = canvas.width * (0.4 + Math.random() * 0.2);
  y = canvas.height - 120;
  paddleX = (canvas.width - paddleWidth) / 2;

  initBricks();

  level++;
  startTime = Date.now();
  gameState = 'waiting';

  messageText = `Level ${level}`;
  messageTimer = 120;

}


function resetGame() {
  messageText = "";
  messageTimer = 0;

  x = canvas.width * (0.4 + Math.random() * 0.2);
  y = canvas.height - 100;
  dx = 2 * scaleX;
  dy = -2 * scaleY
  paddleX = (canvas.width - paddleWidth) / 2;
  gameState = 'waiting';
  startTime = Date.now();
  score = 0;
  level = 1;
  lives = 3;

  // Reset bricks
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r].status = 1;
    }
  }
  bricksRemaining = brickRowCount * brickColumnCount;
}


function playSound(sound) {
  sound.pause();
  sound.currentTime = 0;
  sound.play().catch((e) => {
    // Safari might reject play if user hasn't interacted
    console.warn("Audio play blocked:", e.message);
  });
}


let lastTime = 0;

initBricks();

function gameLoop(timeStamp) {
  if (!gameStarted) return;

  const delta = Math.min(timeStamp - lastTime, 30);
  lastTime = timeStamp;
  draw(delta);
  requestAnimationFrame(gameLoop);
}


// Start the loop this way:
requestAnimationFrame((timeStamp) => {
  lastTime = timeStamp;
  gameLoop(timeStamp);
});


canvas.addEventListener("click", () => {
  if (gameState === 'gameover') {
    resetGame();
  }
});

canvas.addEventListener("touchstart", () => {
  if (gameState === 'gameover') {
    resetGame();
  }
}, { passive: true });



