const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let brickBuffer = null;


// Sounds
const paddleSound = document.getElementById("paddleSound");
const loseSound = document.getElementById("loseSound");
const winSound = document.getElementById("winSound");

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
const brickWidth = 55;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 35;
const paddleHeight = 10;
const paddleWidth = 75;
const paddleMarginBottom = paddleHeight * 2;
const paddleY = canvas.height - paddleHeight - paddleMarginBottom;
const paddleCollisionY = canvas.height - paddleMarginBottom - paddleHeight;
const ballRadius = 10;
const startDelay = 2000; // 2000 ms = 2 seconds pause
let messageText = "";
let messageTimer = 0;
const messageFadeDuration = 120; // in frames (2 seconds)
const messageFadeDelay = 60; // show fully opaque for first messageFadeDelay frames


// Game state
let score = 0;
let highScore = localStorage.getItem("breakoutHighScore") || 0;
let startTime = Date.now();
let soundEnabled = false;
let gameState = 'playing'; // 'playing', 'waiting', 'paused'


// Ball variables
let x = canvas.width / 2;
let y = canvas.height - 100;
let dx = 2;
let dy = -2;

let paddleX = (canvas.width - paddleWidth) / 2;

// Input tracking
let rightPressed = false;
let leftPressed = false;

// Brick data structure (2D array)
const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    bricks[c][r] = { x: 0, y: 0, status: 1 }; // status: 1 = visible, 0 = broken
  }
}



function drawBricks() {
  const hue = (level * 34) % 360;

  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;

        const lightness = 65 - r * 7;

        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`;
        ctx.fill();
        ctx.closePath();
      }
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
          bricksRemaining--;
          score = score + 5 - r;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem("breakoutHighScore", highScore);
          }
          if (bricksRemaining === 0) {
            if (soundEnabled)
                winSound.play();
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
document.body.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
document.body.addEventListener("touchmove", e => e.preventDefault(), { passive: false });


// Support for mobile devices
function handleTouchMove(e) {
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
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff"; // White ball
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.fillStyle = "#0095DD";
  ctx.fillRect(paddleX, paddleY, paddleWidth, paddleHeight);
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
    ctx.globalAlpha = 1.0;

    messageTimer--;
  }
}

function draw(delta) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawPaddle();
  drawBricks();
  drawScore();
  if (gameState === 'playing' || gameState === 'waiting')
    drawBall();

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
  } else if (y + dy > canvas.height) {
      // Game over (reset)
      loseSound.play();
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("breakoutHighScore", highScore);
      }
      setTimeout(() => {
        alert("Game Over");
      }, 100);
      resetGame();
  }

  if (gameState === 'waiting') {
    if (Date.now() - startTime >= startDelay) {
      gameState = 'playing';
    }
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

  ctx.textAlign = "left";
  ctx.fillText("Score: " + score, 8, 20);

  ctx.textAlign = "right";
  ctx.fillText("High Score: " + highScore, canvas.width - 8, 20);

  ctx.textAlign = "center";
  ctx.fillText("Level: " + level, canvas.width / 2, 20);
}



function startNextLevel() {
  // Increase ball speed slightly
  dx *= 1.1;
  dy *= 1.1;
  // always make the ball go upward at the start so player has a chance
  if (dy > 0)
    dy = -dy

  // Reset ball and paddle
  x = canvas.width / 2;
  y = canvas.height - 120;
  paddleX = (canvas.width - paddleWidth) / 2;

  // Reset brick statuses
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r].status = 1;
    }
  }

  level++;
  bricksRemaining = brickRowCount*brickColumnCount;
  startTime = Date.now();
  gameState = 'waiting';

  messageText = `Level ${level}`;
  messageTimer = 120;

}


function resetGame() {
  x = canvas.width / 2;
  y = canvas.height - 100;
  dx = 2;
  dy = -2;
  paddleX = (canvas.width - paddleWidth) / 2;
  gameState = 'waiting';
  startTime = Date.now(); // start the countdown again
  score = 0;
  level = 1;

  // Reset bricks
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r].status = 1;
    }
  }
  bricksRemaining = brickRowCount*brickColumnCount;
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

function gameLoop(timeStamp) {
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



