import { Level, INFO, GOOD, WARN } from './levels.js';
import { LEVELS } from './list.js';

// [name, formula / statement, plain-language gloss, level that lets you play with it (or null = explained only)]
export const SECTIONS = [
  ['Core integral theorems', [
    ['Fundamental theorem of calculus', '∫ₐᵇ f′dx = f(b) − f(a)', 'Total change = accumulated rate.', 'Riemann'],
    ['Gradient theorem', '∫_C ∇φ·dr = φ(B) − φ(A)', 'Line integrals of gradients only see the endpoints.', 'Work'],
    ['Green: circulation form', '∮ P dx + Q dy = ∬ (Qx − Py) dA', 'Swirl around a loop = curl inside.', 'Loop'],
    ['Green: flux form', '∮ F·n ds = ∬ div F dA', 'Flux out of a loop = sources inside.', 'Loop'],
    ['Stokes / Kelvin-Stokes', '∮ F·dr = ∬ (curl F)·n dS', 'Played in its planar form (Green). 3D surfaces are explained only.', 'Loop'],
    ['Gauss divergence theorem', '∯ F·n dS = ∭ div F dV', 'Flux through a closed surface = total sources inside.', 'Gauss'],
    ['Generalized Stokes', '∫_M dω = ∫_∂M ω', 'One theorem behind all of them. Explained only.', null],
  ]],
  ['Multiple integrals', [
    ['Fubini', '∬ f dA = ∫(∫ f dy)dx', 'Integrate in either order (columns or rows).', 'Riemann'],
    ['Tonelli', 'Fubini for f ≥ 0, even if infinite', 'Explained only.', null],
    ['Change of variables', '∬ f dA = ∬ f |J| du dv', 'Polar: |J| = r, so dA = r dr dθ.', 'Jacobian'],
    ['Integration by parts (several variables)', '∫ u∂v = ∮ uv n − ∫ v∂u', 'Moves derivatives, adds a boundary term. Explained only.', null],
    ['Mean value theorem for integrals', '∫ f = f(c)·|D|', 'Explained only.', null],
    ['Dominated / monotone convergence', 'lim ∫ fₙ = ∫ lim fₙ', 'When limits and integrals commute. Explained only.', null],
    ['Leibniz rule', 'd/dt ∫ f(x,t)dx = ∫ ∂f/∂t dx', 'Differentiate under the integral. Explained only.', null],
    ['Reynolds transport theorem', 'd/dt ∫_Ω(t) f = ∫ ∂f/∂t + ∮ f v·n', 'Moving regions. Explained only.', null],
    ['Coarea formula', '∫ g|∇f| dV = ∫ (∫_{f=t} g dS) dt', 'Volume = stack of level sets. Explained only.', null],
    ['Area formula', '∫ g∘φ |Jφ| = ∫ g · multiplicity', 'Explained only.', null],
  ]],
  ['Differentiation', [
    ['Differentiable implies continuous', 'df exists ⇒ f continuous', 'A good linear approximation forces continuity. Explained only.', null],
    ['C¹ implies differentiable', 'continuous ∂f ⇒ differentiable', 'Practical test. Explained only.', null],
    ['Chain rule', '(f∘g)′ = ∇f·g′', 'Explained only (gradient descent uses ∇f along a path).', null],
    ['Clairaut / Schwarz', 'fxy = fyx', 'Mixed partials agree; the Hessian is symmetric.', 'Critical'],
    ['Multivariable Taylor', 'f(a+h) ≈ f + ∇f·h + ½hᵀHh', 'Local quadratic model; descent uses it.', 'Descent'],
    ['Inverse function theorem', 'det Df ≠ 0 ⇒ local inverse', 'Explained only.', null],
    ['Implicit function theorem', 'Fy ≠ 0 ⇒ y = y(x) locally', 'The constraint curve in Lagrange is exactly this.', 'Lagrange'],
    ['Constant rank theorem', 'rank Df constant ⇒ normal form', 'Explained only.', null],
    ['Regular level set theorem', '∇f ≠ 0 ⇒ {f = c} is smooth', 'Contour lines are smooth where the gradient is non-zero.', 'Gradient'],
    ['Euler homogeneous functions', 'x·fx + y·fy = k f', 'Explained only.', null],
    ['Directional derivative', 'D_u f = ∇f · u', 'Slope in any direction.', 'Slope'],
  ]],
  ['Conservative fields and topology', [
    ['Conservative field equivalence', 'potential ⇔ path independent ⇔ ∮ = 0', 'Played with two paths and a potential.', 'Work'],
    ['Curl-free criterion', 'curl F = 0 on simply connected ⇒ potential', 'The hole breaks it: see the post.', 'Hole'],
    ['Poincaré lemma', 'closed ⇒ exact on star-shaped domains', 'Holes are the only obstruction.', 'Hole'],
    ['Vector potential', 'div F = 0 ⇒ F = curl A locally', 'Explained only.', null],
    ['Helmholtz decomposition', 'F = ∇φ + ∇×A', 'Sources and vortices in the Lab are the two parts.', 'Field Lab'],
    ['Hodge decomposition', 'exact + coexact + harmonic', 'Explained only.', null],
    ["De Rham's theorem", 'cohomology = topology', 'Explained only.', null],
  ]],
  ["Green's identities and harmonic functions", [
    ["Green's first identity", '∫ u∇²v + ∇u·∇v = ∮ u ∂v/∂n', 'Explained only.', null],
    ["Green's second identity", '∫ u∇²v − v∇²u = ∮ u∂v − v∂u', 'Explained only.', null],
    ["Green's third identity", 'u(x) via fundamental solution', 'Explained only.', null],
    ['Mean value property', 'harmonic ⇒ f(c) = average on circle', 'The two beads coincide.', 'Harmonic'],
    ['Weak max principle', 'max of harmonic is on the boundary', 'Played on the boundary circle.', 'Harmonic'],
    ['Strong max principle', 'interior max ⇒ constant', 'Interior has only saddles.', 'Harmonic'],
    ['Dirichlet uniqueness', 'boundary values fix the solution', 'Explained only.', null],
    ['Neumann uniqueness', 'unique up to a constant', 'Explained only.', null],
    ['Liouville (harmonic)', 'bounded + harmonic on ℝⁿ ⇒ constant', 'Explained only.', null],
  ]],
  ['Optimisation', [
    ['Extreme value theorem', 'continuous on compact ⇒ max & min', 'The Summit exists because the board is compact.', 'Summit'],
    ['Fermat stationary point', 'interior extremum ⇒ ∇f = 0', 'Flat spots only.', 'Critical'],
    ['Hessian test', 'D = fxx fyy − fxy²', 'Peak, pit or saddle.', 'Critical'],
    ['Lagrange multipliers', '∇f = λ∇g', 'Slide a bead along a constraint.', 'Lagrange'],
    ['KKT conditions', 'Lagrange with inequalities', 'Explained only.', null],
    ['Convexity', 'convex ⇒ local min is global', 'Gradient descent in a bowl.', 'Descent'],
  ]],
  ['Operators and identities', [
    ['Gradient, divergence, curl', '∇f, ∇·F, ∇×F', 'Arrows, sources and swirl.', 'Field Lab'],
    ['Laplacian', '∇²f = ∇·∇f', 'Curvature on average: zero for harmonic.', 'Harmonic'],
    ['Double and triple integrals', '∬ dA, ∭ dV', 'Columns and spheres.', 'Riemann'],
    ['Line integrals and work', '∫ F·dr', 'Draw a path.', 'Work'],
    ['Surface integrals and flux', '∯ F·n dS', 'Sphere across the board.', 'Gauss'],
    ['Curl of a gradient is zero', '∇×∇f = 0', 'Why gradient fields have no swirl.', 'Curl'],
    ['Divergence of a curl is zero', '∇·(∇×F) = 0', 'Explained only.', null],
    ['Vector Laplacian identity', '∇×∇×F = ∇(∇·F) − ΔF', 'Explained only.', null],
    ['Parametrisation, normals, orientation', 'r(u,v), n, right-hand rule', 'Orientation of loops matters in every loop level. Explained only.', null],
    ['Domain conditions', 'connected, simply connected, holes', 'Holes change the answer.', 'Hole'],
  ]],
];

export const codexCount = () => {
  const all = SECTIONS.flatMap((s) => s[1]);
  return { total: all.length, playable: all.filter((e) => e[3]).length };
};

// The Codex lists every item of the checklist, says honestly whether it can be played, and jumps there.
export class Codex extends Level {
  constructor(app) {
    super(app);
    this.sec = 0; this.sel = null; this.page();
  }
  page() {
    this.btns.forEach((b) => this.ui.removeButton(b)); this.btns = [];
    const [name, items] = SECTIONS[this.sec], c = codexCount();
    this.ui.set({ badge: `${this.app.badgePrefix}CODEX  ${this.sec + 1}/${SECTIONS.length}`, title: name, hint: `Pinch an entry. ${c.playable} of ${c.total} checklist items are playable, the rest are explained.`, status: '', color: INFO });
    items.forEach(([n, , , lv], i) => {
      const b = this.ui.addButton(`${lv ? '▶' : '•'} ${n}`.slice(0, 30), ((i % 2) - 0.5) * 0.42, -0.03 - Math.floor(i / 2) * 0.046, -0.78, () => this.show(i), 0.4, 0.042);
      this.btns.push(b);
    });
    this.btns.push(this.ui.addButton('◀ Section', -0.3, -0.3, -0.9, () => { this.sec = (this.sec + SECTIONS.length - 1) % SECTIONS.length; this.sel = null; this.page(); }, 0.24, 0.06));
    this.btns.push(this.ui.addButton('Play it ▶', 0, -0.3, -0.9, () => this.jump(), 0.24, 0.06));
    this.btns.push(this.ui.addButton('Section ▶', 0.3, -0.3, -0.9, () => { this.sec = (this.sec + 1) % SECTIONS.length; this.sel = null; this.page(); }, 0.24, 0.06));
  }
  show(i) {
    this.sel = i; const [n, formula, gloss, lv] = SECTIONS[this.sec][1][i];
    this.ui.set({ title: n, hint: `${formula}    ${gloss}`, status: lv ? `Playable in: ${lv}  (pinch "Play it")` : 'Explained here, not a playable level.', color: lv ? GOOD : WARN });
    this.audio.tick();
  }
  jump() {
    if (this.sel == null) return;
    const lv = SECTIONS[this.sec][1][this.sel][3]; if (!lv) return;
    const i = LEVELS.findIndex((l) => l.name === lv); if (i >= 0) this.app.go(i);
  }
}
