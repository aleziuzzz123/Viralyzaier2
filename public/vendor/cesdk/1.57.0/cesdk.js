var fe = Object.defineProperty;
var ue = (n, t, e) => t in n ? fe(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : n[t] = e;
var j = (n, t, e) => (ue(n, typeof t != "symbol" ? t + "" : t, e), e);
import { E as pe, I as ge, S as we } from "./enum-Dm_29iV8.js";
import { r as S } from "./react-Dm_k2Vz7.js";
import { c as N } from "./copilot-5x__Ze35.js";
var W;
(function(n) {
  n.ARRAY = "array", n.BOOL = "bool", n.ENUM = "enum", n.FLOAT = "float", n.INT = "int", n.OBJECT = "object", n.STRING = "string";
})(W || (W = {}));
const _e = {
  get: () => Promise.resolve({
    id: "com.img.ly.asset.source.main",
    label: "Main",
    findAssets: () => Promise.resolve({
      assets: [],
      total: 0,
      currentPage: 1,
      nextPage: void 0
    }),
    credits: {
      enabled: !1
    },
    license: {
      enabled: !1
    }
  })
};
class A {
  static track(t) {
  }
}
class ye {
  constructor() {
    this.entries = new Map();
  }
  set(t, e) {
    let s = this.entries.get(t);
    return s || (s = new Set(), this.entries.set(t, s)), s.add(e), this;
  }
  get(t) {
    const e = this.entries.get(t);
    return e ? [...e] : [];
  }
  delete(t, e) {
    const s = this.entries.get(t);
    return s ? (s.delete(e), s.size === 0 && this.entries.delete(t), !0) : !1;
  }
}
const xe = "warn";
function F() {
}
class b {
  constructor(t = {}) {
    this._options = t, this._emitter = new N.EventEmitter(), this._disposed = !1;
  }
  get disposed() {
    return this._disposed;
  }
  dispose() {
    this._disposed || (this._disposed = !0, this._emitter.emit("dispose"));
  }
  onDispose(t) {
    return this._emitter.on("dispose", t);
  }
  log(t, e, s) {
    var r, i;
    const o = (i = (r = this._options) == null ? void 0 : r.logLevel) != null ? i : xe;
    o === "silent" || o === "warn" && t === "info" || (t === "info" ? F(e, s) : F(e, s));
  }
}
const D = (n, t) => {
  const e = new AbortController(), s = {
    ...t,
    signal: e.signal
  };
  return Object.defineProperty(s, "abort", {
    value: e.abort.bind(e)
  }), n.addEventListener("dispose", () => e.abort(), {
    once: !0
  }), s;
}, z = (n, t) => {
  const e = D(n, t);
  return {
    ...e,
    signal: n.disposed ? AbortSignal.abort() : e.signal
  };
};
class Se extends b {
  constructor(t, e = "get") {
    super(), this.url = t, this.method = e;
  }
  async send(t) {
    const e = z(this, t);
    e.signal.aborted && A.track(new Error("Request aborted before sending")), e.method = this.method, e.body && (e.headers = {
      ...e.headers,
      "Content-Type": "application/json"
    });
    const s = await fetch(this.url, e);
    if (!s.ok) {
      const r = new Error(`HTTP error ${s.status}`);
      throw r.response = s, r;
    }
    const o = s.headers.get("Content-Type");
    return o && o.includes("application/json") ? await s.json() : await s.text();
  }
}
const be = {
  baseURL: "/",
  core: {
    baseURL: "core/"
  }
}, Ve = "https://cdn.img.ly/packages/imgly/cesdk-js/1.57.0/assets";
var O = class extends b {
  constructor(t, e, s = {}) {
    super(s), this.engine = t, this.domElement = e;
  }
}
const C_UNUSED = (n) => n, Ee = (n, t) => (n = {
  ...n
}, t.forEach((e) => {
  n[e] = !1;
}), n), Me = (n, t) => (n = {
  ...n
}, Object.entries(t).forEach(([e, s]) => {
  s && (n[e] = s);
}), n);
class m {
  constructor() {
    j(this, "modified", !1), j(this, "disposed", !1), j(this, "emitter", new N.EventEmitter());
  }
  dispose() {
    this.disposed || (this.disposed = !0, this.emitter.emit("dispose"));
  }
  onDispose(t) {
    return this.emitter.on("dispose", t);
  }
  onEvent(t, e) {
    return this.emitter.on(t, e);
  }
  emitEvent(t, ...e) {
    this.emitter.emit(t, ...e);
  }
  destroy() {
    this.dispose();
  }
}
class L extends m {
  constructor(t) {
    super(), this.engine = t;
  }
}
class Ae extends L {
  constructor(t) {
    super(t);
  }
}
class Ie extends L {
  constructor(t) {
    super(t);
  }
}
var Ce = class extends L {
  constructor(t) {
    super(t);
  }
}
class Ne extends L {
  constructor(t) {
    super(t);
  }
}
class ke extends L {
  constructor(t) {
    super(t);
  }
}
class Oe extends L {
  constructor(t) {
    super(t);
  }
}
class Te extends L {
  constructor(t) {
    super(t);
  }
}
class De extends L {
  constructor(t) {
    super(t);
  }
}
class je extends L {
  constructor(t) {
    super(t);
  }
}
class I {
  constructor(t) {
    this.engine = t;
  }
}
var C = class extends I {
  constructor(e, s) {
    super(e), this.config = s;
  }
}
O = class extends C {
  constructor(e, s) {
    super(e, s), this._init();
  }
  _init() {
    this.engine.editor.onStateChanged(async () => {
      this.active && (await this.apply(), this.render());
    });
  }
}
A = class extends O {
  constructor(e, s) {
    super(e, s), this.active = !1;
  }
  enable() {
    this.active || (this.active = !0, this.apply(), this.render());
  }
  disable() {
    this.active && (this.active = !1, this.render());
  }
  apply() {
  }
  render() {
  }
  onEvent(e, s) {
    return this.engine.editor.onEvent(e, s);
  }
  dispose() {
    this.disable();
  }
}
S = class extends A {
  constructor(e, s) {
    super(e, s), this.draggable = !1;
  }
  dispose() {
    super.dispose(), this.element && (this.element.remove(), this.element = void 0);
  }
  render() {
    if (this.element && this.element.style) {
      const e = this.element.style;
      e.pointerEvents = this.active ? "auto" : "none", e.opacity = this.active ? "1" : "0", this.visible = this.active;
    }
  }
  setDraggable(e) {
    this.draggable !== e && (this.draggable = e, this.element.setAttribute("draggable", this.draggable ? "true" : "false"));
  }
}
b = class extends S {
  constructor(e, s) {
    super(e, s), this.name = s.name, this.element = document.createElement("div"), this.element.id = `ubq-ce-canvas-sensor-${this.name}`, this.element.style.position = "absolute", this.element.style.top = "0", this.element.style.left = "0", this.element.style.width = "100%", this.element.style.height = "100%", this.element.style.pointerEvents = "none", this.element.style.opacity = "0", this.element.style.transition = "opacity 0.2s ease-in-out", e.editor.getCanvasContainer().appendChild(this.element);
  }
}
class V extends S {
  constructor(e, s) {
    super(e, s);
    const o = e.editor.getCanvasContainer();
    if (!o)
      throw new Error("Canvas container not found.");
    this.container = o, this.element = this.container.appendChild(document.createElement("div")), this.element.style.position = "absolute";
  }
  apply() {
    this.engine.editor.getCanvasTransform();
  }
  dispose() {
    super.dispose(), this.element.remove();
  }
}
class P extends L {
  constructor(t) {
    super(t);
  }
}
class M extends L {
  constructor(t) {
    super(t);
  }
}
C = class extends m {
  constructor(t, e) {
    super(), this.parent = t, this.schema = e;
  }
  get id() {
    return this.schema.id;
  }
  get type() {
    return this.schema.type;
  }
  get meta() {
    return this.schema.meta;
  }
  get(t) {
    return this.meta[t];
  }
}
C = class extends C {
  constructor() {
    super(...arguments);
  }
}
O = class extends C {
  constructor(e) {
    super(e, {
      id: "ly.img.ubq/text",
      type: W.STRING,
      meta: {}
    });
  }
}
C = class extends L {
  constructor(t) {
    super(t);
  }
}
const U = "https://api.img.ly/user-interface/v1/external-config", $ = "https://api.img.ly/user-interface/v1/config", q = "https://api.img.ly/user-interface/v1/credits";
class Pe extends b {
  constructor(t) {
    super(), j(this, "config"), j(this, "emitter", new N.EventEmitter());
    const {
      config: e,
      version: s
    } = t;
    this.config = {
      ...t.config,
      version: s,
      baseURL: t.baseURL
    };
  }
  static async create(t) {
    return new Pe(t);
  }
  onEvent(t, e) {
    return this.emitter.on(t, e);
  }
  async getExternalConfig() {
    const t = new Se(U);
    return t.send({
      body: JSON.stringify({
        version: this.config.version,
        channel: "stable"
      })
    });
  }
  async getConfig(t, e = "web") {
    const s = this.config.baseURL, o = new Se(`${s}/config.json`);
    return o.send();
  }
  async getCredits(t) {
    const e = new Se(q);
    return e.send({
      headers: {
        Authorization: `Bearer ${t}`
      }
    });
  }
}
const Fe = {
  findAssets: async () => ({
    assets: [],
    total: 0,
    currentPage: 0
  })
};
class B extends b {
  constructor(t, e) {
    super(t), this._id = e, this._assetSources = new Map(), this._assetSourceCache = new Map();
  }
  addSource(t) {
    this._assetSources.set(t.id, t);
  }
  removeSource(t) {
    this._assetSources.delete(t);
  }
  async getSource(t) {
    if (this._assetSourceCache.has(t))
      return this._assetSourceCache.get(t);
    if (!this._assetSources.has(t))
      throw new Error(`Asset source with id ${t} not found`);
    const s = await this._assetSources.get(t).get(this);
    return s.findAssets = s.findAssets.bind(s), this._assetSourceCache.set(t, s), s;
  }
  async findAssets(t, e) {
    const s = typeof t == "string" ? await this.getSource(t) : t;
    return s.findAssets(e);
  }
}
const Y = {
  NONE: "none",
  VERTICAL: "vertical",
  HORIZONTAL: "horizontal",
  BOTH: "both"
}, G = {
  TOP_LEFT: "top-left",
  TOP_CENTER: "top-center",
  TOP_RIGHT: "top-right",
  CENTER_LEFT: "center-left",
  CENTER: "center",
  CENTER_RIGHT: "center-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_CENTER: "bottom-center",
  BOTTOM_RIGHT: "bottom-right"
}, K = {
  TOP_LEFT: "top-left",
  TOP: "top",
  TOP_RIGHT: "top-right",
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM: "bottom",
  BOTTOM_RIGHT: "bottom-right"
};
var Z = /* @__PURE__ */ ((n) => (n.Percent = "Percent", n.Pixel = "Pixel", n))(Z || {});
const X = {
  TOP_LEFT: "TopLeft",
  TOP_CENTER: "TopCenter",
  TOP_RIGHT: "TopRight",
  CENTER_LEFT: "CenterLeft",
  CENTER: "Center",
  CENTER_RIGHT: "CenterRight",
  BOTTOM_LEFT: "BottomLeft",
  BOTTOM_CENTER: "BottomCenter",
  BOTTOM_RIGHT: "BottomRight"
}, J = {
  FILL: "Fill",
  FIT: "Fit"
};
var E = /* @__PURE__ */ ((n) => (n.TOP = "Top", n.CENTER = "Center", n.BOTTOM = "Bottom", n))(E || {});
var V = /* @__PURE__ */ ((n) => (n.LEFT = "Left", n.CENTER = "Center", n.RIGHT = "Right", n))(V || {});
var T = /* @__PURE__ */ ((n) => (n.HORIZONTAL = "Horizontal", n.VERTICAL = "Vertical", n))(T || {});
const Q = {
  DEGREES: "Degrees",
  RADIANS: "Radians"
}, ee = {
  ADD: "Add",
  DARKEN: "Darken",
  COLOR_BURN: "ColorBurn",
  LIGHTEN: "Lighten",
  COLOR_DODGE: "ColorDodge",
  SCREEN: "Screen",
  OVERLAY: "Overlay",
  SOFT_LIGHT: "SoftLight",
  HARD_LIGHT: "HardLight",
  DIFFERENCE: "Difference",
  EXCLUSION: "Exclusion",
  MULTIPLY: "Multiply",
  HUE: "Hue",
  SATURATION: "Saturation",
  COLOR: "Color",
  LUMINOSITY: "Luminosity",
  NORMAL: "Normal"
}, te = {
  ...we,
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  UNKNOWN: "unknown"
}, se = "1.57.0";
class R extends m {
  constructor() {
    super();
  }
}
class ne extends Error {
  constructor(t, e) {
    super(e), this.name = "CreativeEngineError", this.code = t, Object.setPrototypeOf(this, new.target.prototype);
  }
}
class oe extends b {
  constructor(t) {
    super(t);
  }
  async load(t) {
    const {
      domElement: e,
      config: s
    } = t, o = {
      ...be,
      ...s
    };
    try {
      this.log("info", "CreativeEngine load started"), this.log("info", "configuration", o), A.track("SDK: Load", {
        version: se
      });
      const i = document.createElement("canvas");
      e.appendChild(i), this.log("info", "canvas created");
      const a = await this.loadWasm(o);
      this.log("info", "engine loaded");
      const h = new R(this, a, i, {
        logLevel: o == null ? void 0 : o.logLevel
      });
      return await h.init(), this.log("info", "engine initialized"), h;
    } catch (r) {
      if (e.replaceChildren(), r instanceof ne)
        throw r;
      throw new ne(
        ge.UNHANDLED_EXCEPTION,
        r
      );
    }
  }
  loadWasm(t) {
    return new Promise((e, s) => {
      const o = t.core.baseURL, r = new URL(o, t.baseURL);
      this.log("info", "engine base path", r.href);
      const i = `${r.href.replace(/\/$/, "")}/`, a = (l) => {
        var d;
        (d = l.stack) != null && d.includes("out of memory") && (console.error(l), s(new ne(pe.WASM_OUT_OF_MEMORY)));
      }, h = {
        locateFile: (l) => {
          if (l.endsWith(".wasm")) {
            const d = new URL(l, i).href;
            return this.log("info", "locating wasm", d), d;
          }
          return l;
        },
        onAbort: (l) => {
          a(l);
        },
        onExit: (l) => {
          this.log("info", "engine exited", l);
        },
        onRuntimeInitialized: () => {
          this.log("info", "engine runtime initialized");
        },
        print: (l) => {
          this.log("info", l);
        },
        printErr: (l) => {
          a(new Error(l));
        }
      };
      if (typeof window > "u")
        s(new ne(pe.ENVIRONMENT_UNSUPPORTED));
      else {
        const d = document.createElement("script");
        d.src = new URL("engine.js", i).href, d.async = !0, d.onload = () => {
          this.log("info", "engine script loaded");
          const u = window.CreativeEngine;
          if (!u) {
            s(new ne(pe.WASM_LOAD_FAILED));
            return;
          }
          u(h).then((c) => {
            this.log("info", "engine instance created"), e(c);
          }).catch((c) => {
            s(c);
          });
        }, d.onerror = (u) => {
          console.error(u), s(new ne(pe.WASM_LOAD_FAILED));
        }, document.body.appendChild(d);
      }
    });
  }
}
class re {
  static init(t, e) {
    const s = new oe(e);
    return s.load({
      domElement: t,
      config: e
    });
  }
}
export {
  O as Ad,
  b as AdSlot,
  P as Adjustment,
  Ie as Animation,
  W as APPEARANCE_PROPERTY_TYPE,
  L as Api,
  B as AssetApi,
  _e as AssetSource,
  Fe as AssetSourceStub,
  ye as BiMultiMap,
  Te as Block,
  C as BlockType,
  I as Canvas,
  V as CanvasOverlay,
  A as CanvasSensor,
  re as default,
  re as CreativeEngine,
  se as CreativeEngineVersion,
  S as DOMElement,
  R as Engine,
  Z as EnumDimensionUnit,
  E as EnumImageBlockVerticalAlign,
  V as EnumImageBlockHorizontalAlign,
  T as EnumLayout,
  J as EnumTextFillMode,
  G as EnumTransformationPosition,
  K as EnumTransformationSpot,
  X as EnumVectorPathPosition,
  Q as EnumAngleUnit,
  ee as EnumBlendMode,
  te as EnumMimeType,
  m as EventManager,
  O as Export,
  oe as F,
  C as Fill,
  Ne as Font,
  De as Operation,
  M as Page,
  je as Parameter,
  I as Property,
  O as PropertyAppearance,
  C as PropertyType,
  O as StringProperty,
  ke as Scene,
  Ce as Settings,
  Ae as Shape,
  De as Stack,
  C as Stroke,
  Oe as StyleKit,
  b as UI,
  O as UIAd,
  A as UIAdSlot,
  S as UIElement,
  V as UICanvasOverlay,
  b as UICanvasSensor,
  C as Variable,
  C as VectorPath,
  Pe as V,
  D as withAbort,
  z as withDispose
};
//# sourceMappingURL=index.js.map