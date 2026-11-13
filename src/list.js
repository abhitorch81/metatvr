import { Architect } from './architect.js';
import { Codex } from './codex.js';
import { Summit, Roll, Flux, Curl, Work, Lagrange } from './levels.js';
import { Hello, Slope, Descent, Riemann, Loop, Lab } from './levels2.js';
import { Critical, Hole, Jacobian, Gauss, Harmonic } from './levels3.js';

// Order = difficulty curve: pinch basics -> single-variable intuition -> vector fields -> theorems -> free play.
// `ref: true` entries are reference screens that do not count towards "solved".
export const LEVELS = [
  { name: 'Hello', make: (a) => new Hello(a) },
  { name: 'Summit', make: (a) => new Summit(a) },
  { name: 'Gradient', make: (a) => new Roll(a, false) },
  { name: 'Slope', make: (a) => new Slope(a) },
  { name: 'Critical', make: (a) => new Critical(a) },
  { name: 'Descent', make: (a) => new Descent(a) },
  { name: 'Riemann', make: (a) => new Riemann(a) },
  { name: 'Jacobian', make: (a) => new Jacobian(a) },
  { name: 'Divergence', make: (a) => new Flux(a) },
  { name: 'Curl', make: (a) => new Curl(a) },
  { name: 'Work', make: (a) => new Work(a) },
  { name: 'Hole', make: (a) => new Hole(a) },
  { name: 'Loop', make: (a) => new Loop(a) },
  { name: 'Gauss', make: (a) => new Gauss(a) },
  { name: 'Harmonic', make: (a) => new Harmonic(a) },
  { name: 'Lagrange', make: (a) => new Lagrange(a) },
  { name: 'Field Lab', make: (a) => new Lab(a) },
  { name: 'Architect', make: (a) => new Architect(a) },
  { name: 'Daily', make: (a) => new Roll(a, true) },
  { name: 'Codex', ref: true, make: (a) => new Codex(a) },
];
export const PLAYABLE = LEVELS.filter((l) => !l.ref).length;
