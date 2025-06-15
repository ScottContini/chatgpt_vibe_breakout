const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const paddleSound = document.getElementById("paddleSound");
const brickSound = document.getElementById("brickSound");
const loseSound = document.getElementById("loseSound");
const winSound = document.getElementById("winSound");


// Brick settings
const brickRowCount = 5;
const brickColumnCount = 7;
const brickWidth = 55;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 35;

let score = 0;

const startDelay = 2000; // 2000 ms = 2 seconds pause
let startTime = Date.now();
let ballMoving = false;


// Brick data structure (2D array)
const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    bricks[c][r] = { x: 0, y: 0, status: 1 }; // status: 1 = visible, 0 = broken
  }
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
        ctx.fillStyle = "#ff6347"; // tomato red
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
          score++;
          if (score === brickRowCount * brickColumnCount) {
            winSound.play();
            alert("YOU WIN!");
            resetGame();
          }
        }
      }
    }
  }
}



// Paddle variables
const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

// Ball variables
let ballRadius = 10;
let x = canvas.width / 2;
let y = canvas.height - 100;
let dx = 2;
let dy = -2;

// Input tracking
let rightPressed = false;
let leftPressed = false;

// Event listeners
document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
canvas.addEventListener("mousemove", mouseMoveHandler, false);
let soundEnabled = false;
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
  ctx.fillRect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
}

function draw() {
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
  }

  if (y + dy < ballRadius) {
    dy = -dy;
  } else if (y + dy > canvas.height - paddleHeight) {
    // Paddle collision
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
      if (soundEnabled) {
        paddleSound.currentTime = 0;
        paddleSound.play();
      }
    } else {
      // Game over (reset)
      loseSound.play();
      alert("Game Over");
      resetGame();
    }
  }

  if (!ballMoving) {
    if (Date.now() - startTime >= startDelay) {
      ballMoving = true;
    }
  }

  if (ballMoving) {
    x += dx;
    y += dy;
  }

}


function drawScore() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Score: " + score, 8, 20);
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

  // Reset bricks
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r].status = 1;
    }
  }
}


setInterval(draw, 10);

