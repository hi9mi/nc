function lerp(a, b, t) {
  return a + (b - a) * t;
}

class Color {
  constructor(r, g, b, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  toString() {
    return `rgba(${this.r * 255},${this.g * 255},${this.b * 255}, ${this.a})`;
  }

  grayScale(t = 1.0) {
    const x = (this.r + this.g + this.b) / 3;

    return new Color(
      lerp(this.r, x, t),
      lerp(this.g, x, t),
      lerp(this.b, x, t),
      this.a
    );
  }

  withAlpha(a) {
    return new Color(this.r, this.g, this.b, a);
  }

  invert() {
    return new Color(1.0 - this.r, 1.0 - this.g, 1.0 - this.b, this.a);
  }

  static hex(hexcolor) {
    const matches = hexcolor.match(/#([0-9a-z]{2})([0-9a-z]{2})([0-9a-z]{2})/i);

    if (matches) {
      const [, r, g, b] = matches;

      return new Color(
        parseInt(r, 16) / 255,
        parseInt(g, 16) / 255,
        parseInt(b, 16) / 255
      );
    } else {
      throw new Error(`Invalid hex color: ${hexcolor}`);
    }
  }
}

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

  static polar(mag, dir) {
    return new V2(Math.cos(dir) * mag, Math.sin(dir) * mag);
  }
}

let grayness = 0.0;

function fillCircle(context, center, radius, color) {
  context.fillStyle = color.grayScale(grayness).toString();
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, 2 * Math.PI, false);

  context.fill();
}

function fillRect(context, x, y, w, h, color) {
  context.fillStyle = color.grayScale(grayness).toString();
  context.fillRect(x, y, w, h);
}

function fillMessage(
  context,
  text,
  color,
  params = {
    x: context.canvas.width / 2,
    y: context.canvas.height / 2,
    maxWidth: context.canvas.width / 2,
    lineHeight: 50,
    fontSize: 30,
    textAlign: "center",
  }
) {
  let { x, y, maxWidth, lineHeight, fontSize, textAlign } = params;
  context.fillStyle = color.toString();
  context.font = `${fontSize}px Lexend Mega`;
  context.textAlign = textAlign;

  let words = text.split(" ");
  let line = "";
  let testLine = "";
  let lineArray = [];

  for (let n = 0; n < words.length; n++) {
    testLine += `${words[n]} `;
    let metrics = context.measureText(testLine);
    let testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      lineArray.push([line, x, y]);

      y += lineHeight;

      line = `${words[n]} `;
      testLine = `${words[n]} `;
    } else {
      line += `${words[n]} `;
    }
    if (n === words.length - 1) {
      lineArray.push([line, x, y]);
    }
  }

  lineArray.forEach(([text, x, y]) => {
    context.fillText(text, x, y);
  });
}

const PLAYER_COLOR = Color.hex("#f43841");
const PLAYER_RADIUS = 69;
const PLAYER_SPEED = 750;
const PLAYER_MAX_HP = 100;
const HP_BAR_HEIGHT = 7;
const LIFE_STEAL = PLAYER_MAX_HP / 10;
const TUTORIAL_POPUP_SPEED = 1.7;
const BULLET_RADIUS = 42;
const BULLET_SPEED = 1500;
const BULLET_LIFETIME = 5.0;
const ENEMY_SPEED = PLAYER_SPEED / 3;
const ENEMY_RADIUS = PLAYER_RADIUS;
const ENEMY_COLOR = Color.hex("#9e95c7");
const ENEMY_SPAWN_COOLDOWN = 1.0;
const ENEMY_SPAWN_DISTANCE = 1500.0;
const ENEMY_DAMAGE = PLAYER_MAX_HP / 5;
const ENEMY_KILL_SCORE = 100;
const PARTICLES_COUNT = 50;
const PARTICLE_RADIUS = 10.0;
const PARTICLE_MAG = BULLET_SPEED;
const PARTICLE_LIFETIME = 1.0;
const MESSAGE_COLOR = Color.hex("#ffffff");
const LS_BEST_SCORE_KEY = "best_score";

const directionMap = new Map([
  ["KeyS", new V2(0, 1.0)],
  ["KeyW", new V2(0, -1.0)],
  ["KeyA", new V2(-1.0, 0)],
  ["KeyD", new V2(1.0, 0)],
]);

class Particle {
  constructor(pos, vel, lifetime, radius, color) {
    this.pos = pos;
    this.vel = vel;
    this.lifetime = lifetime;
    this.radius = radius;
    this.color = color;
  }

  update(dt) {
    this.pos = this.pos.add(this.vel.scale(dt));
    this.lifetime -= dt;
  }

  render(context) {
    const a = this.lifetime / PARTICLE_LIFETIME;
    fillCircle(context, this.pos, this.radius, this.color.withAlpha(a));
  }
}

function particleBurst(particles, center, color) {
  const N = Math.random() * PARTICLES_COUNT;
  for (let i = 0; i < N; i++) {
    particles.push(
      new Particle(
        center,
        V2.polar(Math.random() * PARTICLE_MAG, Math.random() * 2 * Math.PI),
        Math.random() * PARTICLE_LIFETIME,
        Math.random() * PARTICLE_RADIUS + 10.0,
        color
      )
    );
  }
}

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

      this.onFadedOut?.();
    } else if (this.dalpha > 0.0 && this.alpha >= 1.0) {
      this.dalpha = 0.0;
      this.alpha = 1.0;

      this.onFadedIn?.();
    }
  }

  render(context) {
    fillMessage(context, this.text, MESSAGE_COLOR.withAlpha(this.alpha));
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

function renderEntities(context, entities) {
  for (const entity of entities) {
    entity.render(context);
  }
}

class Player {
  hp = PLAYER_MAX_HP;

  constructor(pos) {
    this.pos = pos;
  }

  render(context) {
    if (this.hp > 0.0) {
      fillCircle(context, this.pos, PLAYER_RADIUS, PLAYER_COLOR);
    }
  }

  update(dt, vel) {
    this.pos = this.pos.add(vel.scale(dt));
  }

  shootAt(target) {
    const bulletDir = target.sub(this.pos).normalize();
    const bulletVel = bulletDir.scale(BULLET_SPEED);
    const bulletPos = this.pos.add(
      bulletDir.scale(PLAYER_RADIUS + BULLET_RADIUS)
    );

    return new Bullet(bulletPos, bulletVel);
  }

  damage(value) {
    this.hp = Math.max(this.hp - value, 0.0);
  }

  heal(value) {
    this.hp = Math.min(this.hp + value, PLAYER_MAX_HP);
  }
}

class Game {
  player = new Player(new V2(PLAYER_RADIUS + 100, PLAYER_RADIUS + 100));
  mousePos = new V2(0, 0);
  pressedKeys = new Set();
  tutorial = new Tutorial();
  bullets = [];
  enemies = [];
  particles = [];
  enemySpawnRate = ENEMY_SPAWN_COOLDOWN;
  enemySpawnCooldown = this.enemySpawnRate;
  paused = false;
  score = 0;

  update(dt) {
    if (this.paused) {
      grayness = 1.0;
      return;
    } else {
      grayness = 1.0 - this.player.hp / PLAYER_MAX_HP;
    }

    if (this.player.hp <= 0.0) {
      dt /= 50;
    }

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

    this.player.update(dt, vel);

    this.tutorial.update(dt);

    for (const enemy of this.enemies) {
      if (!enemy.dead) {
        for (const bullet of this.bullets) {
          if (enemy.pos.dist(bullet.pos) <= BULLET_RADIUS + ENEMY_RADIUS) {
            this.score += ENEMY_KILL_SCORE;
            let bestScore = localStorage.getItem(LS_BEST_SCORE_KEY);

            if (bestScore) {
              bestScore = Math.max(JSON.parse(bestScore), this.score);
              localStorage.setItem(
                LS_BEST_SCORE_KEY,
                JSON.stringify(bestScore)
              );
            } else {
              localStorage.setItem(
                LS_BEST_SCORE_KEY,
                JSON.stringify(this.score)
              );
            }

            this.player.heal(LIFE_STEAL);
            enemy.dead = true;
            bullet.lifetime = 0.0;
            particleBurst(this.particles, enemy.pos, ENEMY_COLOR);
          }
        }

        if (
          this.player.hp > 0.0 &&
          enemy.pos.dist(this.player.pos) <= PLAYER_RADIUS + ENEMY_RADIUS
        ) {
          this.player.damage(ENEMY_DAMAGE);
          enemy.dead = true;
          particleBurst(this.particles, enemy.pos, PLAYER_COLOR);
        }
      }
    }

    for (const bullet of this.bullets) {
      bullet.update(dt);
    }
    this.bullets = this.bullets.filter((bullet) => bullet.lifetime > 0.0);

    for (const particle of this.particles) {
      particle.update(dt);
    }
    this.particles = this.particles.filter(
      (particle) => particle.lifetime > 0.0
    );

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player.pos);
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);

    if (this.tutorial.state === TutorialState.Finished) {
      this.enemySpawnCooldown -= dt;
      if (this.enemySpawnCooldown <= 0.0) {
        this.spawnEnemy();
        this.enemySpawnCooldown = this.enemySpawnRate;
        this.enemySpawnRate = Math.max(0.01, this.enemySpawnRate - 0.01);
      }
    }
  }

  render(context) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    context.clearRect(0, 0, width, height);

    this.player.render(context);
    renderEntities(context, this.bullets);
    renderEntities(context, this.particles);
    renderEntities(context, this.enemies);

    if (this.paused) {
      fillMessage(
        context,
        "GAME IS PAUSED (press SPACE to resume game)",
        MESSAGE_COLOR
      );
    } else if (this.player.hp <= 0.0) {
      fillMessage(
        context,
        "YOU DIED (refresh the page to restart game",
        MESSAGE_COLOR
      );
    } else {
      this.tutorial.render(context);
    }

    fillMessage(context, `SCORE: ${this.score}`, MESSAGE_COLOR, {
      x: 10,
      y: 30,
      maxWidth: width / 2,
      lineHeight: 1,
      fontSize: 16,
      textAlign: "left",
    });

    const bestScore = localStorage.getItem(LS_BEST_SCORE_KEY);

    if (bestScore) {
      fillMessage(
        context,
        `BEST SCORE: ${JSON.parse(bestScore)}`,
        MESSAGE_COLOR,
        {
          x: 10,
          y: 60,
          maxWidth: width / 2,
          lineHeight: 1,
          fontSize: 16,
          textAlign: "left",
        }
      );
    }

    fillRect(
      context,
      0,
      height - HP_BAR_HEIGHT,
      width * (this.player.hp / PLAYER_MAX_HP),
      HP_BAR_HEIGHT,
      PLAYER_COLOR
    );
  }

  spawnEnemy() {
    const dir = Math.random() * 2 * Math.PI;

    this.enemies.push(
      new Enemy(this.player.pos.add(V2.polar(ENEMY_SPAWN_DISTANCE, dir)))
    );
  }

  togglePause() {
    this.paused = !this.paused;
  }

  keyDown(event) {
    if (this.player.hp <= 0.0) {
      return;
    }

    if (event.code === "Space") {
      this.togglePause();
    }

    this.pressedKeys.add(event.code);
  }

  keyUp(event) {
    this.pressedKeys.delete(event.code);
  }

  mouseMove(event) {}

  mouseDown(event) {
    if (this.paused || this.player.hp <= 0.0) {
      return;
    }

    this.tutorial.playerShot();
    const mousePos = new V2(event.offsetX, event.offsetY);
    this.bullets.push(this.player.shootAt(mousePos));
  }
}

const game = new Game();

(() => {
  const canvas = document.getElementById("game");
  const context = canvas.getContext("2d");

  let start;
  let windowWasResize = true;

  function step(timestamp) {
    if (start === undefined) {
      start = timestamp;
    }
    const dt = (timestamp - start) * 0.001;
    start = timestamp;

    if (windowWasResize) {
      canvas.width = document.documentElement.clientWidth;
      canvas.height = document.documentElement.clientHeight;
      windowWasResize = false;
    }

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
  window.addEventListener("resize", (event) => {
    windowWasResize = true;
  });
})();
