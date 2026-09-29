/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const q = globalThis, nt = q.ShadowRoot && (q.ShadyCSS === void 0 || q.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, ot = Symbol(), pt = /* @__PURE__ */ new WeakMap();
let Ct = class {
  constructor(t, i, s) {
    if (this._$cssResult$ = !0, s !== ot) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = i;
  }
  get styleSheet() {
    let t = this.o;
    const i = this.t;
    if (nt && t === void 0) {
      const s = i !== void 0 && i.length === 1;
      s && (t = pt.get(i)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), s && pt.set(i, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const Nt = (e) => new Ct(typeof e == "string" ? e : e + "", void 0, ot), Y = (e, ...t) => {
  const i = e.length === 1 ? e[0] : t.reduce((s, r, n) => s + ((o) => {
    if (o._$cssResult$ === !0) return o.cssText;
    if (typeof o == "number") return o;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + o + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + e[n + 1], e[0]);
  return new Ct(i, e, ot);
}, Ut = (e, t) => {
  if (nt) e.adoptedStyleSheets = t.map((i) => i instanceof CSSStyleSheet ? i : i.styleSheet);
  else for (const i of t) {
    const s = document.createElement("style"), r = q.litNonce;
    r !== void 0 && s.setAttribute("nonce", r), s.textContent = i.cssText, e.appendChild(s);
  }
}, dt = nt ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((t) => {
  let i = "";
  for (const s of t.cssRules) i += s.cssText;
  return Nt(i);
})(e) : e;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Bt, defineProperty: It, getOwnPropertyDescriptor: Lt, getOwnPropertyNames: jt, getOwnPropertySymbols: Wt, getPrototypeOf: Vt } = Object, S = globalThis, ut = S.trustedTypes, qt = ut ? ut.emptyScript : "", J = S.reactiveElementPolyfillSupport, N = (e, t) => e, X = { toAttribute(e, t) {
  switch (t) {
    case Boolean:
      e = e ? qt : null;
      break;
    case Object:
    case Array:
      e = e == null ? e : JSON.stringify(e);
  }
  return e;
}, fromAttribute(e, t) {
  let i = e;
  switch (t) {
    case Boolean:
      i = e !== null;
      break;
    case Number:
      i = e === null ? null : Number(e);
      break;
    case Object:
    case Array:
      try {
        i = JSON.parse(e);
      } catch {
        i = null;
      }
  }
  return i;
} }, at = (e, t) => !Bt(e, t), gt = { attribute: !0, type: String, converter: X, reflect: !1, useDefault: !1, hasChanged: at };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), S.litPropertyMetadata ?? (S.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let R = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, i = gt) {
    if (i.state && (i.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((i = Object.create(i)).wrapped = !0), this.elementProperties.set(t, i), !i.noAccessor) {
      const s = Symbol(), r = this.getPropertyDescriptor(t, s, i);
      r !== void 0 && It(this.prototype, t, r);
    }
  }
  static getPropertyDescriptor(t, i, s) {
    const { get: r, set: n } = Lt(this.prototype, t) ?? { get() {
      return this[i];
    }, set(o) {
      this[i] = o;
    } };
    return { get: r, set(o) {
      const a = r == null ? void 0 : r.call(this);
      n == null || n.call(this, o), this.requestUpdate(t, a, s);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? gt;
  }
  static _$Ei() {
    if (this.hasOwnProperty(N("elementProperties"))) return;
    const t = Vt(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(N("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(N("properties"))) {
      const i = this.properties, s = [...jt(i), ...Wt(i)];
      for (const r of s) this.createProperty(r, i[r]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const i = litPropertyMetadata.get(t);
      if (i !== void 0) for (const [s, r] of i) this.elementProperties.set(s, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [i, s] of this.elementProperties) {
      const r = this._$Eu(i, s);
      r !== void 0 && this._$Eh.set(r, i);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const i = [];
    if (Array.isArray(t)) {
      const s = new Set(t.flat(1 / 0).reverse());
      for (const r of s) i.unshift(dt(r));
    } else t !== void 0 && i.push(dt(t));
    return i;
  }
  static _$Eu(t, i) {
    const s = i.attribute;
    return s === !1 ? void 0 : typeof s == "string" ? s : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((i) => this.enableUpdating = i), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((i) => i(this));
  }
  addController(t) {
    var i;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && ((i = t.hostConnected) == null || i.call(t));
  }
  removeController(t) {
    var i;
    (i = this._$EO) == null || i.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), i = this.constructor.elementProperties;
    for (const s of i.keys()) this.hasOwnProperty(s) && (t.set(s, this[s]), delete this[s]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Ut(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var t;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (t = this._$EO) == null || t.forEach((i) => {
      var s;
      return (s = i.hostConnected) == null ? void 0 : s.call(i);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((i) => {
      var s;
      return (s = i.hostDisconnected) == null ? void 0 : s.call(i);
    });
  }
  attributeChangedCallback(t, i, s) {
    this._$AK(t, s);
  }
  _$ET(t, i) {
    var n;
    const s = this.constructor.elementProperties.get(t), r = this.constructor._$Eu(t, s);
    if (r !== void 0 && s.reflect === !0) {
      const o = (((n = s.converter) == null ? void 0 : n.toAttribute) !== void 0 ? s.converter : X).toAttribute(i, s.type);
      this._$Em = t, o == null ? this.removeAttribute(r) : this.setAttribute(r, o), this._$Em = null;
    }
  }
  _$AK(t, i) {
    var n, o;
    const s = this.constructor, r = s._$Eh.get(t);
    if (r !== void 0 && this._$Em !== r) {
      const a = s.getPropertyOptions(r), h = typeof a.converter == "function" ? { fromAttribute: a.converter } : ((n = a.converter) == null ? void 0 : n.fromAttribute) !== void 0 ? a.converter : X;
      this._$Em = r;
      const l = h.fromAttribute(i, a.type);
      this[r] = l ?? ((o = this._$Ej) == null ? void 0 : o.get(r)) ?? l, this._$Em = null;
    }
  }
  requestUpdate(t, i, s, r = !1, n) {
    var o;
    if (t !== void 0) {
      const a = this.constructor;
      if (r === !1 && (n = this[t]), s ?? (s = a.getPropertyOptions(t)), !((s.hasChanged ?? at)(n, i) || s.useDefault && s.reflect && n === ((o = this._$Ej) == null ? void 0 : o.get(t)) && !this.hasAttribute(a._$Eu(t, s)))) return;
      this.C(t, i, s);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, i, { useDefault: s, reflect: r, wrapped: n }, o) {
    s && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, o ?? i ?? this[t]), n !== !0 || o !== void 0) || (this._$AL.has(t) || (this.hasUpdated || s || (i = void 0), this._$AL.set(t, i)), r === !0 && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (i) {
      Promise.reject(i);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var s;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [n, o] of this._$Ep) this[n] = o;
        this._$Ep = void 0;
      }
      const r = this.constructor.elementProperties;
      if (r.size > 0) for (const [n, o] of r) {
        const { wrapped: a } = o, h = this[n];
        a !== !0 || this._$AL.has(n) || h === void 0 || this.C(n, void 0, o, h);
      }
    }
    let t = !1;
    const i = this._$AL;
    try {
      t = this.shouldUpdate(i), t ? (this.willUpdate(i), (s = this._$EO) == null || s.forEach((r) => {
        var n;
        return (n = r.hostUpdate) == null ? void 0 : n.call(r);
      }), this.update(i)) : this._$EM();
    } catch (r) {
      throw t = !1, this._$EM(), r;
    }
    t && this._$AE(i);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var i;
    (i = this._$EO) == null || i.forEach((s) => {
      var r;
      return (r = s.hostUpdated) == null ? void 0 : r.call(s);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((i) => this._$ET(i, this[i]))), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
R.elementStyles = [], R.shadowRootOptions = { mode: "open" }, R[N("elementProperties")] = /* @__PURE__ */ new Map(), R[N("finalized")] = /* @__PURE__ */ new Map(), J == null || J({ ReactiveElement: R }), (S.reactiveElementVersions ?? (S.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const U = globalThis, ft = (e) => e, G = U.trustedTypes, mt = G ? G.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, Pt = "$lit$", A = `lit$${Math.random().toFixed(9).slice(2)}$`, Et = "?" + A, Ft = `<${Et}>`, T = document, B = () => T.createComment(""), I = (e) => e === null || typeof e != "object" && typeof e != "function", ht = Array.isArray, Xt = (e) => ht(e) || typeof (e == null ? void 0 : e[Symbol.iterator]) == "function", Q = `[ 	
\f\r]`, z = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, bt = /-->/g, $t = />/g, E = RegExp(`>|${Q}(?:([^\\s"'>=/]+)(${Q}*=${Q}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), vt = /'/g, yt = /"/g, kt = /^(?:script|style|textarea|title)$/i, Mt = (e) => (t, ...i) => ({ _$litType$: e, strings: t, values: i }), c = Mt(1), D = Mt(2), O = Symbol.for("lit-noChange"), p = Symbol.for("lit-nothing"), xt = /* @__PURE__ */ new WeakMap(), k = T.createTreeWalker(T, 129);
function Tt(e, t) {
  if (!ht(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return mt !== void 0 ? mt.createHTML(t) : t;
}
const Gt = (e, t) => {
  const i = e.length - 1, s = [];
  let r, n = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = z;
  for (let a = 0; a < i; a++) {
    const h = e[a];
    let l, g, d = -1, w = 0;
    for (; w < h.length && (o.lastIndex = w, g = o.exec(h), g !== null); ) w = o.lastIndex, o === z ? g[1] === "!--" ? o = bt : g[1] !== void 0 ? o = $t : g[2] !== void 0 ? (kt.test(g[2]) && (r = RegExp("</" + g[2], "g")), o = E) : g[3] !== void 0 && (o = E) : o === E ? g[0] === ">" ? (o = r ?? z, d = -1) : g[1] === void 0 ? d = -2 : (d = o.lastIndex - g[2].length, l = g[1], o = g[3] === void 0 ? E : g[3] === '"' ? yt : vt) : o === yt || o === vt ? o = E : o === bt || o === $t ? o = z : (o = E, r = void 0);
    const _ = o === E && e[a + 1].startsWith("/>") ? " " : "";
    n += o === z ? h + Ft : d >= 0 ? (s.push(l), h.slice(0, d) + Pt + h.slice(d) + A + _) : h + A + (d === -2 ? a : _);
  }
  return [Tt(e, n + (e[i] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), s];
};
class L {
  constructor({ strings: t, _$litType$: i }, s) {
    let r;
    this.parts = [];
    let n = 0, o = 0;
    const a = t.length - 1, h = this.parts, [l, g] = Gt(t, i);
    if (this.el = L.createElement(l, s), k.currentNode = this.el.content, i === 2 || i === 3) {
      const d = this.el.content.firstChild;
      d.replaceWith(...d.childNodes);
    }
    for (; (r = k.nextNode()) !== null && h.length < a; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const d of r.getAttributeNames()) if (d.endsWith(Pt)) {
          const w = g[o++], _ = r.getAttribute(d).split(A), V = /([.?@])?(.*)/.exec(w);
          h.push({ type: 1, index: n, name: V[2], strings: _, ctor: V[1] === "." ? Kt : V[1] === "?" ? Zt : V[1] === "@" ? Jt : K }), r.removeAttribute(d);
        } else d.startsWith(A) && (h.push({ type: 6, index: n }), r.removeAttribute(d));
        if (kt.test(r.tagName)) {
          const d = r.textContent.split(A), w = d.length - 1;
          if (w > 0) {
            r.textContent = G ? G.emptyScript : "";
            for (let _ = 0; _ < w; _++) r.append(d[_], B()), k.nextNode(), h.push({ type: 2, index: ++n });
            r.append(d[w], B());
          }
        }
      } else if (r.nodeType === 8) if (r.data === Et) h.push({ type: 2, index: n });
      else {
        let d = -1;
        for (; (d = r.data.indexOf(A, d + 1)) !== -1; ) h.push({ type: 7, index: n }), d += A.length - 1;
      }
      n++;
    }
  }
  static createElement(t, i) {
    const s = T.createElement("template");
    return s.innerHTML = t, s;
  }
}
function H(e, t, i = e, s) {
  var o, a;
  if (t === O) return t;
  let r = s !== void 0 ? (o = i._$Co) == null ? void 0 : o[s] : i._$Cl;
  const n = I(t) ? void 0 : t._$litDirective$;
  return (r == null ? void 0 : r.constructor) !== n && ((a = r == null ? void 0 : r._$AO) == null || a.call(r, !1), n === void 0 ? r = void 0 : (r = new n(e), r._$AT(e, i, s)), s !== void 0 ? (i._$Co ?? (i._$Co = []))[s] = r : i._$Cl = r), r !== void 0 && (t = H(e, r._$AS(e, t.values), r, s)), t;
}
class Yt {
  constructor(t, i) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = i;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: i }, parts: s } = this._$AD, r = ((t == null ? void 0 : t.creationScope) ?? T).importNode(i, !0);
    k.currentNode = r;
    let n = k.nextNode(), o = 0, a = 0, h = s[0];
    for (; h !== void 0; ) {
      if (o === h.index) {
        let l;
        h.type === 2 ? l = new W(n, n.nextSibling, this, t) : h.type === 1 ? l = new h.ctor(n, h.name, h.strings, this, t) : h.type === 6 && (l = new Qt(n, this, t)), this._$AV.push(l), h = s[++a];
      }
      o !== (h == null ? void 0 : h.index) && (n = k.nextNode(), o++);
    }
    return k.currentNode = T, r;
  }
  p(t) {
    let i = 0;
    for (const s of this._$AV) s !== void 0 && (s.strings !== void 0 ? (s._$AI(t, s, i), i += s.strings.length - 2) : s._$AI(t[i])), i++;
  }
}
class W {
  get _$AU() {
    var t;
    return ((t = this._$AM) == null ? void 0 : t._$AU) ?? this._$Cv;
  }
  constructor(t, i, s, r) {
    this.type = 2, this._$AH = p, this._$AN = void 0, this._$AA = t, this._$AB = i, this._$AM = s, this.options = r, this._$Cv = (r == null ? void 0 : r.isConnected) ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const i = this._$AM;
    return i !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = i.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, i = this) {
    t = H(this, t, i), I(t) ? t === p || t == null || t === "" ? (this._$AH !== p && this._$AR(), this._$AH = p) : t !== this._$AH && t !== O && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : Xt(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== p && I(this._$AH) ? this._$AA.nextSibling.data = t : this.T(T.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var n;
    const { values: i, _$litType$: s } = t, r = typeof s == "number" ? this._$AC(t) : (s.el === void 0 && (s.el = L.createElement(Tt(s.h, s.h[0]), this.options)), s);
    if (((n = this._$AH) == null ? void 0 : n._$AD) === r) this._$AH.p(i);
    else {
      const o = new Yt(r, this), a = o.u(this.options);
      o.p(i), this.T(a), this._$AH = o;
    }
  }
  _$AC(t) {
    let i = xt.get(t.strings);
    return i === void 0 && xt.set(t.strings, i = new L(t)), i;
  }
  k(t) {
    ht(this._$AH) || (this._$AH = [], this._$AR());
    const i = this._$AH;
    let s, r = 0;
    for (const n of t) r === i.length ? i.push(s = new W(this.O(B()), this.O(B()), this, this.options)) : s = i[r], s._$AI(n), r++;
    r < i.length && (this._$AR(s && s._$AB.nextSibling, r), i.length = r);
  }
  _$AR(t = this._$AA.nextSibling, i) {
    var s;
    for ((s = this._$AP) == null ? void 0 : s.call(this, !1, !0, i); t !== this._$AB; ) {
      const r = ft(t).nextSibling;
      ft(t).remove(), t = r;
    }
  }
  setConnected(t) {
    var i;
    this._$AM === void 0 && (this._$Cv = t, (i = this._$AP) == null || i.call(this, t));
  }
}
class K {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, i, s, r, n) {
    this.type = 1, this._$AH = p, this._$AN = void 0, this.element = t, this.name = i, this._$AM = r, this.options = n, s.length > 2 || s[0] !== "" || s[1] !== "" ? (this._$AH = Array(s.length - 1).fill(new String()), this.strings = s) : this._$AH = p;
  }
  _$AI(t, i = this, s, r) {
    const n = this.strings;
    let o = !1;
    if (n === void 0) t = H(this, t, i, 0), o = !I(t) || t !== this._$AH && t !== O, o && (this._$AH = t);
    else {
      const a = t;
      let h, l;
      for (t = n[0], h = 0; h < n.length - 1; h++) l = H(this, a[s + h], i, h), l === O && (l = this._$AH[h]), o || (o = !I(l) || l !== this._$AH[h]), l === p ? t = p : t !== p && (t += (l ?? "") + n[h + 1]), this._$AH[h] = l;
    }
    o && !r && this.j(t);
  }
  j(t) {
    t === p ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Kt extends K {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === p ? void 0 : t;
  }
}
class Zt extends K {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== p);
  }
}
class Jt extends K {
  constructor(t, i, s, r, n) {
    super(t, i, s, r, n), this.type = 5;
  }
  _$AI(t, i = this) {
    if ((t = H(this, t, i, 0) ?? p) === O) return;
    const s = this._$AH, r = t === p && s !== p || t.capture !== s.capture || t.once !== s.once || t.passive !== s.passive, n = t !== p && (s === p || r);
    r && this.element.removeEventListener(this.name, this, s), n && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var i;
    typeof this._$AH == "function" ? this._$AH.call(((i = this.options) == null ? void 0 : i.host) ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Qt {
  constructor(t, i, s) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = i, this.options = s;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    H(this, t);
  }
}
const tt = U.litHtmlPolyfillSupport;
tt == null || tt(L, W), (U.litHtmlVersions ?? (U.litHtmlVersions = [])).push("3.3.3");
const te = (e, t, i) => {
  const s = (i == null ? void 0 : i.renderBefore) ?? t;
  let r = s._$litPart$;
  if (r === void 0) {
    const n = (i == null ? void 0 : i.renderBefore) ?? null;
    s._$litPart$ = r = new W(t.insertBefore(B(), n), n, void 0, i ?? {});
  }
  return r._$AI(e), r;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const M = globalThis;
class C extends R {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var i;
    const t = super.createRenderRoot();
    return (i = this.renderOptions).renderBefore ?? (i.renderBefore = t.firstChild), t;
  }
  update(t) {
    const i = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = te(i, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this._$Do) == null || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this._$Do) == null || t.setConnected(!1);
  }
  render() {
    return O;
  }
}
var St;
C._$litElement$ = !0, C.finalized = !0, (St = M.litElementHydrateSupport) == null || St.call(M, { LitElement: C });
const et = M.litElementPolyfillSupport;
et == null || et({ LitElement: C });
(M.litElementVersions ?? (M.litElementVersions = [])).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Z = (e) => (t, i) => {
  i !== void 0 ? i.addInitializer(() => {
    customElements.define(e, t);
  }) : customElements.define(e, t);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ee = { attribute: !0, type: String, converter: X, reflect: !1, hasChanged: at }, ie = (e = ee, t, i) => {
  const { kind: s, metadata: r } = i;
  let n = globalThis.litPropertyMetadata.get(r);
  if (n === void 0 && globalThis.litPropertyMetadata.set(r, n = /* @__PURE__ */ new Map()), s === "setter" && ((e = Object.create(e)).wrapped = !0), n.set(i.name, e), s === "accessor") {
    const { name: o } = i;
    return { set(a) {
      const h = t.get.call(this);
      t.set.call(this, a), this.requestUpdate(o, h, e, !0, a);
    }, init(a) {
      return a !== void 0 && this.C(o, void 0, e, a), a;
    } };
  }
  if (s === "setter") {
    const { name: o } = i;
    return function(a) {
      const h = this[o];
      t.call(this, a), this.requestUpdate(o, h, e, !0, a);
    };
  }
  throw Error("Unsupported decorator location: " + s);
};
function b(e) {
  return (t, i) => typeof i == "object" ? ie(e, t, i) : ((s, r, n) => {
    const o = r.hasOwnProperty(n);
    return r.constructor.createProperty(n, s), o ? Object.getOwnPropertyDescriptor(r, n) : void 0;
  })(e, t, i);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function u(e) {
  return b({ ...e, state: !0, attribute: !1 });
}
const P = "switchbot_segments", se = (e) => e.connection.sendMessagePromise({ type: `${P}/strips` }), re = (e, t) => e.connection.sendMessagePromise({ type: `${P}/read`, entry_id: t }), ne = (e, t, i) => e.connection.sendMessagePromise({ type: `${P}/save_layout`, entry_id: t, layout: i }), oe = (e, t) => e.connection.subscribeMessage(() => {
}, { type: `${P}/preview/start`, entry_id: t }), ae = (e, t, i) => e.connection.sendMessagePromise({ type: `${P}/preview/update`, entry_id: t, layout: i }), he = (e, t, i) => e.connection.sendMessagePromise({ type: `${P}/apply_colors`, entry_id: t, colors: i }), lt = (e) => (t, i, s) => t.connection.sendMessagePromise({ type: `${P}/${e}_preset`, entry_id: i, name: s }), le = lt("save"), ce = lt("apply"), pe = lt("delete"), wt = (e, t, i, s) => e.connection.sendMessagePromise({
  type: `${P}/render_template`,
  entry_id: t,
  layout: s,
  ...i
}), de = {
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
  up: [0, -1]
}, _t = (e) => e === 0 ? 0 : e;
function ue([e, t], i) {
  const [s, r] = i === "right" ? [-t, e] : [t, -e];
  return [_t(s), _t(r)];
}
function it(e) {
  const t = new Map(e.corners.map((h) => [h.index, h.turn]));
  let [i, s] = de[e.start_direction], r = 0, n = 0, o = 0;
  const a = [];
  for (let h = 0; h < e.segment_count; h++) {
    a.push({
      index: h,
      x: r + i / 2,
      y: n + s / 2,
      angle: Math.atan2(s, i) * 180 / Math.PI,
      section: o
    }), r += i, n += s;
    const l = t.get(h);
    l && ([i, s] = ue([i, s], l), o++);
  }
  return a;
}
function ge(e, t = 1.5) {
  const i = e.map((o) => o.x), s = e.map((o) => o.y), r = Math.min(...i) - t, n = Math.min(...s) - t;
  return {
    x: r,
    y: n,
    width: Math.max(...i) + t - r,
    height: Math.max(...s) + t - n
  };
}
function At(e, t, i, s = 0, r = e.length - 1) {
  let n = s, o = 1 / 0;
  for (const a of e.slice(s, r + 1)) {
    const h = (a.x - t) ** 2 + (a.y - i) ** 2;
    h < o && (o = h, n = a.index);
  }
  return n;
}
function Rt(e, t) {
  const i = t > 0 ? e.corners[t - 1].index + 1 : 1, s = t < e.corners.length - 1 ? e.corners[t + 1].index - 1 : e.segment_count - 2;
  return [i, s];
}
function fe(e, t = "right") {
  const i = [0, ...e.corners.map((a) => a.index), e.segment_count - 1];
  let s = 0, r = 0;
  for (let a = 0; a < i.length - 1; a++) {
    const h = i[a + 1] - i[a];
    h > r && (r = h, s = i[a]);
  }
  if (r < 2) return null;
  const n = s + Math.floor(r / 2), o = [...e.corners, { index: n, turn: t }].sort((a, h) => a.index - h.index);
  return { ...e, corners: o };
}
const st = { base: "ffc800", corner: "ff0000", start: "00ff00" };
function me(e) {
  const t = Array(e.segment_count).fill(st.base);
  for (const i of e.corners) t[i.index] = st.corner;
  return t[0] = st.start, t;
}
const be = {
  title: "Lightstrips",
  noStrips: "Noch kein Strip eingerichtet. Einstellungen → Geräte & Dienste → Integration hinzufügen → SwitchBot Segments.",
  start: "Startrichtung",
  corners: "Ecken",
  corner: "Ecke",
  segment: "Segment",
  left: "links",
  right: "rechts",
  addCorner: "Ecke hinzufügen",
  remove: "Entfernen",
  calibrate: "Am Strip anzeigen",
  calibrating: "Anzeige beenden",
  calibrateHint: "Der Strip leuchtet gelb, die Ecken rot, der Anfang grün. Ecken ziehen oder mit −/+ verschieben, bis sie an der Wand stimmen. Beim Beenden kommen die alten Farben zurück.",
  read: "Farben vom Strip lesen",
  save: "Speichern",
  discard: "Verwerfen",
  saved: "Gespeichert",
  unsaved: "Ungespeicherte Änderungen",
  error: "Fehler",
  layoutTab: "Layout",
  paintTab: "Farben",
  brush: "Pinsel",
  brushHint: "Farbe wählen, dann Segmente anklicken oder darüberziehen – der Strip übernimmt sie sofort.",
  onStrip: "Am Strip",
  whites: "Weißtöne",
  fillAll: "Alles in dieser Farbe",
  presets: "Presets",
  noPresets: "Noch keine Presets.",
  presetName: "Name",
  savePreset: "Aktuellen Stand speichern",
  apply: "Anwenden",
  confirmDelete: "Wirklich löschen?",
  active: "aktiv",
  templates: "Vorlagen",
  addBrush: "Pinselfarbe",
  steps: "Stufen",
  stepsHint: "Mehr Stufen = weicher; jede Stufe kostet mindestens einen Befehl an den Strip.",
  previewTemplate: "Vorschau",
  toolBrush: "Pinsel",
  toolRange: "Bereich",
  rangeHint: "Vom ersten bis zum letzten Segment ziehen – oder Anfang und Ende nacheinander antippen.",
  previewBanner: "Vorschau – nur hier im Panel, der Strip ist unverändert.",
  applyToStrip: "Am Strip anwenden",
  endPreview: "Vorschau beenden",
  accentWidth: "Breite",
  applyTemplate: "Vorlage anwenden",
  tpl_sections: "Je Abschnitt",
  tpl_gradient: "Verlauf",
  tpl_section_gradient: "Verlauf je Abschnitt",
  tpl_mirror: "Gespiegelt",
  tpl_corner_accent: "Ecken-Akzent",
  tplHint_sections: "Jeder Abschnitt zwischen den Ecken bekommt die nächste Farbe der Palette.",
  tplHint_gradient: "Verlauf durch die Palette über den ganzen Strip.",
  tplHint_section_gradient: "Derselbe Verlauf in jedem Abschnitt.",
  tplHint_mirror: "Außen die erste, zur Strip-Mitte hin die letzte Farbe – beide Seiten gleich.",
  tplHint_corner_accent: "Erste Farbe als Grund, zweite an den Ecken."
}, $e = {
  title: "Lightstrips",
  noStrips: "No strip set up yet. Settings → Devices & services → Add integration → SwitchBot Segments.",
  start: "Start direction",
  corners: "Corners",
  corner: "Corner",
  segment: "Segment",
  left: "left",
  right: "right",
  addCorner: "Add corner",
  remove: "Remove",
  calibrate: "Show on strip",
  calibrating: "Stop showing",
  calibrateHint: "The strip lights up yellow, corners red, the start green. Drag the corners or nudge them with −/+ until they match the wall. When you stop, the previous colours come back.",
  read: "Read colours from strip",
  save: "Save",
  discard: "Discard",
  saved: "Saved",
  unsaved: "Unsaved changes",
  error: "Error",
  layoutTab: "Layout",
  paintTab: "Colours",
  brush: "Brush",
  brushHint: "Pick a colour, then click segments or drag across them – the strip follows right away.",
  onStrip: "On the strip",
  whites: "Whites",
  fillAll: "Everything in this colour",
  presets: "Presets",
  noPresets: "No presets yet.",
  presetName: "Name",
  savePreset: "Save current state",
  apply: "Apply",
  confirmDelete: "Really delete?",
  active: "active",
  templates: "Templates",
  addBrush: "Brush colour",
  steps: "Steps",
  stepsHint: "More steps = smoother; each step costs at least one command to the strip.",
  previewTemplate: "Preview",
  toolBrush: "Brush",
  toolRange: "Range",
  rangeHint: "Drag from the first to the last segment – or tap start and end one after the other.",
  previewBanner: "Preview – only here in the panel, the strip is unchanged.",
  applyToStrip: "Apply to strip",
  endPreview: "End preview",
  accentWidth: "Width",
  applyTemplate: "Apply template",
  tpl_sections: "Per section",
  tpl_gradient: "Gradient",
  tpl_section_gradient: "Gradient per section",
  tpl_mirror: "Mirrored",
  tpl_corner_accent: "Corner accent",
  tplHint_sections: "Each section between the corners gets the next palette colour.",
  tplHint_gradient: "Gradient through the palette along the whole strip.",
  tplHint_section_gradient: "The same gradient in every section.",
  tplHint_mirror: "First colour at the ends, last towards the middle – both sides alike.",
  tplHint_corner_accent: "First colour as base, second at the corners."
}, ve = (e) => {
  const t = e != null && e.startsWith("de") ? be : $e;
  return (i) => t[i];
}, ye = 8;
function Ot(e, t) {
  const i = Math.min(t.width / e.width, t.height / e.height);
  return {
    scale: i,
    offX: (t.width - e.width * i) / 2,
    offY: (t.height - e.height * i) / 2
  };
}
function Ht(e, t, i, s) {
  const r = Ot(e, t);
  return {
    x: e.x + (i - t.left - r.offX) / r.scale,
    y: e.y + (s - t.top - r.offY) / r.scale
  };
}
function zt(e, t, i, s, r, n) {
  const o = Math.min(ye, Math.max(1, i)), a = e.width / o, h = e.height / o, l = Ot({ width: a, height: h }, t);
  let g = s.x - (r - t.left - l.offX) / l.scale, d = s.y - (n - t.top - l.offY) / l.scale;
  return g = Math.min(e.x + e.width - a, Math.max(e.x, g)), d = Math.min(e.y + e.height - h, Math.max(e.y, d)), { x: g, y: d, width: a, height: h };
}
const F = (e, t) => e.width / t.width;
function xe(e, t, i, s, r, n) {
  const o = Ht(t, i, r, n);
  return zt(e, i, F(e, t) * s, o, r, n);
}
var we = Object.defineProperty, _e = Object.getOwnPropertyDescriptor, y = (e, t, i, s) => {
  for (var r = s > 1 ? void 0 : s ? _e(t, i) : t, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (r = (s ? o(t, i, r) : o(r)) || r);
  return s && r && we(t, i, r), r;
};
let $ = class extends C {
  constructor() {
    super(...arguments), this.colors = null, this.selected = -1, this.mode = "layout", this.tool = "brush", this.dragging = -1, this.painting = !1, this.lastPainted = -1, this.anchor = -1, this.rangeEnd = -1, this.waitingTap = !1, this.pointerAt = -1, this.view = null, this.base = { x: 0, y: 0, width: 1, height: 1 }, this.touches = /* @__PURE__ */ new Map(), this.pinch = null, this.onTouchStart = (e) => {
      var s;
      if (e.touches.length >= 2) {
        e.preventDefault();
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      const i = (s = e.target.classList) == null ? void 0 : s.contains("hit");
      (this.mode === "paint" && this.hit(t) >= 0 || this.mode === "layout" && i) && e.preventDefault();
    }, this.onTouchMove = (e) => {
      (this.painting || this.dragging >= 0 || this.pinch || e.touches.length >= 2) && e.preventDefault();
    }, this.onWheel = (e) => {
      e.ctrlKey && (e.preventDefault(), this.zoomBy(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY));
    };
  }
  toSvgPoint(e) {
    const t = this.renderRoot.querySelector("svg"), i = t == null ? void 0 : t.getScreenCTM();
    if (!t || !i) return null;
    const s = new DOMPoint(e.clientX, e.clientY).matrixTransform(i.inverse());
    return { x: s.x, y: s.y };
  }
  onDown(e, t) {
    this.dragging = t, e.target.setPointerCapture(e.pointerId), this.dispatchEvent(new CustomEvent("corner-select", { detail: t }));
  }
  /** Segment unter dem Zeiger; Finger duerfen deutlich danebenliegen. -1 = keins. */
  hit(e) {
    const t = this.toSvgPoint(e);
    if (!t) return -1;
    const i = it(this.layout), s = At(i, t.x, t.y), r = i[s], n = e.pointerType === "mouse" ? 0.8 : 1.6;
    return (r.x - t.x) ** 2 + (r.y - t.y) ** 2 <= n ** 2 ? s : -1;
  }
  get rect() {
    var e;
    return ((e = this.renderRoot.querySelector("svg")) == null ? void 0 : e.getBoundingClientRect()) ?? null;
  }
  zoomBy(e, t, i) {
    const s = this.rect;
    s && this.setView(xe(this.base, this.view ?? this.base, s, e, t, i));
  }
  setView(e) {
    this.view = F(this.base, e) <= 1.001 ? null : e;
  }
  startPinch() {
    this.painting && this.tool === "brush" && this.lastPainted >= 0 && this.dispatchEvent(new CustomEvent("paint-cancel")), this.painting = !1, this.dragging = -1, this.pointerAt = -1, this.clearRange();
    const e = this.rect, [t, i] = [...this.touches.values()];
    if (!e || !t || !i) return;
    const s = this.view ?? this.base;
    this.pinch = {
      p: Ht(s, e, (t.x + i.x) / 2, (t.y + i.y) / 2),
      d0: Math.hypot(t.x - i.x, t.y - i.y) || 1,
      z0: F(this.base, s)
    };
  }
  movePinch() {
    const e = this.rect, [t, i] = [...this.touches.values()];
    if (!this.pinch || !e || !t || !i) return;
    const s = this.pinch.z0 * Math.hypot(t.x - i.x, t.y - i.y) / this.pinch.d0;
    this.setView(zt(this.base, e, s, this.pinch.p, (t.x + i.x) / 2, (t.y + i.y) / 2));
  }
  firstUpdated() {
    const e = this.renderRoot.querySelector("svg");
    e == null || e.addEventListener("touchstart", this.onTouchStart, { passive: !1 }), e == null || e.addEventListener("touchmove", this.onTouchMove, { passive: !1 }), e == null || e.addEventListener("wheel", this.onWheel, { passive: !1 });
  }
  paintAt(e) {
    const t = this.hit(e);
    if (!(t < 0)) {
      if (this.pointerAt = t, this.tool === "range") {
        this.rangeEnd = t;
        return;
      }
      t !== this.lastPainted && (this.lastPainted = t, this.dispatchEvent(new CustomEvent("segment-paint", { detail: t })));
    }
  }
  onSvgDown(e) {
    if (e.pointerType === "touch") {
      if (this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY }), e.currentTarget.setPointerCapture(e.pointerId), this.touches.size === 2) return this.startPinch();
      if (this.touches.size > 2 || this.pinch) return;
    }
    if (this.mode !== "paint") return;
    const t = this.hit(e);
    if (!(t < 0)) {
      if (this.painting = !0, this.lastPainted = -1, e.currentTarget.setPointerCapture(e.pointerId), this.tool === "range") {
        if (this.waitingTap) {
          this.emitRange(this.anchor, t), this.painting = !1;
          return;
        }
        this.anchor = t;
      }
      this.paintAt(e);
    }
  }
  emitRange(e, t) {
    const i = { from: Math.min(e, t), to: Math.max(e, t) };
    this.dispatchEvent(new CustomEvent("segment-range", { detail: i })), this.clearRange();
  }
  /** Halb gewaehlten Bereich verwerfen (z.B. beim Werkzeugwechsel). */
  clearRange() {
    this.anchor = this.rangeEnd = -1, this.waitingTap = !1;
  }
  onMove(e) {
    if (this.touches.has(e.pointerId) && this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY }), this.pinch) return this.movePinch();
    if (this.painting) return this.paintAt(e);
    if (this.dragging < 0) return;
    const t = this.toSvgPoint(e);
    if (!t) return;
    const [i, s] = Rt(this.layout, this.dragging), r = At(it(this.layout), t.x, t.y, i, s);
    if (r !== this.layout.corners[this.dragging].index) {
      const n = { corner: this.dragging, index: r };
      this.dispatchEvent(new CustomEvent("corner-move", { detail: n }));
    }
  }
  onUp(e) {
    if (this.touches.delete(e.pointerId), this.pinch) {
      this.touches.size === 0 && (this.pinch = null);
      return;
    }
    if (this.dragging = -1, this.pointerAt = -1, !!this.painting) {
      if (this.painting = !1, this.tool === "range" && this.anchor >= 0) {
        this.rangeEnd !== this.anchor ? this.emitRange(this.anchor, this.rangeEnd) : this.waitingTap = !0;
        return;
      }
      this.dispatchEvent(new CustomEvent("paint-end"));
    }
  }
  renderBubble(e) {
    const t = e[this.pointerAt];
    return t ? D`<g class="bubble" transform="translate(${t.x} ${t.y - 2})">
      <rect x="-1.1" y="-0.6" width="2.2" height="1.2" rx="0.4"></rect>
      <text>${t.index + 1}</text>
    </g>` : p;
  }
  inRange(e) {
    return this.anchor < 0 || this.rangeEnd < 0 ? !1 : e >= Math.min(this.anchor, this.rangeEnd) && e <= Math.max(this.anchor, this.rangeEnd);
  }
  render() {
    const e = it(this.layout);
    this.base = ge(e);
    const t = this.view ?? this.base, i = F(this.base, t) >= 3 ? 5 : 10, s = new Map(this.layout.corners.map((r, n) => [r.index, n]));
    return c`<div class="wrap"><svg
      viewBox="${t.x} ${t.y} ${t.width} ${t.height}"
      @pointerdown=${this.onSvgDown}
      @pointermove=${this.onMove}
      @pointerup=${this.onUp}
      @pointercancel=${this.onUp}
    >
      ${e.map(
      (r) => {
        var n;
        return D`<rect class="seg ${this.inRange(r.index) ? "in-range" : ""}" x="-0.46" y="-0.34" width="0.92" height="0.68" rx="0.14"
          fill="${(n = this.colors) != null && n[r.index] ? `#${this.colors[r.index]}` : "var(--disabled-color, #bbb)"}"
          transform="translate(${r.x} ${r.y}) rotate(${r.angle})"><title>#${r.index + 1}</title></rect>`;
      }
    )}
      ${e.filter((r) => r.index === 0 || (r.index + 1) % i === 0).map((r) => D`<text x="${r.x + 0.6}" y="${r.y - 0.6}">${r.index + 1}</text>`)}
      ${e.filter((r) => this.mode === "layout" && s.has(r.index)).map((r) => {
      const n = s.get(r.index);
      return D`<circle class="handle ${n === this.selected ? "selected" : ""}" cx="${r.x}" cy="${r.y}" r="0.85"></circle>
            <circle class="hit" cx="${r.x}" cy="${r.y}" r="1.8" @pointerdown=${(o) => this.onDown(o, n)}></circle>`;
    })}
      ${this.waitingTap && e[this.anchor] ? D`<circle class="anchor" cx="${e[this.anchor].x}" cy="${e[this.anchor].y}" r="0.8"></circle>` : p}
      ${this.renderBubble(e)}
    </svg></div>`;
  }
};
$.styles = Y`
    :host { display: block; }
    .wrap { position: relative; }
    /* pan-y: Wischen neben dem Strip scrollt die Seite; auf Segmenten/Griffen blockiert
       onTouchStart das Scrollen (iOS respektiert touch-action allein nicht zuverlaessig). */
    svg { width: 100%; max-height: var(--sbs-strip-max-height, 60vh); touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    :host([mode="view"]) svg { touch-action: auto; }
    .seg { stroke: var(--divider-color, #0003); stroke-width: 0.04; }
    .seg.in-range { stroke: var(--primary-color, #03a9f4); stroke-width: 0.14; }
    .bubble rect { fill: var(--primary-text-color, #000); opacity: 0.85; }
    .bubble text { fill: var(--primary-background-color, #fff); font-size: 0.9px; font-weight: 600; text-anchor: middle; dominant-baseline: central; }
    .handle { fill: none; stroke: var(--primary-text-color, #000); stroke-width: 0.12; cursor: grab; }
    .handle.selected { stroke: var(--primary-color, #03a9f4); stroke-width: 0.2; }
    .hit { fill: transparent; cursor: grab; }
    .anchor { fill: none; stroke: var(--primary-color, #03a9f4); stroke-width: 0.16; stroke-dasharray: 0.3 0.2; }
    :host([mode="paint"]) .seg { cursor: crosshair; }
    text { font-size: 0.7px; fill: var(--secondary-text-color, #666); font-family: sans-serif; }
  `;
y([
  b({ attribute: !1 })
], $.prototype, "layout", 2);
y([
  b({ attribute: !1 })
], $.prototype, "colors", 2);
y([
  b({ type: Number })
], $.prototype, "selected", 2);
y([
  b({ reflect: !0 })
], $.prototype, "mode", 2);
y([
  b()
], $.prototype, "tool", 2);
y([
  u()
], $.prototype, "anchor", 2);
y([
  u()
], $.prototype, "rangeEnd", 2);
y([
  u()
], $.prototype, "pointerAt", 2);
y([
  u()
], $.prototype, "view", 2);
$ = y([
  Z("sbs-strip-view")
], $);
const rt = (e) => Math.round(Math.min(255, Math.max(0, e))).toString(16).padStart(2, "0"), Dt = (e, t, i) => rt(e) + rt(t) + rt(i);
function Ae(e) {
  const t = parseInt(e, 16);
  return [t >> 16 & 255, t >> 8 & 255, t & 255];
}
function Se(e, t) {
  const i = (s) => {
    const r = (s + e / 60) % 6;
    return 255 * (1 - t * Math.max(0, Math.min(r, 4 - r, 1)));
  };
  return Dt(i(5), i(3), i(1));
}
function Ce(e) {
  const [t, i, s] = Ae(e).map((a) => a / 255), r = Math.max(t, i, s), n = r - Math.min(t, i, s);
  if (r === 0 || n === 0) return { hue: 0, sat: 0 };
  let o;
  return r === t ? o = (i - s) / n % 6 : r === i ? o = (s - t) / n + 2 : o = (t - i) / n + 4, { hue: (o * 60 + 360) % 360, sat: n / r };
}
function Pe(e) {
  const t = e / 100, i = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592, s = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492, r = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307, [n, o, a] = [i, s, r].map((l) => Math.min(255, Math.max(0, l))), h = 255 / Math.max(n, o, a);
  return Dt(n * h, o * h, a * h);
}
var Ee = Object.defineProperty, ke = Object.getOwnPropertyDescriptor, ct = (e, t, i, s) => {
  for (var r = s > 1 ? void 0 : s ? ke(t, i) : t, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (r = (s ? o(t, i, r) : o(r)) || r);
  return s && r && Ee(t, i, r), r;
};
const Me = [2200, 2700, 3e3, 4e3, 5e3, 6500];
let j = class extends C {
  constructor() {
    super(...arguments), this.value = "ff0000", this.whitesLabel = "", this.dragging = !1;
  }
  pick(e) {
    const t = e.currentTarget.getBoundingClientRect(), i = e.clientX - (t.left + t.width / 2), s = e.clientY - (t.top + t.height / 2), r = (Math.atan2(i, -s) * 180 / Math.PI + 360) % 360, n = Math.min(1, Math.hypot(i, s) / (t.width / 2));
    this.emit(Se(r, n));
  }
  emit(e) {
    e !== this.value && this.dispatchEvent(new CustomEvent("color-change", { detail: e }));
  }
  onDown(e) {
    this.dragging = !0, e.currentTarget.setPointerCapture(e.pointerId), this.pick(e);
  }
  render() {
    const { hue: e, sat: t } = Ce(this.value), i = e * Math.PI / 180, s = 50 + 50 * t * Math.sin(i), r = 50 - 50 * t * Math.cos(i);
    return c`
      <div
        class="wheel"
        @pointerdown=${this.onDown}
        @pointermove=${(n) => this.dragging && this.pick(n)}
        @pointerup=${() => this.dragging = !1}
        @pointercancel=${() => this.dragging = !1}
      >
        <div class="marker" style="left:${s}%;top:${r}%;background:#${this.value}"></div>
      </div>
      <h3>${this.whitesLabel}</h3>
      <div class="whites">
        ${Me.map((n) => {
      const o = Pe(n);
      return c`<button class=${o === this.value ? "on" : ""} style="background:#${o}" @click=${() => this.emit(o)}>
            ${n} K
          </button>`;
    })}
      </div>
    `;
  }
};
j.styles = Y`
    :host { display: block; }
    .wheel {
      position: relative; width: min(100%, 240px); aspect-ratio: 1; margin: 0 auto; border-radius: 50%;
      background: radial-gradient(closest-side, #fff, #fff0),
        conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
      touch-action: none; cursor: crosshair;
    }
    .marker {
      position: absolute; width: 22px; height: 22px; margin: -13px 0 0 -13px; border-radius: 50%;
      border: 2px solid #fff; box-shadow: 0 0 0 1px #0006, 0 1px 4px #0006; pointer-events: none;
    }
    h3 { font-size: 14px; font-weight: 500; margin: 12px 0 6px; color: var(--secondary-text-color); }
    .whites { display: flex; flex-wrap: wrap; gap: 6px; }
    .whites button {
      font: inherit; font-size: 12px; min-width: 52px; padding: 6px 4px; border-radius: 8px; cursor: pointer;
      border: 1px solid var(--divider-color, #ccc); color: #000;
    }
    @media (pointer: coarse) {
      .wheel { width: min(100%, 280px); }
      .marker { width: 30px; height: 30px; margin: -17px 0 0 -17px; }
      .whites { gap: 10px; }
      .whites button { min-height: 44px; min-width: 60px; }
    }
    .whites button.on { outline: 3px solid var(--primary-color); outline-offset: 1px; }
  `;
ct([
  b()
], j.prototype, "value", 2);
ct([
  b({ attribute: !1 })
], j.prototype, "whitesLabel", 2);
j = ct([
  Z("sbs-light-picker")
], j);
var Te = Object.defineProperty, Re = Object.getOwnPropertyDescriptor, x = (e, t, i, s) => {
  for (var r = s > 1 ? void 0 : s ? Re(t, i) : t, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (r = (s ? o(t, i, r) : o(r)) || r);
  return s && r && Te(t, i, r), r;
};
const Oe = ["sections", "gradient", "section_gradient", "mirror", "corner_accent"], He = 4, ze = ["gradient", "section_gradient", "mirror"];
let v = class extends C {
  constructor() {
    super(...arguments), this.brush = "ff0000", this.disabled = !1, this.maxSteps = 60, this.previewing = !1, this.template = "sections", this.palette = ["ff0000", "0000ff"], this.steps = 6, this.accentWidth = 1;
  }
  get request() {
    return { template: this.template, colors: this.palette, steps: this.steps, accent_width: this.accentWidth };
  }
  get valid() {
    return this.palette.length >= (this.template === "corner_accent" ? 2 : 1);
  }
  emit(e) {
    this.dispatchEvent(new CustomEvent(e, { detail: this.request }));
  }
  updated(e) {
    ["template", "palette", "steps", "accentWidth"].some((i) => e.has(i)) && this.previewing && this.valid && this.emit("template-preview");
  }
  render() {
    const e = this.t;
    return c`
      <div class="row">
        ${Oe.map(
      (t) => c`<button class=${t === this.template ? "on" : ""} @click=${() => this.template = t}>${e(`tpl_${t}`)}</button>`
    )}
      </div>
      <p class="hint">${e(`tplHint_${this.template}`)}</p>
      <div class="row">
        ${this.palette.map(
      (t, i) => c`<button class="chip" style="background:#${t}" title=${e("remove")}
            @click=${() => this.palette = this.palette.filter((s, r) => r !== i)}><span>✕</span></button>`
    )}
        <button ?disabled=${this.palette.length >= He} @click=${() => this.palette = [...this.palette, this.brush]}>
          + ${e("addBrush")}
        </button>
      </div>
      ${ze.includes(this.template) ? c`<div class="row"><label>${e("steps")}
            <input type="range" min="2" max=${this.maxSteps} .value=${String(Math.min(this.steps, this.maxSteps))} @input=${(t) => this.steps = Number(t.target.value)} />
            ${this.steps}</label></div>
            <p class="hint">${e("stepsHint")}</p>` : p}
      ${this.template === "corner_accent" ? c`<div class="row"><label>${e("accentWidth")}
            <input type="range" min="0" max="8" .value=${String(this.accentWidth)} @input=${(t) => this.accentWidth = Number(t.target.value)} />
            ±${this.accentWidth}</label></div>` : p}
      <div class="row">
        <button class=${this.previewing ? "on" : ""} ?disabled=${!this.valid} @click=${() => this.emit("template-preview")}>
          ${e("previewTemplate")}
        </button>
        <button class="primary" ?disabled=${this.disabled || !this.valid} @click=${() => this.emit("template-apply")}>
          ${e("applyTemplate")}
        </button>
      </div>
    `;
  }
};
v.styles = Y`
    :host { display: grid; gap: 8px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    button { font: inherit; border: 1px solid var(--divider-color, #ccc); background: var(--card-background-color, #fff); color: inherit; border-radius: 8px; padding: 6px 10px; min-height: 36px; cursor: pointer; touch-action: manipulation; }
    button.on, button.primary { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
    button:disabled { opacity: 0.5; cursor: default; }
    .chip { position: relative; width: 32px; height: 32px; padding: 0; border-radius: 50%; }
    .chip span { position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; border-radius: 50%; font-size: 11px; line-height: 16px; background: var(--card-background-color, #fff); color: var(--primary-text-color); border: 1px solid var(--divider-color, #ccc); }
    .row label { flex: 1; }
    label { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    input[type="range"] { flex: 1; min-height: 32px; accent-color: var(--primary-color); }
    @media (pointer: coarse) {
      button { min-height: 44px; padding: 8px 12px; }
      .chip { width: 44px; height: 44px; }
      .chip span { width: 22px; height: 22px; line-height: 22px; font-size: 13px; }
      input[type="range"] { min-height: 44px; }
    }
    .hint { color: var(--secondary-text-color); font-size: 14px; margin: 0; }
  `;
x([
  b({ attribute: !1 })
], v.prototype, "t", 2);
x([
  b()
], v.prototype, "brush", 2);
x([
  b({ type: Boolean })
], v.prototype, "disabled", 2);
x([
  b({ type: Number })
], v.prototype, "maxSteps", 2);
x([
  b({ type: Boolean })
], v.prototype, "previewing", 2);
x([
  u()
], v.prototype, "template", 2);
x([
  u()
], v.prototype, "palette", 2);
x([
  u()
], v.prototype, "steps", 2);
x([
  u()
], v.prototype, "accentWidth", 2);
v = x([
  Z("sbs-template-picker")
], v);
var De = Object.defineProperty, Ne = Object.getOwnPropertyDescriptor, m = (e, t, i, s) => {
  for (var r = s > 1 ? void 0 : s ? Ne(t, i) : t, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (r = (s ? o(t, i, r) : o(r)) || r);
  return s && r && De(t, i, r), r;
};
const Ue = [
  ["up", "↑"],
  ["right", "→"],
  ["down", "↓"],
  ["left", "←"]
], Be = 250, Ie = 12;
let f = class extends C {
  constructor() {
    super(...arguments), this.narrow = !1, this.strips = [], this.selectedId = "", this.draft = null, this.dirty = !1, this.selectedCorner = -1, this.calibrating = !1, this.busy = !1, this.message = "", this.mode = "layout", this.paintColors = null, this.brush = "ff0000", this.presetName = "", this.confirmDelete = "", this.previewColors = null, this.tool = "brush", this.previewRequest = 0, this.stopPreview = null, this.previewRunning = Promise.resolve(), this.paintRunning = Promise.resolve(), this.loaded = !1, this.strokeBase = null;
  }
  get t() {
    var e;
    return ve((e = this.hass) == null ? void 0 : e.language);
  }
  get liveDelay() {
    var e;
    return ((e = this.strip) == null ? void 0 : e.live_delay_ms) ?? Be;
  }
  get strip() {
    return this.strips.find((e) => e.entry_id === this.selectedId);
  }
  updated() {
    this.hass && !this.loaded && (this.loaded = !0, this.load());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.endCalibration(), this.flushPaint();
  }
  async run(e) {
    this.busy = !0, this.message = "";
    try {
      return await e();
    } catch (t) {
      this.message = `${this.t("error")}: ${t.message ?? t}`;
      return;
    } finally {
      this.busy = !1;
    }
  }
  async load(e = !1) {
    var i;
    const t = await this.run(() => se(this.hass));
    t && (this.strips = t, (!e || !this.strip) && this.select(((i = t[0]) == null ? void 0 : i.entry_id) ?? ""));
  }
  /** `pickMode`: ohne gespeichertes Layout mit dem Layout beginnen, sonst mit den Farben. */
  select(e, t = !0) {
    var i;
    this.endCalibration(), this.selectedId = e, t && (this.mode = this.strip && !this.strip.layout_saved ? "layout" : "paint"), this.draft = this.strip ? structuredClone(this.strip.layout) : null, this.dirty = !1, this.selectedCorner = -1, this.paintColors = (i = this.strip) != null && i.colors ? [...this.strip.colors] : null, this.confirmDelete = "", this.previewColors = null, this.mode === "paint" && this.ensureColors();
  }
  async setMode(e) {
    e !== this.mode && (e === "paint" ? await this.endCalibration() : await this.flushPaint(), this.previewColors = null, this.mode = e, e === "paint" && await this.ensureColors());
  }
  /** Malen braucht den echten Farbstand -- notfalls vom Strip lesen. */
  async ensureColors() {
    var e;
    (e = this.strip) != null && e.colors ? this.paintColors || (this.paintColors = [...this.strip.colors]) : await this.readColors();
  }
  replaceStrip(e) {
    this.strips = this.strips.map((t) => t.entry_id === e.entry_id ? e : t), e.entry_id === this.selectedId && e.colors && (this.paintColors = [...e.colors]);
  }
  setTool(e) {
    var t;
    this.tool = e, (t = this.renderRoot.querySelector("sbs-strip-view")) == null || t.clearRange();
  }
  cancelStroke() {
    this.strokeBase && this.setPaintColors(this.strokeBase), this.strokeBase = null;
  }
  paint(e) {
    if (!this.paintColors || this.paintColors[e] === this.brush) return;
    this.strokeBase ?? (this.strokeBase = [...this.paintColors]);
    const t = [...this.paintColors];
    t[e] = this.brush, this.setPaintColors(t);
  }
  paintRange({ from: e, to: t }) {
    this.paintColors && this.setPaintColors(this.paintColors.map((i, s) => s >= e && s <= t ? this.brush : i));
  }
  setPaintColors(e) {
    this.paintColors = e, window.clearTimeout(this.paintTimer), this.paintTimer = window.setTimeout(() => this.sendPaint(), this.liveDelay);
  }
  sendPaint() {
    return window.clearTimeout(this.paintTimer), this.paintRunning = this.paintRunning.then(async () => {
      var s;
      const e = this.paintColors, t = this.strip;
      if (!e || !t || e.join() === ((s = t.colors) == null ? void 0 : s.join())) return;
      await this.run(() => he(this.hass, t.entry_id, e)) && (this.strips = this.strips.map(
        (r) => r.entry_id === t.entry_id ? { ...r, colors: e, active_preset: this.matchPreset(r, e) } : r
      ));
    }), this.paintRunning;
  }
  async flushPaint() {
    this.paintTimer !== void 0 ? await this.sendPaint() : await this.paintRunning, this.paintTimer = void 0;
  }
  /** Vorlage vom Backend berechnen lassen (mit dem Layout-Entwurf) und live uebernehmen. */
  async applyTemplate(e) {
    if (!this.draft) return;
    const t = await this.run(() => wt(this.hass, this.selectedId, e, this.draft));
    t && (this.previewColors = null, this.setPaintColors(t.colors), await this.sendPaint());
  }
  /** Vorlage nur berechnen und im Panel zeigen; spaete Antworten ueberholter Anfragen verwerfen. */
  async previewTemplate(e) {
    if (!this.draft) return;
    const t = ++this.previewRequest, i = await wt(this.hass, this.selectedId, e, this.draft).catch((s) => {
      this.message = `${this.t("error")}: ${s.message ?? s}`;
    });
    i && t === this.previewRequest && (this.previewColors = i.colors);
  }
  applyPreview() {
    this.previewColors && (this.setPaintColors(this.previewColors), this.previewColors = null, this.sendPaint());
  }
  matchPreset(e, t) {
    const i = t.join();
    return Object.keys(e.presets).sort().find((s) => e.presets[s].join() === i) ?? null;
  }
  async presetAction(e, t) {
    await this.flushPaint();
    const i = { save: le, apply: ce, delete: pe }[e], s = await this.run(() => i(this.hass, this.selectedId, t));
    s && (this.replaceStrip(s), this.confirmDelete = "", e === "save" && (this.presetName = ""));
  }
  change(e) {
    this.draft = e, this.dirty = !0, this.calibrating && this.schedulePreview();
  }
  schedulePreview() {
    window.clearTimeout(this.previewTimer), this.previewTimer = window.setTimeout(() => {
      this.previewRunning = this.previewRunning.then(
        () => this.calibrating && this.draft ? this.run(() => ae(this.hass, this.selectedId, this.draft)) : void 0
      );
    }, this.liveDelay);
  }
  async toggleCalibration() {
    if (this.calibrating) return this.endCalibration();
    const e = await this.run(() => oe(this.hass, this.selectedId));
    e && (this.stopPreview = e, this.calibrating = !0, this.schedulePreview());
  }
  async endCalibration() {
    window.clearTimeout(this.previewTimer), this.calibrating = !1;
    const e = this.stopPreview;
    this.stopPreview = null, e && (await this.previewRunning, await e().catch(() => {
    }));
  }
  moveCorner(e, t) {
    if (!this.draft) return;
    const [i, s] = Rt(this.draft, e), r = Math.min(s, Math.max(i, t)), n = this.draft.corners.map((o, a) => a === e ? { ...o, index: r } : o);
    this.selectedCorner = e, this.change({ ...this.draft, corners: n });
  }
  async save() {
    !this.draft || await this.run(() => ne(this.hass, this.selectedId, this.draft)) === void 0 || (this.dirty = !1, this.message = this.t("saved"), await this.load(!0), this.draft = this.strip ? structuredClone(this.strip.layout) : this.draft);
  }
  async readColors() {
    const e = await this.run(() => re(this.hass, this.selectedId));
    e && this.replaceStrip(e);
  }
  renderCorners(e) {
    return c`${e.corners.map(
      (t, i) => c`<div class="corner ${i === this.selectedCorner ? "selected" : ""}" @click=${() => this.selectedCorner = i}>
        <span>${this.t("corner")} ${i + 1}</span>
        <span class="row">
          <button @click=${() => this.moveCorner(i, t.index - 1)}>−</button>
          <span>${this.t("segment")} ${t.index + 1}</span>
          <button @click=${() => this.moveCorner(i, t.index + 1)}>+</button>
        </span>
        <button @click=${() => this.change({ ...e, corners: e.corners.map((s, r) => r === i ? { ...s, turn: s.turn === "left" ? "right" : "left" } : s) })}>
          ${t.turn === "left" ? `↰ ${this.t("left")}` : `↱ ${this.t("right")}`}
        </button>
        <button title=${this.t("remove")} @click=${() => {
        this.selectedCorner = -1, this.change({ ...e, corners: e.corners.filter((s, r) => r !== i) });
      }}>✕</button>
      </div>`
    )}`;
  }
  render() {
    const e = this.strip, t = this.draft;
    return c`
      <div class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <span>${this.t("title")}</span>
      </div>
      <div class="content">
        ${!e || !t ? c`<div class="card">${this.busy ? "…" : this.t("noStrips")}</div>` : c`
              <div class="card">
                ${this.strips.length > 1 ? c`<div class="row" style="margin-bottom:8px">${this.strips.map(
      (i) => c`<button class=${i.entry_id === this.selectedId ? "on" : ""} @click=${() => this.select(i.entry_id)}>${i.title}</button>`
    )}</div>` : c`<h2 class="title">${e.title}</h2>`}
                ${this.previewColors ? c`<div class="banner">
                      <span>${this.t("previewBanner")}</span>
                      <button class="primary" ?disabled=${this.busy} @click=${this.applyPreview}>${this.t("applyToStrip")}</button>
                      <button @click=${() => this.previewColors = null}>${this.t("endPreview")}</button>
                    </div>` : p}
                <sbs-strip-view
                  class=${this.previewColors ? "previewing" : ""}
                  .layout=${t}
                  .colors=${this.previewColors ?? (this.mode === "paint" ? this.paintColors : this.calibrating ? me(t) : e.colors)}
                  .selected=${this.selectedCorner}
                  .mode=${this.previewColors ? "view" : this.mode}
                  .tool=${this.tool}
                  @segment-range=${(i) => this.paintRange(i.detail)}
                  @paint-end=${() => this.strokeBase = null}
                  @paint-cancel=${this.cancelStroke}
                  @segment-paint=${(i) => this.paint(i.detail)}
                  @corner-select=${(i) => this.selectedCorner = i.detail}
                  @corner-move=${(i) => this.moveCorner(i.detail.corner, i.detail.index)}
                ></sbs-strip-view>
                <div class="row">
                  ${this.mode === "paint" && !this.previewColors ? c`<div class="segmented">
                        <button class=${this.tool === "brush" ? "on" : ""} @click=${() => this.setTool("brush")}>✎\uFE0E ${this.t("toolBrush")}</button>
                        <button class=${this.tool === "range" ? "on" : ""} @click=${() => this.setTool("range")}>↔\uFE0E ${this.t("toolRange")}</button>
                      </div>` : p}
                  <button class="icon" title=${this.t("read")} aria-label=${this.t("read")} @click=${this.readColors} ?disabled=${this.busy || this.calibrating}>⟳\uFE0E</button>
                  <span class="status">${this.message || (this.dirty ? this.t("unsaved") : p)}</span>
                </div>
                ${this.mode === "paint" && this.tool === "range" && !this.previewColors ? c`<p class="hint small">${this.t("rangeHint")}</p>` : p}
              </div>
              <div class="card">
                <div class="tabs">
                  <button class=${this.mode === "paint" ? "on" : ""} @click=${() => this.setMode("paint")}>${this.t("paintTab")}</button>
                  <button class=${this.mode === "layout" ? "on" : ""} @click=${() => this.setMode("layout")}>${this.t("layoutTab")}</button>
                </div>
                ${this.mode === "paint" ? this.renderPaint(e) : this.renderLayout(t)}
              </div>
            `}
      </div>
    `;
  }
  renderPaint(e) {
    const t = [...new Set(this.paintColors ?? [])].slice(0, Ie), i = Object.keys(e.presets).sort();
    return c`
      <section class="group">
        <h2>${this.t("brush")}</h2>
        <p class="hint">${this.t("brushHint")}</p>
        <sbs-light-picker
          .value=${this.brush}
          .whitesLabel=${this.t("whites")}
          @color-change=${(s) => this.brush = s.detail}
        ></sbs-light-picker>
        <div class="row">
          <span class="swatch current" style="background:#${this.brush}"></span>
          <button ?disabled=${!this.paintColors} @click=${() => this.setPaintColors(this.paintColors.map(() => this.brush))}>${this.t("fillAll")}</button>
        </div>
        ${t.length ? c`<h3>${this.t("onStrip")}</h3>
              <div class="swatches">
                ${t.map(
      (s) => c`<button class="swatch ${s === this.brush ? "on" : ""}" style="background:#${s}" title="#${s}" @click=${() => this.brush = s}></button>`
    )}
              </div>` : p}
      </section>
      <section class="group">
        <h2>${this.t("presets")}</h2>
        ${i.length ? p : c`<p class="hint">${this.t("noPresets")}</p>`}
        ${i.map((s) => {
      const r = e.presets[s], n = r.map((o, a) => `#${o} ${a / r.length * 100}% ${(a + 1) / r.length * 100}%`).join(", ");
      return c`<div class="preset ${e.active_preset === s ? "active" : ""}">
            <div>
              <div class="name">${s}${e.active_preset === s ? c` <span class="status">· ${this.t("active")}</span>` : p}</div>
              <div class="bar" style="background:linear-gradient(to right, ${n})"></div>
            </div>
            <button ?disabled=${this.busy} @click=${() => this.presetAction("apply", s)}>${this.t("apply")}</button>
            ${this.confirmDelete === s ? c`<button class="primary" @click=${() => this.presetAction("delete", s)}>${this.t("confirmDelete")}</button>` : c`<button title=${this.t("remove")} @click=${() => this.confirmDelete = s}>✕</button>`}
          </div>`;
    })}
        <div class="row">
          <input type="text" placeholder=${this.t("presetName")} .value=${this.presetName}
            @input=${(s) => this.presetName = s.target.value}
            @keydown=${(s) => s.key === "Enter" && this.presetName.trim() && this.presetAction("save", this.presetName.trim())} />
          <button class="primary" ?disabled=${!this.presetName.trim() || this.busy} @click=${() => this.presetAction("save", this.presetName.trim())}>
            ${this.t("savePreset")}
          </button>
        </div>
      </section>
      <section class="group">
        <h2>${this.t("templates")}</h2>
        <sbs-template-picker
          .t=${this.t}
          .brush=${this.brush}
          .maxSteps=${e.segment_count}
          .previewing=${this.previewColors !== null}
          @template-preview=${(s) => this.previewTemplate(s.detail)}
          ?disabled=${!this.paintColors || this.busy}
          @template-apply=${(s) => this.applyTemplate(s.detail)}
        ></sbs-template-picker>
      </section>
    `;
  }
  renderLayout(e) {
    return c`
      <section class="group">
        <h2>${this.t("start")}</h2>
        <div class="row">
          ${Ue.map(
      ([t, i]) => c`<button class=${e.start_direction === t ? "on" : ""} @click=${() => this.change({ ...e, start_direction: t })}>${i}</button>`
    )}
        </div>
      </section>
      <section class="group">
        <h2>${this.t("corners")}</h2>
        ${this.renderCorners(e)}
        <div class="row">
          <button @click=${() => {
      const t = fe(e);
      t && this.change(t);
    }}>+ ${this.t("addCorner")}</button>
        </div>
      </section>
      <section class="group">
        <h2>${this.t("calibrate")}</h2>
        <p class="hint">${this.t("calibrateHint")}</p>
        <div class="row">
          <button class=${this.calibrating ? "on" : ""} @click=${this.toggleCalibration} ?disabled=${this.busy && !this.calibrating}>
            ${this.calibrating ? this.t("calibrating") : this.t("calibrate")}
          </button>
        </div>
      </section>
      <div class="row actions">
        <button class="primary" @click=${this.save} ?disabled=${!this.dirty || this.busy}>${this.t("save")}</button>
        <button @click=${() => this.select(this.selectedId, !1)} ?disabled=${!this.dirty}>${this.t("discard")}</button>
      </div>
    `;
  }
};
f.styles = Y`
    :host { display: block; background: var(--primary-background-color); color: var(--primary-text-color); min-height: 100vh; }
    .toolbar { display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 12px; background: var(--app-header-background-color, var(--primary-color)); color: var(--app-header-text-color, #fff); font-size: 20px; }
    .content { padding: 16px; max-width: 1100px; margin: 0 auto; display: grid; gap: 16px; }
    .card { background: var(--card-background-color, #fff); border-radius: var(--ha-card-border-radius, 12px); box-shadow: var(--ha-card-box-shadow, 0 1px 3px #0002); padding: 16px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    h2 { font-size: 16px; margin: 0 0 8px; font-weight: 500; }
    button { font: inherit; border: 1px solid var(--divider-color, #ccc); background: var(--card-background-color, #fff); color: inherit; border-radius: 8px; padding: 6px 12px; min-height: 36px; cursor: pointer; touch-action: manipulation; }
    .segmented { display: inline-flex; }
    .segmented button { border-radius: 0; }
    .segmented button:first-child { border-radius: 8px 0 0 8px; }
    .segmented button:last-child { border-radius: 0 8px 8px 0; }
    button.primary, button.on { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
    button:disabled { opacity: 0.5; cursor: default; }
    .corner { display: grid; grid-template-columns: 70px auto auto auto; align-items: center; gap: 8px; padding: 4px; border-radius: 8px; }
    .corner.selected { background: var(--secondary-background-color, #0001); }
    .tabs { display: flex; gap: 4px; margin-bottom: 12px; }
    .tabs button { flex: 1; }
    .swatches { display: flex; flex-wrap: wrap; gap: 6px; }
    .swatch { width: 32px; height: 32px; min-height: 0; padding: 0; border-radius: 50%; }
    .swatch.on { outline: 3px solid var(--primary-color); outline-offset: 2px; }
    .swatch.current { display: inline-block; width: 36px; height: 36px; border: 1px solid var(--divider-color, #ccc); box-sizing: border-box; }
    input[type="text"] { font: inherit; flex: 1; min-width: 0; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--divider-color, #ccc); background: var(--card-background-color, #fff); color: inherit; }
    .preset { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 8px; padding: 6px 4px; }
    .preset .bar { height: 10px; border-radius: 5px; margin-top: 4px; }
    .preset.active .name { font-weight: 600; }
    .group { border: 1px solid var(--divider-color, #0002); border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; display: grid; gap: 8px; }
    .group:last-child { margin-bottom: 0; }
    .group h2 { margin: 0; }
    .group .hint { margin: 0; }
    h3 { font-size: 14px; font-weight: 500; margin: 4px 0 0; color: var(--secondary-text-color); }
    .actions { margin-top: 4px; }
    .banner { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 8px; border-radius: 10px; border: 1px dashed var(--primary-color); color: var(--primary-text-color); }
    .banner span { flex: 1; font-size: 14px; }
    sbs-strip-view.previewing { outline: 1px dashed var(--primary-color); outline-offset: 4px; border-radius: 8px; }
    .hint, .status { color: var(--secondary-text-color); font-size: 14px; }
    @media (min-width: 900px) { .content { grid-template-columns: 2fr 1fr; } }
    /* Finger: groessere Tippflaechen (mind. 44 px), mehr Abstand. */
    @media (pointer: coarse) {
      button { min-height: 44px; padding: 8px 14px; }
      .row { gap: 10px; }
      .swatches { gap: 10px; }
      .swatch { width: 44px; height: 44px; }
      .corner { grid-template-columns: 1fr auto; row-gap: 6px; }
      .corner .row button { min-width: 44px; }
      input[type="text"] { min-height: 44px; font-size: 16px; }
      .preset { padding: 8px 4px; }
      .preset .bar { height: 14px; }
    }
    button.icon { font-size: 18px; min-width: 44px; padding: 6px 10px; }
    .hint.small { font-size: 13px; margin: 6px 0 0; }
    /* Schmal: kompakte Strip-Karte, die beim Scrollen oben stehen bleibt. */
    @media (max-width: 899px) {
      .content { padding: 8px; gap: 8px; }
      .card { padding: 12px; }
      .content > .card:first-child { position: sticky; top: 0; z-index: 2; padding: 8px 12px 10px; }
      .content > .card:first-child .title { font-size: 14px; margin: 0 0 4px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .content > .card:first-child .row { flex-wrap: nowrap; }
      .content > .card:first-child .status { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      sbs-strip-view { --sbs-strip-max-height: 30vh; }
      .group { padding: 10px 12px; }
    }
  `;
m([
  b({ attribute: !1 })
], f.prototype, "hass", 2);
m([
  b({ type: Boolean })
], f.prototype, "narrow", 2);
m([
  u()
], f.prototype, "strips", 2);
m([
  u()
], f.prototype, "selectedId", 2);
m([
  u()
], f.prototype, "draft", 2);
m([
  u()
], f.prototype, "dirty", 2);
m([
  u()
], f.prototype, "selectedCorner", 2);
m([
  u()
], f.prototype, "calibrating", 2);
m([
  u()
], f.prototype, "busy", 2);
m([
  u()
], f.prototype, "message", 2);
m([
  u()
], f.prototype, "mode", 2);
m([
  u()
], f.prototype, "paintColors", 2);
m([
  u()
], f.prototype, "brush", 2);
m([
  u()
], f.prototype, "presetName", 2);
m([
  u()
], f.prototype, "confirmDelete", 2);
m([
  u()
], f.prototype, "previewColors", 2);
m([
  u()
], f.prototype, "tool", 2);
f = m([
  Z("switchbot-segments-panel")
], f);
export {
  f as SwitchbotSegmentsPanel
};
