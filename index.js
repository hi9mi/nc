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

  len() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const n = this.len();
    return new V2(this.x / n, this.y / n);
  }

  dist(that) {
    return this.sub(that).len();
  }
}

const PLAYER_COLOR = "#f43841";
const PLAYER_RADIUS = 69;
const PLAYER_SPEED = 750;
const TUTORIAL_POPUP_SPEED = 1.7;
const BULLET_RADIUS = 42;
const BULLET_SPEED = 1500;
const BULLET_LIFETIME = 5.0;
const ENEMY_SPEED = PLAYER_SPEED / 3;
const ENEMY_RADIUS = PLAYER_RADIUS;
const ENEMY_COLOR = "#9e95c7";

const directionMap = new Map([
  ["KeyS", new V2(0, 1.0)],
  ["KeyW", new V2(0, -1.0)],
  ["KeyA", new V2(-1.0, 0)],
  ["KeyD", new V2(1.0, 0)],
]);

class Enemy {
  constructor(pos) {
    this.pos = pos;
    this.dead = false;
  }

  update(dt, followPos) {
    const vel = followPos
      .sub(this.pos)
      .normalize()
      .scale(ENEMY_SPEED * dt);
    this.pos = this.pos.add(vel);
  }

  render(context) {
    fillCircle(context, this.pos, ENEMY_RADIUS, ENEMY_COLOR);
  }
}

class Bullet {
  constructor(pos, vel) {
    this.pos = pos;
    this.vel = vel;
    this.lifetime = BULLET_LIFETIME;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.scale(dt));
    this.lifetime -= dt;
  }

  render(context) {
    fillCircle(context, this.pos, BULLET_RADIUS, PLAYER_COLOR);
  }
}

class TutorialPopup {
  constructor(text) {
    this.alpha = 0.0;
    this.dalpha = 0.0;
    this.text = text;
    this.onFadedOut = undefined;
    this.onFadedIn = undefined;
  }

  update(dt) {
    this.alpha += this.dalpha * dt;

    if (this.dalpha < 0.0 && this.alpha < 0.0) {
      this.dalpha = 0.0;
      this.alpha = 0.0;

      if (this.onFadedOut !== undefined) {
        this.onFadedOut();
      }
    } else if (this.dalpha > 0.0 && this.alpha >= 1.0) {
      this.dalpha = 0.0;
      this.alpha = 1.0;

      if (this.onFadedIn !== undefined) {
        this.onFadedIn();
      }
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
    this.dalpha = TUTORIAL_POPUP_SPEED;
  }

  fadeOut() {
    this.dalpha = -TUTORIAL_POPUP_SPEED;
  }
}

const TutorialState = Object.freeze({
  LearningMovement: 0,
  LearningShooting: 1,
  Finished: 2,
});

const TutorialMessages = Object.freeze([
  "WASD to move",
  "Left Mouse Click to shoot",
  "",
]);

class Tutorial {
  constructor() {
    this.state = 0;
    this.popup = new TutorialPopup(TutorialMessages[this.state]);
    this.popup.fadeIn();
    this.popup.onFadedOut = () => {
      this.popup.text = TutorialMessages[this.state];
      this.popup.fadeIn();
    };
  }

  update(dt) {
    this.popup.update(dt);
  }

  render(context) {
    this.popup.render(context);
  }

  playerMoved() {
    if (this.state === TutorialState.LearningMovement) {
      this.popup.fadeOut();
      this.state += 1;
    }
  }

  playerShot() {
    if (this.state === TutorialState.LearningShooting) {
      this.popup.fadeOut();
      this.state += 1;
    }
  }
}

class Game {
  constructor() {
    this.playerPos = new V2(PLAYER_RADIUS + 10, PLAYER_RADIUS + 10);
    this.mousePos = new V2(0, 0);
    this.pressedKeys = new Set();
    this.tutorial = new Tutorial();
    this.bullets = [];
    this.enemies = [];

    this.enemies.push(new Enemy(new V2(800, 600)));
  }

  update(dt) {
    let vel = new V2(0, 0);
    let moved = false;
    for (const key of this.pressedKeys) {
      if (directionMap.has(key)) {
        vel = vel.add(directionMap.get(key).scale(PLAYER_SPEED));
        moved = true;
      }
    }

    if (moved) {
      this.tutorial.playerMoved();
    }

    this.playerPos = this.playerPos.add(vel.scale(dt));

    this.tutorial.update(dt);

    for (const enemy of this.enemies) {
      for (const bullet of this.bullets) {
        if (enemy.pos.dist(bullet.pos) <= BULLET_RADIUS + ENEMY_RADIUS) {
          enemy.dead = true;
          bullet.lifetime = 0.0;
        }
      }
    }

    for (const bullet of this.bullets) {
      bullet.update(dt);
    }
    this.bullets = this.bullets.filter((bullet) => bullet.lifetime > 0.0);

    for (const enemy of this.enemies) {
      enemy.update(dt, this.playerPos);
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
  }

  render(context) {
    const width = context.canvas.width;
    const height = context.canvas.height;

    context.clearRect(0, 0, width, height);
    fillCircle(context, this.playerPos, PLAYER_RADIUS, PLAYER_COLOR);

    for (const bullet of this.bullets) {
      bullet.render(context);
    }

    for (const enemy of this.enemies) {
      enemy.render(context);
    }

    this.tutorial.render(context);
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
    this.tutorial.playerShot();
    const mousePos = new V2(event.offsetX, event.offsetY);
    const bulletVel = mousePos
      .sub(this.playerPos)
      .normalize()
      .scale(BULLET_SPEED);

    this.bullets.push(new Bullet(this.playerPos, bulletVel));
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
