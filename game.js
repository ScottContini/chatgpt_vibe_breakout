const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Sounds
const paddleSound = document.getElementById("paddleSound");
const brickSound = document.getElementById("brickSound");
const loseSound = document.getElementById("loseSound");
const winSound = document.getElementById("winSound");


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

// Game state
let score = 0;
let highScore = localStorage.getItem("breakoutHighScore") || 0;
let startTime = Date.now();
let ballMoving = false;
let soundEnabled = false;

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

function getBrickColor(level) {
  const hue = (level * 40) % 360; // Rotate hue each level
  return `hsl(${hue}, 80%, 60%)`;
}


function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;

        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fillStyle = getBrickColor(level);
        ctx.fill();
        ctx.closePath();
      }
    }
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
            brickSound.currentTime = 0;
            brickSound.play();
          }
          dy = -dy;
          b.status = 0;
          bricksRemaining--;
          score++;
          if (score > highScore) {
            highScore = score;
            localStorage.setItem("breakoutHighScore", highScore);
          }
          if (bricksRemaining === 0) {
            if (soundEnabled)
                winSound.play();
            startNextLevel();
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


// this is to fix a glitch of the ball getting stuck side walls
// code from ChatGPT and honestly I don't trust this, but it does
// make the problem happen a lot less often
function ensureMinimumVelocity() {
  const minSpeed = 1.0;

  if (Math.abs(dx) < minSpeed) {
    dx = dx < 0 ? -minSpeed : minSpeed;
  }
  if (Math.abs(dy) < minSpeed) {
    dy = dy < 0 ? -minSpeed : minSpeed;
  }
}


function draw(delta) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBall();
  drawPaddle();
  drawBricks();
  drawScore();

  // Paddle movement
  if (rightPressed && paddleX < canvas.width - paddleWidth) {
    paddleX += 7;
  } else if (leftPressed && paddleX > 0) {
    paddleX -= 7;
  }

  collisionDetection();

  // Wall collisions
  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
    ensureMinimumVelocity();
  }

  const ballWithinPaddleZone = y + dy > paddleCollisionY && y + dy < paddleCollisionY + paddleHeight;

  if (y + dy < ballRadius) {
    dy = -dy;
    ensureMinimumVelocity();
  } else if (ballWithinPaddleZone) {
    // Paddle collision
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
      ensureMinimumVelocity();
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

  if (!ballMoving) {
    if (Date.now() - startTime >= startDelay) {
      ballMoving = true;
    }
  }

  if (ballMoving) {
    x += dx * (delta / 10.0);
    y += dy * (delta / 10.0);
  }

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
  ballMoving = false;

}


function resetGame() {
  x = canvas.width / 2;
  y = canvas.height - 100;
  dx = 2;
  dy = -2;
  paddleX = (canvas.width - paddleWidth) / 2;
  startTime = Date.now();
  ballMoving = false;
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


