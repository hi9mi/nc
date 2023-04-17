class V2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(that) {
    return new V2(this.x + that.x, this.y + that.y);
  }

  sub(that) {
    return new V2(this.x - that.x, this.y - that.y);
  }

  scale(scaler) {
    return new V2(this.x * scaler, this.y * scaler);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const n = this.length();
    return new V2(this.x / n, this.y / n);
  }
}

const radius = 69;
const speed = 750;
const BULLET_RADIUS = 42;
const BULLET_SPEED = 1500;

const directionMap = new Map([
  ["KeyS", new V2(0, 1.0)],
  ["KeyW", new V2(0, -1.0)],
  ["KeyA", new V2(-1.0, 0)],
  ["KeyD", new V2(1.0, 0)],
]);

class TutorialPopup {
  constructor(text) {
    this.alpha = 0.0;
    this.dalpha = 0.0;
    this.text = text;
  }

  update(dt) {
    this.alpha += this.dalpha * dt;

    if (this.dalpha < 0.0 && this.alpha < 0.0) {
      this.dalpha = 0.0;
      this.alpha = 0.0;
    } else if (this.dalpha > 0.0 && this.alpha >= 1.0) {
      this.dalpha = 0.0;
      this.alpha = 1.0;
    }
  }

  render(context) {
    const width = context.canvas.width;
    const height = context.canvas.height;

    context.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
    context.font = "30px Lexend Mega";
    context.textAlign = "center";
    context.fillText(this.text, width / 2, height / 2);
  }

  fadeIn() {
    this.dalpha = 1.0;
  }

  fadeOut() {
    this.dalpha = -1.0;
  }
}

class Bullet {
  constructor(pos, vel) {
    this.pos = pos;
    this.vel = vel;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.scale(dt));
  }

  render(context) {
    fillCircle(context, this.pos, BULLET_RADIUS, "red");
  }
}

class Game {
  constructor() {
    this.playerPos = new V2(radius + 10, radius + 10);
    this.mousePos = new V2(0, 0);
    this.pressedKeys = new Set();
    this.popup = new TutorialPopup("WASD to move around");
    this.playerLearntHowToMove = false;
    this.popup.fadeIn();
    this.bullets = new Set();
  }

  update(dt) {
    let vel = new V2(0, 0);
    for (const key of this.pressedKeys) {
      if (directionMap.has(key)) {
        vel = vel.add(directionMap.get(key).scale(speed));
      }
    }

    if (!this.playerLearntHowToMove && vel.length() > 0.0) {
      this.playerLearntHowToMove = true;
      this.popup.fadeOut();
    }

    this.playerPos = this.playerPos.add(vel.scale(dt));

    this.popup.update(dt);

    for (const bullet of this.bullets) {
      bullet.update(dt);
    }
  }

  render(context) {
    const width = context.canvas.width;
    const height = context.canvas.height;

    context.clearRect(0, 0, width, height);
    fillCircle(context, this.playerPos, radius, "red");

    this.popup.render(context);

    for (const bullet of this.bullets) {
      bullet.render(context);
    }
  }

  keyDown(event) {
    this.pressedKeys.add(event.code);
  }

  keyUp(event) {
    this.pressedKeys.delete(event.code);
  }

  mouseMove(event) {
    this.mousePos = new V2(event.screenX, event.screenY);
  }

  mouseDown(event) {
    const mousePos = new V2(event.offsetX, event.offsetY);
    const bulletVel = mousePos
      .sub(this.playerPos)
      .normalize()
      .scale(BULLET_SPEED);

    this.bullets.add(new Bullet(this.playerPos, bulletVel));
  }
}

function fillCircle(context, center, radius, color = "green") {
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, 2 * Math.PI, false);
  context.fillStyle = color;
  context.fill();
}

(() => {
  const canvas = document.getElementById("game");
  const context = canvas.getContext("2d");

  const game = new Game();

  let start;

  function step(timestamp) {
    if (start === undefined) {
      start = timestamp;
    }
    const dt = (timestamp - start) * 0.001;
    start = timestamp;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    game.update(dt);
    game.render(context);

    window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);

  document.addEventListener("keydown", (event) => {
    game.keyDown(event);
  });
  document.addEventListener("keyup", (event) => {
    game.keyUp(event);
  });
  document.addEventListener("mousemove", (event) => {
    game.mouseMove(event);
  });
  document.addEventListener("mousedown", (event) => {
    game.mouseDown(event);
  });
})();
