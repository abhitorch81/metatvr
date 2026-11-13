import { Level, INFO } from './levels.js';
import { LEVELS } from './list.js';

// Level select: a floating grid of pinchable buttons showing progress and stars.
export class Menu extends Level {
  constructor(app) {
    super(app);
    const st = app.streak;
    app.ui.set({ badge: '', title: 'Choose a level', hint: 'Pinch any button. Stars reward speed: 3 stars under 90 seconds. Field Lab is free play, Architect designs new levels for you, and Daily changes every day.', status: st ? `Streak: ${st} day${st > 1 ? 's' : ''} (best ${app.meta.best})` : 'Solve a level to start a streak', color: st ? '#8dffb0' : INFO });
    // Comfort layout: buttons sit on an arc around the head (each faces the player) so the whole
    // menu fits inside +-30 degrees of azimuth, even on the narrower Quest 2 field of view.
    const perRow = 4, R0 = 0.9, STEP = 14, D2R = Math.PI / 180;
    const place = (deg) => [R0 * Math.sin(deg * D2R), -R0 * Math.cos(deg * D2R), -deg * D2R];
    LEVELS.forEach((lv, i) => {
      const row = Math.floor(i / perRow), col = i % perRow, n = Math.min(perRow, LEVELS.length - row * perRow);
      const [x, z, rot] = place((col - (n - 1) / 2) * STEP), y = -0.04 - row * 0.062;
      const stars = app.starsFor(lv.name);
      const b = this.ui.addButton(`${stars ? '✓' : i}  ${lv.name}${stars ? ' ' + '★'.repeat(stars) : ''}`, x, y, z, () => app.go(i), 0.2, 0.055, rot);
      this.btns.push(b);
    });
    // accessibility toggles (saved between sessions)
    const A = [['contrast', 'High contrast'], ['big', 'Large text'], ['dwell', 'Hover-to-select']];
    A.forEach(([k, label], i) => {
      const [x, z, rot] = place((i - 1) * STEP);
      const b = this.ui.addButton(label, x, -0.04 - Math.ceil(LEVELS.length / perRow) * 0.062 - 0.02, z, () => { app.toggleAccess(k); this.ui.setActive(b, app.meta.access[k]); }, 0.2, 0.055, rot);
      b.active = !!app.meta.access[k]; this.ui.paintButton(b); this.btns.push(b);
    });
  }
}
