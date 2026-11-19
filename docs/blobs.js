/**
 * quotes :: blobs
 *
 * Solid circles of ink drift across the screen and bounce off its edges; a
 * pane of frosted glass in front of them (backdrop-filter) melts them into
 * soft light. Only ink and paper, at a few percent: the quote stays alone.
 *
 * Motion is time-based (px per second, not per frame) so it is just as slow
 * on a 120 Hz screen, stops while the tab is hidden, and freezes when
 * animations are off in Settings or the system asks for reduced motion.
 */

const SPEED = [9, 16]; // px per second: very slow on purpose

/** @param {number} min @param {number} max */
const random = (min, max) => Math.random() * (max - min) + min;

class Blob {
  /** @param {HTMLElement} el */
  constructor(el) {
    this.el = el;
    this.size = el.getBoundingClientRect().width;
    this.x = random(-this.size / 2, innerWidth - this.size / 2);
    this.y = random(-this.size / 2, innerHeight - this.size / 2);
    const angle = random(0, Math.PI * 2);
    const speed = random(SPEED[0], SPEED[1]);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.move();
  }

  /** @param {number} dt seconds since the last frame */
  update(dt) {
    this.size = this.el.getBoundingClientRect().width;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // bounce when the centre reaches an edge, so half of each blob can leave the screen
    const minX = -this.size / 2, maxX = innerWidth - this.size / 2;
    const minY = -this.size / 2, maxY = innerHeight - this.size / 2;
    if (this.x < minX) { this.x = minX; this.vx = Math.abs(this.vx); }
    if (this.x > maxX) { this.x = maxX; this.vx = -Math.abs(this.vx); }
    if (this.y < minY) { this.y = minY; this.vy = Math.abs(this.vy); }
    if (this.y > maxY) { this.y = maxY; this.vy = -Math.abs(this.vy); }
  }

  move() {
    this.el.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
  }
}

function still() {
  return document.documentElement.dataset.motion === "off" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function initBlobs() {
  const blobs = Array.from(document.querySelectorAll(".blob"), (el) => new Blob(/** @type {HTMLElement} */ (el)));
  if (!blobs.length) return;
  let last = performance.now();
  const frame = (now) => {
    // cap the step so coming back to a hidden tab does not teleport them
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!still()) {
      for (const blob of blobs) {
        blob.update(dt);
        blob.move();
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

initBlobs();
