import * as d from "https://unpkg.com/pixi.js@^8.5.2?module";
import { Filter as ci, deprecation as hi, GpuProgram as di, GlProgram as ui, Color as pi } from "https://unpkg.com/pixi.js@^8.5.2?module";
import * as fi from "https://unpkg.com/howler@^2.2.4?module";
import * as Ie from "https://unpkg.com/opentype.js@^1.3.4?module";
import { FFmpeg as gi } from "https://unpkg.com/@ffmpeg/ffmpeg@^0.12.15?module";
class mi {
  curves = {};
  constructor() {
    this.initializeCurves();
  }
  initializeCurves() {
    this.curves = {
      ease: [
        [0.25, 0.1],
        [0.25, 1]
      ],
      easeIn: [
        [0.42, 0],
        [1, 1]
      ],
      easeOut: [
        [0, 0],
        [0.58, 1]
      ],
      easeInOut: [
        [0.42, 0],
        [0.58, 1]
      ],
      easeInQuad: [
        [0.55, 0.085],
        [0.68, 0.53]
      ],
      easeInCubic: [
        [0.55, 0.055],
        [0.675, 0.19]
      ],
      easeInQuart: [
        [0.895, 0.03],
        [0.685, 0.22]
      ],
      easeInQuint: [
        [0.755, 0.05],
        [0.855, 0.06]
      ],
      easeInSine: [
        [0.47, 0],
        [0.745, 0.715]
      ],
      easeInExpo: [
        [0.95, 0.05],
        [0.795, 0.035]
      ],
      easeInCirc: [
        [0.6, 0.04],
        [0.98, 0.335]
      ],
      easeInBack: [
        [0.6, -0.28],
        [0.735, 0.045]
      ],
      easeOutQuad: [
        [0.25, 0.46],
        [0.45, 0.94]
      ],
      easeOutCubic: [
        [0.215, 0.61],
        [0.355, 1]
      ],
      easeOutQuart: [
        [0.165, 0.84],
        [0.44, 1]
      ],
      easeOutQuint: [
        [0.23, 1],
        [0.32, 1]
      ],
      easeOutSine: [
        [0.39, 0.575],
        [0.565, 1]
      ],
      easeOutExpo: [
        [0.19, 1],
        [0.22, 1]
      ],
      easeOutCirc: [
        [0.075, 0.82],
        [0.165, 1]
      ],
      easeOutBack: [
        [0.175, 0.885],
        [0.32, 1.275]
      ],
      easeInOutQuad: [
        [0.455, 0.03],
        [0.515, 0.955]
      ],
      easeInOutCubic: [
        [0.645, 0.045],
        [0.355, 1]
      ],
      easeInOutQuart: [
        [0.77, 0],
        [0.175, 1]
      ],
      easeInOutQuint: [
        [0.86, 0],
        [0.07, 1]
      ],
      easeInOutSine: [
        [0.445, 0.05],
        [0.55, 0.95]
      ],
      easeInOutExpo: [
        [1, 0],
        [0, 1]
      ],
      easeInOutCirc: [
        [0.785, 0.135],
        [0.15, 0.86]
      ],
      easeInOutBack: [
        [0.68, -0.55],
        [0.265, 1.55]
      ]
    };
  }
  getValue(t, e, i, s) {
    const n = this.curves[s ?? ""] ?? this.curves.ease, [[a, o], [l, c]] = n, h = i + (3 * a - 3 * l + 1) * i * (1 - i), p = t, f = t + (e - t) * o, y = t + (e - t) * c, S = e, b = h, O = 1 - b;
    return O ** 3 * p + 3 * O ** 2 * b * f + 3 * O * b ** 2 * y + b ** 3 * S;
  }
}
class R {
  property;
  length;
  cubicBuilder;
  constructor(t, e, i = 0) {
    this.property = this.createKeyframes(t, e, i), this.length = e, this.cubicBuilder = new mi();
  }
  getValue(t) {
    const e = this.property.find((s) => t >= s.start && t < s.start + s.length);
    if (!e) {
      if (this.property.length > 0) {
        if (t >= this.length) return this.property[this.property.length - 1].to;
        if (t < 0) return this.property[0].from;
      }
      return 1;
    }
    const i = (t - e.start) / e.length;
    switch (e.interpolation) {
      case "bezier":
        return this.cubicBuilder.getValue(e.from, e.to, i, e.easing);
      case "constant":
        return e.from;
      case "linear":
      default:
        return e.from + (e.to - e.from) * i;
    }
  }
  createKeyframes(t, e, i = 0) {
    if (typeof t == "number")
      return [{ start: 0, length: e, from: t, to: t }];
    if (!t.length)
      throw new Error("Keyframes should have at least one value.");
    const s = this.createNormalizedKeyframes(t);
    try {
      this.validateKeyframes(s);
    } catch (n) {
      console.warn("Keyframe configuration issues detected:", n);
    }
    return this.insertFillerKeyframes(s, e, i);
  }
  createNormalizedKeyframes(t) {
    return t.toSorted((e, i) => e.start - i.start).map((e) => ({ ...e, start: e.start * 1e3, length: e.length * 1e3 }));
  }
  validateKeyframes(t) {
    for (let e = 0; e < t.length; e += 1) {
      const i = t[e], s = t[e + 1];
      if (!s) {
        if (i.start + i.length > this.length)
          throw new Error("Last keyframe exceeds the maximum duration.");
        break;
      }
      if (i.start + i.length > s.start)
        throw new Error("Overlapping keyframes detected.");
    }
  }
  insertFillerKeyframes(t, e, i = 0) {
    const s = [];
    for (let n = 0; n < t.length; n += 1) {
      const a = t[n], o = t[n + 1];
      if (n === 0 && a.start !== 0) {
        const h = { start: 0, length: a.start, from: i, to: a.from };
        s.push(h);
      }
      if (s.push(a), !o) {
        if (a.start + a.length < e) {
          const p = a.start + a.length, f = { start: p, length: e - p, from: a.to, to: a.to };
          s.push(f);
        }
        break;
      }
      if (a.start + a.length !== o.start) {
        const h = { start: a.start + a.length, length: o.start, from: a.to, to: o.from };
        s.push(h);
      }
    }
    return s;
  }
}
class te {
  static Name = "AudioLoadParser";
  name;
  extension;
  validAudioExtensions;
  constructor() {
    this.name = te.Name, this.extension = {
      type: [d.ExtensionType.LoadParser],
      priority: d.LoaderParserPriority.Normal,
      ref: null
    }, this.validAudioExtensions = ["mp3", "mpeg", "ogg", "wav"];
  }
  test(t) {
    const e = t.split("?")[0]?.split(".").pop() ?? "";
    return this.validAudioExtensions.includes(e);
  }
  async load(t, e, i) {
    return new Promise((s) => {
      const n = { src: t }, a = new Howl(n);
      a.on("load", () => s(a)), a.on("loaderror", () => s(null));
    });
  }
  unload(t) {
    t?.unload();
  }
}
class yi {
  clipConfiguration;
  constructor(t) {
    this.clipConfiguration = t;
  }
  build(t, e) {
    const i = [], s = [], n = [], a = [], o = [], { effect: l, length: c } = this.clipConfiguration;
    if (!l)
      return { offsetXKeyframes: i, offsetYKeyframes: s, opacityKeyframes: n, scaleKeyframes: a, rotationKeyframes: o };
    const h = 0;
    switch (this.getPresetName()) {
      case "zoomIn": {
        const f = this.getZoomSpeed(), y = 1 * this.clipConfiguration.scale, S = f * this.clipConfiguration.scale;
        a.push({ from: y, to: S, start: h, length: c, interpolation: "linear" });
        break;
      }
      case "zoomOut": {
        const y = this.getZoomSpeed() * this.clipConfiguration.scale, S = 1 * this.clipConfiguration.scale;
        a.push({ from: y, to: S, start: h, length: c, interpolation: "linear" });
        break;
      }
      case "slideLeft": {
        let f = this.getSlideStart();
        const y = t.width + t.width * f * 2, S = e.height / e.width * t.height;
        if (S < y) {
          const b = Math.abs(y / t.width);
          a.push({ from: b, to: b, start: h, length: c, interpolation: "linear" });
        } else
          f = (S - t.width) / 2 / t.width;
        i.push({ from: f, to: -f, start: h, length: c });
        break;
      }
      case "slideRight": {
        let f = this.getSlideStart();
        const y = t.width + t.width * f * 2, S = e.height / e.width * t.height;
        if (S < y) {
          const b = Math.abs(y / t.width);
          a.push({ from: b, to: b, start: h, length: c, interpolation: "linear" });
        } else
          f = (S - t.width) / 2 / t.width;
        i.push({ from: -f, to: f, start: h, length: c });
        break;
      }
      case "slideUp": {
        let f = this.getSlideStart();
        const y = t.height + t.height * f * 2, S = e.height / e.width * t.width;
        if (S < y) {
          const b = Math.abs(y / t.height);
          a.push({ from: b, to: b, start: h, length: c, interpolation: "linear" });
        } else
          f = (S - t.height) / 2 / t.height;
        s.push({ from: f, to: -f, start: h, length: c });
        break;
      }
      case "slideDown": {
        let f = this.getSlideStart();
        const y = t.height + t.height * f * 2, S = e.height / e.width * t.width;
        if (S < y) {
          const b = Math.abs(y / t.height);
          a.push({ from: b, to: b, start: h, length: c, interpolation: "linear" });
        } else
          f = (S - t.height) / 2 / t.height;
        s.push({ from: -f, to: f, start: h, length: c });
        break;
      }
    }
    return { offsetXKeyframes: i, offsetYKeyframes: s, opacityKeyframes: n, scaleKeyframes: a, rotationKeyframes: o };
  }
  getPresetName() {
    const [t] = (this.clipConfiguration.effect ?? "").split(/(Slow|Fast)/);
    return t;
  }
  getZoomSpeed() {
    const [t, e] = (this.clipConfiguration.effect ?? "").split(/(Slow|Fast)/);
    if (t.startsWith("zoom"))
      switch (e) {
        case "Slow":
          return 1.1;
        case "Fast":
          return 1.7;
        default:
          return 1.3;
      }
    return 0;
  }
  getSlideStart() {
    const [t, e] = (this.clipConfiguration.effect ?? "").split(/(Slow|Fast)/);
    if (t.startsWith("slide"))
      switch (e) {
        case "Slow":
          return 0.03;
        case "Fast":
          return 1.7;
        default:
          return 0.12;
      }
    return 0;
  }
}
class Ci {
  clipConfiguration;
  constructor(t) {
    this.clipConfiguration = t;
  }
  build() {
    const t = [], e = [], i = [], s = [], n = [], a = this.buildInPreset();
    t.push(...a.offsetXKeyframes), e.push(...a.offsetYKeyframes), i.push(...a.opacityKeyframes), s.push(...a.scaleKeyframes), n.push(...a.rotationKeyframes);
    const o = this.buildOutPreset();
    return t.push(...o.offsetXKeyframes), e.push(...o.offsetYKeyframes), i.push(...o.opacityKeyframes), s.push(...o.scaleKeyframes), n.push(...o.rotationKeyframes), { offsetXKeyframes: t, offsetYKeyframes: e, opacityKeyframes: i, scaleKeyframes: s, rotationKeyframes: n };
  }
  buildInPreset() {
    const t = [], e = [], i = [], s = [], n = [];
    if (!this.clipConfiguration.transition?.in)
      return { offsetXKeyframes: t, offsetYKeyframes: e, opacityKeyframes: i, scaleKeyframes: s, rotationKeyframes: n };
    const a = 0, o = this.getInPresetLength();
    switch (this.getInPresetName()) {
      case "fade": {
        const h = Math.max(0, Math.min(this.clipConfiguration.opacity ?? 1, 1));
        i.push({ from: 0, to: h, start: a, length: o, interpolation: "linear" });
        break;
      }
      case "zoom": {
        const h = this.clipConfiguration.scale + 9, p = this.clipConfiguration.scale;
        s.push({ from: h, to: p, start: a, length: o, interpolation: "bezier", easing: "easeIn" }), i.push({ from: 0, to: 1, start: a, length: o, interpolation: "bezier", easing: "easeIn" });
        break;
      }
      case "slideLeft": {
        const c = this.clipConfiguration.offset?.x + 0.025, h = this.clipConfiguration.offset?.x;
        t.push({ from: c, to: h, start: a, length: o, interpolation: "bezier", easing: "easeIn" }), i.push({ from: 0, to: 1, start: a, length: o, interpolation: "bezier", easing: "easeIn" });
        break;
      }
      case "slideRight": {
        const c = this.clipConfiguration.offset?.x - 0.025, h = this.clipConfiguration.offset?.x;
        t.push({ from: c, to: h, start: a, length: o, interpolation: "bezier", easing: "easeIn" }), i.push({ from: 0, to: 1, start: a, length: o, interpolation: "bezier", easing: "easeIn" });
        break;
      }
      case "slideUp": {
        const c = this.clipConfiguration.offset?.y + 0.025, h = this.clipConfiguration.offset?.y;
        e.push({ from: c, to: h, start: a, length: o, interpolation: "bezier", easing: "easeIn" }), i.push({ from: 0, to: 1, start: a, length: o, interpolation: "bezier", easing: "easeIn" });
        break;
      }
      case "slideDown": {
        const c = this.clipConfiguration.offset?.y - 0.025, h = this.clipConfiguration.offset?.y;
        e.push({ from: c, to: h, start: a, length: o, interpolation: "bezier", easing: "easeOut" }), i.push({ from: 0, to: 1, start: a, length: o, interpolation: "bezier", easing: "easeOut" });
        break;
      }
      case "carouselLeft":
      case "carouselRight":
      case "carouselUp":
      case "carouselDown":
      case "shuffleTopRight":
      case "shuffleRightTop":
      case "shuffleRightBottom":
      case "shuffleBottomRight":
      case "shuffleBottomLeft":
      case "shuffleLeftBottom":
      case "shuffleLeftTop":
      case "shuffleTopLeft":
      default:
        console.warn(`Unimplemented transition:in preset "${this.clipConfiguration.transition.in}"`);
        break;
    }
    return { offsetXKeyframes: t, offsetYKeyframes: e, opacityKeyframes: i, scaleKeyframes: s, rotationKeyframes: n };
  }
  buildOutPreset() {
    const t = [], e = [], i = [], s = [], n = [];
    if (!this.clipConfiguration.transition?.out)
      return { offsetXKeyframes: t, offsetYKeyframes: e, opacityKeyframes: i, scaleKeyframes: s, rotationKeyframes: n };
    const a = this.getOutPresetLength(), o = this.clipConfiguration.length - a;
    switch (this.getOutPresetName()) {
      case "fade": {
        const c = Math.max(0, Math.min(this.clipConfiguration.opacity ?? 1, 1));
        i.push({ from: c, to: 0, start: o, length: a, interpolation: "linear" });
        break;
      }
      case "zoom": {
        const h = this.clipConfiguration.scale, p = h + 9;
        s.push({ from: h, to: p, start: o, length: a, interpolation: "bezier", easing: "easeOut" }), i.push({ from: 1, to: 0, start: o, length: a, interpolation: "bezier", easing: "easeOut" });
        break;
      }
      case "slideLeft": {
        const c = this.clipConfiguration.offset?.x, h = c - 0.025;
        t.push({ from: c, to: h, start: o, length: a, interpolation: "bezier", easing: "easeOut" }), i.push({ from: 1, to: 0, start: o, length: a, interpolation: "bezier", easing: "easeOut" });
        break;
      }
      case "slideRight": {
        const c = this.clipConfiguration.offset?.x, h = c + 0.025;
        t.push({ from: c, to: h, start: o, length: a, interpolation: "bezier", easing: "easeOut" }), i.push({ from: 1, to: 0, start: o, length: a, interpolation: "bezier", easing: "easeOut" });
        break;
      }
      case "slideUp": {
        const c = this.clipConfiguration.offset?.y, h = c - 0.025;
        e.push({ from: c, to: h, start: o, length: a, interpolation: "bezier", easing: "easeIn" }), i.push({ from: 1, to: 0, start: o, length: a, interpolation: "bezier", easing: "easeIn" });
        break;
      }
      case "slideDown": {
        const c = this.clipConfiguration.offset?.y, h = c + 0.025;
        e.push({ from: c, to: h, start: o, length: a, interpolation: "bezier", easing: "easeIn" }), i.push({ from: 1, to: 0, start: o, length: a, interpolation: "bezier", easing: "easeIn" });
        break;
      }
      case "carouselLeft":
      case "carouselRight":
      case "carouselUp":
      case "carouselDown":
      case "shuffleTopRight":
      case "shuffleRightTop":
      case "shuffleRightBottom":
      case "shuffleBottomRight":
      case "shuffleBottomLeft":
      case "shuffleLeftBottom":
      case "shuffleLeftTop":
      case "shuffleTopLeft":
      default:
        console.warn(`Unimplemented transition:out preset "${this.clipConfiguration.transition.out}"`);
        break;
    }
    return { offsetXKeyframes: t, offsetYKeyframes: e, opacityKeyframes: i, scaleKeyframes: s, rotationKeyframes: n };
  }
  getInPresetName() {
    const [t] = (this.clipConfiguration.transition?.in ?? "").split(/(Slow|Fast|VeryFast)/);
    return t;
  }
  getOutPresetName() {
    const [t] = (this.clipConfiguration.transition?.out ?? "").split(/(Slow|Fast|VeryFast)/);
    return t;
  }
  getInPresetLength() {
    const [, t] = (this.clipConfiguration.transition?.in ?? "").split(/(Slow|Fast|VeryFast)/);
    switch (t) {
      case "Slow":
        return 2;
      case "Fast":
        return 0.5;
      case "VeryFast":
        return 0.25;
      default:
        return 1;
    }
  }
  getOutPresetLength() {
    const [, t] = (this.clipConfiguration.transition?.out ?? "").split(/(Slow|Fast|VeryFast)/);
    switch (t) {
      case "Slow":
        return 2;
      case "Fast":
        return 0.5;
      case "VeryFast":
        return 0.25;
      default:
        return 1;
    }
  }
}
class vi {
  static ButtonLeftClick = 0;
  static ButtonRightClick = 3;
}
class xi {
  containerSize;
  constructor(t) {
    this.containerSize = t;
  }
  relativeToAbsolute(t, e, i) {
    switch (e) {
      case "topLeft":
        return {
          x: i.x * this.containerSize.width,
          y: -i.y * this.containerSize.height
        };
      case "topRight":
        return {
          x: (i.x + 1) * this.containerSize.width - t.width,
          y: -i.y * this.containerSize.height
        };
      case "bottomLeft":
        return {
          x: i.x * this.containerSize.width,
          y: (-i.y + 1) * this.containerSize.height - t.height
        };
      case "bottomRight":
        return {
          x: (i.x + 1) * this.containerSize.width - t.width,
          y: (-i.y + 1) * this.containerSize.height - t.height
        };
      case "left":
        return {
          x: i.x * this.containerSize.width,
          y: (-i.y + 0.5) * this.containerSize.height - t.height / 2
        };
      case "right":
        return {
          x: (i.x + 1) * this.containerSize.width - t.width,
          y: (-i.y + 0.5) * this.containerSize.height - t.height / 2
        };
      case "top":
        return {
          x: (i.x + 0.5) * this.containerSize.width - t.width / 2,
          y: -i.y * this.containerSize.height
        };
      case "bottom":
        return {
          x: (i.x + 0.5) * this.containerSize.width - t.width / 2,
          y: (-i.y + 1) * this.containerSize.height - t.height
        };
      case "center":
      default:
        return {
          x: (i.x + 0.5) * this.containerSize.width - t.width / 2,
          y: (-i.y + 0.5) * this.containerSize.height - t.height / 2
        };
    }
  }
  absoluteToRelative(t, e, i) {
    switch (e) {
      case "topLeft":
        return {
          x: i.x / this.containerSize.width,
          y: -(i.y / this.containerSize.height)
        };
      case "topRight":
        return {
          x: (i.x + t.width) / this.containerSize.width - 1,
          y: -(i.y / this.containerSize.height)
        };
      case "bottomLeft":
        return {
          x: i.x / this.containerSize.width,
          y: -((i.y + t.height) / this.containerSize.height - 1)
        };
      case "bottomRight":
        return {
          x: (i.x + t.width) / this.containerSize.width - 1,
          y: -((i.y + t.height) / this.containerSize.height - 1)
        };
      case "left":
        return {
          x: i.x / this.containerSize.width,
          y: -((i.y + t.height / 2) / this.containerSize.height - 0.5)
        };
      case "right":
        return {
          x: (i.x + t.width) / this.containerSize.width - 1,
          y: -((i.y + t.height / 2) / this.containerSize.height - 0.5)
        };
      case "top":
        return {
          x: (i.x + t.width / 2) / this.containerSize.width - 0.5,
          y: -(i.y / this.containerSize.height)
        };
      case "bottom":
        return {
          x: (i.x + t.width / 2) / this.containerSize.width - 0.5,
          y: -((i.y + t.height) / this.containerSize.height - 1)
        };
      case "center":
      default:
        return {
          x: (i.x + t.width / 2) / this.containerSize.width - 0.5,
          y: -((i.y + t.height / 2) / this.containerSize.height - 0.5)
        };
    }
  }
}
class ot {
  container;
  constructor() {
    this.container = new d.Container();
  }
  /** @internal */
  getContainer() {
    return this.container;
  }
}
class D extends ot {
  static SnapThreshold = 20;
  static DiscardedFrameCount = Math.ceil(1 / 30 * 1e3);
  static ScaleHandleRadius = 10;
  static RotationHandleRadius = 10;
  static RotationHandleOffset = 50;
  static OutlineWidth = 5;
  static MinScale = 0.1;
  static MaxScale = 5;
  layer;
  shouldDispose;
  edit;
  clipConfiguration;
  positionBuilder;
  offsetXKeyframeBuilder;
  offsetYKeyframeBuilder;
  scaleKeyframeBuilder;
  opacityKeyframeBuilder;
  rotationKeyframeBuilder;
  outline;
  topLeftScaleHandle;
  topRightScaleHandle;
  bottomLeftScaleHandle;
  bottomRightScaleHandle;
  rotationHandle;
  isHovering;
  isDragging;
  dragOffset;
  scaleDirection;
  scaleStart;
  scaleOffset;
  isRotating;
  rotationStart;
  rotationOffset;
  initialClipConfiguration;
  contentContainer;
  constructor(t, e) {
    super(), this.edit = t, this.layer = 0, this.shouldDispose = !1, this.clipConfiguration = e, this.positionBuilder = new xi(t.size), this.outline = null, this.topLeftScaleHandle = null, this.topRightScaleHandle = null, this.bottomRightScaleHandle = null, this.bottomLeftScaleHandle = null, this.rotationHandle = null, this.isHovering = !1, this.isDragging = !1, this.dragOffset = { x: 0, y: 0 }, this.scaleDirection = null, this.scaleStart = null, this.scaleOffset = { x: 0, y: 0 }, this.isRotating = !1, this.rotationStart = null, this.rotationOffset = { x: 0, y: 0 }, this.initialClipConfiguration = null, this.contentContainer = new d.Container(), this.getContainer().addChild(this.contentContainer);
  }
  reconfigureAfterRestore() {
    this.configureKeyframes();
  }
  configureKeyframes() {
    if (this.offsetXKeyframeBuilder = new R(this.clipConfiguration.offset?.x ?? 0, this.getLength()), this.offsetYKeyframeBuilder = new R(this.clipConfiguration.offset?.y ?? 0, this.getLength()), this.scaleKeyframeBuilder = new R(this.clipConfiguration.scale ?? 1, this.getLength(), 1), this.opacityKeyframeBuilder = new R(this.clipConfiguration.opacity ?? 1, this.getLength(), 1), this.rotationKeyframeBuilder = new R(this.clipConfiguration.transform?.rotate?.angle ?? 0, this.getLength()), this.clipHasKeyframes())
      return;
    const t = [], e = [], i = [], s = [], n = [], a = new yi(this.clipConfiguration).build(this.edit.size, this.getSize());
    t.push(...a.offsetXKeyframes), e.push(...a.offsetYKeyframes), i.push(...a.opacityKeyframes), s.push(...a.scaleKeyframes), n.push(...a.rotationKeyframes);
    const o = new Ci(this.clipConfiguration).build();
    t.push(...o.offsetXKeyframes), e.push(...o.offsetYKeyframes), i.push(...o.opacityKeyframes), s.push(...o.scaleKeyframes), n.push(...o.rotationKeyframes), t.length && (this.offsetXKeyframeBuilder = new R(t, this.getLength())), e.length && (this.offsetYKeyframeBuilder = new R(e, this.getLength())), i.length && (this.opacityKeyframeBuilder = new R(i, this.getLength(), 1)), s.length && (this.scaleKeyframeBuilder = new R(s, this.getLength(), 1)), n.length && (this.rotationKeyframeBuilder = new R(n, this.getLength()));
  }
  async load() {
    this.outline = new d.Graphics(), this.getContainer().addChild(this.outline), this.topLeftScaleHandle = new d.Graphics(), this.topRightScaleHandle = new d.Graphics(), this.bottomRightScaleHandle = new d.Graphics(), this.bottomLeftScaleHandle = new d.Graphics(), this.rotationHandle = new d.Graphics(), this.topLeftScaleHandle.zIndex = 1e3, this.topRightScaleHandle.zIndex = 1e3, this.bottomRightScaleHandle.zIndex = 1e3, this.bottomLeftScaleHandle.zIndex = 1e3, this.rotationHandle.zIndex = 1e3, this.getContainer().addChild(this.topLeftScaleHandle), this.getContainer().addChild(this.topRightScaleHandle), this.getContainer().addChild(this.bottomRightScaleHandle), this.getContainer().addChild(this.bottomLeftScaleHandle), this.getContainer().addChild(this.rotationHandle), this.getContainer().sortableChildren = !0, this.getContainer().cursor = "pointer", this.getContainer().eventMode = "static", this.getContainer().on("pointerdown", this.onPointerStart.bind(this)), this.getContainer().on("pointermove", this.onPointerMove.bind(this)), this.getContainer().on("globalpointermove", this.onPointerMove.bind(this)), this.getContainer().on("pointerup", this.onPointerUp.bind(this)), this.getContainer().on("pointerupoutside", this.onPointerUp.bind(this)), this.getContainer().on("pointerover", this.onPointerOver.bind(this)), this.getContainer().on("pointerout", this.onPointerOut.bind(this));
  }
  update(t, e) {
    if (this.getContainer().visible = this.isActive(), this.getContainer().zIndex = 1e5 - this.layer * 100, !this.isActive())
      return;
    const i = this.getPivot(), s = this.getPosition(), n = this.getScale();
    this.getContainer().scale.set(n), this.getContainer().pivot.set(i.x, i.y), this.getContainer().position.set(s.x + i.x, s.y + i.y);
    const a = this.getRotation();
    this.contentContainer.alpha = this.getOpacity(), this.getContainer().angle = a, this.shouldDiscardFrame() && (this.contentContainer.alpha = 0);
  }
  draw() {
    if (!this.outline)
      return;
    const t = this.edit.isPlayerSelected(this);
    if ((!this.isActive() || !t) && !this.isHovering) {
      this.outline.clear(), this.topLeftScaleHandle?.clear(), this.topRightScaleHandle?.clear(), this.bottomRightScaleHandle?.clear(), this.bottomLeftScaleHandle?.clear(), this.rotationHandle?.clear();
      return;
    }
    const e = this.isHovering || this.isDragging ? 65535 : 16777215, i = this.getSize(), s = this.getScale();
    if (this.outline.clear(), this.outline.strokeStyle = { width: D.OutlineWidth / s, color: e }, this.outline.rect(0, 0, i.width, i.height), this.outline.stroke(), !this.topLeftScaleHandle || !this.topRightScaleHandle || !this.bottomRightScaleHandle || !this.bottomLeftScaleHandle || !this.isActive() || !t)
      return;
    this.topLeftScaleHandle.fillStyle = { color: e }, this.topLeftScaleHandle.clear();
    const n = D.ScaleHandleRadius * 2 / s;
    if (this.topLeftScaleHandle.rect(-n / 2, -n / 2, n, n), this.topLeftScaleHandle.fill(), this.topRightScaleHandle.fillStyle = { color: e }, this.topRightScaleHandle.clear(), this.topRightScaleHandle.rect(i.width - n / 2, -n / 2, n, n), this.topRightScaleHandle.fill(), this.bottomRightScaleHandle.fillStyle = { color: e }, this.bottomRightScaleHandle.clear(), this.bottomRightScaleHandle.rect(i.width - n / 2, i.height - n / 2, n, n), this.bottomRightScaleHandle.fill(), this.bottomLeftScaleHandle.fillStyle = { color: e }, this.bottomLeftScaleHandle.clear(), this.bottomLeftScaleHandle.rect(-n / 2, i.height - n / 2, n, n), this.bottomLeftScaleHandle.fill(), !this.rotationHandle)
      return;
    const a = i.width / 2, o = -50 / s;
    this.rotationHandle.clear(), this.rotationHandle.fillStyle = { color: e }, this.rotationHandle.circle(a, o, D.RotationHandleRadius / s), this.rotationHandle.fill(), this.outline.strokeStyle = { width: D.OutlineWidth / s, color: e }, this.outline.moveTo(a, 0), this.outline.lineTo(a, o), this.outline.stroke();
  }
  dispose() {
    this.outline?.destroy(), this.outline = null, this.topLeftScaleHandle?.destroy(), this.topLeftScaleHandle = null, this.topRightScaleHandle?.destroy(), this.topRightScaleHandle = null, this.bottomLeftScaleHandle?.destroy(), this.bottomLeftScaleHandle = null, this.bottomRightScaleHandle?.destroy(), this.bottomRightScaleHandle = null, this.rotationHandle?.destroy(), this.rotationHandle = null, this.contentContainer?.destroy();
  }
  getStart() {
    return this.clipConfiguration.start * 1e3;
  }
  getLength() {
    return this.clipConfiguration.length * 1e3;
  }
  getEnd() {
    return this.getStart() + this.getLength();
  }
  getPlaybackTime() {
    const t = this.edit.playbackTime - this.getStart();
    return t < 0 ? 0 : t > this.getLength() ? this.getLength() : t;
  }
  getOpacity() {
    return this.opacityKeyframeBuilder?.getValue(this.getPlaybackTime()) ?? 1;
  }
  getPosition() {
    const t = {
      x: this.offsetXKeyframeBuilder?.getValue(this.getPlaybackTime()) ?? 0,
      y: this.offsetYKeyframeBuilder?.getValue(this.getPlaybackTime()) ?? 0
    };
    return this.positionBuilder.relativeToAbsolute(this.getSize(), this.clipConfiguration.position ?? "center", t);
  }
  getPivot() {
    const t = this.getSize();
    return { x: t.width / 2, y: t.height / 2 };
  }
  getFitScale() {
    switch (this.clipConfiguration.fit ?? "crop") {
      case "crop":
        return Math.max(this.edit.size.width / this.getSize().width, this.edit.size.height / this.getSize().height);
      case "cover":
        return Math.max(this.edit.size.width / this.getSize().width, this.edit.size.height / this.getSize().height);
      case "contain":
        return Math.min(this.edit.size.width / this.getSize().width, this.edit.size.height / this.getSize().height);
      case "none":
      default:
        return 1;
    }
  }
  getScale() {
    return (this.scaleKeyframeBuilder?.getValue(this.getPlaybackTime()) ?? 1) * this.getFitScale();
  }
  getRotation() {
    return this.rotationKeyframeBuilder?.getValue(this.getPlaybackTime()) ?? 0;
  }
  isActive() {
    return this.edit.playbackTime >= this.getStart() && this.edit.playbackTime < this.getEnd();
  }
  shouldDiscardFrame() {
    return this.getPlaybackTime() < D.DiscardedFrameCount;
  }
  onPointerStart(t) {
    if (t.button !== vi.ButtonLeftClick || (this.edit.events.emit("canvas:clip:clicked", { player: this }), this.initialClipConfiguration = structuredClone(this.clipConfiguration), this.clipHasKeyframes()))
      return;
    if (this.scaleDirection = null, this.topLeftScaleHandle?.getBounds().containsPoint(t.globalX, t.globalY) && (this.scaleDirection = "topLeft"), this.topRightScaleHandle?.getBounds().containsPoint(t.globalX, t.globalY) && (this.scaleDirection = "topRight"), this.bottomRightScaleHandle?.getBounds().containsPoint(t.globalX, t.globalY) && (this.scaleDirection = "bottomRight"), this.bottomLeftScaleHandle?.getBounds().containsPoint(t.globalX, t.globalY) && (this.scaleDirection = "bottomLeft"), this.scaleDirection !== null) {
      this.scaleStart = this.getScale() / this.getFitScale();
      const l = t.getLocalPosition(this.edit.getContainer());
      this.scaleOffset = l;
      return;
    }
    if (this.rotationHandle?.getBounds().containsPoint(t.globalX, t.globalY)) {
      this.isRotating = !0, this.rotationStart = this.getRotation();
      const l = t.getLocalPosition(this.edit.getContainer());
      this.rotationOffset = l;
      return;
    }
    this.isDragging = !0;
    const o = t.getLocalPosition(this.edit.getContainer());
    this.dragOffset = {
      x: o.x - this.getContainer().position.x,
      y: o.y - this.getContainer().position.y
    };
  }
  onPointerMove(t) {
    if (this.scaleDirection !== null && this.scaleStart !== null) {
      const e = t.getLocalPosition(this.edit.getContainer()), i = this.getPosition(), s = this.getPivot(), n = { x: i.x + s.x, y: i.y + s.y }, a = Math.sqrt((this.scaleOffset.x - n.x) ** 2 + (this.scaleOffset.y - n.y) ** 2), l = Math.sqrt((e.x - n.x) ** 2 + (e.y - n.y) ** 2) / a, c = this.scaleStart * l;
      this.clipConfiguration.scale = Math.max(D.MinScale, Math.min(c, D.MaxScale)), this.scaleKeyframeBuilder = new R(this.clipConfiguration.scale, this.getLength(), 1);
      return;
    }
    if (this.isRotating && this.rotationStart !== null) {
      const e = t.getLocalPosition(this.edit.getContainer()), i = this.getPosition(), s = this.getPivot(), n = { x: i.x + s.x, y: i.y + s.y }, a = Math.atan2(this.rotationOffset.y - n.y, this.rotationOffset.x - n.x), l = (Math.atan2(e.y - n.y, e.x - n.x) - a) * (180 / Math.PI);
      let c = this.rotationStart + l;
      const h = 45, p = c % h, f = 2;
      Math.abs(p) < f ? c = Math.floor(c / h) * h : Math.abs(p - h) < f && (c = Math.ceil(c / h) * h), this.clipConfiguration.transform || (this.clipConfiguration.transform = { rotate: { angle: 0 } }), this.clipConfiguration.transform.rotate || (this.clipConfiguration.transform.rotate = { angle: 0 }), this.clipConfiguration.transform.rotate.angle = c, this.rotationKeyframeBuilder = new R(this.clipConfiguration.transform.rotate.angle, this.getLength());
      return;
    }
    if (this.isDragging) {
      const e = t.getLocalPosition(this.edit.getContainer()), i = this.getPivot(), s = { x: e.x - this.dragOffset.x, y: e.y - this.dragOffset.y }, n = { x: s.x - i.x, y: s.y - i.y }, a = [
        { x: 0, y: 0 },
        { x: this.edit.size.width, y: 0 },
        { x: 0, y: this.edit.size.height },
        { x: this.edit.size.width, y: this.edit.size.height }
      ], o = { x: this.edit.size.width / 2, y: this.edit.size.height / 2 }, l = [...a, o], c = [
        { x: n.x, y: n.y },
        { x: n.x + this.getSize().width, y: n.y },
        { x: n.x, y: n.y + this.getSize().height },
        { x: n.x + this.getSize().width, y: n.y + this.getSize().height }
      ], h = { x: n.x + this.getSize().width / 2, y: n.y + this.getSize().height / 2 }, p = [...c, h];
      let f = D.SnapThreshold, y = D.SnapThreshold, S = null, b = null;
      for (const z of p)
        for (const it of l) {
          const $ = Math.abs(z.x - it.x);
          $ < f && (f = $, S = n.x + (it.x - z.x));
          const ft = Math.abs(z.y - it.y);
          ft < y && (y = ft, b = n.y + (it.y - z.y));
        }
      S !== null && (n.x = S), b !== null && (n.y = b);
      const O = this.positionBuilder.absoluteToRelative(
        this.getSize(),
        this.clipConfiguration.position ?? "center",
        n
      );
      this.clipConfiguration.offset || (this.clipConfiguration.offset = { x: 0, y: 0 }), this.clipConfiguration.offset.x = O.x, this.clipConfiguration.offset.y = O.y, this.offsetXKeyframeBuilder = new R(this.clipConfiguration.offset.x, this.getLength()), this.offsetYKeyframeBuilder = new R(this.clipConfiguration.offset.y, this.getLength());
    }
  }
  onPointerUp() {
    (this.isDragging || this.scaleDirection !== null || this.isRotating) && this.hasStateChanged() && this.edit.setUpdatedClip(this, this.initialClipConfiguration, structuredClone(this.clipConfiguration)), this.isDragging = !1, this.dragOffset = { x: 0, y: 0 }, this.scaleDirection = null, this.scaleStart = null, this.scaleOffset = { x: 0, y: 0 }, this.isRotating = !1, this.rotationStart = null, this.rotationOffset = { x: 0, y: 0 }, this.initialClipConfiguration = null;
  }
  onPointerOver() {
    this.isHovering = !0;
  }
  onPointerOut() {
    this.isHovering = !1;
  }
  clipHasPresets() {
    return !!this.clipConfiguration.effect || !!this.clipConfiguration.transition?.in || !!this.clipConfiguration.transition?.out;
  }
  clipHasKeyframes() {
    return [
      this.clipConfiguration.scale,
      this.clipConfiguration.offset?.x,
      this.clipConfiguration.offset?.y,
      this.clipConfiguration.transform?.rotate?.angle
    ].some((t) => t && typeof t != "number");
  }
  hasStateChanged() {
    if (!this.initialClipConfiguration) return !1;
    const t = this.clipConfiguration.offset?.x, e = this.clipConfiguration.offset?.y, i = this.clipConfiguration.scale, s = Number(this.clipConfiguration.transform?.rotate?.angle ?? 0), n = this.initialClipConfiguration.offset?.x, a = this.initialClipConfiguration.offset?.y, o = this.initialClipConfiguration.scale, l = Number(this.initialClipConfiguration.transform?.rotate?.angle ?? 0);
    return n !== void 0 && t !== n || a !== void 0 && e !== a || o !== void 0 && i !== o || s !== l;
  }
}
class ce extends D {
  audioResource;
  isPlaying;
  volumeKeyframeBuilder;
  syncTimer;
  constructor(t, e) {
    super(t, e), this.audioResource = null, this.isPlaying = !1;
    const i = e.asset;
    this.volumeKeyframeBuilder = new R(i.volume ?? 1, this.getLength()), this.syncTimer = 0;
  }
  async load() {
    await super.load();
    const t = this.clipConfiguration.asset, e = t.src, i = { src: e, loadParser: te.Name }, s = await this.edit.assetLoader.load(e, i);
    if (!(s instanceof fi.Howl))
      throw new Error(`Invalid audio source '${t.src}'.`);
    this.audioResource = s, this.configureKeyframes();
  }
  update(t, e) {
    super.update(t, e);
    const { trim: i = 0 } = this.clipConfiguration.asset;
    if (this.syncTimer += e, this.getContainer().alpha = 0, !this.audioResource)
      return;
    const s = this.edit.isPlaying && this.isActive(), n = this.getPlaybackTime();
    s && (this.isPlaying || (this.isPlaying = !0, this.audioResource.seek(n / 1e3 + i), this.audioResource.play()), this.audioResource.volume() !== this.getVolume() && this.audioResource.volume(this.getVolume()), Math.abs((this.audioResource.seek() - i) * 1e3 - n) > 100 && this.audioResource.seek(n / 1e3 + i)), this.isPlaying && !s && (this.isPlaying = !1, this.audioResource.pause());
    const a = this.syncTimer > 100;
    !this.edit.isPlaying && this.isActive() && a && (this.syncTimer = 0, this.audioResource.seek(n / 1e3 + i));
  }
  draw() {
    super.draw();
  }
  dispose() {
    this.audioResource?.unload(), this.audioResource = null;
  }
  getSize() {
    return { width: 0, height: 0 };
  }
  getVolume() {
    return this.volumeKeyframeBuilder.getValue(this.getPlaybackTime());
  }
}
var ki = `in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`, Ti = `struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>
  };

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

fn globalTextureCoord( aPosition:vec2<f32> ) -> vec2<f32>
{
  return  (aPosition.xy / gfu.uGlobalFrame.zw) + (gfu.uGlobalFrame.xy / gfu.uGlobalFrame.zw);  
}

fn getSize() -> vec2<f32>
{
  return gfu.uGlobalFrame.zw;
}
  
@vertex
fn mainVertex(
  @location(0) aPosition : vec2<f32>, 
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition)
  );
}`, wi = `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uThickness;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uKnockout;

uniform vec4 uInputClamp;

const float DOUBLE_PI = 2. * 3.14159265358979323846264;
const float ANGLE_STEP = \${ANGLE_STEP};

float outlineMaxAlphaAtPos(vec2 pos) {
    if (uThickness.x == 0. || uThickness.y == 0.) {
        return 0.;
    }

    vec4 displacedColor;
    vec2 displacedPos;
    float maxAlpha = 0.;

    for (float angle = 0.; angle <= DOUBLE_PI; angle += ANGLE_STEP) {
        displacedPos.x = vTextureCoord.x + uThickness.x * cos(angle);
        displacedPos.y = vTextureCoord.y + uThickness.y * sin(angle);
        displacedColor = texture(uTexture, clamp(displacedPos, uInputClamp.xy, uInputClamp.zw));
        maxAlpha = max(maxAlpha, displacedColor.a);
    }

    return maxAlpha;
}

void main(void) {
    vec4 sourceColor = texture(uTexture, vTextureCoord);
    vec4 contentColor = sourceColor * float(uKnockout < 0.5);
    float outlineAlpha = uAlpha * outlineMaxAlphaAtPos(vTextureCoord.xy) * (1.-sourceColor.a);
    vec4 outlineColor = vec4(vec3(uColor) * outlineAlpha, outlineAlpha);
    finalColor = contentColor + outlineColor;
}
`, bi = `struct OutlineUniforms {
  uThickness:vec2<f32>,
  uColor:vec3<f32>,
  uAlpha:f32,
  uAngleStep:f32,
  uKnockout:f32,
};

struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;

@group(0) @binding(1) var uTexture: texture_2d<f32>; 
@group(0) @binding(2) var uSampler: sampler;
@group(1) @binding(0) var<uniform> outlineUniforms : OutlineUniforms;

@fragment
fn mainFragment(
  @builtin(position) position: vec4<f32>,
  @location(0) uv : vec2<f32>
) -> @location(0) vec4<f32> {
  let sourceColor: vec4<f32> = textureSample(uTexture, uSampler, uv);
  let contentColor: vec4<f32> = sourceColor * (1. - outlineUniforms.uKnockout);
  
  let outlineAlpha: f32 = outlineUniforms.uAlpha * outlineMaxAlphaAtPos(uv) * (1. - sourceColor.a);
  let outlineColor: vec4<f32> = vec4<f32>(vec3<f32>(outlineUniforms.uColor) * outlineAlpha, outlineAlpha);
  
  return contentColor + outlineColor;
}

fn outlineMaxAlphaAtPos(uv: vec2<f32>) -> f32 {
  let thickness = outlineUniforms.uThickness;

  if (thickness.x == 0. || thickness.y == 0.) {
    return 0.;
  }
  
  let angleStep = outlineUniforms.uAngleStep;

  var displacedColor: vec4<f32>;
  var displacedPos: vec2<f32>;

  var maxAlpha: f32 = 0.;
  var displaced: vec2<f32>;
  var curColor: vec4<f32>;

  for (var angle = 0.; angle <= DOUBLE_PI; angle += angleStep)
  {
    displaced.x = uv.x + thickness.x * cos(angle);
    displaced.y = uv.y + thickness.y * sin(angle);
    curColor = textureSample(uTexture, uSampler, clamp(displaced, gfu.uInputClamp.xy, gfu.uInputClamp.zw));
    maxAlpha = max(maxAlpha, curColor.a);
  }

  return maxAlpha;
}

const DOUBLE_PI: f32 = 3.14159265358979323846264 * 2.;`, Si = Object.defineProperty, Ii = (r, t, e) => t in r ? Si(r, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : r[t] = e, ct = (r, t, e) => (Ii(r, typeof t != "symbol" ? t + "" : t, e), e);
const ee = class lt extends ci {
  /** @ignore */
  constructor(...t) {
    let e = t[0] ?? {};
    typeof e == "number" && (hi("6.0.0", "OutlineFilter constructor params are now options object. See params: { thickness, color, quality, alpha, knockout }"), e = { thickness: e }, t[1] !== void 0 && (e.color = t[1]), t[2] !== void 0 && (e.quality = t[2]), t[3] !== void 0 && (e.alpha = t[3]), t[4] !== void 0 && (e.knockout = t[4])), e = { ...lt.DEFAULT_OPTIONS, ...e };
    const i = e.quality ?? 0.1, s = di.from({
      vertex: {
        source: Ti,
        entryPoint: "mainVertex"
      },
      fragment: {
        source: bi,
        entryPoint: "mainFragment"
      }
    }), n = ui.from({
      vertex: ki,
      fragment: wi.replace(/\$\{ANGLE_STEP\}/, lt.getAngleStep(i).toFixed(7)),
      name: "outline-filter"
    });
    super({
      gpuProgram: s,
      glProgram: n,
      resources: {
        outlineUniforms: {
          uThickness: { value: new Float32Array(2), type: "vec2<f32>" },
          uColor: { value: new Float32Array(3), type: "vec3<f32>" },
          uAlpha: { value: e.alpha, type: "f32" },
          uAngleStep: { value: 0, type: "f32" },
          uKnockout: { value: e.knockout ? 1 : 0, type: "f32" }
        }
      }
    }), ct(this, "uniforms"), ct(this, "_thickness"), ct(this, "_quality"), ct(this, "_color"), this.uniforms = this.resources.outlineUniforms.uniforms, this.uniforms.uAngleStep = lt.getAngleStep(i), this._color = new pi(), this.color = e.color ?? 0, Object.assign(this, e);
  }
  /**
   * Override existing apply method in `Filter`
   * @override
   * @ignore
   */
  apply(t, e, i, s) {
    this.uniforms.uThickness[0] = this.thickness / e.source.width, this.uniforms.uThickness[1] = this.thickness / e.source.height, t.applyFilter(this, e, i, s);
  }
  /**
   * Get the angleStep by quality
   * @param quality
   */
  static getAngleStep(t) {
    return parseFloat((Math.PI * 2 / Math.max(
      t * lt.MAX_SAMPLES,
      lt.MIN_SAMPLES
    )).toFixed(7));
  }
  /**
   * The thickness of the outline
   * @default 1
   */
  get thickness() {
    return this._thickness;
  }
  set thickness(t) {
    this._thickness = this.padding = t;
  }
  /**
   * The color value of the ambient color
   * @example [1.0, 1.0, 1.0] = 0xffffff
   * @default 0x000000
   */
  get color() {
    return this._color.value;
  }
  set color(t) {
    this._color.setValue(t);
    const [e, i, s] = this._color.toArray();
    this.uniforms.uColor[0] = e, this.uniforms.uColor[1] = i, this.uniforms.uColor[2] = s;
  }
  /**
   * Coefficient for alpha multiplication
   * @default 1
   */
  get alpha() {
    return this.uniforms.uAlpha;
  }
  set alpha(t) {
    this.uniforms.uAlpha = t;
  }
  /**
   * The quality of the outline from `0` to `1`.
   * Using a higher quality setting will result in more accuracy but slower performance
   * @default 0.1
   */
  get quality() {
    return this._quality;
  }
  set quality(t) {
    this._quality = t, this.uniforms.uAngleStep = lt.getAngleStep(t);
  }
  /**
   * Whether to only render outline, not the contents.
   * @default false
   */
  get knockout() {
    return this.uniforms.uKnockout === 1;
  }
  set knockout(t) {
    this.uniforms.uKnockout = t ? 1 : 0;
  }
};
ct(ee, "DEFAULT_OPTIONS", {
  thickness: 1,
  color: 0,
  alpha: 1,
  quality: 0.1,
  knockout: !1
});
ct(ee, "MIN_SAMPLES", 1);
ct(ee, "MAX_SAMPLES", 100);
let ve = ee;
class _i extends D {
  background;
  text;
  constructor(t, e) {
    super(t, e), this.background = null, this.text = null;
  }
  async load() {
    await super.load();
    const t = this.clipConfiguration.asset, e = await this.parseDocument();
    if (!e)
      return;
    const i = new d.Graphics();
    e.background.color && (i.fillStyle = {
      color: e.background.color,
      alpha: e.background.opacity ?? 1
    }, i.rect(0, 0, t.width ?? this.edit.size.width, t.height ?? this.edit.size.height), i.fill());
    const s = new d.Text();
    s.text = e.text;
    const { horizontal: n, vertical: a } = e.alignment;
    s.style = {
      fontFamily: e.font?.family ?? "Open Sans",
      fontSize: e.font?.size ?? 32,
      fill: e.font?.color ?? "#ffffff",
      fontWeight: (e.font?.weight ?? "400").toString(),
      wordWrap: !0,
      wordWrapWidth: t.width ?? this.edit.size.width,
      lineHeight: (e.font?.lineHeight ?? 1) * (e.font?.size ?? 32),
      align: n
    };
    let o = (t.width ?? this.edit.size.width) / 2 - s.width / 2, l = (t.height ?? this.edit.size.height) / 2 - s.height / 2;
    if (n === "left" && (o = 0), n === "right" && (o = (t.width ?? this.edit.size.width) - s.width), a === "top" && (l = 0), a === "bottom" && (l = (t.height ?? this.edit.size.height) - s.height), s.position = {
      x: o,
      y: l
    }, e.stroke.color && e.stroke.width) {
      const c = new ve({
        thickness: e.stroke.width,
        color: e.stroke.color
      });
      s.filters = [c];
    }
    this.background = i, this.text = s, this.contentContainer.addChild(i), this.contentContainer.addChild(s), this.configureKeyframes();
  }
  update(t, e) {
    super.update(t, e);
  }
  draw() {
    super.draw();
  }
  dispose() {
    super.dispose(), this.background?.destroy(), this.background = null, this.text?.destroy(), this.text = null;
  }
  getSize() {
    const t = this.clipConfiguration.asset;
    return {
      width: t.width ?? this.edit.size.width,
      height: t.height ?? this.edit.size.height
    };
  }
  getFitScale() {
    return 1;
  }
  async parseDocument() {
    const t = this.clipConfiguration.asset, { html: e, css: i, position: s } = t;
    if (!e.includes('data-html-type="text"'))
      return console.warn("Unsupported html format."), null;
    const a = new DOMParser().parseFromString(e, "text/html").body.textContent ?? "", l = (await new CSSStyleSheet().replace(i)).cssRules[0], c = { text: a, font: {}, alignment: {}, background: {}, stroke: {} };
    if (l?.constructor.name !== "CSSStyleRule" || !("style" in l))
      return console.warn("Unsupported css format."), c;
    const h = l.style, p = this.parseAlignment(s ?? "center");
    c.font = {
      color: h.color.length ? h.color : void 0,
      family: h.fontFamily.length ? h.fontFamily : void 0,
      size: h.fontSize.length ? parseInt(h.fontSize, 10) : void 0,
      weight: h.fontWeight.length ? parseInt(h.fontWeight, 10) : void 0,
      lineHeight: h.lineHeight.length ? parseInt(h.lineHeight, 10) : void 0
    }, c.alignment = p;
    let f = "";
    return h.background.length && (f = h.background), h.backgroundColor.length && (f = h.backgroundColor), c.background = {
      color: f.length ? f : void 0,
      opacity: h.opacity.length ? parseInt(h.opacity, 10) : void 0
    }, c.stroke = {
      width: h.strokeWidth.length ? parseInt(h.strokeWidth, 10) : void 0,
      color: h.stroke.length ? h.stroke : void 0
    }, c;
  }
  parseAlignment(t) {
    switch (t) {
      case "topLeft":
        return { horizontal: "left", vertical: "top" };
      case "top":
        return { horizontal: "center", vertical: "top" };
      case "topRight":
        return { horizontal: "right", vertical: "top" };
      case "left":
        return { horizontal: "left", vertical: "center" };
      case "right":
        return { horizontal: "right", vertical: "center" };
      case "bottomLeft":
        return { horizontal: "left", vertical: "bottom" };
      case "bottom":
        return { horizontal: "center", vertical: "bottom" };
      case "bottomRight":
        return { horizontal: "right", vertical: "bottom" };
      case "center":
      default:
        return { horizontal: "center", vertical: "center" };
    }
  }
}
class Pi extends D {
  texture;
  sprite;
  constructor(t, e) {
    super(t, e), this.texture = null, this.sprite = null;
  }
  async load() {
    await super.load();
    const t = this.clipConfiguration.asset, e = t.src, i = {
      src: e,
      crossovern: "anonymous",
      data: {}
    }, s = await this.edit.assetLoader.load(e, i);
    if (!(s?.source instanceof d.ImageSource))
      throw new Error(`Invalid image source '${t.src}'.`);
    this.texture = this.createCroppedTexture(s), this.sprite = new d.Sprite(this.texture), this.contentContainer.addChild(this.sprite), this.configureKeyframes();
  }
  update(t, e) {
    super.update(t, e);
  }
  draw() {
    super.draw();
  }
  dispose() {
    super.dispose(), this.sprite?.destroy(), this.sprite = null, this.texture?.destroy(), this.texture = null;
  }
  getSize() {
    return { width: this.sprite?.width ?? 0, height: this.sprite?.height ?? 0 };
  }
  createCroppedTexture(t) {
    const e = this.clipConfiguration.asset;
    if (!e.crop)
      return t;
    const i = t.width, s = t.height, n = Math.floor((e.crop?.left ?? 0) * i), a = Math.floor((e.crop?.right ?? 0) * i), o = Math.floor((e.crop?.top ?? 0) * s), l = Math.floor((e.crop?.bottom ?? 0) * s), c = n, h = o, p = i - n - a, f = s - o - l, y = new d.Rectangle(c, h, p, f);
    return new d.Texture({ source: t.source, frame: y });
  }
}
class _e extends D {
  texture;
  sprite;
  isPlaying;
  constructor(t, e) {
    super(t, e), this.texture = null, this.sprite = null, this.isPlaying = !1;
  }
  async load() {
    await super.load();
    const t = this.clipConfiguration.asset, e = t.src, i = { src: e, data: { autoPlay: !1, muted: !0 } }, s = await this.edit.assetLoader.load(e, i);
    if (!(s?.source instanceof d.ImageSource || s?.source instanceof d.VideoSource))
      throw new Error(`Invalid luma source '${t.src}'.`);
    this.texture = s, this.sprite = new d.Sprite(this.texture), this.contentContainer.addChild(this.sprite), this.configureKeyframes();
  }
  update(t, e) {
    if (super.update(t, e), !this.texture || !(this.texture.source instanceof d.VideoSource))
      return;
    const i = this.getPlaybackTime(), s = this.edit.isPlaying && this.isActive();
    s && (this.isPlaying || (this.isPlaying = !0, this.texture.source.resource.currentTime = i / 1e3, this.texture.source.resource.play().catch(console.error)), this.texture.source.resource.volume !== this.getVolume() && (this.texture.source.resource.volume = this.getVolume()), Math.abs(this.texture.source.resource.currentTime * 1e3 - i) > 100 && (this.texture.source.resource.currentTime = i / 1e3)), !s && this.isPlaying && (this.isPlaying = !1, this.texture.source.resource.pause()), !this.edit.isPlaying && this.isActive() && (this.texture.source.resource.currentTime = i / 1e3);
  }
  draw() {
    super.draw();
  }
  dispose() {
    super.dispose(), this.sprite?.destroy(), this.sprite = null, this.texture?.destroy(), this.texture = null;
  }
  getSize() {
    return { width: this.sprite?.width ?? 0, height: this.sprite?.height ?? 0 };
  }
  getVolume() {
    return 0;
  }
  getMask() {
    return this.sprite;
  }
}
class Ei extends D {
  shape;
  shapeBackground;
  constructor(t, e) {
    super(t, e), this.shape = null, this.shapeBackground = null;
  }
  async load() {
    await super.load();
    const t = this.clipConfiguration.asset, e = new d.Graphics(), i = t.width ?? this.edit.size.width, s = t.height ?? this.edit.size.height;
    e.fillStyle = { color: "transparent" }, e.rect(0, 0, i, s), e.fill();
    const n = new d.Graphics();
    switch (t.shape) {
      case "rectangle": {
        const a = t.rectangle, o = i / 2 - a.width / 2, l = s / 2 - a.height / 2;
        n.rect(o, l, a.width, a.height);
        break;
      }
      case "circle": {
        const a = t.circle, o = i / 2, l = s / 2;
        n.circle(o, l, a.radius);
        break;
      }
      case "line": {
        const a = t.line, o = i / 2 - a.length / 2, l = s / 2 - a.thickness / 2;
        n.rect(o, l, a.length, a.thickness);
        break;
      }
      default:
        console.warn("Unsupported shape asset type.");
        break;
    }
    if (n.fillStyle = {
      color: t.fill?.color ?? "#ffffff",
      alpha: t.fill?.opacity ?? 1
    }, n.fill(), t.stroke) {
      const a = new ve({
        thickness: t.stroke.width,
        color: t.stroke.color
      });
      n.filters = [a];
    }
    this.shapeBackground = e, this.shape = n, this.contentContainer.addChild(e), e.addChild(n), this.configureKeyframes();
  }
  update(t, e) {
    super.update(t, e);
  }
  draw() {
    super.draw();
  }
  dispose() {
    super.dispose(), this.shape?.destroy(), this.shape = null, this.shapeBackground?.destroy(), this.shapeBackground = null;
  }
  getSize() {
    const t = this.clipConfiguration.asset;
    return {
      width: t.width ?? this.edit.size.width,
      height: t.height ?? this.edit.size.height
    };
  }
  getFitScale() {
    return 1;
  }
}
class Et {
  static DEFAULT_BLINK_INTERVAL_MS = 500;
  static DEFAULT_CURSOR_WIDTH_PX = 2;
  static DEFAULT_CURSOR_COLOR = 16777215;
  cursor = null;
  parent;
  textElement;
  clipConfig;
  textPosition = 0;
  pixelX = 0;
  pixelY = 0;
  currentLine = 0;
  isBlinking = !1;
  blinkInterval = null;
  blinkIntervalMs = 500;
  width = 2;
  color = 16777215;
  isVisible = !0;
  constructor(t, e, i, s) {
    this.parent = t, this.textElement = e, this.clipConfig = i, this.width = s?.width ?? Et.DEFAULT_CURSOR_WIDTH_PX, this.color = s?.color ?? Et.DEFAULT_CURSOR_COLOR, this.blinkIntervalMs = s?.blinkInterval ?? Et.DEFAULT_BLINK_INTERVAL_MS, this.textPosition = 0, this.isBlinking = !1, this.isVisible = !0, this.blinkInterval = null, this.createCursor();
  }
  updatePosition(t) {
    if (!this.cursor || !this.textElement) {
      console.warn("TextCursor: Cannot update position, cursor not initialized");
      return;
    }
    this.textPosition = this.validateTextPosition(t), this.calculateAndApplyPixelPosition();
  }
  setPosition(t, e) {
    if (!this.cursor) {
      console.warn("TextCursor: Cannot set position, cursor not initialized");
      return;
    }
    this.pixelX = t, this.pixelY = e, this.updateGraphicsPosition();
  }
  show() {
    this.setVisible(!0);
  }
  hide() {
    this.setVisible(!1);
  }
  setVisible(t) {
    this.isVisible = t, this.cursor && !this.isBlinking && (this.cursor.visible = t);
  }
  startBlinking() {
    if (!this.cursor) {
      console.warn("TextCursor: Cannot start blinking, cursor not initialized");
      return;
    }
    this.isBlinking || this.startBlinkingAnimation();
  }
  stopBlinking() {
    this.stopBlinkingAnimation();
  }
  setBlinkInterval(t) {
    this.blinkIntervalMs = t, this.isBlinking && (this.stopBlinking(), this.startBlinking());
  }
  dispose() {
    if (this.stopBlinkingAnimation(), this.cursor && this.parent)
      try {
        this.parent.removeChild(this.cursor);
      } catch (t) {
        console.warn("TextCursor: Error removing cursor from parent:", t);
      }
    if (this.cursor)
      try {
        this.cursor.destroy();
      } catch (t) {
        console.warn("TextCursor: Error destroying cursor graphics:", t);
      } finally {
        this.cursor = null;
      }
    this.textPosition = 0, this.pixelX = 0, this.pixelY = 0, this.currentLine = 0, this.isVisible = !0;
  }
  createCursor() {
    if (!this.textElement) return;
    this.cursor = new d.Graphics(), this.cursor.fillStyle = { color: this.color };
    const t = this.textElement.style.fontSize;
    this.cursor.rect(0, 0, this.width, t), this.cursor.fill(), this.parent.addChild(this.cursor), this.cursor.visible = this.isVisible;
  }
  validateTextPosition(t) {
    return this.textElement ? Math.max(0, Math.min(t, this.textElement.text.length)) : 0;
  }
  calculateAndApplyPixelPosition() {
    this.calculatePixelPositionFromText(), this.updateGraphicsPosition();
  }
  calculatePixelPositionFromText() {
    if (!this.textElement) return;
    const { text: t } = this.textElement, e = this.textElement.style, i = t.substring(0, this.textPosition), s = i.match(/\n/g);
    this.currentLine = s ? s.length : 0;
    const n = t.split(`
`), a = this.currentLine < n.length ? n[this.currentLine] : "", o = i.lastIndexOf(`
`), l = o === -1 ? this.textPosition : this.textPosition - o - 1, c = a.substring(0, l);
    let h;
    c.length > 0 && c.endsWith(" ") ? h = this.measureText(`${c}x`, e) - this.measureText("x", e) : h = this.measureText(c, e);
    const p = e.lineHeight;
    this.pixelY = this.currentLine * p;
    const y = this.clipConfig.asset.alignment?.horizontal ?? "center";
    let S = h;
    if (y !== "left") {
      const b = this.measureText(a, e), O = this.textElement.width;
      let z = 0;
      y === "center" ? z = (O - b) / 2 : y === "right" && (z = O - b), S = z + h;
    }
    this.pixelX = S;
  }
  updateGraphicsPosition() {
    this.cursor && this.cursor.position.set(this.pixelX, this.pixelY);
  }
  startBlinkingAnimation() {
    !this.cursor || this.isBlinking || (this.isBlinking = !0, this.blinkInterval = window.setInterval(() => {
      this.cursor && this.isBlinking && (this.cursor.visible = !this.cursor.visible);
    }, this.blinkIntervalMs));
  }
  stopBlinkingAnimation() {
    this.blinkInterval !== null && (window.clearInterval(this.blinkInterval), this.blinkInterval = null), this.isBlinking = !1, this.cursor && (this.cursor.visible = this.isVisible);
  }
  measureText(t, e) {
    const i = new d.Text(t, e), { width: s } = i;
    return i.destroy(), s;
  }
  isInitialized() {
    return this.cursor !== null;
  }
  getState() {
    return {
      isInitialized: this.isInitialized(),
      isBlinking: this.isBlinking,
      isVisible: this.isVisible,
      textPosition: this.textPosition,
      pixelPosition: { x: this.pixelX, y: this.pixelY },
      currentLine: this.currentLine
    };
  }
}
class Ft {
  static DEFAULT_FOCUS_DELAY_MS = 50;
  hiddenInput = null;
  isFocused = !1;
  focusRetryCount = 0;
  maxFocusRetries = 3;
  focusDelay = Ft.DEFAULT_FOCUS_DELAY_MS;
  eventHandlers = {};
  abortController = null;
  textChangeCallback = null;
  lastSyncedText = "";
  isComposing = !1;
  setupInput(t, e) {
    this.focusDelay = e?.focusDelay ?? Ft.DEFAULT_FOCUS_DELAY_MS, this.createHiddenTextarea(), this.hiddenInput && (this.hiddenInput.value = t, this.lastSyncedText = t), this.setupEventListeners(), e?.autoFocus !== !1 && this.focusInput();
  }
  updateInputValue(t) {
    this.hiddenInput && (this.hiddenInput.value = t, this.lastSyncedText = t);
  }
  focusInput() {
    this.hiddenInput && setTimeout(() => {
      this.hiddenInput && !this.isFocused && (this.hiddenInput.focus(), setTimeout(() => {
        !this.isFocused && this.focusRetryCount < this.maxFocusRetries && (this.focusRetryCount += 1, this.focusInput());
      }, 10));
    }, this.focusDelay);
  }
  blurInput() {
    this.hiddenInput && this.hiddenInput.blur();
  }
  setSelectionRange(t, e) {
    if (!this.hiddenInput) return;
    const i = this.hiddenInput.value.length, s = Math.max(0, Math.min(t, i)), n = Math.max(s, Math.min(e, i));
    this.hiddenInput.setSelectionRange(s, n);
  }
  getCursorPosition() {
    return this.hiddenInput?.selectionStart || 0;
  }
  getValue() {
    return this.hiddenInput?.value || "";
  }
  setTextInputHandler(t) {
    this.textChangeCallback = t;
  }
  setEventHandlers(t) {
    this.eventHandlers = { ...this.eventHandlers, ...t };
  }
  isFocusedInput() {
    return this.isFocused;
  }
  dispose() {
    this.removeAllEventListeners(), this.hiddenInput && this.hiddenInput.parentNode && this.hiddenInput.parentNode.removeChild(this.hiddenInput), this.hiddenInput = null, this.isFocused = !1, this.focusRetryCount = 0, this.textChangeCallback = null, this.eventHandlers = {};
  }
  createHiddenTextarea() {
    this.hiddenInput = document.createElement("textarea");
    const t = {
      position: "absolute",
      opacity: "0.01",
      pointerEvents: "none",
      zIndex: "999",
      left: "0px",
      top: "0px",
      width: "1px",
      height: "1px",
      border: "none",
      outline: "none",
      resize: "none",
      backgroundColor: "transparent"
    };
    Object.assign(this.hiddenInput.style, t), this.hiddenInput.tabIndex = 0, document.body.appendChild(this.hiddenInput);
  }
  setupEventListeners() {
    if (!this.hiddenInput) return;
    this.abortController = new AbortController();
    const { signal: t } = this.abortController;
    this.hiddenInput.addEventListener("input", this.handleTextInput, { signal: t }), this.hiddenInput.addEventListener("keydown", this.handleKeyDown, { signal: t }), this.hiddenInput.addEventListener("compositionstart", this.handleCompositionStart, { signal: t }), this.hiddenInput.addEventListener("compositionend", this.handleCompositionEnd, { signal: t }), this.hiddenInput.addEventListener("focus", this.handleFocus, { signal: t }), this.hiddenInput.addEventListener("blur", this.handleBlur, { signal: t }), this.hiddenInput.addEventListener("paste", this.handlePaste, { signal: t });
  }
  removeAllEventListeners() {
    this.abortController?.abort(), this.abortController = null;
  }
  handleTextInput = (t) => {
    if (!this.hiddenInput || this.isComposing) return;
    const e = this.hiddenInput.value, i = this.hiddenInput.selectionStart || 0;
    this.lastSyncedText = e, this.textChangeCallback?.(e, i);
  };
  handleKeyDown = (t) => {
    if (document.activeElement !== this.hiddenInput) return;
    let e = !1;
    if ((t.ctrlKey || t.metaKey) && (e = this.handleKeyboardShortcuts(t), e)) {
      t.preventDefault();
      return;
    }
    if (t.key === "Tab") {
      const i = t.shiftKey ? "backward" : "forward";
      this.eventHandlers.onTabNavigation?.(i), t.preventDefault();
      return;
    }
    switch (t.key) {
      case "Escape":
        this.eventHandlers.onEscape?.(t), e = !0;
        break;
      case "Enter":
        e = !1;
        break;
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown":
        setTimeout(() => {
          if (this.hiddenInput) {
            const i = this.hiddenInput.value, s = this.hiddenInput.selectionStart || 0;
            this.textChangeCallback?.(i, s);
          }
        }, 0), e = !1;
        break;
      case "Backspace":
      case "Delete":
        e = !1;
        break;
      default:
        e = this.eventHandlers.onCustomKey?.(t.key, t) || !1;
        break;
    }
    e && t.preventDefault();
  };
  handleKeyboardShortcuts(t) {
    const { key: e } = t;
    switch (e.toLowerCase()) {
      case "a":
        return this.selectAll(), !0;
      case "c":
      case "v":
        return !1;
      case "z":
        return this.eventHandlers.onCustomKey?.("undo", t), !0;
      case "y":
        return this.eventHandlers.onCustomKey?.("redo", t), !0;
      default:
        return !1;
    }
  }
  handleCompositionStart = (t) => {
    this.isComposing = !0;
  };
  handleCompositionEnd = (t) => {
    if (this.isComposing = !1, this.hiddenInput) {
      const e = this.hiddenInput.value, i = this.hiddenInput.selectionStart || 0;
      this.textChangeCallback?.(e, i);
    }
  };
  handleFocus = (t) => {
    this.isFocused = !0, this.focusRetryCount = 0, this.eventHandlers.onFocus?.(t);
  };
  handleBlur = (t) => {
    this.isFocused = !1, this.eventHandlers.onBlur?.(t);
  };
  handlePaste = (t) => {
    setTimeout(() => {
      this.handleTextInput(t);
    }, 0);
  };
  selectAll() {
    this.hiddenInput && this.hiddenInput.select();
  }
}
class U {
  static DOUBLE_CLICK_THRESHOLD_MS = 300;
  static EDITING_BG_PADDING_PX = 5;
  static EDITING_BG_ALPHA = 0.2;
  static CLICK_HANDLER_DELAY_MS = 100;
  parent;
  targetText;
  clipConfig;
  isEditing = !1;
  lastClickTime = 0;
  editingContainer = null;
  editableText = null;
  textCursor = null;
  textInputHandler = null;
  outsideClickHandler = null;
  constructor(t, e, i) {
    this.parent = t, this.targetText = e, this.clipConfig = i, this.parent.getContainer().eventMode = "static", this.parent.getContainer().on("click", this.checkForDoubleClick);
  }
  dispose() {
    this.parent.getContainer().off("click", this.checkForDoubleClick), this.stopEditing(), this.outsideClickHandler && (window.removeEventListener("click", this.outsideClickHandler), this.outsideClickHandler = null);
  }
  startEditing() {
    if (this.isEditing || !this.targetText) return;
    const t = structuredClone(this.clipConfig);
    this.targetText.visible = !1, this.createEditingEnvironment(), this.setupOutsideClickHandler(t), this.isEditing = !0;
  }
  stopEditing(t = !1, e) {
    if (!this.isEditing) return;
    let i = "";
    this.editableText && (i = this.editableText.text), this.editingContainer && (this.parent.getContainer().removeChild(this.editingContainer), this.editingContainer.destroy(), this.editingContainer = null), this.editableText = null, this.textCursor && (this.textCursor.dispose(), this.textCursor = null), this.textInputHandler && (this.textInputHandler.dispose(), this.textInputHandler = null), this.targetText.visible = !0, t && e && i !== "" && this.parent.updateTextContent(i, e), this.isEditing = !1;
  }
  checkForDoubleClick = (t) => {
    const e = Date.now();
    e - this.lastClickTime < U.DOUBLE_CLICK_THRESHOLD_MS && this.startEditing(), this.lastClickTime = e;
  };
  setupOutsideClickHandler(t) {
    this.outsideClickHandler = (e) => {
      const s = this.parent.getContainer().getBounds(), n = e.clientX, a = e.clientY;
      (n < s.x || n > s.x + s.width || a < s.y || a > s.y + s.height) && (this.stopEditing(!0, t), this.outsideClickHandler && (window.removeEventListener("click", this.outsideClickHandler), this.outsideClickHandler = null));
    }, setTimeout(() => {
      this.outsideClickHandler && window.addEventListener("click", this.outsideClickHandler);
    }, U.CLICK_HANDLER_DELAY_MS);
  }
  createEditingEnvironment() {
    this.setupEditingContainer(), this.editingContainer && this.editableText && (this.textCursor = new Et(this.editingContainer, this.editableText, this.clipConfig), this.textCursor.updatePosition(this.targetText.text.length), this.textCursor.startBlinking()), this.setupTextInputHandler(), this.updateTextAlignment();
  }
  setupEditingContainer() {
    this.editingContainer = new d.Container(), this.parent.getContainer().addChild(this.editingContainer);
    const t = new d.Graphics();
    t.fillStyle = { color: 0, alpha: U.EDITING_BG_ALPHA }, t.rect(
      -5,
      -5,
      this.targetText.width + 2 * U.EDITING_BG_PADDING_PX,
      this.targetText.height + 2 * U.EDITING_BG_PADDING_PX
    ), t.fill(), this.editingContainer.addChild(t), this.editableText = new d.Text(this.targetText.text, this.targetText.style), this.editableText.eventMode = "static", this.editableText.cursor = "text", this.editingContainer.addChild(this.editableText);
  }
  setupTextInputHandler() {
    this.textInputHandler = new Ft(), this.textInputHandler.setTextInputHandler((t, e) => {
      this.editableText && (this.editableText.text = t, this.updateTextAlignment()), this.textCursor?.updatePosition(e);
    }), this.textInputHandler.setEventHandlers({
      onEscape: (t) => this.stopEditing(!1),
      onTabNavigation: (t) => this.stopEditing(!0)
    }), this.textInputHandler.setupInput(this.targetText.text, { autoFocus: !0 });
  }
  updateTextAlignment() {
    if (!this.editableText || !this.editingContainer) return;
    const t = this.getContainerDimensions(), e = this.getAlignmentSettings(), i = this.calculateHorizontalPosition({ width: this.editableText.width }, t, e.horizontal), s = this.calculateVerticalPosition({ height: this.editableText.height }, t, e.vertical);
    if (this.editingContainer.position.set(i, s), this.editingContainer.children.length > 0) {
      const n = this.editingContainer.getChildAt(0);
      n instanceof d.Graphics && (n.clear(), n.fillStyle = { color: 0, alpha: U.EDITING_BG_ALPHA }, n.rect(
        -5,
        -5,
        this.editableText.width + 2 * U.EDITING_BG_PADDING_PX,
        this.editableText.height + 2 * U.EDITING_BG_PADDING_PX
      ), n.fill());
    }
  }
  calculateHorizontalPosition(t, e, i = "center") {
    switch (i) {
      case "center":
        return e.width / 2 - t.width / 2;
      case "right":
        return e.width - t.width;
      case "left":
      default:
        return 0;
    }
  }
  calculateVerticalPosition(t, e, i = "center") {
    switch (i) {
      case "center":
        return e.height / 2 - t.height / 2;
      case "bottom":
        return e.height - t.height;
      case "top":
      default:
        return 0;
    }
  }
  getContainerDimensions() {
    const t = this.clipConfig.asset;
    return {
      width: t.width ?? this.parent.getSize().width,
      height: t.height ?? this.parent.getSize().height
    };
  }
  getAlignmentSettings() {
    const t = this.clipConfig.asset;
    return {
      horizontal: t.alignment?.horizontal ?? "center",
      vertical: t.alignment?.vertical ?? "center"
      /* CENTER */
    };
  }
}
class Ai extends D {
  background = null;
  text = null;
  textEditor = null;
  async load() {
    await super.load();
    const t = this.clipConfiguration.asset;
    if (this.background = new d.Graphics(), t.background && (this.background.fillStyle = {
      color: t.background.color,
      alpha: t.background.opacity
    }, this.background.rect(0, 0, t.width ?? this.edit.size.width, t.height ?? this.edit.size.height), this.background.fill()), this.text = new d.Text(t.text, this.createTextStyle(t)), this.positionText(t), t.stroke) {
      const e = new ve({
        thickness: t.stroke.width,
        color: t.stroke.color
      });
      this.text.filters = [e];
    }
    this.contentContainer.addChild(this.background), this.contentContainer.addChild(this.text), this.configureKeyframes(), this.textEditor = new U(this, this.text, this.clipConfiguration);
  }
  update(t, e) {
    super.update(t, e);
  }
  dispose() {
    super.dispose(), this.background?.destroy(), this.background = null, this.text?.destroy(), this.text = null, this.textEditor?.dispose(), this.textEditor = null;
  }
  getSize() {
    const t = this.clipConfiguration.asset;
    return {
      width: t.width ?? this.edit.size.width,
      height: t.height ?? this.edit.size.height
    };
  }
  getFitScale() {
    return 1;
  }
  createTextStyle(t) {
    return new d.TextStyle({
      fontFamily: t.font?.family ?? "Open Sans",
      fontSize: t.font?.size ?? 32,
      fill: t.font?.color ?? "#ffffff",
      fontWeight: (t.font?.weight ?? "400").toString(),
      wordWrap: !0,
      wordWrapWidth: t.width ?? this.edit.size.width,
      lineHeight: (t.font?.lineHeight ?? 1) * (t.font?.size ?? 32),
      align: t.alignment?.horizontal ?? "center"
    });
  }
  positionText(t) {
    if (!this.text) return;
    const e = t.alignment?.horizontal ?? "center", i = t.alignment?.vertical ?? "center", s = t.width ?? this.edit.size.width, n = t.height ?? this.edit.size.height;
    let a = s / 2 - this.text.width / 2, o = n / 2 - this.text.height / 2;
    e === "left" ? a = 0 : e === "right" && (a = s - this.text.width), i === "top" ? o = 0 : i === "bottom" && (o = n - this.text.height), this.text.position.set(a, o);
  }
  updateTextContent(t, e) {
    this.edit.updateTextContent(this, t, e);
  }
}
class Oi extends D {
  texture;
  sprite;
  isPlaying;
  volumeKeyframeBuilder;
  syncTimer;
  constructor(t, e) {
    super(t, e), this.texture = null, this.sprite = null, this.isPlaying = !1;
    const i = this.clipConfiguration.asset;
    this.volumeKeyframeBuilder = new R(i.volume ?? 1, this.getLength()), this.syncTimer = 0;
  }
  /**
   * TODO: Add support for .mov and .webm files
   */
  async load() {
    await super.load();
    const t = this.clipConfiguration.asset, e = t.src;
    if (e.endsWith(".mov") || e.endsWith(".webm"))
      throw new Error(`Video source '${t.src}' is not supported. .mov and .webm files are currently not supported.`);
    const i = { src: e, data: { autoPlay: !1, muted: !1 } }, s = await this.edit.assetLoader.load(e, i);
    if (!(s?.source instanceof d.VideoSource))
      throw new Error(`Invalid video source '${t.src}'.`);
    this.texture = this.createCroppedTexture(s), this.sprite = new d.Sprite(this.texture), this.contentContainer.addChild(this.sprite), this.configureKeyframes();
  }
  update(t, e) {
    super.update(t, e);
    const { trim: i = 0 } = this.clipConfiguration.asset;
    if (this.syncTimer += e, !this.texture)
      return;
    const s = this.getPlaybackTime(), n = this.edit.isPlaying && this.isActive();
    n && (this.isPlaying || (this.isPlaying = !0, this.texture.source.resource.currentTime = s / 1e3 + i, this.texture.source.resource.play().catch(console.error)), this.texture.source.resource.volume !== this.getVolume() && (this.texture.source.resource.volume = this.getVolume()), Math.abs((this.texture.source.resource.currentTime - i) * 1e3 - s) > 100 && (this.texture.source.resource.currentTime = s / 1e3 + i)), !n && this.isPlaying && (this.isPlaying = !1, this.texture.source.resource.pause());
    const a = this.syncTimer > 100;
    !this.edit.isPlaying && this.isActive() && a && (this.syncTimer = 0, this.texture.source.resource.currentTime = s / 1e3 + i);
  }
  draw() {
    super.draw();
  }
  dispose() {
    super.dispose(), this.sprite?.destroy(), this.sprite = null, this.texture?.destroy(), this.texture = null;
  }
  getSize() {
    return { width: this.sprite?.width ?? 0, height: this.sprite?.height ?? 0 };
  }
  getVolume() {
    return this.volumeKeyframeBuilder.getValue(this.getPlaybackTime());
  }
  createCroppedTexture(t) {
    const e = this.clipConfiguration.asset;
    if (!e.crop)
      return t;
    const i = t.width, s = t.height, n = Math.floor((e.crop?.left ?? 0) * i), a = Math.floor((e.crop?.right ?? 0) * i), o = Math.floor((e.crop?.top ?? 0) * s), l = Math.floor((e.crop?.bottom ?? 0) * s), c = n, h = o, p = i - n - a, f = s - o - l, y = new d.Rectangle(c, h, p, f);
    return new d.Texture({ source: t.source, frame: y });
  }
}
var I;
(function(r) {
  r.assertEqual = (s) => s;
  function t(s) {
  }
  r.assertIs = t;
  function e(s) {
    throw new Error();
  }
  r.assertNever = e, r.arrayToEnum = (s) => {
    const n = {};
    for (const a of s)
      n[a] = a;
    return n;
  }, r.getValidEnumValues = (s) => {
    const n = r.objectKeys(s).filter((o) => typeof s[s[o]] != "number"), a = {};
    for (const o of n)
      a[o] = s[o];
    return r.objectValues(a);
  }, r.objectValues = (s) => r.objectKeys(s).map(function(n) {
    return s[n];
  }), r.objectKeys = typeof Object.keys == "function" ? (s) => Object.keys(s) : (s) => {
    const n = [];
    for (const a in s)
      Object.prototype.hasOwnProperty.call(s, a) && n.push(a);
    return n;
  }, r.find = (s, n) => {
    for (const a of s)
      if (n(a))
        return a;
  }, r.isInteger = typeof Number.isInteger == "function" ? (s) => Number.isInteger(s) : (s) => typeof s == "number" && isFinite(s) && Math.floor(s) === s;
  function i(s, n = " | ") {
    return s.map((a) => typeof a == "string" ? `'${a}'` : a).join(n);
  }
  r.joinValues = i, r.jsonStringifyReplacer = (s, n) => typeof n == "bigint" ? n.toString() : n;
})(I || (I = {}));
var Pe;
(function(r) {
  r.mergeShapes = (t, e) => ({
    ...t,
    ...e
    // second overwrites first
  });
})(Pe || (Pe = {}));
const m = I.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]), nt = (r) => {
  switch (typeof r) {
    case "undefined":
      return m.undefined;
    case "string":
      return m.string;
    case "number":
      return isNaN(r) ? m.nan : m.number;
    case "boolean":
      return m.boolean;
    case "function":
      return m.function;
    case "bigint":
      return m.bigint;
    case "symbol":
      return m.symbol;
    case "object":
      return Array.isArray(r) ? m.array : r === null ? m.null : r.then && typeof r.then == "function" && r.catch && typeof r.catch == "function" ? m.promise : typeof Map < "u" && r instanceof Map ? m.map : typeof Set < "u" && r instanceof Set ? m.set : typeof Date < "u" && r instanceof Date ? m.date : m.object;
    default:
      return m.unknown;
  }
}, u = I.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
class N extends Error {
  get errors() {
    return this.issues;
  }
  constructor(t) {
    super(), this.issues = [], this.addIssue = (i) => {
      this.issues = [...this.issues, i];
    }, this.addIssues = (i = []) => {
      this.issues = [...this.issues, ...i];
    };
    const e = new.target.prototype;
    Object.setPrototypeOf ? Object.setPrototypeOf(this, e) : this.__proto__ = e, this.name = "ZodError", this.issues = t;
  }
  format(t) {
    const e = t || function(n) {
      return n.message;
    }, i = { _errors: [] }, s = (n) => {
      for (const a of n.issues)
        if (a.code === "invalid_union")
          a.unionErrors.map(s);
        else if (a.code === "invalid_return_type")
          s(a.returnTypeError);
        else if (a.code === "invalid_arguments")
          s(a.argumentsError);
        else if (a.path.length === 0)
          i._errors.push(e(a));
        else {
          let o = i, l = 0;
          for (; l < a.path.length; ) {
            const c = a.path[l];
            l === a.path.length - 1 ? (o[c] = o[c] || { _errors: [] }, o[c]._errors.push(e(a))) : o[c] = o[c] || { _errors: [] }, o = o[c], l++;
          }
        }
    };
    return s(this), i;
  }
  static assert(t) {
    if (!(t instanceof N))
      throw new Error(`Not a ZodError: ${t}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, I.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(t = (e) => e.message) {
    const e = {}, i = [];
    for (const s of this.issues)
      s.path.length > 0 ? (e[s.path[0]] = e[s.path[0]] || [], e[s.path[0]].push(t(s))) : i.push(t(s));
    return { formErrors: i, fieldErrors: e };
  }
  get formErrors() {
    return this.flatten();
  }
}
N.create = (r) => new N(r);
const Dt = (r, t) => {
  let e;
  switch (r.code) {
    case u.invalid_type:
      r.received === m.undefined ? e = "Required" : e = `Expected ${r.expected}, received ${r.received}`;
      break;
    case u.invalid_literal:
      e = `Invalid literal value, expected ${JSON.stringify(r.expected, I.jsonStringifyReplacer)}`;
      break;
    case u.unrecognized_keys:
      e = `Unrecognized key(s) in object: ${I.joinValues(r.keys, ", ")}`;
      break;
    case u.invalid_union:
      e = "Invalid input";
      break;
    case u.invalid_union_discriminator:
      e = `Invalid discriminator value. Expected ${I.joinValues(r.options)}`;
      break;
    case u.invalid_enum_value:
      e = `Invalid enum value. Expected ${I.joinValues(r.options)}, received '${r.received}'`;
      break;
    case u.invalid_arguments:
      e = "Invalid function arguments";
      break;
    case u.invalid_return_type:
      e = "Invalid function return type";
      break;
    case u.invalid_date:
      e = "Invalid date";
      break;
    case u.invalid_string:
      typeof r.validation == "object" ? "includes" in r.validation ? (e = `Invalid input: must include "${r.validation.includes}"`, typeof r.validation.position == "number" && (e = `${e} at one or more positions greater than or equal to ${r.validation.position}`)) : "startsWith" in r.validation ? e = `Invalid input: must start with "${r.validation.startsWith}"` : "endsWith" in r.validation ? e = `Invalid input: must end with "${r.validation.endsWith}"` : I.assertNever(r.validation) : r.validation !== "regex" ? e = `Invalid ${r.validation}` : e = "Invalid";
      break;
    case u.too_small:
      r.type === "array" ? e = `Array must contain ${r.exact ? "exactly" : r.inclusive ? "at least" : "more than"} ${r.minimum} element(s)` : r.type === "string" ? e = `String must contain ${r.exact ? "exactly" : r.inclusive ? "at least" : "over"} ${r.minimum} character(s)` : r.type === "number" ? e = `Number must be ${r.exact ? "exactly equal to " : r.inclusive ? "greater than or equal to " : "greater than "}${r.minimum}` : r.type === "date" ? e = `Date must be ${r.exact ? "exactly equal to " : r.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(r.minimum))}` : e = "Invalid input";
      break;
    case u.too_big:
      r.type === "array" ? e = `Array must contain ${r.exact ? "exactly" : r.inclusive ? "at most" : "less than"} ${r.maximum} element(s)` : r.type === "string" ? e = `String must contain ${r.exact ? "exactly" : r.inclusive ? "at most" : "under"} ${r.maximum} character(s)` : r.type === "number" ? e = `Number must be ${r.exact ? "exactly" : r.inclusive ? "less than or equal to" : "less than"} ${r.maximum}` : r.type === "bigint" ? e = `BigInt must be ${r.exact ? "exactly" : r.inclusive ? "less than or equal to" : "less than"} ${r.maximum}` : r.type === "date" ? e = `Date must be ${r.exact ? "exactly" : r.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(r.maximum))}` : e = "Invalid input";
      break;
    case u.custom:
      e = "Invalid input";
      break;
    case u.invalid_intersection_types:
      e = "Intersection results could not be merged";
      break;
    case u.not_multiple_of:
      e = `Number must be a multiple of ${r.multipleOf}`;
      break;
    case u.not_finite:
      e = "Number must be finite";
      break;
    default:
      e = t.defaultError, I.assertNever(r);
  }
  return { message: e };
};
let Di = Dt;
function he() {
  return Di;
}
const de = (r) => {
  const { data: t, path: e, errorMaps: i, issueData: s } = r, n = [...e, ...s.path || []], a = {
    ...s,
    path: n
  };
  if (s.message !== void 0)
    return {
      ...s,
      path: n,
      message: s.message
    };
  let o = "";
  const l = i.filter((c) => !!c).slice().reverse();
  for (const c of l)
    o = c(a, { data: t, defaultError: o }).message;
  return {
    ...s,
    path: n,
    message: o
  };
};
function g(r, t) {
  const e = he(), i = de({
    issueData: t,
    data: r.data,
    path: r.path,
    errorMaps: [
      r.common.contextualErrorMap,
      // contextual error map is first priority
      r.schemaErrorMap,
      // then schema-bound map if available
      e,
      // then global override map
      e === Dt ? void 0 : Dt
      // then global default map
    ].filter((s) => !!s)
  });
  r.common.issues.push(i);
}
class L {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    this.value === "valid" && (this.value = "dirty");
  }
  abort() {
    this.value !== "aborted" && (this.value = "aborted");
  }
  static mergeArray(t, e) {
    const i = [];
    for (const s of e) {
      if (s.status === "aborted")
        return k;
      s.status === "dirty" && t.dirty(), i.push(s.value);
    }
    return { status: t.value, value: i };
  }
  static async mergeObjectAsync(t, e) {
    const i = [];
    for (const s of e) {
      const n = await s.key, a = await s.value;
      i.push({
        key: n,
        value: a
      });
    }
    return L.mergeObjectSync(t, i);
  }
  static mergeObjectSync(t, e) {
    const i = {};
    for (const s of e) {
      const { key: n, value: a } = s;
      if (n.status === "aborted" || a.status === "aborted")
        return k;
      n.status === "dirty" && t.dirty(), a.status === "dirty" && t.dirty(), n.value !== "__proto__" && (typeof a.value < "u" || s.alwaysSet) && (i[n.value] = a.value);
    }
    return { status: t.value, value: i };
  }
}
const k = Object.freeze({
  status: "aborted"
}), St = (r) => ({ status: "dirty", value: r }), B = (r) => ({ status: "valid", value: r }), Ee = (r) => r.status === "aborted", Ae = (r) => r.status === "dirty", xt = (r) => r.status === "valid", Nt = (r) => typeof Promise < "u" && r instanceof Promise;
function Vt(r, t, e, i) {
  if (typeof t == "function" ? r !== t || !0 : !t.has(r)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return t.get(r);
}
function Ye(r, t, e, i, s) {
  if (typeof t == "function" ? r !== t || !0 : !t.has(r)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return t.set(r, e), e;
}
var C;
(function(r) {
  r.errToObj = (t) => typeof t == "string" ? { message: t } : t || {}, r.toString = (t) => typeof t == "string" ? t : t?.message;
})(C || (C = {}));
var It, _t;
class K {
  constructor(t, e, i, s) {
    this._cachedPath = [], this.parent = t, this.data = e, this._path = i, this._key = s;
  }
  get path() {
    return this._cachedPath.length || (this._key instanceof Array ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
  }
}
const Oe = (r, t) => {
  if (xt(t))
    return { success: !0, data: t.value };
  if (!r.common.issues.length)
    throw new Error("Validation failed but no issues detected.");
  return {
    success: !1,
    get error() {
      if (this._error)
        return this._error;
      const e = new N(r.common.issues);
      return this._error = e, this._error;
    }
  };
};
function T(r) {
  if (!r)
    return {};
  const { errorMap: t, invalid_type_error: e, required_error: i, description: s } = r;
  if (t && (e || i))
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  return t ? { errorMap: t, description: s } : { errorMap: (a, o) => {
    var l, c;
    const { message: h } = r;
    return a.code === "invalid_enum_value" ? { message: h ?? o.defaultError } : typeof o.data > "u" ? { message: (l = h ?? i) !== null && l !== void 0 ? l : o.defaultError } : a.code !== "invalid_type" ? { message: o.defaultError } : { message: (c = h ?? e) !== null && c !== void 0 ? c : o.defaultError };
  }, description: s };
}
class w {
  get description() {
    return this._def.description;
  }
  _getType(t) {
    return nt(t.data);
  }
  _getOrReturnCtx(t, e) {
    return e || {
      common: t.parent.common,
      data: t.data,
      parsedType: nt(t.data),
      schemaErrorMap: this._def.errorMap,
      path: t.path,
      parent: t.parent
    };
  }
  _processInputParams(t) {
    return {
      status: new L(),
      ctx: {
        common: t.parent.common,
        data: t.data,
        parsedType: nt(t.data),
        schemaErrorMap: this._def.errorMap,
        path: t.path,
        parent: t.parent
      }
    };
  }
  _parseSync(t) {
    const e = this._parse(t);
    if (Nt(e))
      throw new Error("Synchronous parse encountered promise.");
    return e;
  }
  _parseAsync(t) {
    const e = this._parse(t);
    return Promise.resolve(e);
  }
  parse(t, e) {
    const i = this.safeParse(t, e);
    if (i.success)
      return i.data;
    throw i.error;
  }
  safeParse(t, e) {
    var i;
    const s = {
      common: {
        issues: [],
        async: (i = e?.async) !== null && i !== void 0 ? i : !1,
        contextualErrorMap: e?.errorMap
      },
      path: e?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: t,
      parsedType: nt(t)
    }, n = this._parseSync({ data: t, path: s.path, parent: s });
    return Oe(s, n);
  }
  "~validate"(t) {
    var e, i;
    const s = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: t,
      parsedType: nt(t)
    };
    if (!this["~standard"].async)
      try {
        const n = this._parseSync({ data: t, path: [], parent: s });
        return xt(n) ? {
          value: n.value
        } : {
          issues: s.common.issues
        };
      } catch (n) {
        !((i = (e = n?.message) === null || e === void 0 ? void 0 : e.toLowerCase()) === null || i === void 0) && i.includes("encountered") && (this["~standard"].async = !0), s.common = {
          issues: [],
          async: !0
        };
      }
    return this._parseAsync({ data: t, path: [], parent: s }).then((n) => xt(n) ? {
      value: n.value
    } : {
      issues: s.common.issues
    });
  }
  async parseAsync(t, e) {
    const i = await this.safeParseAsync(t, e);
    if (i.success)
      return i.data;
    throw i.error;
  }
  async safeParseAsync(t, e) {
    const i = {
      common: {
        issues: [],
        contextualErrorMap: e?.errorMap,
        async: !0
      },
      path: e?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: t,
      parsedType: nt(t)
    }, s = this._parse({ data: t, path: i.path, parent: i }), n = await (Nt(s) ? s : Promise.resolve(s));
    return Oe(i, n);
  }
  refine(t, e) {
    const i = (s) => typeof e == "string" || typeof e > "u" ? { message: e } : typeof e == "function" ? e(s) : e;
    return this._refinement((s, n) => {
      const a = t(s), o = () => n.addIssue({
        code: u.custom,
        ...i(s)
      });
      return typeof Promise < "u" && a instanceof Promise ? a.then((l) => l ? !0 : (o(), !1)) : a ? !0 : (o(), !1);
    });
  }
  refinement(t, e) {
    return this._refinement((i, s) => t(i) ? !0 : (s.addIssue(typeof e == "function" ? e(i, s) : e), !1));
  }
  _refinement(t) {
    return new et({
      schema: this,
      typeName: x.ZodEffects,
      effect: { type: "refinement", refinement: t }
    });
  }
  superRefine(t) {
    return this._refinement(t);
  }
  constructor(t) {
    this.spa = this.safeParseAsync, this._def = t, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (e) => this["~validate"](e)
    };
  }
  optional() {
    return J.create(this, this._def);
  }
  nullable() {
    return dt.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return W.create(this);
  }
  promise() {
    return Lt.create(this, this._def);
  }
  or(t) {
    return Zt.create([this, t], this._def);
  }
  and(t) {
    return Wt.create(this, t, this._def);
  }
  transform(t) {
    return new et({
      ...T(this._def),
      schema: this,
      typeName: x.ZodEffects,
      effect: { type: "transform", transform: t }
    });
  }
  default(t) {
    const e = typeof t == "function" ? t : () => t;
    return new jt({
      ...T(this._def),
      innerType: this,
      defaultValue: e,
      typeName: x.ZodDefault
    });
  }
  brand() {
    return new Qe({
      typeName: x.ZodBranded,
      type: this,
      ...T(this._def)
    });
  }
  catch(t) {
    const e = typeof t == "function" ? t : () => t;
    return new qt({
      ...T(this._def),
      innerType: this,
      catchValue: e,
      typeName: x.ZodCatch
    });
  }
  describe(t) {
    const e = this.constructor;
    return new e({
      ...this._def,
      description: t
    });
  }
  pipe(t) {
    return ie.create(this, t);
  }
  readonly() {
    return Qt.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
}
const Ri = /^c[^\s-]{8,}$/i, Li = /^[0-9a-z]+$/, Mi = /^[0-9A-HJKMNP-TV-Z]{26}$/i, Hi = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i, Bi = /^[a-z0-9_-]{21}$/i, zi = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/, Fi = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/, Ni = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i, Vi = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
let le;
const Gi = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/, Ui = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/, Zi = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/, Wi = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/, Ki = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/, $i = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/, Xe = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))", Yi = new RegExp(`^${Xe}$`);
function je(r) {
  let t = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
  return r.precision ? t = `${t}\\.\\d{${r.precision}}` : r.precision == null && (t = `${t}(\\.\\d+)?`), t;
}
function Xi(r) {
  return new RegExp(`^${je(r)}$`);
}
function ji(r) {
  let t = `${Xe}T${je(r)}`;
  const e = [];
  return e.push(r.local ? "Z?" : "Z"), r.offset && e.push("([+-]\\d{2}:?\\d{2})"), t = `${t}(${e.join("|")})`, new RegExp(`^${t}$`);
}
function qi(r, t) {
  return !!((t === "v4" || !t) && Gi.test(r) || (t === "v6" || !t) && Zi.test(r));
}
function Qi(r, t) {
  if (!zi.test(r))
    return !1;
  try {
    const [e] = r.split("."), i = e.replace(/-/g, "+").replace(/_/g, "/").padEnd(e.length + (4 - e.length % 4) % 4, "="), s = JSON.parse(atob(i));
    return !(typeof s != "object" || s === null || !s.typ || !s.alg || t && s.alg !== t);
  } catch {
    return !1;
  }
}
function Ji(r, t) {
  return !!((t === "v4" || !t) && Ui.test(r) || (t === "v6" || !t) && Wi.test(r));
}
class q extends w {
  _parse(t) {
    if (this._def.coerce && (t.data = String(t.data)), this._getType(t) !== m.string) {
      const n = this._getOrReturnCtx(t);
      return g(n, {
        code: u.invalid_type,
        expected: m.string,
        received: n.parsedType
      }), k;
    }
    const i = new L();
    let s;
    for (const n of this._def.checks)
      if (n.kind === "min")
        t.data.length < n.value && (s = this._getOrReturnCtx(t, s), g(s, {
          code: u.too_small,
          minimum: n.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: n.message
        }), i.dirty());
      else if (n.kind === "max")
        t.data.length > n.value && (s = this._getOrReturnCtx(t, s), g(s, {
          code: u.too_big,
          maximum: n.value,
          type: "string",
          inclusive: !0,
          exact: !1,
          message: n.message
        }), i.dirty());
      else if (n.kind === "length") {
        const a = t.data.length > n.value, o = t.data.length < n.value;
        (a || o) && (s = this._getOrReturnCtx(t, s), a ? g(s, {
          code: u.too_big,
          maximum: n.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: n.message
        }) : o && g(s, {
          code: u.too_small,
          minimum: n.value,
          type: "string",
          inclusive: !0,
          exact: !0,
          message: n.message
        }), i.dirty());
      } else if (n.kind === "email")
        Ni.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
          validation: "email",
          code: u.invalid_string,
          message: n.message
        }), i.dirty());
      else if (n.kind === "emoji")
        le || (le = new RegExp(Vi, "u")), le.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
          validation: "emoji",
          code: u.invalid_string,
          message: n.message
        }), i.dirty());
      else if (n.kind === "uuid")
        Hi.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
          validation: "uuid",
          code: u.invalid_string,
          message: n.message
        }), i.dirty());
      else if (n.kind === "nanoid")
        Bi.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
          validation: "nanoid",
          code: u.invalid_string,
          message: n.message
        }), i.dirty());
      else if (n.kind === "cuid")
        Ri.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
          validation: "cuid",
          code: u.invalid_string,
          message: n.message
        }), i.dirty());
      else if (n.kind === "cuid2")
        Li.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
          validation: "cuid2",
          code: u.invalid_string,
          message: n.message
        }), i.dirty());
      else if (n.kind === "ulid")
        Mi.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
          validation: "ulid",
          code: u.invalid_string,
          message: n.message
        }), i.dirty());
      else if (n.kind === "url")
        try {
          new URL(t.data);
        } catch {
          s = this._getOrReturnCtx(t, s), g(s, {
            validation: "url",
            code: u.invalid_string,
            message: n.message
          }), i.dirty();
        }
      else n.kind === "regex" ? (n.regex.lastIndex = 0, n.regex.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
        validation: "regex",
        code: u.invalid_string,
        message: n.message
      }), i.dirty())) : n.kind === "trim" ? t.data = t.data.trim() : n.kind === "includes" ? t.data.includes(n.value, n.position) || (s = this._getOrReturnCtx(t, s), g(s, {
        code: u.invalid_string,
        validation: { includes: n.value, position: n.position },
        message: n.message
      }), i.dirty()) : n.kind === "toLowerCase" ? t.data = t.data.toLowerCase() : n.kind === "toUpperCase" ? t.data = t.data.toUpperCase() : n.kind === "startsWith" ? t.data.startsWith(n.value) || (s = this._getOrReturnCtx(t, s), g(s, {
        code: u.invalid_string,
        validation: { startsWith: n.value },
        message: n.message
      }), i.dirty()) : n.kind === "endsWith" ? t.data.endsWith(n.value) || (s = this._getOrReturnCtx(t, s), g(s, {
        code: u.invalid_string,
        validation: { endsWith: n.value },
        message: n.message
      }), i.dirty()) : n.kind === "datetime" ? ji(n).test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
        code: u.invalid_string,
        validation: "datetime",
        message: n.message
      }), i.dirty()) : n.kind === "date" ? Yi.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
        code: u.invalid_string,
        validation: "date",
        message: n.message
      }), i.dirty()) : n.kind === "time" ? Xi(n).test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
        code: u.invalid_string,
        validation: "time",
        message: n.message
      }), i.dirty()) : n.kind === "duration" ? Fi.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
        validation: "duration",
        code: u.invalid_string,
        message: n.message
      }), i.dirty()) : n.kind === "ip" ? qi(t.data, n.version) || (s = this._getOrReturnCtx(t, s), g(s, {
        validation: "ip",
        code: u.invalid_string,
        message: n.message
      }), i.dirty()) : n.kind === "jwt" ? Qi(t.data, n.alg) || (s = this._getOrReturnCtx(t, s), g(s, {
        validation: "jwt",
        code: u.invalid_string,
        message: n.message
      }), i.dirty()) : n.kind === "cidr" ? Ji(t.data, n.version) || (s = this._getOrReturnCtx(t, s), g(s, {
        validation: "cidr",
        code: u.invalid_string,
        message: n.message
      }), i.dirty()) : n.kind === "base64" ? Ki.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
        validation: "base64",
        code: u.invalid_string,
        message: n.message
      }), i.dirty()) : n.kind === "base64url" ? $i.test(t.data) || (s = this._getOrReturnCtx(t, s), g(s, {
        validation: "base64url",
        code: u.invalid_string,
        message: n.message
      }), i.dirty()) : I.assertNever(n);
    return { status: i.value, value: t.data };
  }
  _regex(t, e, i) {
    return this.refinement((s) => t.test(s), {
      validation: e,
      code: u.invalid_string,
      ...C.errToObj(i)
    });
  }
  _addCheck(t) {
    return new q({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  email(t) {
    return this._addCheck({ kind: "email", ...C.errToObj(t) });
  }
  url(t) {
    return this._addCheck({ kind: "url", ...C.errToObj(t) });
  }
  emoji(t) {
    return this._addCheck({ kind: "emoji", ...C.errToObj(t) });
  }
  uuid(t) {
    return this._addCheck({ kind: "uuid", ...C.errToObj(t) });
  }
  nanoid(t) {
    return this._addCheck({ kind: "nanoid", ...C.errToObj(t) });
  }
  cuid(t) {
    return this._addCheck({ kind: "cuid", ...C.errToObj(t) });
  }
  cuid2(t) {
    return this._addCheck({ kind: "cuid2", ...C.errToObj(t) });
  }
  ulid(t) {
    return this._addCheck({ kind: "ulid", ...C.errToObj(t) });
  }
  base64(t) {
    return this._addCheck({ kind: "base64", ...C.errToObj(t) });
  }
  base64url(t) {
    return this._addCheck({
      kind: "base64url",
      ...C.errToObj(t)
    });
  }
  jwt(t) {
    return this._addCheck({ kind: "jwt", ...C.errToObj(t) });
  }
  ip(t) {
    return this._addCheck({ kind: "ip", ...C.errToObj(t) });
  }
  cidr(t) {
    return this._addCheck({ kind: "cidr", ...C.errToObj(t) });
  }
  datetime(t) {
    var e, i;
    return typeof t == "string" ? this._addCheck({
      kind: "datetime",
      precision: null,
      offset: !1,
      local: !1,
      message: t
    }) : this._addCheck({
      kind: "datetime",
      precision: typeof t?.precision > "u" ? null : t?.precision,
      offset: (e = t?.offset) !== null && e !== void 0 ? e : !1,
      local: (i = t?.local) !== null && i !== void 0 ? i : !1,
      ...C.errToObj(t?.message)
    });
  }
  date(t) {
    return this._addCheck({ kind: "date", message: t });
  }
  time(t) {
    return typeof t == "string" ? this._addCheck({
      kind: "time",
      precision: null,
      message: t
    }) : this._addCheck({
      kind: "time",
      precision: typeof t?.precision > "u" ? null : t?.precision,
      ...C.errToObj(t?.message)
    });
  }
  duration(t) {
    return this._addCheck({ kind: "duration", ...C.errToObj(t) });
  }
  regex(t, e) {
    return this._addCheck({
      kind: "regex",
      regex: t,
      ...C.errToObj(e)
    });
  }
  includes(t, e) {
    return this._addCheck({
      kind: "includes",
      value: t,
      position: e?.position,
      ...C.errToObj(e?.message)
    });
  }
  startsWith(t, e) {
    return this._addCheck({
      kind: "startsWith",
      value: t,
      ...C.errToObj(e)
    });
  }
  endsWith(t, e) {
    return this._addCheck({
      kind: "endsWith",
      value: t,
      ...C.errToObj(e)
    });
  }
  min(t, e) {
    return this._addCheck({
      kind: "min",
      value: t,
      ...C.errToObj(e)
    });
  }
  max(t, e) {
    return this._addCheck({
      kind: "max",
      value: t,
      ...C.errToObj(e)
    });
  }
  length(t, e) {
    return this._addCheck({
      kind: "length",
      value: t,
      ...C.errToObj(e)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(t) {
    return this.min(1, C.errToObj(t));
  }
  trim() {
    return new q({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new q({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new q({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((t) => t.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((t) => t.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((t) => t.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((t) => t.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((t) => t.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((t) => t.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((t) => t.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((t) => t.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((t) => t.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((t) => t.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((t) => t.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((t) => t.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((t) => t.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((t) => t.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((t) => t.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((t) => t.kind === "base64url");
  }
  get minLength() {
    let t = null;
    for (const e of this._def.checks)
      e.kind === "min" && (t === null || e.value > t) && (t = e.value);
    return t;
  }
  get maxLength() {
    let t = null;
    for (const e of this._def.checks)
      e.kind === "max" && (t === null || e.value < t) && (t = e.value);
    return t;
  }
}
q.create = (r) => {
  var t;
  return new q({
    checks: [],
    typeName: x.ZodString,
    coerce: (t = r?.coerce) !== null && t !== void 0 ? t : !1,
    ...T(r)
  });
};
function ts(r, t) {
  const e = (r.toString().split(".")[1] || "").length, i = (t.toString().split(".")[1] || "").length, s = e > i ? e : i, n = parseInt(r.toFixed(s).replace(".", "")), a = parseInt(t.toFixed(s).replace(".", ""));
  return n % a / Math.pow(10, s);
}
class kt extends w {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
  }
  _parse(t) {
    if (this._def.coerce && (t.data = Number(t.data)), this._getType(t) !== m.number) {
      const n = this._getOrReturnCtx(t);
      return g(n, {
        code: u.invalid_type,
        expected: m.number,
        received: n.parsedType
      }), k;
    }
    let i;
    const s = new L();
    for (const n of this._def.checks)
      n.kind === "int" ? I.isInteger(t.data) || (i = this._getOrReturnCtx(t, i), g(i, {
        code: u.invalid_type,
        expected: "integer",
        received: "float",
        message: n.message
      }), s.dirty()) : n.kind === "min" ? (n.inclusive ? t.data < n.value : t.data <= n.value) && (i = this._getOrReturnCtx(t, i), g(i, {
        code: u.too_small,
        minimum: n.value,
        type: "number",
        inclusive: n.inclusive,
        exact: !1,
        message: n.message
      }), s.dirty()) : n.kind === "max" ? (n.inclusive ? t.data > n.value : t.data >= n.value) && (i = this._getOrReturnCtx(t, i), g(i, {
        code: u.too_big,
        maximum: n.value,
        type: "number",
        inclusive: n.inclusive,
        exact: !1,
        message: n.message
      }), s.dirty()) : n.kind === "multipleOf" ? ts(t.data, n.value) !== 0 && (i = this._getOrReturnCtx(t, i), g(i, {
        code: u.not_multiple_of,
        multipleOf: n.value,
        message: n.message
      }), s.dirty()) : n.kind === "finite" ? Number.isFinite(t.data) || (i = this._getOrReturnCtx(t, i), g(i, {
        code: u.not_finite,
        message: n.message
      }), s.dirty()) : I.assertNever(n);
    return { status: s.value, value: t.data };
  }
  gte(t, e) {
    return this.setLimit("min", t, !0, C.toString(e));
  }
  gt(t, e) {
    return this.setLimit("min", t, !1, C.toString(e));
  }
  lte(t, e) {
    return this.setLimit("max", t, !0, C.toString(e));
  }
  lt(t, e) {
    return this.setLimit("max", t, !1, C.toString(e));
  }
  setLimit(t, e, i, s) {
    return new kt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: t,
          value: e,
          inclusive: i,
          message: C.toString(s)
        }
      ]
    });
  }
  _addCheck(t) {
    return new kt({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  int(t) {
    return this._addCheck({
      kind: "int",
      message: C.toString(t)
    });
  }
  positive(t) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !1,
      message: C.toString(t)
    });
  }
  negative(t) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !1,
      message: C.toString(t)
    });
  }
  nonpositive(t) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: !0,
      message: C.toString(t)
    });
  }
  nonnegative(t) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: !0,
      message: C.toString(t)
    });
  }
  multipleOf(t, e) {
    return this._addCheck({
      kind: "multipleOf",
      value: t,
      message: C.toString(e)
    });
  }
  finite(t) {
    return this._addCheck({
      kind: "finite",
      message: C.toString(t)
    });
  }
  safe(t) {
    return this._addCheck({
      kind: "min",
      inclusive: !0,
      value: Number.MIN_SAFE_INTEGER,
      message: C.toString(t)
    })._addCheck({
      kind: "max",
      inclusive: !0,
      value: Number.MAX_SAFE_INTEGER,
      message: C.toString(t)
    });
  }
  get minValue() {
    let t = null;
    for (const e of this._def.checks)
      e.kind === "min" && (t === null || e.value > t) && (t = e.value);
    return t;
  }
  get maxValue() {
    let t = null;
    for (const e of this._def.checks)
      e.kind === "max" && (t === null || e.value < t) && (t = e.value);
    return t;
  }
  get isInt() {
    return !!this._def.checks.find((t) => t.kind === "int" || t.kind === "multipleOf" && I.isInteger(t.value));
  }
  get isFinite() {
    let t = null, e = null;
    for (const i of this._def.checks) {
      if (i.kind === "finite" || i.kind === "int" || i.kind === "multipleOf")
        return !0;
      i.kind === "min" ? (e === null || i.value > e) && (e = i.value) : i.kind === "max" && (t === null || i.value < t) && (t = i.value);
    }
    return Number.isFinite(e) && Number.isFinite(t);
  }
}
kt.create = (r) => new kt({
  checks: [],
  typeName: x.ZodNumber,
  coerce: r?.coerce || !1,
  ...T(r)
});
class Tt extends w {
  constructor() {
    super(...arguments), this.min = this.gte, this.max = this.lte;
  }
  _parse(t) {
    if (this._def.coerce)
      try {
        t.data = BigInt(t.data);
      } catch {
        return this._getInvalidInput(t);
      }
    if (this._getType(t) !== m.bigint)
      return this._getInvalidInput(t);
    let i;
    const s = new L();
    for (const n of this._def.checks)
      n.kind === "min" ? (n.inclusive ? t.data < n.value : t.data <= n.value) && (i = this._getOrReturnCtx(t, i), g(i, {
        code: u.too_small,
        type: "bigint",
        minimum: n.value,
        inclusive: n.inclusive,
        message: n.message
      }), s.dirty()) : n.kind === "max" ? (n.inclusive ? t.data > n.value : t.data >= n.value) && (i = this._getOrReturnCtx(t, i), g(i, {
        code: u.too_big,
        type: "bigint",
        maximum: n.value,
        inclusive: n.inclusive,
        message: n.message
      }), s.dirty()) : n.kind === "multipleOf" ? t.data % n.value !== BigInt(0) && (i = this._getOrReturnCtx(t, i), g(i, {
        code: u.not_multiple_of,
        multipleOf: n.value,
        message: n.message
      }), s.dirty()) : I.assertNever(n);
    return { status: s.value, value: t.data };
  }
  _getInvalidInput(t) {
    const e = this._getOrReturnCtx(t);
    return g(e, {
      code: u.invalid_type,
      expected: m.bigint,
      received: e.parsedType
    }), k;
  }
  gte(t, e) {
    return this.setLimit("min", t, !0, C.toString(e));
  }
  gt(t, e) {
    return this.setLimit("min", t, !1, C.toString(e));
  }
  lte(t, e) {
    return this.setLimit("max", t, !0, C.toString(e));
  }
  lt(t, e) {
    return this.setLimit("max", t, !1, C.toString(e));
  }
  setLimit(t, e, i, s) {
    return new Tt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind: t,
          value: e,
          inclusive: i,
          message: C.toString(s)
        }
      ]
    });
  }
  _addCheck(t) {
    return new Tt({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  positive(t) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !1,
      message: C.toString(t)
    });
  }
  negative(t) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !1,
      message: C.toString(t)
    });
  }
  nonpositive(t) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: !0,
      message: C.toString(t)
    });
  }
  nonnegative(t) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: !0,
      message: C.toString(t)
    });
  }
  multipleOf(t, e) {
    return this._addCheck({
      kind: "multipleOf",
      value: t,
      message: C.toString(e)
    });
  }
  get minValue() {
    let t = null;
    for (const e of this._def.checks)
      e.kind === "min" && (t === null || e.value > t) && (t = e.value);
    return t;
  }
  get maxValue() {
    let t = null;
    for (const e of this._def.checks)
      e.kind === "max" && (t === null || e.value < t) && (t = e.value);
    return t;
  }
}
Tt.create = (r) => {
  var t;
  return new Tt({
    checks: [],
    typeName: x.ZodBigInt,
    coerce: (t = r?.coerce) !== null && t !== void 0 ? t : !1,
    ...T(r)
  });
};
class ue extends w {
  _parse(t) {
    if (this._def.coerce && (t.data = !!t.data), this._getType(t) !== m.boolean) {
      const i = this._getOrReturnCtx(t);
      return g(i, {
        code: u.invalid_type,
        expected: m.boolean,
        received: i.parsedType
      }), k;
    }
    return B(t.data);
  }
}
ue.create = (r) => new ue({
  typeName: x.ZodBoolean,
  coerce: r?.coerce || !1,
  ...T(r)
});
class Rt extends w {
  _parse(t) {
    if (this._def.coerce && (t.data = new Date(t.data)), this._getType(t) !== m.date) {
      const n = this._getOrReturnCtx(t);
      return g(n, {
        code: u.invalid_type,
        expected: m.date,
        received: n.parsedType
      }), k;
    }
    if (isNaN(t.data.getTime())) {
      const n = this._getOrReturnCtx(t);
      return g(n, {
        code: u.invalid_date
      }), k;
    }
    const i = new L();
    let s;
    for (const n of this._def.checks)
      n.kind === "min" ? t.data.getTime() < n.value && (s = this._getOrReturnCtx(t, s), g(s, {
        code: u.too_small,
        message: n.message,
        inclusive: !0,
        exact: !1,
        minimum: n.value,
        type: "date"
      }), i.dirty()) : n.kind === "max" ? t.data.getTime() > n.value && (s = this._getOrReturnCtx(t, s), g(s, {
        code: u.too_big,
        message: n.message,
        inclusive: !0,
        exact: !1,
        maximum: n.value,
        type: "date"
      }), i.dirty()) : I.assertNever(n);
    return {
      status: i.value,
      value: new Date(t.data.getTime())
    };
  }
  _addCheck(t) {
    return new Rt({
      ...this._def,
      checks: [...this._def.checks, t]
    });
  }
  min(t, e) {
    return this._addCheck({
      kind: "min",
      value: t.getTime(),
      message: C.toString(e)
    });
  }
  max(t, e) {
    return this._addCheck({
      kind: "max",
      value: t.getTime(),
      message: C.toString(e)
    });
  }
  get minDate() {
    let t = null;
    for (const e of this._def.checks)
      e.kind === "min" && (t === null || e.value > t) && (t = e.value);
    return t != null ? new Date(t) : null;
  }
  get maxDate() {
    let t = null;
    for (const e of this._def.checks)
      e.kind === "max" && (t === null || e.value < t) && (t = e.value);
    return t != null ? new Date(t) : null;
  }
}
Rt.create = (r) => new Rt({
  checks: [],
  coerce: r?.coerce || !1,
  typeName: x.ZodDate,
  ...T(r)
});
class pe extends w {
  _parse(t) {
    if (this._getType(t) !== m.symbol) {
      const i = this._getOrReturnCtx(t);
      return g(i, {
        code: u.invalid_type,
        expected: m.symbol,
        received: i.parsedType
      }), k;
    }
    return B(t.data);
  }
}
pe.create = (r) => new pe({
  typeName: x.ZodSymbol,
  ...T(r)
});
class Gt extends w {
  _parse(t) {
    if (this._getType(t) !== m.undefined) {
      const i = this._getOrReturnCtx(t);
      return g(i, {
        code: u.invalid_type,
        expected: m.undefined,
        received: i.parsedType
      }), k;
    }
    return B(t.data);
  }
}
Gt.create = (r) => new Gt({
  typeName: x.ZodUndefined,
  ...T(r)
});
class Ut extends w {
  _parse(t) {
    if (this._getType(t) !== m.null) {
      const i = this._getOrReturnCtx(t);
      return g(i, {
        code: u.invalid_type,
        expected: m.null,
        received: i.parsedType
      }), k;
    }
    return B(t.data);
  }
}
Ut.create = (r) => new Ut({
  typeName: x.ZodNull,
  ...T(r)
});
class fe extends w {
  constructor() {
    super(...arguments), this._any = !0;
  }
  _parse(t) {
    return B(t.data);
  }
}
fe.create = (r) => new fe({
  typeName: x.ZodAny,
  ...T(r)
});
class yt extends w {
  constructor() {
    super(...arguments), this._unknown = !0;
  }
  _parse(t) {
    return B(t.data);
  }
}
yt.create = (r) => new yt({
  typeName: x.ZodUnknown,
  ...T(r)
});
class rt extends w {
  _parse(t) {
    const e = this._getOrReturnCtx(t);
    return g(e, {
      code: u.invalid_type,
      expected: m.never,
      received: e.parsedType
    }), k;
  }
}
rt.create = (r) => new rt({
  typeName: x.ZodNever,
  ...T(r)
});
class ge extends w {
  _parse(t) {
    if (this._getType(t) !== m.undefined) {
      const i = this._getOrReturnCtx(t);
      return g(i, {
        code: u.invalid_type,
        expected: m.void,
        received: i.parsedType
      }), k;
    }
    return B(t.data);
  }
}
ge.create = (r) => new ge({
  typeName: x.ZodVoid,
  ...T(r)
});
class W extends w {
  _parse(t) {
    const { ctx: e, status: i } = this._processInputParams(t), s = this._def;
    if (e.parsedType !== m.array)
      return g(e, {
        code: u.invalid_type,
        expected: m.array,
        received: e.parsedType
      }), k;
    if (s.exactLength !== null) {
      const a = e.data.length > s.exactLength.value, o = e.data.length < s.exactLength.value;
      (a || o) && (g(e, {
        code: a ? u.too_big : u.too_small,
        minimum: o ? s.exactLength.value : void 0,
        maximum: a ? s.exactLength.value : void 0,
        type: "array",
        inclusive: !0,
        exact: !0,
        message: s.exactLength.message
      }), i.dirty());
    }
    if (s.minLength !== null && e.data.length < s.minLength.value && (g(e, {
      code: u.too_small,
      minimum: s.minLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: s.minLength.message
    }), i.dirty()), s.maxLength !== null && e.data.length > s.maxLength.value && (g(e, {
      code: u.too_big,
      maximum: s.maxLength.value,
      type: "array",
      inclusive: !0,
      exact: !1,
      message: s.maxLength.message
    }), i.dirty()), e.common.async)
      return Promise.all([...e.data].map((a, o) => s.type._parseAsync(new K(e, a, e.path, o)))).then((a) => L.mergeArray(i, a));
    const n = [...e.data].map((a, o) => s.type._parseSync(new K(e, a, e.path, o)));
    return L.mergeArray(i, n);
  }
  get element() {
    return this._def.type;
  }
  min(t, e) {
    return new W({
      ...this._def,
      minLength: { value: t, message: C.toString(e) }
    });
  }
  max(t, e) {
    return new W({
      ...this._def,
      maxLength: { value: t, message: C.toString(e) }
    });
  }
  length(t, e) {
    return new W({
      ...this._def,
      exactLength: { value: t, message: C.toString(e) }
    });
  }
  nonempty(t) {
    return this.min(1, t);
  }
}
W.create = (r, t) => new W({
  type: r,
  minLength: null,
  maxLength: null,
  exactLength: null,
  typeName: x.ZodArray,
  ...T(t)
});
function gt(r) {
  if (r instanceof A) {
    const t = {};
    for (const e in r.shape) {
      const i = r.shape[e];
      t[e] = J.create(gt(i));
    }
    return new A({
      ...r._def,
      shape: () => t
    });
  } else return r instanceof W ? new W({
    ...r._def,
    type: gt(r.element)
  }) : r instanceof J ? J.create(gt(r.unwrap())) : r instanceof dt ? dt.create(gt(r.unwrap())) : r instanceof tt ? tt.create(r.items.map((t) => gt(t))) : r;
}
class A extends w {
  constructor() {
    super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const t = this._def.shape(), e = I.objectKeys(t);
    return this._cached = { shape: t, keys: e };
  }
  _parse(t) {
    if (this._getType(t) !== m.object) {
      const c = this._getOrReturnCtx(t);
      return g(c, {
        code: u.invalid_type,
        expected: m.object,
        received: c.parsedType
      }), k;
    }
    const { status: i, ctx: s } = this._processInputParams(t), { shape: n, keys: a } = this._getCached(), o = [];
    if (!(this._def.catchall instanceof rt && this._def.unknownKeys === "strip"))
      for (const c in s.data)
        a.includes(c) || o.push(c);
    const l = [];
    for (const c of a) {
      const h = n[c], p = s.data[c];
      l.push({
        key: { status: "valid", value: c },
        value: h._parse(new K(s, p, s.path, c)),
        alwaysSet: c in s.data
      });
    }
    if (this._def.catchall instanceof rt) {
      const c = this._def.unknownKeys;
      if (c === "passthrough")
        for (const h of o)
          l.push({
            key: { status: "valid", value: h },
            value: { status: "valid", value: s.data[h] }
          });
      else if (c === "strict")
        o.length > 0 && (g(s, {
          code: u.unrecognized_keys,
          keys: o
        }), i.dirty());
      else if (c !== "strip") throw new Error("Internal ZodObject error: invalid unknownKeys value.");
    } else {
      const c = this._def.catchall;
      for (const h of o) {
        const p = s.data[h];
        l.push({
          key: { status: "valid", value: h },
          value: c._parse(
            new K(s, p, s.path, h)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: h in s.data
        });
      }
    }
    return s.common.async ? Promise.resolve().then(async () => {
      const c = [];
      for (const h of l) {
        const p = await h.key, f = await h.value;
        c.push({
          key: p,
          value: f,
          alwaysSet: h.alwaysSet
        });
      }
      return c;
    }).then((c) => L.mergeObjectSync(i, c)) : L.mergeObjectSync(i, l);
  }
  get shape() {
    return this._def.shape();
  }
  strict(t) {
    return C.errToObj, new A({
      ...this._def,
      unknownKeys: "strict",
      ...t !== void 0 ? {
        errorMap: (e, i) => {
          var s, n, a, o;
          const l = (a = (n = (s = this._def).errorMap) === null || n === void 0 ? void 0 : n.call(s, e, i).message) !== null && a !== void 0 ? a : i.defaultError;
          return e.code === "unrecognized_keys" ? {
            message: (o = C.errToObj(t).message) !== null && o !== void 0 ? o : l
          } : {
            message: l
          };
        }
      } : {}
    });
  }
  strip() {
    return new A({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new A({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(t) {
    return new A({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...t
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(t) {
    return new A({
      unknownKeys: t._def.unknownKeys,
      catchall: t._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...t._def.shape()
      }),
      typeName: x.ZodObject
    });
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(t, e) {
    return this.augment({ [t]: e });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(t) {
    return new A({
      ...this._def,
      catchall: t
    });
  }
  pick(t) {
    const e = {};
    return I.objectKeys(t).forEach((i) => {
      t[i] && this.shape[i] && (e[i] = this.shape[i]);
    }), new A({
      ...this._def,
      shape: () => e
    });
  }
  omit(t) {
    const e = {};
    return I.objectKeys(this.shape).forEach((i) => {
      t[i] || (e[i] = this.shape[i]);
    }), new A({
      ...this._def,
      shape: () => e
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return gt(this);
  }
  partial(t) {
    const e = {};
    return I.objectKeys(this.shape).forEach((i) => {
      const s = this.shape[i];
      t && !t[i] ? e[i] = s : e[i] = s.optional();
    }), new A({
      ...this._def,
      shape: () => e
    });
  }
  required(t) {
    const e = {};
    return I.objectKeys(this.shape).forEach((i) => {
      if (t && !t[i])
        e[i] = this.shape[i];
      else {
        let n = this.shape[i];
        for (; n instanceof J; )
          n = n._def.innerType;
        e[i] = n;
      }
    }), new A({
      ...this._def,
      shape: () => e
    });
  }
  keyof() {
    return qe(I.objectKeys(this.shape));
  }
}
A.create = (r, t) => new A({
  shape: () => r,
  unknownKeys: "strip",
  catchall: rt.create(),
  typeName: x.ZodObject,
  ...T(t)
});
A.strictCreate = (r, t) => new A({
  shape: () => r,
  unknownKeys: "strict",
  catchall: rt.create(),
  typeName: x.ZodObject,
  ...T(t)
});
A.lazycreate = (r, t) => new A({
  shape: r,
  unknownKeys: "strip",
  catchall: rt.create(),
  typeName: x.ZodObject,
  ...T(t)
});
class Zt extends w {
  _parse(t) {
    const { ctx: e } = this._processInputParams(t), i = this._def.options;
    function s(n) {
      for (const o of n)
        if (o.result.status === "valid")
          return o.result;
      for (const o of n)
        if (o.result.status === "dirty")
          return e.common.issues.push(...o.ctx.common.issues), o.result;
      const a = n.map((o) => new N(o.ctx.common.issues));
      return g(e, {
        code: u.invalid_union,
        unionErrors: a
      }), k;
    }
    if (e.common.async)
      return Promise.all(i.map(async (n) => {
        const a = {
          ...e,
          common: {
            ...e.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await n._parseAsync({
            data: e.data,
            path: e.path,
            parent: a
          }),
          ctx: a
        };
      })).then(s);
    {
      let n;
      const a = [];
      for (const l of i) {
        const c = {
          ...e,
          common: {
            ...e.common,
            issues: []
          },
          parent: null
        }, h = l._parseSync({
          data: e.data,
          path: e.path,
          parent: c
        });
        if (h.status === "valid")
          return h;
        h.status === "dirty" && !n && (n = { result: h, ctx: c }), c.common.issues.length && a.push(c.common.issues);
      }
      if (n)
        return e.common.issues.push(...n.ctx.common.issues), n.result;
      const o = a.map((l) => new N(l));
      return g(e, {
        code: u.invalid_union,
        unionErrors: o
      }), k;
    }
  }
  get options() {
    return this._def.options;
  }
}
Zt.create = (r, t) => new Zt({
  options: r,
  typeName: x.ZodUnion,
  ...T(t)
});
const j = (r) => r instanceof $t ? j(r.schema) : r instanceof et ? j(r.innerType()) : r instanceof Yt ? [r.value] : r instanceof ht ? r.options : r instanceof Xt ? I.objectValues(r.enum) : r instanceof jt ? j(r._def.innerType) : r instanceof Gt ? [void 0] : r instanceof Ut ? [null] : r instanceof J ? [void 0, ...j(r.unwrap())] : r instanceof dt ? [null, ...j(r.unwrap())] : r instanceof Qe || r instanceof Qt ? j(r.unwrap()) : r instanceof qt ? j(r._def.innerType) : [];
class xe extends w {
  _parse(t) {
    const { ctx: e } = this._processInputParams(t);
    if (e.parsedType !== m.object)
      return g(e, {
        code: u.invalid_type,
        expected: m.object,
        received: e.parsedType
      }), k;
    const i = this.discriminator, s = e.data[i], n = this.optionsMap.get(s);
    return n ? e.common.async ? n._parseAsync({
      data: e.data,
      path: e.path,
      parent: e
    }) : n._parseSync({
      data: e.data,
      path: e.path,
      parent: e
    }) : (g(e, {
      code: u.invalid_union_discriminator,
      options: Array.from(this.optionsMap.keys()),
      path: [i]
    }), k);
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(t, e, i) {
    const s = /* @__PURE__ */ new Map();
    for (const n of e) {
      const a = j(n.shape[t]);
      if (!a.length)
        throw new Error(`A discriminator value for key \`${t}\` could not be extracted from all schema options`);
      for (const o of a) {
        if (s.has(o))
          throw new Error(`Discriminator property ${String(t)} has duplicate value ${String(o)}`);
        s.set(o, n);
      }
    }
    return new xe({
      typeName: x.ZodDiscriminatedUnion,
      discriminator: t,
      options: e,
      optionsMap: s,
      ...T(i)
    });
  }
}
function me(r, t) {
  const e = nt(r), i = nt(t);
  if (r === t)
    return { valid: !0, data: r };
  if (e === m.object && i === m.object) {
    const s = I.objectKeys(t), n = I.objectKeys(r).filter((o) => s.indexOf(o) !== -1), a = { ...r, ...t };
    for (const o of n) {
      const l = me(r[o], t[o]);
      if (!l.valid)
        return { valid: !1 };
      a[o] = l.data;
    }
    return { valid: !0, data: a };
  } else if (e === m.array && i === m.array) {
    if (r.length !== t.length)
      return { valid: !1 };
    const s = [];
    for (let n = 0; n < r.length; n++) {
      const a = r[n], o = t[n], l = me(a, o);
      if (!l.valid)
        return { valid: !1 };
      s.push(l.data);
    }
    return { valid: !0, data: s };
  } else return e === m.date && i === m.date && +r == +t ? { valid: !0, data: r } : { valid: !1 };
}
class Wt extends w {
  _parse(t) {
    const { status: e, ctx: i } = this._processInputParams(t), s = (n, a) => {
      if (Ee(n) || Ee(a))
        return k;
      const o = me(n.value, a.value);
      return o.valid ? ((Ae(n) || Ae(a)) && e.dirty(), { status: e.value, value: o.data }) : (g(i, {
        code: u.invalid_intersection_types
      }), k);
    };
    return i.common.async ? Promise.all([
      this._def.left._parseAsync({
        data: i.data,
        path: i.path,
        parent: i
      }),
      this._def.right._parseAsync({
        data: i.data,
        path: i.path,
        parent: i
      })
    ]).then(([n, a]) => s(n, a)) : s(this._def.left._parseSync({
      data: i.data,
      path: i.path,
      parent: i
    }), this._def.right._parseSync({
      data: i.data,
      path: i.path,
      parent: i
    }));
  }
}
Wt.create = (r, t, e) => new Wt({
  left: r,
  right: t,
  typeName: x.ZodIntersection,
  ...T(e)
});
class tt extends w {
  _parse(t) {
    const { status: e, ctx: i } = this._processInputParams(t);
    if (i.parsedType !== m.array)
      return g(i, {
        code: u.invalid_type,
        expected: m.array,
        received: i.parsedType
      }), k;
    if (i.data.length < this._def.items.length)
      return g(i, {
        code: u.too_small,
        minimum: this._def.items.length,
        inclusive: !0,
        exact: !1,
        type: "array"
      }), k;
    !this._def.rest && i.data.length > this._def.items.length && (g(i, {
      code: u.too_big,
      maximum: this._def.items.length,
      inclusive: !0,
      exact: !1,
      type: "array"
    }), e.dirty());
    const n = [...i.data].map((a, o) => {
      const l = this._def.items[o] || this._def.rest;
      return l ? l._parse(new K(i, a, i.path, o)) : null;
    }).filter((a) => !!a);
    return i.common.async ? Promise.all(n).then((a) => L.mergeArray(e, a)) : L.mergeArray(e, n);
  }
  get items() {
    return this._def.items;
  }
  rest(t) {
    return new tt({
      ...this._def,
      rest: t
    });
  }
}
tt.create = (r, t) => {
  if (!Array.isArray(r))
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  return new tt({
    items: r,
    typeName: x.ZodTuple,
    rest: null,
    ...T(t)
  });
};
class Kt extends w {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: e, ctx: i } = this._processInputParams(t);
    if (i.parsedType !== m.object)
      return g(i, {
        code: u.invalid_type,
        expected: m.object,
        received: i.parsedType
      }), k;
    const s = [], n = this._def.keyType, a = this._def.valueType;
    for (const o in i.data)
      s.push({
        key: n._parse(new K(i, o, i.path, o)),
        value: a._parse(new K(i, i.data[o], i.path, o)),
        alwaysSet: o in i.data
      });
    return i.common.async ? L.mergeObjectAsync(e, s) : L.mergeObjectSync(e, s);
  }
  get element() {
    return this._def.valueType;
  }
  static create(t, e, i) {
    return e instanceof w ? new Kt({
      keyType: t,
      valueType: e,
      typeName: x.ZodRecord,
      ...T(i)
    }) : new Kt({
      keyType: q.create(),
      valueType: t,
      typeName: x.ZodRecord,
      ...T(e)
    });
  }
}
class ye extends w {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(t) {
    const { status: e, ctx: i } = this._processInputParams(t);
    if (i.parsedType !== m.map)
      return g(i, {
        code: u.invalid_type,
        expected: m.map,
        received: i.parsedType
      }), k;
    const s = this._def.keyType, n = this._def.valueType, a = [...i.data.entries()].map(([o, l], c) => ({
      key: s._parse(new K(i, o, i.path, [c, "key"])),
      value: n._parse(new K(i, l, i.path, [c, "value"]))
    }));
    if (i.common.async) {
      const o = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const l of a) {
          const c = await l.key, h = await l.value;
          if (c.status === "aborted" || h.status === "aborted")
            return k;
          (c.status === "dirty" || h.status === "dirty") && e.dirty(), o.set(c.value, h.value);
        }
        return { status: e.value, value: o };
      });
    } else {
      const o = /* @__PURE__ */ new Map();
      for (const l of a) {
        const c = l.key, h = l.value;
        if (c.status === "aborted" || h.status === "aborted")
          return k;
        (c.status === "dirty" || h.status === "dirty") && e.dirty(), o.set(c.value, h.value);
      }
      return { status: e.value, value: o };
    }
  }
}
ye.create = (r, t, e) => new ye({
  valueType: t,
  keyType: r,
  typeName: x.ZodMap,
  ...T(e)
});
class wt extends w {
  _parse(t) {
    const { status: e, ctx: i } = this._processInputParams(t);
    if (i.parsedType !== m.set)
      return g(i, {
        code: u.invalid_type,
        expected: m.set,
        received: i.parsedType
      }), k;
    const s = this._def;
    s.minSize !== null && i.data.size < s.minSize.value && (g(i, {
      code: u.too_small,
      minimum: s.minSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: s.minSize.message
    }), e.dirty()), s.maxSize !== null && i.data.size > s.maxSize.value && (g(i, {
      code: u.too_big,
      maximum: s.maxSize.value,
      type: "set",
      inclusive: !0,
      exact: !1,
      message: s.maxSize.message
    }), e.dirty());
    const n = this._def.valueType;
    function a(l) {
      const c = /* @__PURE__ */ new Set();
      for (const h of l) {
        if (h.status === "aborted")
          return k;
        h.status === "dirty" && e.dirty(), c.add(h.value);
      }
      return { status: e.value, value: c };
    }
    const o = [...i.data.values()].map((l, c) => n._parse(new K(i, l, i.path, c)));
    return i.common.async ? Promise.all(o).then((l) => a(l)) : a(o);
  }
  min(t, e) {
    return new wt({
      ...this._def,
      minSize: { value: t, message: C.toString(e) }
    });
  }
  max(t, e) {
    return new wt({
      ...this._def,
      maxSize: { value: t, message: C.toString(e) }
    });
  }
  size(t, e) {
    return this.min(t, e).max(t, e);
  }
  nonempty(t) {
    return this.min(1, t);
  }
}
wt.create = (r, t) => new wt({
  valueType: r,
  minSize: null,
  maxSize: null,
  typeName: x.ZodSet,
  ...T(t)
});
class At extends w {
  constructor() {
    super(...arguments), this.validate = this.implement;
  }
  _parse(t) {
    const { ctx: e } = this._processInputParams(t);
    if (e.parsedType !== m.function)
      return g(e, {
        code: u.invalid_type,
        expected: m.function,
        received: e.parsedType
      }), k;
    function i(o, l) {
      return de({
        data: o,
        path: e.path,
        errorMaps: [
          e.common.contextualErrorMap,
          e.schemaErrorMap,
          he(),
          Dt
        ].filter((c) => !!c),
        issueData: {
          code: u.invalid_arguments,
          argumentsError: l
        }
      });
    }
    function s(o, l) {
      return de({
        data: o,
        path: e.path,
        errorMaps: [
          e.common.contextualErrorMap,
          e.schemaErrorMap,
          he(),
          Dt
        ].filter((c) => !!c),
        issueData: {
          code: u.invalid_return_type,
          returnTypeError: l
        }
      });
    }
    const n = { errorMap: e.common.contextualErrorMap }, a = e.data;
    if (this._def.returns instanceof Lt) {
      const o = this;
      return B(async function(...l) {
        const c = new N([]), h = await o._def.args.parseAsync(l, n).catch((y) => {
          throw c.addIssue(i(l, y)), c;
        }), p = await Reflect.apply(a, this, h);
        return await o._def.returns._def.type.parseAsync(p, n).catch((y) => {
          throw c.addIssue(s(p, y)), c;
        });
      });
    } else {
      const o = this;
      return B(function(...l) {
        const c = o._def.args.safeParse(l, n);
        if (!c.success)
          throw new N([i(l, c.error)]);
        const h = Reflect.apply(a, this, c.data), p = o._def.returns.safeParse(h, n);
        if (!p.success)
          throw new N([s(h, p.error)]);
        return p.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...t) {
    return new At({
      ...this._def,
      args: tt.create(t).rest(yt.create())
    });
  }
  returns(t) {
    return new At({
      ...this._def,
      returns: t
    });
  }
  implement(t) {
    return this.parse(t);
  }
  strictImplement(t) {
    return this.parse(t);
  }
  static create(t, e, i) {
    return new At({
      args: t || tt.create([]).rest(yt.create()),
      returns: e || yt.create(),
      typeName: x.ZodFunction,
      ...T(i)
    });
  }
}
class $t extends w {
  get schema() {
    return this._def.getter();
  }
  _parse(t) {
    const { ctx: e } = this._processInputParams(t);
    return this._def.getter()._parse({ data: e.data, path: e.path, parent: e });
  }
}
$t.create = (r, t) => new $t({
  getter: r,
  typeName: x.ZodLazy,
  ...T(t)
});
class Yt extends w {
  _parse(t) {
    if (t.data !== this._def.value) {
      const e = this._getOrReturnCtx(t);
      return g(e, {
        received: e.data,
        code: u.invalid_literal,
        expected: this._def.value
      }), k;
    }
    return { status: "valid", value: t.data };
  }
  get value() {
    return this._def.value;
  }
}
Yt.create = (r, t) => new Yt({
  value: r,
  typeName: x.ZodLiteral,
  ...T(t)
});
function qe(r, t) {
  return new ht({
    values: r,
    typeName: x.ZodEnum,
    ...T(t)
  });
}
class ht extends w {
  constructor() {
    super(...arguments), It.set(this, void 0);
  }
  _parse(t) {
    if (typeof t.data != "string") {
      const e = this._getOrReturnCtx(t), i = this._def.values;
      return g(e, {
        expected: I.joinValues(i),
        received: e.parsedType,
        code: u.invalid_type
      }), k;
    }
    if (Vt(this, It) || Ye(this, It, new Set(this._def.values)), !Vt(this, It).has(t.data)) {
      const e = this._getOrReturnCtx(t), i = this._def.values;
      return g(e, {
        received: e.data,
        code: u.invalid_enum_value,
        options: i
      }), k;
    }
    return B(t.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const t = {};
    for (const e of this._def.values)
      t[e] = e;
    return t;
  }
  get Values() {
    const t = {};
    for (const e of this._def.values)
      t[e] = e;
    return t;
  }
  get Enum() {
    const t = {};
    for (const e of this._def.values)
      t[e] = e;
    return t;
  }
  extract(t, e = this._def) {
    return ht.create(t, {
      ...this._def,
      ...e
    });
  }
  exclude(t, e = this._def) {
    return ht.create(this.options.filter((i) => !t.includes(i)), {
      ...this._def,
      ...e
    });
  }
}
It = /* @__PURE__ */ new WeakMap();
ht.create = qe;
class Xt extends w {
  constructor() {
    super(...arguments), _t.set(this, void 0);
  }
  _parse(t) {
    const e = I.getValidEnumValues(this._def.values), i = this._getOrReturnCtx(t);
    if (i.parsedType !== m.string && i.parsedType !== m.number) {
      const s = I.objectValues(e);
      return g(i, {
        expected: I.joinValues(s),
        received: i.parsedType,
        code: u.invalid_type
      }), k;
    }
    if (Vt(this, _t) || Ye(this, _t, new Set(I.getValidEnumValues(this._def.values))), !Vt(this, _t).has(t.data)) {
      const s = I.objectValues(e);
      return g(i, {
        received: i.data,
        code: u.invalid_enum_value,
        options: s
      }), k;
    }
    return B(t.data);
  }
  get enum() {
    return this._def.values;
  }
}
_t = /* @__PURE__ */ new WeakMap();
Xt.create = (r, t) => new Xt({
  values: r,
  typeName: x.ZodNativeEnum,
  ...T(t)
});
class Lt extends w {
  unwrap() {
    return this._def.type;
  }
  _parse(t) {
    const { ctx: e } = this._processInputParams(t);
    if (e.parsedType !== m.promise && e.common.async === !1)
      return g(e, {
        code: u.invalid_type,
        expected: m.promise,
        received: e.parsedType
      }), k;
    const i = e.parsedType === m.promise ? e.data : Promise.resolve(e.data);
    return B(i.then((s) => this._def.type.parseAsync(s, {
      path: e.path,
      errorMap: e.common.contextualErrorMap
    })));
  }
}
Lt.create = (r, t) => new Lt({
  type: r,
  typeName: x.ZodPromise,
  ...T(t)
});
class et extends w {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === x.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(t) {
    const { status: e, ctx: i } = this._processInputParams(t), s = this._def.effect || null, n = {
      addIssue: (a) => {
        g(i, a), a.fatal ? e.abort() : e.dirty();
      },
      get path() {
        return i.path;
      }
    };
    if (n.addIssue = n.addIssue.bind(n), s.type === "preprocess") {
      const a = s.transform(i.data, n);
      if (i.common.async)
        return Promise.resolve(a).then(async (o) => {
          if (e.value === "aborted")
            return k;
          const l = await this._def.schema._parseAsync({
            data: o,
            path: i.path,
            parent: i
          });
          return l.status === "aborted" ? k : l.status === "dirty" || e.value === "dirty" ? St(l.value) : l;
        });
      {
        if (e.value === "aborted")
          return k;
        const o = this._def.schema._parseSync({
          data: a,
          path: i.path,
          parent: i
        });
        return o.status === "aborted" ? k : o.status === "dirty" || e.value === "dirty" ? St(o.value) : o;
      }
    }
    if (s.type === "refinement") {
      const a = (o) => {
        const l = s.refinement(o, n);
        if (i.common.async)
          return Promise.resolve(l);
        if (l instanceof Promise)
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        return o;
      };
      if (i.common.async === !1) {
        const o = this._def.schema._parseSync({
          data: i.data,
          path: i.path,
          parent: i
        });
        return o.status === "aborted" ? k : (o.status === "dirty" && e.dirty(), a(o.value), { status: e.value, value: o.value });
      } else
        return this._def.schema._parseAsync({ data: i.data, path: i.path, parent: i }).then((o) => o.status === "aborted" ? k : (o.status === "dirty" && e.dirty(), a(o.value).then(() => ({ status: e.value, value: o.value }))));
    }
    if (s.type === "transform")
      if (i.common.async === !1) {
        const a = this._def.schema._parseSync({
          data: i.data,
          path: i.path,
          parent: i
        });
        if (!xt(a))
          return a;
        const o = s.transform(a.value, n);
        if (o instanceof Promise)
          throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
        return { status: e.value, value: o };
      } else
        return this._def.schema._parseAsync({ data: i.data, path: i.path, parent: i }).then((a) => xt(a) ? Promise.resolve(s.transform(a.value, n)).then((o) => ({ status: e.value, value: o })) : a);
    I.assertNever(s);
  }
}
et.create = (r, t, e) => new et({
  schema: r,
  typeName: x.ZodEffects,
  effect: t,
  ...T(e)
});
et.createWithPreprocess = (r, t, e) => new et({
  schema: t,
  effect: { type: "preprocess", transform: r },
  typeName: x.ZodEffects,
  ...T(e)
});
class J extends w {
  _parse(t) {
    return this._getType(t) === m.undefined ? B(void 0) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
J.create = (r, t) => new J({
  innerType: r,
  typeName: x.ZodOptional,
  ...T(t)
});
class dt extends w {
  _parse(t) {
    return this._getType(t) === m.null ? B(null) : this._def.innerType._parse(t);
  }
  unwrap() {
    return this._def.innerType;
  }
}
dt.create = (r, t) => new dt({
  innerType: r,
  typeName: x.ZodNullable,
  ...T(t)
});
class jt extends w {
  _parse(t) {
    const { ctx: e } = this._processInputParams(t);
    let i = e.data;
    return e.parsedType === m.undefined && (i = this._def.defaultValue()), this._def.innerType._parse({
      data: i,
      path: e.path,
      parent: e
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
}
jt.create = (r, t) => new jt({
  innerType: r,
  typeName: x.ZodDefault,
  defaultValue: typeof t.default == "function" ? t.default : () => t.default,
  ...T(t)
});
class qt extends w {
  _parse(t) {
    const { ctx: e } = this._processInputParams(t), i = {
      ...e,
      common: {
        ...e.common,
        issues: []
      }
    }, s = this._def.innerType._parse({
      data: i.data,
      path: i.path,
      parent: {
        ...i
      }
    });
    return Nt(s) ? s.then((n) => ({
      status: "valid",
      value: n.status === "valid" ? n.value : this._def.catchValue({
        get error() {
          return new N(i.common.issues);
        },
        input: i.data
      })
    })) : {
      status: "valid",
      value: s.status === "valid" ? s.value : this._def.catchValue({
        get error() {
          return new N(i.common.issues);
        },
        input: i.data
      })
    };
  }
  removeCatch() {
    return this._def.innerType;
  }
}
qt.create = (r, t) => new qt({
  innerType: r,
  typeName: x.ZodCatch,
  catchValue: typeof t.catch == "function" ? t.catch : () => t.catch,
  ...T(t)
});
class Ce extends w {
  _parse(t) {
    if (this._getType(t) !== m.nan) {
      const i = this._getOrReturnCtx(t);
      return g(i, {
        code: u.invalid_type,
        expected: m.nan,
        received: i.parsedType
      }), k;
    }
    return { status: "valid", value: t.data };
  }
}
Ce.create = (r) => new Ce({
  typeName: x.ZodNaN,
  ...T(r)
});
class Qe extends w {
  _parse(t) {
    const { ctx: e } = this._processInputParams(t), i = e.data;
    return this._def.type._parse({
      data: i,
      path: e.path,
      parent: e
    });
  }
  unwrap() {
    return this._def.type;
  }
}
class ie extends w {
  _parse(t) {
    const { status: e, ctx: i } = this._processInputParams(t);
    if (i.common.async)
      return (async () => {
        const n = await this._def.in._parseAsync({
          data: i.data,
          path: i.path,
          parent: i
        });
        return n.status === "aborted" ? k : n.status === "dirty" ? (e.dirty(), St(n.value)) : this._def.out._parseAsync({
          data: n.value,
          path: i.path,
          parent: i
        });
      })();
    {
      const s = this._def.in._parseSync({
        data: i.data,
        path: i.path,
        parent: i
      });
      return s.status === "aborted" ? k : s.status === "dirty" ? (e.dirty(), {
        status: "dirty",
        value: s.value
      }) : this._def.out._parseSync({
        data: s.value,
        path: i.path,
        parent: i
      });
    }
  }
  static create(t, e) {
    return new ie({
      in: t,
      out: e,
      typeName: x.ZodPipeline
    });
  }
}
class Qt extends w {
  _parse(t) {
    const e = this._def.innerType._parse(t), i = (s) => (xt(s) && (s.value = Object.freeze(s.value)), s);
    return Nt(e) ? e.then((s) => i(s)) : i(e);
  }
  unwrap() {
    return this._def.innerType;
  }
}
Qt.create = (r, t) => new Qt({
  innerType: r,
  typeName: x.ZodReadonly,
  ...T(t)
});
A.lazycreate;
var x;
(function(r) {
  r.ZodString = "ZodString", r.ZodNumber = "ZodNumber", r.ZodNaN = "ZodNaN", r.ZodBigInt = "ZodBigInt", r.ZodBoolean = "ZodBoolean", r.ZodDate = "ZodDate", r.ZodSymbol = "ZodSymbol", r.ZodUndefined = "ZodUndefined", r.ZodNull = "ZodNull", r.ZodAny = "ZodAny", r.ZodUnknown = "ZodUnknown", r.ZodNever = "ZodNever", r.ZodVoid = "ZodVoid", r.ZodArray = "ZodArray", r.ZodObject = "ZodObject", r.ZodUnion = "ZodUnion", r.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", r.ZodIntersection = "ZodIntersection", r.ZodTuple = "ZodTuple", r.ZodRecord = "ZodRecord", r.ZodMap = "ZodMap", r.ZodSet = "ZodSet", r.ZodFunction = "ZodFunction", r.ZodLazy = "ZodLazy", r.ZodLiteral = "ZodLiteral", r.ZodEnum = "ZodEnum", r.ZodEffects = "ZodEffects", r.ZodNativeEnum = "ZodNativeEnum", r.ZodOptional = "ZodOptional", r.ZodNullable = "ZodNullable", r.ZodDefault = "ZodDefault", r.ZodCatch = "ZodCatch", r.ZodPromise = "ZodPromise", r.ZodBranded = "ZodBranded", r.ZodPipeline = "ZodPipeline", r.ZodReadonly = "ZodReadonly";
})(x || (x = {}));
const M = q.create, v = kt.create;
Ce.create;
Tt.create;
ue.create;
Rt.create;
pe.create;
Gt.create;
Ut.create;
fe.create;
yt.create;
rt.create;
ge.create;
W.create;
const P = A.create;
A.strictCreate;
const es = Zt.create;
xe.create;
Wt.create;
tt.create;
Kt.create;
ye.create;
wt.create;
At.create;
$t.create;
const ut = Yt.create, at = ht.create;
Xt.create;
Lt.create;
et.create;
J.create;
dt.create;
et.createWithPreprocess;
ie.create;
const is = at(["linear", "bezier", "constant"]), ss = at([
  "ease",
  "easeIn",
  "easeOut",
  "easeInOut",
  "easeInQuad",
  "easeInCubic",
  "easeInQuart",
  "easeInQuint",
  "easeInSine",
  "easeInExpo",
  "easeInCirc",
  "easeInBack",
  "easeOutQuad",
  "easeOutCubic",
  "easeOutQuart",
  "easeOutQuint",
  "easeOutSine",
  "easeOutExpo",
  "easeOutCirc",
  "easeOutBack",
  "easeInOutQuad",
  "easeInOutCubic",
  "easeInOutQuart",
  "easeInOutQuint",
  "easeInOutSine",
  "easeInOutExpo",
  "easeInOutCirc",
  "easeInOutBack"
]), pt = P({
  from: v(),
  to: v(),
  start: v().min(0),
  length: v().positive(),
  interpolation: is.optional(),
  easing: ss.optional()
}), ns = M().url("Invalid audio url format."), rs = pt.extend({
  from: v().min(0).max(1),
  to: v().min(0).max(1)
}).array().or(v().min(0).max(1)), De = P({
  type: ut("audio"),
  src: ns,
  trim: v().optional(),
  volume: rs.optional()
}), as = at(["top", "topRight", "right", "bottomRight", "bottom", "bottomLeft", "left", "topLeft", "center"]), Re = P({
  type: ut("html"),
  html: M(),
  css: M(),
  width: v().positive().optional(),
  height: v().positive().optional(),
  position: as.optional()
}), os = M().url("Invalid image url format."), ls = P({
  top: v().min(0).optional(),
  right: v().min(0).optional(),
  bottom: v().min(0).optional(),
  left: v().min(0).optional()
}), Le = P({
  type: ut("image"),
  src: os,
  crop: ls.optional()
}), cs = M().url("Invalid luma url format."), Me = P({
  type: ut("luma"),
  src: cs
}), Je = M().regex(/^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})|transparent$/, "Invalid color format."), He = P({
  width: v().positive(),
  height: v().positive()
}), Be = P({
  radius: v().positive()
}), ze = P({
  length: v().positive(),
  thickness: v().positive()
}), hs = P({
  color: Je,
  opacity: v().min(0).max(1)
}), ds = P({
  color: Je,
  width: v().positive()
}), Fe = P({
  type: ut("shape"),
  width: v().positive().optional(),
  height: v().positive().optional(),
  shape: at(["rectangle", "circle", "line"]),
  fill: hs.optional(),
  stroke: ds.optional(),
  rectangle: He.optional(),
  circle: Be.optional(),
  line: ze.optional()
}).refine((r) => r.shape === "rectangle" ? He.safeParse(r.rectangle) : r.shape === "circle" ? Be.safeParse(r.circle) : r.shape === "line" ? ze.safeParse(r.line) : !1), ke = M().regex(/^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})|transparent$/, "Invalid color format."), us = P({
  color: ke.optional(),
  family: M().optional(),
  size: v().positive().optional(),
  weight: v().optional(),
  lineHeight: v().optional()
}), ps = P({
  horizontal: at(["left", "center", "right"]).optional(),
  vertical: at(["top", "center", "bottom"]).optional()
}), fs = P({
  color: ke,
  opacity: v().min(0).max(1)
}), gs = P({
  width: v().positive(),
  color: ke
}), Ne = P({
  type: ut("text"),
  text: M(),
  width: v().positive().optional(),
  height: v().positive().optional(),
  font: us.optional(),
  alignment: ps.optional(),
  background: fs.optional(),
  stroke: gs.optional()
}), ms = M().url("Invalid video url format."), ys = P({
  top: v().min(0).optional(),
  right: v().min(0).optional(),
  bottom: v().min(0).optional(),
  left: v().min(0).optional()
}), Cs = pt.extend({
  from: v().min(0).max(1),
  to: v().min(0).max(1)
}).array().or(v().min(0).max(1)), Ve = P({
  type: ut("video"),
  src: ms,
  trim: v().optional(),
  crop: ys.optional(),
  volume: Cs.optional()
}), vs = es([Ne, Fe, Re, Le, Ve, Me, De]).refine((r) => r.type === "text" ? Ne.safeParse(r) : r.type === "shape" ? Fe.safeParse(r) : r.type === "html" ? Re.safeParse(r) : r.type === "image" ? Le.safeParse(r) : r.type === "video" ? Ve.safeParse(r) : r.type === "luma" ? Me.safeParse(r) : r.type === "audio" ? De.safeParse(r) : !1), xs = at(["topLeft", "top", "topRight", "left", "center", "right", "bottomLeft", "bottom", "bottomRight"]), ks = at(["crop", "cover", "contain", "none"]), Ct = v().min(-10).max(10).default(0), Ts = pt.extend({
  from: Ct,
  to: Ct
}).array().or(Ct), ws = pt.extend({
  from: Ct,
  to: Ct
}).array().or(Ct), bs = P({
  x: Ts.default(0),
  y: ws.default(0)
}), Ss = pt.extend({
  from: v().min(0).max(1),
  to: v().min(0).max(1)
}).array().or(v().min(0).max(1)), Is = pt.extend({
  from: v().min(0),
  to: v().min(0)
}).array().or(v().min(0)), _s = P({
  angle: pt.extend({
    from: v(),
    to: v()
  }).array().or(v())
}), Ps = M(), Ge = M(), Es = P({
  in: Ge.optional(),
  out: Ge.optional()
}), As = P({
  rotate: _s.default({ angle: 0 })
}), ti = P({
  asset: vs,
  start: v().min(0),
  length: v().positive(),
  position: xs.default("center").optional(),
  fit: ks.default("crop").optional(),
  offset: bs.default({ x: 0, y: 0 }).optional(),
  opacity: Ss.default(1).optional(),
  scale: Is.default(1).optional(),
  transform: As.default({ rotate: { angle: 0 } }).optional(),
  effect: Ps.optional(),
  transition: Es.optional()
});
class Os {
  constructor(t, e) {
    this.trackIdx = t, this.clip = e;
  }
  name = "addClip";
  addedPlayer;
  async execute(t) {
    if (!t) return;
    const e = ti.parse(this.clip), i = t.createPlayerFromAssetType(e);
    i.layer = this.trackIdx + 1, await t.addPlayer(this.trackIdx, i), t.updateDuration(), this.addedPlayer = i;
  }
  async undo(t) {
    !t || !this.addedPlayer || (t.queueDisposeClip(this.addedPlayer), t.updateDuration());
  }
}
class ei {
  constructor(t) {
    this.trackIdx = t;
  }
  name = "addTrack";
  execute(t) {
    if (!t) return;
    const e = t.getTracks(), i = t.getClips();
    e.splice(this.trackIdx, 0, []), i.forEach((s) => {
      if (s.layer >= this.trackIdx) {
        const n = 1e5 - s.layer * 100, a = t.getContainer().getChildByLabel(`shotstack-track-${n}`, !1);
        a && a.removeChild(s.getContainer()), s.layer += 1;
        const o = 1e5 - s.layer * 100;
        let l = t.getContainer().getChildByLabel(`shotstack-track-${o}`, !1);
        l || (l = new d.Container({ label: `shotstack-track-${o}`, zIndex: o }), t.getContainer().addChild(l)), l.addChild(s.getContainer());
      }
    }), t.updateDuration(), t.emitEvent("track:added", {
      trackIndex: this.trackIdx,
      totalTracks: e.length
    });
  }
  undo(t) {
    if (!t) return;
    const e = t.getTracks(), i = t.getClips();
    e.splice(this.trackIdx, 1), i.forEach((s) => {
      s.layer > this.trackIdx && (s.layer -= 1);
    }), t.updateDuration();
  }
}
class Ds {
  name = "ClearSelection";
  previousSelection = null;
  execute(t) {
    const e = t.getSelectedClip();
    if (e) {
      const i = t.findClipIndices(e);
      i && (this.previousSelection = {
        player: e,
        trackIndex: i.trackIndex,
        clipIndex: i.clipIndex
      });
    }
    t.setSelectedClip(null), t.emitEvent("selection:cleared", {});
  }
  undo(t) {
    if (this.previousSelection) {
      const e = t.getClipAt(this.previousSelection.trackIndex, this.previousSelection.clipIndex);
      e && (t.setSelectedClip(e), t.emitEvent("clip:selected", {
        clip: e.clipConfiguration,
        trackIndex: this.previousSelection.trackIndex,
        clipIndex: this.previousSelection.clipIndex
      }));
    }
  }
}
class Rs {
  constructor(t, e) {
    this.trackIdx = t, this.clipIdx = e;
  }
  name = "deleteClip";
  deletedClip;
  execute(t) {
    if (!t) return;
    const i = t.getClips().filter((s) => s.layer === this.trackIdx + 1);
    this.deletedClip = i[this.clipIdx], this.deletedClip && (t.queueDisposeClip(this.deletedClip), t.updateDuration());
  }
  undo(t) {
    !t || !this.deletedClip || t.undeleteClip(this.trackIdx, this.deletedClip);
  }
}
class Ls {
  constructor(t) {
    this.trackIdx = t;
  }
  name = "deleteTrack";
  deletedClips = [];
  execute(t) {
    if (!t) return;
    const e = t.getClips(), i = t.getTracks();
    this.deletedClips = e.filter((a) => a.layer === this.trackIdx + 1).map((a) => ({ config: structuredClone(a.clipConfiguration) })), e.forEach((a, o) => {
      a.layer === this.trackIdx + 1 && (e[o].shouldDispose = !0);
    }), t.disposeClips(), i.splice(this.trackIdx, 1);
    const s = t.getClips(), n = t.getContainer();
    s.forEach((a, o) => {
      if (a.layer > this.trackIdx + 1) {
        n.getChildByLabel(`shotstack-track-${1e5 - a.layer * 100}`, !1)?.removeChild(a.getContainer()), s[o].layer -= 1;
        const c = 1e5 - s[o].layer * 100;
        let h = n.getChildByLabel(`shotstack-track-${c}`, !1);
        h || (h = new d.Container({ label: `shotstack-track-${c}`, zIndex: c }), n.addChild(h)), h.addChild(s[o].getContainer());
      }
    }), t.updateDuration();
  }
  async undo(t) {
    if (!t || this.deletedClips.length === 0) return;
    const e = t.getTracks(), i = t.getClips();
    e.splice(this.trackIdx, 0, []), i.forEach((s, n) => {
      s.layer >= this.trackIdx + 1 && (i[n].layer += 1);
    });
    for (const { config: s } of this.deletedClips) {
      const n = t.createPlayerFromAssetType(s);
      n.layer = this.trackIdx + 1, await t.addPlayer(this.trackIdx, n);
    }
    t.updateDuration();
  }
}
class Ms {
  constructor(t, e) {
    this.trackIndex = t, this.clipIndex = e;
  }
  name = "SelectClip";
  previousSelection = null;
  execute(t) {
    const e = t.getSelectedClip();
    if (e) {
      const s = t.findClipIndices(e);
      s && (this.previousSelection = s);
    }
    const i = t.getClipAt(this.trackIndex, this.clipIndex);
    i && (t.setSelectedClip(i), t.emitEvent("clip:selected", {
      clip: i.clipConfiguration,
      trackIndex: this.trackIndex,
      clipIndex: this.clipIndex
    }));
  }
  undo(t) {
    if (t.setSelectedClip(null), this.previousSelection) {
      const e = t.getClipAt(this.previousSelection.trackIndex, this.previousSelection.clipIndex);
      e && (t.setSelectedClip(e), t.emitEvent("clip:selected", {
        clip: e.clipConfiguration,
        trackIndex: this.previousSelection.trackIndex,
        clipIndex: this.previousSelection.clipIndex
      }));
    } else
      t.emitEvent("selection:cleared", {});
  }
}
class Hs {
  constructor(t, e, i) {
    this.clip = t, this.initialClipConfig = e, this.finalClipConfig = i, this.storedInitialConfig = e ? structuredClone(e) : null, this.storedFinalConfig = i ? structuredClone(i) : structuredClone(this.clip.clipConfiguration);
  }
  name = "setUpdatedClip";
  storedInitialConfig;
  storedFinalConfig;
  execute(t) {
    if (!t) return;
    this.storedFinalConfig && t.restoreClipConfiguration(this.clip, this.storedFinalConfig), t.setUpdatedClip(this.clip);
    const e = this.clip.layer - 1, n = t.getClips().filter((a) => a.layer === this.clip.layer).indexOf(this.clip);
    t.emitEvent("clip:updated", {
      previous: { clip: this.storedInitialConfig || this.initialClipConfig, trackIndex: e, clipIndex: n },
      current: { clip: this.storedFinalConfig || this.clip.clipConfiguration, trackIndex: e, clipIndex: n }
    });
  }
  undo(t) {
    if (!t || !this.storedInitialConfig) return;
    t.restoreClipConfiguration(this.clip, this.storedInitialConfig), t.setUpdatedClip(this.clip);
    const e = this.clip.layer - 1, n = t.getClips().filter((a) => a.layer === this.clip.layer).indexOf(this.clip);
    t.emitEvent("clip:updated", {
      previous: { clip: this.storedFinalConfig, trackIndex: e, clipIndex: n },
      current: { clip: this.storedInitialConfig, trackIndex: e, clipIndex: n }
    });
  }
}
class Bs {
  constructor(t, e, i) {
    this.trackIndex = t, this.clipIndex = e, this.splitTime = i;
  }
  name = "SplitClip";
  originalClipConfig = null;
  rightClipPlayer = null;
  splitSuccessful = !1;
  execute(t) {
    const e = t.getClipAt(this.trackIndex, this.clipIndex);
    if (!e || !e.clipConfiguration)
      throw new Error("Cannot split clip: invalid player or clip configuration");
    const i = e.clipConfiguration, s = i.start || 0, n = i.length, a = 0.1, o = this.splitTime - s;
    if (o <= a || o >= n - a)
      throw new Error("Cannot split clip: split point too close to clip boundaries");
    this.originalClipConfig = { ...i };
    const l = {
      ...i,
      length: o
    }, c = {
      ...i,
      start: s + o,
      length: n - o
    };
    if (i.asset && (l.asset = { ...i.asset }, c.asset = { ...i.asset }), i.asset && (i.asset.type === "video" || i.asset.type === "audio")) {
      const y = i.asset.trim || 0;
      l.asset && (l.asset.type === "video" || l.asset.type === "audio") && (l.asset.trim = y), c.asset && (c.asset.type === "video" || c.asset.type === "audio") && (c.asset.trim = y + o);
    }
    if (Object.assign(e.clipConfiguration, l), e.reconfigureAfterRestore(), e.draw(), this.rightClipPlayer = t.createPlayerFromAssetType(c), !this.rightClipPlayer)
      throw Object.assign(e.clipConfiguration, this.originalClipConfig), e.reconfigureAfterRestore(), new Error("Failed to create right clip player");
    this.rightClipPlayer.layer = this.trackIndex + 1;
    const h = t.getTrack(this.trackIndex);
    if (!h)
      throw new Error("Invalid track index");
    h.splice(this.clipIndex + 1, 0, this.rightClipPlayer);
    const p = t.getClips(), f = p.indexOf(e);
    f !== -1 && p.splice(f + 1, 0, this.rightClipPlayer), t.addPlayerToContainer(this.trackIndex, this.rightClipPlayer), this.rightClipPlayer.reconfigureAfterRestore(), this.rightClipPlayer.load().then(() => {
      this.splitSuccessful = !0, this.rightClipPlayer && this.rightClipPlayer.draw(), t.updateDuration(), t.emitEvent("timeline:updated", {
        current: t.getEditState()
      });
    }).catch((y) => {
      console.error("Failed to load split clip:", y);
    });
  }
  undo(t) {
    if (!this.originalClipConfig)
      return;
    const e = t.getClipAt(this.trackIndex, this.clipIndex);
    if (e) {
      if (Object.assign(e.clipConfiguration, this.originalClipConfig), e.reconfigureAfterRestore(), this.rightClipPlayer) {
        const i = t.getTrack(this.trackIndex);
        if (i) {
          const a = i.indexOf(this.rightClipPlayer);
          a !== -1 && i.splice(a, 1);
        }
        const s = t.getClips(), n = s.indexOf(this.rightClipPlayer);
        n !== -1 && s.splice(n, 1), t.queueDisposeClip(this.rightClipPlayer), this.rightClipPlayer = null;
      }
      t.updateDuration(), t.emitEvent("timeline:updated", {
        current: t.getEditState()
      });
    }
  }
}
class zs {
  constructor(t, e, i) {
    this.clip = t, this.newText = e, this.initialConfig = i;
    const { asset: s } = this.clip.clipConfiguration;
    this.previousText = s && "text" in s ? s.text : "";
  }
  name = "updateTextContent";
  previousText;
  execute(t) {
    if (t && this.clip.clipConfiguration.asset && "text" in this.clip.clipConfiguration.asset) {
      this.clip.clipConfiguration.asset.text = this.newText;
      const e = this.clip.text;
      e && (e.text = this.newText, this.clip.positionText(this.clip.clipConfiguration.asset)), t.setUpdatedClip(this.clip);
      const i = this.clip.layer - 1, a = t.getClips().filter((o) => o.layer === this.clip.layer).indexOf(this.clip);
      t.emitEvent("clip:updated", {
        previous: { clip: this.initialConfig, trackIndex: i, clipIndex: a },
        current: { clip: this.clip.clipConfiguration, trackIndex: i, clipIndex: a }
      });
    }
  }
  undo(t) {
    if (t && this.clip.clipConfiguration.asset && "text" in this.clip.clipConfiguration.asset) {
      this.clip.clipConfiguration.asset.text = this.previousText;
      const e = this.clip.text;
      e && (e.text = this.previousText, this.clip.positionText(this.clip.clipConfiguration.asset)), t.setUpdatedClip(this.clip);
      const i = this.clip.layer - 1, a = t.getClips().filter((o) => o.layer === this.clip.layer).indexOf(this.clip);
      t.emitEvent("clip:updated", {
        previous: { clip: this.clip.clipConfiguration, trackIndex: i, clipIndex: a },
        current: { clip: this.initialConfig, trackIndex: i, clipIndex: a }
      });
    }
  }
}
class Mt {
  events;
  constructor() {
    this.events = {};
  }
  on(t, e) {
    this.events[t] || (this.events[t] = /* @__PURE__ */ new Set()), this.events[t].add(e);
  }
  off(t, e) {
    this.events[t] && (this.events[t].delete(e), !(this.events[t].size > 0) && delete this.events[t]);
  }
  clear(t) {
    delete this.events[t];
  }
  emit(t, e) {
    if (this.events[t])
      for (const i of this.events[t])
        i(e);
  }
}
class Fs extends Mt {
  registry;
  constructor() {
    super(), this.registry = {};
  }
}
class Jt {
  static VIDEO_EXTENSIONS = [".mp4", ".m4v", ".webm", ".ogg", ".ogv"];
  static VIDEO_MIME = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "video/ogg",
    ".ogv": "video/ogg"
  };
  loadTracker = new Fs();
  async load(t, e) {
    this.updateAssetLoadMetadata(t, "pending", 0);
    try {
      if (await this.shouldUseSafariVideoLoader(e))
        return await this.loadVideoForSafari(t, e);
      const i = await d.Assets.load(e, (s) => {
        this.updateAssetLoadMetadata(t, "loading", s);
      });
      return this.updateAssetLoadMetadata(t, "success", 1), i;
    } catch {
      return this.updateAssetLoadMetadata(t, "failed", 1), null;
    }
  }
  getProgress() {
    const t = Object.keys(this.loadTracker.registry);
    return t.length === 0 ? 0 : t.reduce((i, s) => i + this.loadTracker.registry[s].progress, 0) / t.length;
  }
  extractUrl(t) {
    if (typeof t == "string") return t;
    const e = Array.isArray(t.src) ? t.src[0] : t.src;
    return typeof e == "string" ? e : e?.src;
  }
  hasVideoExtension(t) {
    const e = new URL(t, window.location.origin).pathname.toLowerCase();
    return Jt.VIDEO_EXTENSIONS.some((i) => e.endsWith(i));
  }
  async getContentType(t) {
    try {
      return (await fetch(t, { method: "HEAD" })).headers.get("content-type");
    } catch {
      return null;
    }
  }
  canPlayVideo(t) {
    const e = new URL(t, window.location.origin).pathname.toLowerCase(), i = e.slice(e.lastIndexOf(".")), s = Jt.VIDEO_MIME[i];
    return s ? document.createElement("video").canPlayType(s) !== "" : !1;
  }
  async isPlayableVideo(t) {
    if (this.hasVideoExtension(t)) return this.canPlayVideo(t);
    const e = await this.getContentType(t);
    return e?.startsWith("video/") ? document.createElement("video").canPlayType(e) !== "" : !1;
  }
  async shouldUseSafariVideoLoader(t) {
    const e = /^((?!chrome|android).)*safari/i.test(navigator.userAgent), i = this.extractUrl(t);
    return e && i !== void 0 && await this.isPlayableVideo(i);
  }
  async loadVideoForSafari(t, e) {
    const i = this.extractUrl(e), s = typeof e == "object" ? e.data ?? {} : {}, n = await new Promise((a, o) => {
      const l = document.createElement("video");
      l.crossOrigin = "anonymous", l.playsInline = !0, l.muted = !0, l.preload = "metadata", l.addEventListener(
        "loadedmetadata",
        () => {
          try {
            const c = new d.VideoSource({
              resource: l,
              autoPlay: s.autoPlay ?? !1,
              ...s
            });
            a(new d.Texture({ source: c }));
          } catch (c) {
            o(c);
          }
        },
        { once: !0 }
      ), l.addEventListener("error", () => o(new Error("Video loading failed")), { once: !0 }), this.updateAssetLoadMetadata(t, "loading", 0.5), l.src = i;
    });
    return this.updateAssetLoadMetadata(t, "success", 1), n;
  }
  updateAssetLoadMetadata(t, e, i) {
    this.loadTracker.registry[t] ? (this.loadTracker.registry[t].progress = i, this.loadTracker.registry[t].status = e) : this.loadTracker.registry[t] = { progress: i, status: e };
    const s = { ...this.loadTracker.registry };
    this.loadTracker.emit("onAssetLoadInfoUpdated", { registry: s });
  }
}
class se {
  static Name = "FontLoadParser";
  name;
  extension;
  validFontExtensions;
  woff2Decompressor;
  constructor() {
    this.name = se.Name, this.extension = {
      type: [d.ExtensionType.LoadParser],
      priority: d.LoaderParserPriority.High,
      ref: null
    }, this.validFontExtensions = ["ttf", "otf", "woff", "woff2"], this.woff2Decompressor = null;
  }
  test(t) {
    const e = t.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
    return this.validFontExtensions.includes(e);
  }
  async load(t, e, i) {
    const s = t.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "", n = await fetch(t).then((f) => f.arrayBuffer());
    if (s !== "woff2") {
      const f = Ie.parse(new Uint8Array(n).buffer), y = f.names.fontFamily.en || f.names.fontFamily[Object.keys(f.names.fontFamily)[0]], S = new FontFace(y, `url(${t})`);
      return await S.load(), document.fonts.add(S), S;
    }
    if (await this.loadWoff2Decompressor(), !this.woff2Decompressor)
      throw new Error("Cannot initialize Woff2 decompressor.");
    const a = this.woff2Decompressor.decompress(n), o = Ie.parse(new Uint8Array(a).buffer), l = o.names.fontFamily.en || o.names.fontFamily[Object.keys(o.names.fontFamily)[0]], c = new Blob([a], { type: "font/ttf" }), h = URL.createObjectURL(c), p = new FontFace(l, `url(${h})`);
    return await p.load(), document.fonts.add(p), p;
  }
  async loadWoff2Decompressor() {
    if (this.woff2Decompressor)
      return;
    const e = `${await fetch("https://unpkg.com/wawoff2@2.0.1/build/decompress_binding.js").then((i) => i.text())}; return Module`;
    this.woff2Decompressor = new Function(e)(), await new Promise((i) => {
      this.woff2Decompressor.onRuntimeInitialized = i;
    });
  }
  unload(t) {
    t && document.fonts.delete(t);
  }
}
const Ns = P({
  clips: ti.array()
}), Vs = M().url("Invalid image url format."), Gs = P({
  src: Vs
}), Us = P({
  background: M().optional(),
  fonts: Gs.array().optional(),
  tracks: Ns.array()
}), Zs = P({
  size: P({
    width: v().positive(),
    height: v().positive()
  }),
  fps: v().positive().optional(),
  format: M()
}), Ws = P({
  timeline: Us,
  output: Zs
});
class Pt extends ot {
  static ZIndexPadding = 100;
  assetLoader;
  events;
  edit;
  tracks;
  clipsToDispose;
  clips;
  commandHistory = [];
  commandIndex = -1;
  playbackTime;
  /** @internal */
  size;
  /** @internal */
  backgroundColor;
  totalDuration;
  /** @internal */
  isPlaying;
  /** @internal */
  selectedClip;
  /** @internal */
  updatedClip;
  constructor(t, e = "#ffffff") {
    super(), this.assetLoader = new Jt(), this.edit = null, this.tracks = [], this.clipsToDispose = [], this.clips = [], this.events = new Mt(), this.size = t, this.playbackTime = 0, this.totalDuration = 0, this.isPlaying = !1, this.selectedClip = null, this.updatedClip = null, this.backgroundColor = e, this.setupIntentListeners();
  }
  async load() {
    const t = new d.Graphics();
    t.fillStyle = {
      color: this.backgroundColor
    }, t.rect(0, 0, this.size.width, this.size.height), t.fill(), this.getContainer().addChild(t);
  }
  /** @internal */
  update(t, e) {
    for (const i of this.clips)
      i.shouldDispose && this.queueDisposeClip(i), i.update(t, e);
    this.disposeClips(), this.isPlaying && (this.playbackTime = Math.max(0, Math.min(this.playbackTime + e, this.totalDuration)), this.playbackTime === this.totalDuration && this.pause());
  }
  /** @internal */
  draw() {
    for (const t of this.clips)
      t.draw();
  }
  /** @internal */
  dispose() {
    this.clearClips();
  }
  play() {
    this.isPlaying = !0, this.events.emit("playback:play", {});
  }
  pause() {
    this.isPlaying = !1, this.events.emit("playback:pause", {});
  }
  seek(t) {
    this.playbackTime = Math.max(0, Math.min(t, this.totalDuration)), this.pause();
  }
  stop() {
    this.seek(0);
  }
  async loadEdit(t) {
    this.clearClips(), this.edit = Ws.parse(t), this.backgroundColor = this.edit.timeline.background || "#000000", await Promise.all(
      (this.edit.timeline.fonts ?? []).map(async (e) => {
        const i = e.src, s = { src: i, loadParser: se.Name };
        return this.assetLoader.load(i, s);
      })
    );
    for (const [e, i] of this.edit.timeline.tracks.entries())
      for (const s of i.clips) {
        const n = this.createPlayerFromAssetType(s);
        n.layer = e + 1, await this.addPlayer(e, n);
      }
    this.updateTotalDuration();
  }
  getEdit() {
    const t = this.tracks.map((e, i) => ({ clips: e.filter((n) => n && !this.clipsToDispose.includes(n)).map((n) => n.clipConfiguration) }));
    return {
      timeline: {
        background: this.backgroundColor,
        tracks: t,
        fonts: this.edit?.timeline.fonts || []
      },
      output: this.edit?.output || { size: this.size, format: "mp4" }
    };
  }
  addClip(t, e) {
    const i = new Os(t, e);
    this.executeCommand(i);
  }
  getClip(t, e) {
    const i = this.clips.filter((s) => s.layer === t + 1);
    return e < 0 || e >= i.length ? null : i[e].clipConfiguration;
  }
  getPlayerClip(t, e) {
    const i = this.clips.filter((s) => s.layer === t + 1);
    return e < 0 || e >= i.length ? null : i[e];
  }
  deleteClip(t, e) {
    const i = new Rs(t, e);
    this.executeCommand(i);
  }
  splitClip(t, e, i) {
    const s = new Bs(t, e, i);
    this.executeCommand(s);
  }
  addTrack(t, e) {
    const i = new ei(t);
    this.executeCommand(i), e?.clips?.forEach((s) => this.addClip(t, s));
  }
  getTrack(t) {
    const e = this.clips.filter((i) => i.layer === t + 1);
    return e.length === 0 ? null : {
      clips: e.map((i) => i.clipConfiguration)
    };
  }
  deleteTrack(t) {
    const e = new Ls(t);
    this.executeCommand(e);
  }
  getTotalDuration() {
    return this.totalDuration;
  }
  undo() {
    if (this.commandIndex >= 0) {
      const t = this.commandHistory[this.commandIndex];
      if (t.undo) {
        const e = this.createCommandContext();
        t.undo(e), this.commandIndex -= 1, this.events.emit("edit:undo", { command: t.name });
      }
    }
  }
  redo() {
    if (this.commandIndex < this.commandHistory.length - 1) {
      this.commandIndex += 1;
      const t = this.commandHistory[this.commandIndex], e = this.createCommandContext();
      t.execute(e), this.events.emit("edit:redo", { command: t.name });
    }
  }
  /** @internal */
  setUpdatedClip(t, e = null, i = null) {
    const s = new Hs(t, e, i);
    this.executeCommand(s);
  }
  /** @internal */
  updateTextContent(t, e, i) {
    const s = new zs(t, e, i);
    this.executeCommand(s);
  }
  executeEditCommand(t) {
    return this.executeCommand(t);
  }
  executeCommand(t) {
    const e = this.createCommandContext(), i = t.execute(e);
    return this.commandHistory = this.commandHistory.slice(0, this.commandIndex + 1), this.commandHistory.push(t), this.commandIndex += 1, i;
  }
  createCommandContext() {
    return {
      getClips: () => this.clips,
      getTracks: () => this.tracks,
      getTrack: (t) => t >= 0 && t < this.tracks.length ? this.tracks[t] : null,
      getContainer: () => this.getContainer(),
      addPlayer: (t, e) => this.addPlayer(t, e),
      addPlayerToContainer: (t, e) => {
        this.addPlayerToContainer(t, e);
      },
      createPlayerFromAssetType: (t) => this.createPlayerFromAssetType(t),
      queueDisposeClip: (t) => this.queueDisposeClip(t),
      disposeClips: () => this.disposeClips(),
      undeleteClip: (t, e) => {
        this.clips.push(e), this.updateTotalDuration();
      },
      setUpdatedClip: (t) => {
        this.updatedClip = t;
      },
      restoreClipConfiguration: (t, e) => {
        Object.assign(t.clipConfiguration, structuredClone(e)), t.reconfigureAfterRestore(), t.draw();
      },
      updateDuration: () => this.updateTotalDuration(),
      emitEvent: (t, e) => this.events.emit(t, e),
      findClipIndices: (t) => this.findClipIndices(t),
      getClipAt: (t, e) => this.getClipAt(t, e),
      getSelectedClip: () => this.selectedClip,
      setSelectedClip: (t) => {
        this.selectedClip = t;
      },
      movePlayerToTrackContainer: (t, e, i) => this.movePlayerToTrackContainer(t, e, i),
      getEditState: () => this.getEdit()
    };
  }
  queueDisposeClip(t) {
    this.clipsToDispose.push(t);
  }
  disposeClips() {
    if (this.clipsToDispose.length !== 0) {
      for (const t of this.clipsToDispose)
        this.disposeClip(t);
      this.clips = this.clips.filter((t) => !this.clipsToDispose.includes(t)), this.clipsToDispose = [], this.updateTotalDuration();
    }
  }
  disposeClip(t) {
    try {
      if (this.getContainer().children.includes(t.getContainer())) {
        const e = this.getContainer().getChildIndex(t.getContainer());
        this.getContainer().removeChildAt(e);
      } else
        for (const e of this.getContainer().children)
          if (e instanceof d.Container && e.label?.toString().startsWith("shotstack-track-") && e.children.includes(t.getContainer())) {
            e.removeChild(t.getContainer());
            break;
          }
    } catch (e) {
      console.warn(`Attempting to unmount an unmounted clip: ${e}`);
    }
    this.unloadClipAssets(t), t.dispose();
  }
  unloadClipAssets(t) {
    const { asset: e } = t.clipConfiguration;
    if (e && "src" in e && typeof e.src == "string")
      try {
        d.Assets.unload(e.src);
      } catch (i) {
        console.warn(`Failed to unload asset: ${e.src}`, i);
      }
  }
  clearClips() {
    for (const t of this.clips)
      this.disposeClip(t);
    this.clips = [], this.clipsToDispose = [], this.updateTotalDuration();
  }
  updateTotalDuration() {
    let t = 0;
    for (const i of this.tracks)
      for (const s of i)
        t = Math.max(t, s.getEnd());
    const e = this.totalDuration;
    this.totalDuration = t, e !== this.totalDuration && this.events.emit("duration:changed", { duration: this.totalDuration });
  }
  addPlayerToContainer(t, e) {
    const i = 1e5 - (t + 1) * Pt.ZIndexPadding, s = `shotstack-track-${i}`;
    let n = this.getContainer().getChildByLabel(s, !1);
    n || (n = new d.Container({ label: s, zIndex: i }), this.getContainer().addChild(n)), n.addChild(e.getContainer());
  }
  // Move a player's container to the appropriate track container
  movePlayerToTrackContainer(t, e, i) {
    if (e === i) return;
    const s = 1e5 - (e + 1) * Pt.ZIndexPadding, n = 1e5 - (i + 1) * Pt.ZIndexPadding, a = `shotstack-track-${s}`, o = `shotstack-track-${n}`, l = this.getContainer().getChildByLabel(a, !1);
    let c = this.getContainer().getChildByLabel(o, !1);
    c || (c = new d.Container({ label: o, zIndex: n }), this.getContainer().addChild(c)), l && l.removeChild(t.getContainer()), c.addChild(t.getContainer());
  }
  createPlayerFromAssetType(t) {
    if (!t.asset?.type)
      throw new Error("Invalid clip configuration: missing asset type");
    let e;
    switch (t.asset.type) {
      case "text": {
        e = new Ai(this, t);
        break;
      }
      case "shape": {
        e = new Ei(this, t);
        break;
      }
      case "html": {
        e = new _i(this, t);
        break;
      }
      case "image": {
        e = new Pi(this, t);
        break;
      }
      case "video": {
        e = new Oi(this, t);
        break;
      }
      case "audio": {
        e = new ce(this, t);
        break;
      }
      case "luma": {
        e = new _e(this, t);
        break;
      }
      default:
        throw new Error(`Unsupported clip type: ${t.asset.type}`);
    }
    return e;
  }
  async addPlayer(t, e) {
    for (; this.tracks.length <= t; )
      this.tracks.push([]);
    this.tracks[t].push(e), this.clips.push(e);
    const i = 1e5 - (t + 1) * Pt.ZIndexPadding, s = `shotstack-track-${i}`;
    let n = this.getContainer().getChildByLabel(s, !1);
    n || (n = new d.Container({ label: s, zIndex: i }), this.getContainer().addChild(n)), n.addChild(e.getContainer());
    const a = e instanceof _e;
    await e.load(), a && n.setMask({ mask: e.getMask(), inverse: !0 }), this.updateTotalDuration();
  }
  // Selection management methods
  selectClip(t, e) {
    const i = new Ms(t, e);
    this.executeCommand(i);
  }
  clearSelection() {
    const t = new Ds();
    this.executeCommand(t);
  }
  isClipSelected(t, e) {
    if (!this.selectedClip) return !1;
    const i = this.selectedClip.layer - 1, s = this.tracks[i].indexOf(this.selectedClip);
    return t === i && e === s;
  }
  getSelectedClipInfo() {
    if (!this.selectedClip) return null;
    const t = this.selectedClip.layer - 1, e = this.tracks[t].indexOf(this.selectedClip);
    return { trackIndex: t, clipIndex: e, player: this.selectedClip };
  }
  // Clip lookup methods
  findClipIndices(t) {
    for (let e = 0; e < this.tracks.length; e += 1) {
      const i = this.tracks[e].indexOf(t);
      if (i !== -1)
        return { trackIndex: e, clipIndex: i };
    }
    return null;
  }
  getClipAt(t, e) {
    return t >= 0 && t < this.tracks.length && e >= 0 && e < this.tracks[t].length ? this.tracks[t][e] : null;
  }
  // Clean encapsulation APIs for selection
  selectPlayer(t) {
    const e = this.findClipIndices(t);
    e && this.selectClip(e.trackIndex, e.clipIndex);
  }
  isPlayerSelected(t) {
    return this.selectedClip === t;
  }
  // Event-driven architecture setup
  setupIntentListeners() {
    this.events.on("timeline:clip:clicked", (t) => {
      t.player ? this.selectPlayer(t.player) : this.selectClip(t.trackIndex, t.clipIndex);
    }), this.events.on("timeline:background:clicked", () => {
      this.clearSelection();
    }), this.events.on("canvas:clip:clicked", (t) => {
      this.selectPlayer(t.player);
    }), this.events.on("canvas:background:clicked", () => {
      this.clearSelection();
    });
  }
}
class Ot extends ot {
  static Width = 250;
  static Height = 100;
  fps;
  playbackTime;
  playbackDuration;
  isPlaying;
  background;
  text;
  constructor() {
    super(), this.background = null, this.text = null, this.fps = 0, this.playbackTime = 0, this.playbackDuration = 0, this.isPlaying = !1;
  }
  async load() {
    const t = new d.Graphics();
    t.fillStyle = { color: "#424242", alpha: 0.5 }, t.rect(0, 0, Ot.Width, Ot.Height), t.fill(), this.getContainer().addChild(t), this.background = t;
    const e = new d.Text();
    e.text = "", e.style = {
      fontFamily: "monospace",
      fontSize: 14,
      fill: "#ffffff",
      wordWrap: !0,
      wordWrapWidth: Ot.Width
    }, this.getContainer().addChild(e), this.text = e;
  }
  update(t, e) {
    if (!this.text)
      return;
    const i = this.getMemoryInfo(), s = [
      `FPS: ${this.fps}`,
      `Playback: ${(this.playbackTime / 1e3).toFixed(2)}/${(this.playbackDuration / 1e3).toFixed(2)}`,
      `Playing: ${this.isPlaying}`,
      `Total Heap Size: ${i.totalHeapSize ? `${this.bytesToMegabytes(i.totalHeapSize)}MB` : "N/A"}`,
      `Used Heap Size: ${i.usedHeapSize ? `${this.bytesToMegabytes(i.usedHeapSize)}MB` : "N/A"}`,
      `Heap Size Limit: ${i.heapSizeLimit ? `${this.bytesToMegabytes(i.heapSizeLimit)}MB` : "N/A"}`
    ];
    this.text.text = s.join(`
`);
  }
  draw() {
  }
  dispose() {
    this.background?.destroy(), this.background = null, this.text?.destroy(), this.text = null;
  }
  getMemoryInfo() {
    const t = {};
    return "memory" in performance && (t.totalHeapSize = performance.memory.totalJSHeapSize, t.usedHeapSize = performance.memory.usedJSHeapSize, t.heapSizeLimit = performance.memory.jsHeapSizeLimit), t;
  }
  bytesToMegabytes(t) {
    return Math.round(t / 1024 / 1024);
  }
}
class mt {
  /** @internal */
  static CanvasSelector = "[data-shotstack-studio]";
  static extensionsRegistered = !1;
  size;
  /** @internal */
  application;
  edit;
  inspector;
  container;
  background;
  timeline;
  minZoom = 0.1;
  maxZoom = 4;
  currentZoom = 0.8;
  constructor(t, e) {
    this.size = t, this.application = new d.Application(), this.edit = e, this.inspector = new Ot();
  }
  async load() {
    const t = document.querySelector(mt.CanvasSelector);
    if (!t)
      throw new Error(`Shotstack canvas root element '${mt.CanvasSelector}' not found.`);
    this.registerExtensions(), this.container = new d.Container(), this.background = new d.Graphics(), this.background.fillStyle = { color: "#424242" }, this.background.rect(0, 0, this.size.width, this.size.height), this.background.fill(), await this.configureApplication(), this.configureStage(), this.setupTouchHandling(t), this.edit.getContainer().scale = this.currentZoom, t.appendChild(this.application.canvas);
  }
  setupTouchHandling(t) {
    const e = this.edit.getContainer();
    t.addEventListener(
      "wheel",
      (i) => {
        if (i.preventDefault(), i.stopPropagation(), i.ctrlKey) {
          const s = Math.exp(-i.deltaY / 100), n = this.currentZoom * s, a = this.currentZoom;
          this.currentZoom = Math.min(Math.max(n, this.minZoom), this.maxZoom);
          const o = {
            x: this.application.canvas.width / 2,
            y: this.application.canvas.height / 2
          }, l = {
            x: e.position.x - o.x,
            y: e.position.y - o.y
          }, c = this.currentZoom / a;
          e.position.x = o.x + l.x * c, e.position.y = o.y + l.y * c, e.scale.x = this.currentZoom, e.scale.y = this.currentZoom;
        }
      },
      {
        passive: !1,
        capture: !0
      }
    );
  }
  centerEdit() {
    if (!this.edit)
      return;
    const t = this.edit.getContainer();
    t.position = {
      x: this.application.canvas.width / 2 - this.edit.size.width * this.currentZoom / 2,
      y: this.application.canvas.height / 2 - this.edit.size.height * this.currentZoom / 2
    };
  }
  zoomToFit() {
    if (!this.edit)
      return;
    const t = this.application.canvas.width / this.edit.size.width, e = this.application.canvas.height / this.edit.size.height, i = Math.min(t, e);
    this.currentZoom = Math.min(Math.max(i, this.minZoom), this.maxZoom);
    const s = this.edit.getContainer();
    s.scale.x = this.currentZoom, s.scale.y = this.currentZoom, this.centerEdit();
  }
  setZoom(t) {
    this.currentZoom = Math.min(Math.max(t, this.minZoom), this.maxZoom);
    const e = this.edit.getContainer();
    e.scale.x = this.currentZoom, e.scale.y = this.currentZoom;
  }
  registerTimeline(t) {
    this.timeline = t;
  }
  registerExtensions() {
    mt.extensionsRegistered || (d.extensions.add(new te()), d.extensions.add(new se()), mt.extensionsRegistered = !0);
  }
  async configureApplication() {
    const t = {
      background: "#000000",
      width: this.size.width,
      height: this.size.height,
      antialias: !0
    };
    await this.application.init(t), this.application.ticker.add(this.onTick.bind(this)), this.application.ticker.minFPS = 60, this.application.ticker.maxFPS = 60;
  }
  onTick(t) {
    this.edit.update(t.deltaTime, t.deltaMS), this.edit.draw(), this.inspector.fps = Math.ceil(t.FPS), this.inspector.playbackTime = this.edit.playbackTime, this.inspector.playbackDuration = this.edit.totalDuration, this.inspector.isPlaying = this.edit.isPlaying, this.inspector.update(t.deltaTime, t.deltaMS), this.inspector.draw(), this.timeline && (this.timeline.update(t.deltaTime, t.deltaMS), this.timeline.draw());
  }
  configureStage() {
    if (!this.container || !this.background)
      throw new Error("Shotstack canvas container not set up.");
    this.container.addChild(this.background), this.container.addChild(this.edit.getContainer()), this.container.addChild(this.inspector.getContainer()), this.application.stage.addChild(this.container), this.application.stage.eventMode = "static", this.application.stage.hitArea = new d.Rectangle(0, 0, this.size.width, this.size.height), this.background.eventMode = "static", this.background.on("pointerdown", this.onBackgroundClick.bind(this)), this.application.stage.on("click", this.onClick.bind(this)), this.edit.getContainer().position = {
      x: this.application.canvas.width / 2 - this.edit.size.width * this.currentZoom / 2,
      y: this.application.canvas.height / 2 - this.edit.size.height * this.currentZoom / 2
    };
  }
  onClick() {
    this.edit.pause();
  }
  onBackgroundClick(t) {
    t.target === this.background && this.edit.events.emit("canvas:background:clicked", {});
  }
  dispose() {
    const t = document.querySelector(mt.CanvasSelector);
    t && t.contains(this.application.canvas) && t.removeChild(this.application.canvas), this.application.ticker.remove(this.onTick, this), this.application.stage.off("click", this.onClick, this), this.background?.off("pointerdown", this.onBackgroundClick, this), this.background?.destroy(), this.container?.destroy(), this.inspector.dispose(), this.application.destroy(!0, { children: !0, texture: !0 });
  }
}
class kn {
  edit;
  seekDistance = 50;
  seekDistanceLarge = 500;
  frameTime = 16.67;
  constructor(t) {
    this.edit = t;
  }
  async load() {
    document.addEventListener("keydown", this.handleKeyDown), document.addEventListener("keyup", this.handleKeyUp);
  }
  /** @internal */
  dispose() {
    document.removeEventListener("keydown", this.handleKeyDown), document.removeEventListener("keyup", this.handleKeyUp);
  }
  handleKeyDown = (t) => {
    if (!(t.target instanceof HTMLInputElement || t.target instanceof HTMLTextAreaElement))
      switch (t.code) {
        case "Space": {
          this.edit.isPlaying ? this.edit.pause() : this.edit.play();
          break;
        }
        case "ArrowLeft": {
          if (t.metaKey)
            this.edit.seek(0);
          else {
            const e = t.shiftKey ? this.seekDistanceLarge : this.seekDistance;
            this.edit.seek(this.edit.playbackTime - e);
          }
          break;
        }
        case "ArrowRight": {
          if (t.metaKey)
            this.edit.seek(this.edit.getTotalDuration());
          else {
            const e = t.shiftKey ? this.seekDistanceLarge : this.seekDistance;
            this.edit.seek(this.edit.playbackTime + e);
          }
          break;
        }
        case "KeyJ": {
          this.edit.stop();
          break;
        }
        case "KeyK": {
          this.edit.pause();
          break;
        }
        case "KeyL": {
          this.edit.play();
          break;
        }
        case "Comma": {
          this.edit.seek(this.edit.playbackTime - this.frameTime);
          break;
        }
        case "Period": {
          this.edit.seek(this.edit.playbackTime + this.frameTime);
          break;
        }
        case "KeyZ": {
          (t.metaKey || t.ctrlKey) && (t.preventDefault(), t.shiftKey ? this.edit.redo() : this.edit.undo());
          break;
        }
        case "Delete":
        case "Backspace": {
          const e = this.edit.getSelectedClipInfo();
          e && (t.preventDefault(), this.edit.deleteClip(e.trackIndex, e.clipIndex));
          break;
        }
      }
  };
  handleKeyUp = (t) => {
    if (!(t.target instanceof HTMLInputElement || t.target instanceof HTMLTextAreaElement))
      switch (t.code) {
        case "KeyI":
          console.log(this.edit.getEdit());
          break;
      }
  };
}
class Tn {
  ffmpeg;
  isReady = !1;
  edit;
  application;
  constructor(t, e) {
    this.edit = t, this.application = e.application, this.ffmpeg = new gi();
  }
  async init() {
    if (!this.isReady)
      try {
        await this.ffmpeg.load(), this.isReady = !0;
      } catch (t) {
        throw console.error("FFmpeg initialization failed:", t), t;
      }
  }
  async export(t = "shotstack-export.mp4", e = 30) {
    this.isReady || await this.init();
    const i = this.edit.isPlaying, s = this.edit.playbackTime;
    this.edit.pause();
    const n = this.edit.getContainer(), a = n.visible, { x: o, y: l } = n.position, { x: c, y: h } = n.scale;
    n.visible = !1;
    const p = this.createProgressOverlay();
    try {
      const f = this.edit.getSize ? this.edit.getSize() : { width: 1920, height: 1080 }, y = Math.ceil(this.edit.totalDuration * e / 1e3), S = 1e3 / e, b = 100, O = 50, z = 50, it = (_) => Math.round(_ / y * O);
      this.updateProgressOverlay(p, 0, b);
      const $ = document.createElement("canvas");
      $.width = f.width, $.height = f.height;
      const ft = $.getContext("2d");
      if (!ft)
        throw new Error("Could not get 2D context for canvas");
      const ne = this.findAudioPlayers();
      this.updateProgressOverlay(p, 2, b);
      const Y = [];
      if (ne.length > 0) {
        this.updateProgressOverlay(p, 3, b);
        for (let _ = 0; _ < ne.length; _ += 1) {
          const V = await this.processAudioTrack(ne[_], _);
          V && Y.push(V), this.updateProgressOverlay(p, 4 + _, b);
        }
      }
      n.position.x = 0, n.position.y = 0, n.scale.x = 1, n.scale.y = 1;
      for (let _ = 0; _ < y; _ += 1) {
        this.edit.seek(_ * S), this.edit.tick ? this.edit.tick(0, 0) : (this.edit.update?.(0, 0), this.edit.draw?.());
        try {
          const { extract: V } = this.application.renderer, H = V.canvas(n);
          ft.clearRect(0, 0, $.width, $.height), ft.drawImage(H, 0, 0);
          const X = $.toDataURL("image/png"), Ht = await (await fetch(X)).arrayBuffer(), li = `frame_${_.toString().padStart(6, "0")}.png`;
          await this.ffmpeg.writeFile(li, new Uint8Array(Ht));
        } catch (V) {
          console.error(`Error capturing frame ${_}:`, V);
        }
        this.updateProgressOverlay(p, it(_ + 1), b);
      }
      this.updateProgressOverlay(p, O, b);
      let st = ["-framerate", e.toString(), "-i", "frame_%06d.png"];
      for (const _ of Y)
        st = st.concat(["-i", _.filename]);
      if (st = st.concat(["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23"]), Y.length > 0) {
        let _ = "";
        for (let H = 0; H < Y.length; H += 1) {
          const X = Y[H], Se = H + 1, Ht = Math.max(0, X.start);
          _ += `[${Se}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,apad,afade=t=in:st=0:d=0.05,atrim=start=0:end=${X.duration / 1e3 + 0.1},adelay=${Ht}|${Ht},volume=${X.volume}[a${H}];`;
        }
        const V = Y.length > 1 ? `${Y.map((H, X) => `[a${X}]`).join("")}amix=inputs=${Y.length}:duration=longest:dropout_transition=0.5:normalize=0[aout]` : "[a0]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]";
        _ += V, st = st.concat([
          "-filter_complex",
          _,
          "-map",
          "0:v",
          "-map",
          "[aout]",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-shortest"
        ]);
      }
      const re = "output.mp4";
      st.push(re);
      let Te = 0;
      const we = ({ message: _ }) => {
        const V = _.includes("frame=") && _.includes("fps=") ? _.match(/frame=\s*(\d+)/) : null;
        if (V?.[1]) {
          const H = parseInt(V[1], 10);
          if (!Number.isNaN(H) && H > Te && (Te = H, H <= y)) {
            const X = Math.round(H / y * z);
            this.updateProgressOverlay(p, O + X, b);
          }
        }
      };
      this.ffmpeg.on("log", we), await this.ffmpeg.exec(st), this.ffmpeg.off("log", we), this.updateProgressOverlay(p, O + z, b);
      const ae = await this.ffmpeg.readFile(re), ai = ae instanceof Uint8Array ? ae : new TextEncoder().encode(ae.toString()), oi = new Blob([ai], { type: "video/mp4" }), be = URL.createObjectURL(oi), oe = document.createElement("a");
      oe.href = be, oe.download = t, oe.click(), URL.revokeObjectURL(be);
      for (let _ = 0; _ < y; _ += 1)
        try {
          await this.ffmpeg.deleteFile(`frame_${_.toString().padStart(6, "0")}.png`);
        } catch {
        }
      for (const _ of Y)
        try {
          await this.ffmpeg.deleteFile(_.filename);
        } catch {
        }
      await this.ffmpeg.deleteFile(re), this.updateProgressOverlay(p, b, b);
    } catch (f) {
      throw console.error("Error during export:", f), f;
    } finally {
      this.removeProgressOverlay(p), n.position.x = o, n.position.y = l, n.scale.x = c, n.scale.y = h, n.visible = a, this.edit.seek(s), i && this.edit.play();
    }
  }
  findAudioPlayers() {
    const t = [], e = this.edit.tracks;
    if (e && Array.isArray(e))
      for (let i = 0; i < e.length; i += 1) {
        const s = e[i];
        if (Array.isArray(s))
          for (let n = 0; n < s.length; n += 1) {
            const a = s[n];
            (a instanceof ce || a.constructor.name === "AudioPlayer" || a.clipConfiguration?.asset?.type === "audio") && (t.includes(a) || t.push(a));
          }
      }
    return this.searchContainerForPlayers(this.edit.getContainer(), t), t;
  }
  searchContainerForPlayers(t, e) {
    if (t) {
      for (const i of t.children)
        if (i instanceof d.Container) {
          if (i.label?.startsWith("shotstack-track-")) {
            for (const n of i.children)
              if (n instanceof d.Container) {
                const a = n, o = ["player", "clip", "audioPlayer", "entity"];
                for (const l of o) {
                  const c = a[l];
                  c instanceof ce && !e.includes(c) && e.push(c);
                }
              }
          }
          this.searchContainerForPlayers(i, e);
        }
    }
  }
  async processAudioTrack(t, e) {
    try {
      const { clipConfiguration: i } = t;
      if (!i?.asset) return null;
      const s = i.asset;
      if (!s.src)
        return console.warn("Audio asset does not have a valid src property"), null;
      const n = await fetch(s.src);
      if (!n.ok)
        return console.error(`Failed to fetch audio file: ${s.src}`), null;
      const a = await n.arrayBuffer(), o = `audio_${e}.mp3`;
      return await this.ffmpeg.writeFile(o, new Uint8Array(a)), {
        filename: o,
        start: t.getStart(),
        duration: t.getLength(),
        volume: t.getVolume()
      };
    } catch (i) {
      return console.error(`Error processing audio track ${e}:`, i), null;
    }
  }
  createProgressOverlay() {
    const t = document.createElement("div");
    t.className = "video-export-progress-overlay", Object.assign(t.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      color: "white",
      fontFamily: "Arial, sans-serif"
    });
    const e = document.createElement("div");
    Object.assign(e.style, {
      backgroundColor: "#222",
      borderRadius: "8px",
      padding: "20px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      width: "300px",
      textAlign: "center"
    }), t.appendChild(e);
    const i = document.createElement("h3");
    i.innerText = "Exporting Video", i.style.margin = "0 0 15px 0", i.style.fontWeight = "normal", e.appendChild(i);
    const s = document.createElement("div");
    Object.assign(s.style, {
      width: "100%",
      height: "6px",
      backgroundColor: "#444",
      borderRadius: "3px",
      overflow: "hidden",
      marginBottom: "10px"
    }), e.appendChild(s);
    const n = document.createElement("div");
    n.className = "video-export-progress-bar", Object.assign(n.style, {
      width: "0%",
      height: "100%",
      backgroundColor: "#3498db",
      transition: "width 0.3s"
    }), s.appendChild(n);
    const a = document.createElement("div");
    return a.className = "video-export-percent", a.innerText = "0%", a.style.fontSize = "12px", e.appendChild(a), document.body.appendChild(t), t;
  }
  updateProgressOverlay(t, e, i) {
    if (!t) return;
    const s = Math.round(e / i * 100), n = t.querySelector(".video-export-progress-bar"), a = t.querySelector(".video-export-percent");
    n && (n.style.width = `${s}%`), a && (a.innerText = `${s}%`);
  }
  removeProgressOverlay(t) {
    t?.parentNode?.removeChild(t);
  }
}
function ii(r) {
  const t = r.replace("#", ""), e = parseInt(t, 16);
  return Number.isNaN(e) ? (console.warn(`Invalid hex color: ${r}, defaulting to black`), 0) : e;
}
function Ks(r) {
  const t = (e) => {
    if (typeof e == "string")
      return ii(e);
    if (typeof e == "object" && e !== null) {
      const i = Array.isArray(e) ? [] : {};
      for (const s in e)
        Object.prototype.hasOwnProperty.call(e, s) && (i[s] = t(e[s]));
      return i;
    }
    return e;
  };
  return t(r);
}
function si(r) {
  if (typeof r == "string")
    return ii(r);
  if (typeof r == "object" && r !== null) {
    const t = Array.isArray(r) ? [] : {};
    for (const e in r)
      Object.prototype.hasOwnProperty.call(r, e) && (t[e] = si(r[e]));
    return t;
  }
  return r;
}
const $s = {
  timeline: {
    background: "#1a1a1a",
    divider: "#1a1a1a",
    toolbar: {
      background: "#1a1a1a",
      surface: "#2a2a2a",
      hover: "#3a3a3a",
      active: "#007acc",
      divider: "#3a3a3a",
      icon: "#888888",
      text: "#ffffff",
      height: 36
    },
    ruler: {
      background: "#404040",
      text: "#ffffff",
      markers: "#666666",
      height: 40
    },
    tracks: {
      surface: "#2a2a2a",
      surfaceAlt: "#242424",
      border: "#3a3a3a",
      height: 60
    },
    clips: {
      video: "#4a90e2",
      audio: "#7ed321",
      image: "#f5a623",
      text: "#d0021b",
      shape: "#9013fe",
      html: "#50e3c2",
      luma: "#b8e986",
      default: "#8e8e93",
      selected: "#007acc",
      radius: 4
    },
    playhead: "#ff4444",
    snapGuide: "#888888",
    dropZone: "#00ff00",
    trackInsertion: "#00ff00"
  }
}, Ue = Ks($s);
class Ze {
  static resolveTheme(t) {
    if (!t || !t.theme)
      return this.deepClone(Ue);
    const e = si(t.theme), i = this.deepClone(Ue);
    return this.deepMerge(i, e);
  }
  static validateTheme(t) {
    try {
      if (!t.timeline) return !1;
      const { timeline: e } = t;
      if (typeof e.background != "number" || typeof e.divider != "number" || typeof e.playhead != "number" || typeof e.snapGuide != "number" || typeof e.dropZone != "number" || typeof e.trackInsertion != "number" || !e.toolbar) return !1;
      const i = e.toolbar;
      if (typeof i.background != "number" || typeof i.surface != "number" || typeof i.hover != "number" || typeof i.active != "number" || typeof i.divider != "number" || typeof i.icon != "number" || typeof i.text != "number" || typeof i.height != "number" || i.height <= 0 || !e.ruler) return !1;
      const s = e.ruler;
      if (typeof s.background != "number" || typeof s.text != "number" || typeof s.markers != "number" || typeof s.height != "number" || s.height <= 0 || !e.tracks) return !1;
      const n = e.tracks;
      if (typeof n.surface != "number" || typeof n.surfaceAlt != "number" || typeof n.border != "number" || typeof n.height != "number" || n.height <= 0 || !e.clips) return !1;
      const a = e.clips, o = ["video", "audio", "image", "text", "shape", "html", "luma", "default", "selected"];
      for (const l of o)
        if (typeof a[l] != "number") return !1;
      return !(typeof a.radius != "number" || a.radius < 0);
    } catch (e) {
      return console.error("Theme validation error:", e), !1;
    }
  }
  static deepClone(t) {
    if (t === null || typeof t != "object")
      return t;
    if (t instanceof Array)
      return t.map((i) => this.deepClone(i));
    const e = {};
    for (const i in t)
      Object.prototype.hasOwnProperty.call(t, i) && (e[i] = this.deepClone(t[i]));
    return e;
  }
  static deepMerge(t, e) {
    const i = { ...t };
    for (const s in e)
      if (Object.prototype.hasOwnProperty.call(e, s)) {
        const n = e[s], a = i[s];
        n !== void 0 && (typeof n == "object" && n !== null && !Array.isArray(n) && typeof a == "object" && a !== null && !Array.isArray(a) ? i[s] = this.deepMerge(a, n) : i[s] = n);
      }
    return i;
  }
}
class Ys {
  timeline;
  constructor(t) {
    this.timeline = t;
  }
  getValidDropPosition(t, e, i, s) {
    const n = this.timeline.getVisualTracks()[i];
    if (!n) return { validTime: t, wouldOverlap: !1 };
    const a = this.getOtherClipBounds(n, s), o = t + e, l = a.find(
      (y) => !(o <= y.start || t >= y.end)
      // Not if completely before or after
    );
    if (!l)
      return { validTime: t, wouldOverlap: !1 };
    const c = l.start - e, h = l.end, p = Math.abs(t - c) < Math.abs(t - h) && c >= 0 ? c : h;
    return {
      validTime: this.getValidDropPosition(p, e, i, s).validTime,
      wouldOverlap: !0
    };
  }
  checkOverlap(t, e, i, s) {
    const n = this.timeline.getVisualTracks()[i];
    if (!n) return !1;
    const a = this.getOtherClipBounds(n, s), o = t + e;
    return a.some((l) => !(o <= l.start || t >= l.end));
  }
  getOtherClipBounds(t, e) {
    return t.getClips().map((i, s) => ({ clip: i, index: s })).filter(({ index: i }) => i !== e).map(({ clip: i }) => {
      const s = i.getClipConfig();
      return s ? {
        start: s.start || 0,
        end: (s.start || 0) + (s.length || 0)
      } : null;
    }).filter((i) => i !== null).sort((i, s) => i.start - s.start);
  }
  findAvailableGaps(t, e) {
    const i = this.timeline.getVisualTracks()[t];
    if (!i) return [];
    const s = this.getOtherClipBounds(i), n = [];
    s.length > 0 && s[0].start >= e && n.push({ start: 0, end: s[0].start });
    for (let a = 0; a < s.length - 1; a += 1)
      s[a + 1].start - s[a].end >= e && n.push({ start: s[a].end, end: s[a + 1].start });
    return n;
  }
}
class ni {
  constructor(t, e, i, s) {
    this.fromTrackIndex = t, this.fromClipIndex = e, this.toTrackIndex = i, this.newStart = s, this.originalTrackIndex = t, this.originalClipIndex = e;
  }
  name = "moveClip";
  player;
  originalTrackIndex;
  originalClipIndex;
  originalStart;
  execute(t) {
    if (!t) return;
    const e = t.getTracks();
    if (this.fromTrackIndex < 0 || this.fromTrackIndex >= e.length) {
      console.warn(`Invalid source track index: ${this.fromTrackIndex}`);
      return;
    }
    const i = e[this.fromTrackIndex];
    if (this.fromClipIndex < 0 || this.fromClipIndex >= i.length) {
      console.warn(`Invalid clip index: ${this.fromClipIndex}`);
      return;
    }
    if (this.player = i[this.fromClipIndex], this.originalStart = this.player.clipConfiguration.start, this.fromTrackIndex !== this.toTrackIndex) {
      if (this.toTrackIndex < 0 || this.toTrackIndex >= e.length) {
        console.warn(`Invalid destination track index: ${this.toTrackIndex}`);
        return;
      }
      i.splice(this.fromClipIndex, 1), this.player.layer = this.toTrackIndex + 1;
      const s = e[this.toTrackIndex];
      let n = 0;
      for (let a = 0; a < s.length; a += 1) {
        const o = s[a];
        if (o.clipConfiguration && o.clipConfiguration.start !== void 0 && this.newStart < o.clipConfiguration.start)
          break;
        n += 1;
      }
      s.splice(n, 0, this.player), this.originalClipIndex = n;
    }
    if (this.player.clipConfiguration.start = this.newStart, t.movePlayerToTrackContainer(this.player, this.fromTrackIndex, this.toTrackIndex), this.player.reconfigureAfterRestore(), this.player.draw(), t.updateDuration(), this.fromTrackIndex !== this.toTrackIndex) {
      const s = e[this.fromTrackIndex], n = e[this.toTrackIndex];
      [...s, ...n].forEach((a) => {
        a && a !== this.player && a.draw();
      });
    }
    t.emitEvent("clip:updated", {
      previous: {
        clip: { ...this.player.clipConfiguration, start: this.originalStart },
        trackIndex: this.fromTrackIndex,
        clipIndex: this.fromClipIndex
      },
      current: {
        clip: this.player.clipConfiguration,
        trackIndex: this.toTrackIndex,
        clipIndex: this.originalClipIndex
      }
    });
  }
  undo(t) {
    if (!t || !this.player || this.originalStart === void 0) return;
    const e = t.getTracks();
    if (this.fromTrackIndex !== this.toTrackIndex) {
      const i = e[this.toTrackIndex], s = i.indexOf(this.player);
      s !== -1 && i.splice(s, 1), this.player.layer = this.fromTrackIndex + 1, e[this.fromTrackIndex].splice(this.fromClipIndex, 0, this.player);
    }
    this.player.clipConfiguration.start = this.originalStart, t.movePlayerToTrackContainer(this.player, this.toTrackIndex, this.fromTrackIndex), this.player.reconfigureAfterRestore(), this.player.draw(), t.updateDuration(), t.emitEvent("clip:updated", {
      previous: {
        clip: { ...this.player.clipConfiguration, start: this.newStart },
        trackIndex: this.toTrackIndex,
        clipIndex: this.originalClipIndex
      },
      current: {
        clip: this.player.clipConfiguration,
        trackIndex: this.fromTrackIndex,
        clipIndex: this.fromClipIndex
      }
    });
  }
}
class Xs {
  constructor(t, e, i, s) {
    this.insertionIndex = t, this.fromTrackIndex = e, this.fromClipIndex = i, this.newStart = s, this.addTrackCommand = new ei(t);
    const n = e >= t ? e + 1 : e;
    this.moveClipCommand = new ni(n, i, t, s);
  }
  name = "createTrackAndMoveClip";
  addTrackCommand;
  moveClipCommand;
  wasExecuted = !1;
  async execute(t) {
    if (t)
      try {
        this.addTrackCommand.execute(t), this.moveClipCommand.execute(t), this.wasExecuted = !0;
      } catch (e) {
        if (this.wasExecuted)
          try {
            this.undo(t);
          } catch {
          }
        throw e;
      }
  }
  undo(t) {
    !t || !this.wasExecuted || (this.moveClipCommand.undo(t), this.addTrackCommand.undo(t), this.wasExecuted = !1, t.emitEvent("track:created:undone", {
      trackIndex: this.insertionIndex
    }));
  }
}
class js {
  timeline;
  thresholds;
  snapManager;
  collisionDetector;
  visualFeedback;
  dragInfo = null;
  currentDropZone = null;
  constructor(t, e, i, s, n) {
    this.timeline = t, this.thresholds = e, this.snapManager = i, this.collisionDetector = s, this.visualFeedback = n;
  }
  activate() {
  }
  deactivate() {
    this.endDrag();
  }
  canStartDrag(t, e) {
    const i = Math.sqrt((e.x - t.x) ** 2 + (e.y - t.y) ** 2), { trackHeight: s } = this.timeline.getLayout(), n = s < 20 ? 2 : this.thresholds.drag.base;
    return i > n;
  }
  startDrag(t, e) {
    const i = this.timeline.getClipData(t.trackIndex, t.clipIndex);
    if (!i)
      return console.warn(`Clip data not found for track ${t.trackIndex}, clip ${t.clipIndex}`), !1;
    const s = this.timeline.getContainer().toLocal(e.global), n = this.timeline.getLayout(), a = n.getXAtTime(i.start || 0), o = t.trackIndex * n.trackHeight;
    return this.dragInfo = {
      trackIndex: t.trackIndex,
      clipIndex: t.clipIndex,
      startTime: i.start || 0,
      offsetX: s.x - a,
      offsetY: s.y - o
    }, this.timeline.getPixiApp().canvas.style.cursor = "grabbing", this.timeline.getEdit().events.emit("drag:started", this.dragInfo), !0;
  }
  updateDrag(t) {
    if (!this.dragInfo) return;
    const e = this.calculateDragPosition(t), i = this.detectDropZone(e.y);
    i ? this.handleDropZonePreview(i, e) : this.handleNormalDragPreview(e), this.emitDragUpdate(e, i);
  }
  completeDrag(t) {
    if (!this.dragInfo) return;
    const e = { ...this.dragInfo }, i = this.calculateDragPosition(t), s = this.detectDropZone(i.y);
    this.endDrag(), s ? this.executeDropZoneMove(s, e, i) : this.executeNormalMove(e, i);
  }
  calculateDragPosition(t) {
    if (!this.dragInfo) throw new Error("No drag info available");
    const e = this.timeline.getContainer().toLocal(t.global), i = this.timeline.getLayout(), s = Math.max(0, i.getTimeAtX(e.x - this.dragInfo.offsetX)), n = e.y - this.dragInfo.offsetY, a = n + i.trackHeight / 2, o = Math.max(0, Math.floor(a / i.trackHeight)), l = this.timeline.getVisualTracks().length - 1, c = Math.max(0, Math.min(l, o));
    return {
      x: e.x,
      y: e.y + i.viewportY,
      // For drop zone detection
      time: s,
      track: c,
      ghostY: n
      // Free Y position for ghost
    };
  }
  detectDropZone(t) {
    const e = this.timeline.getLayout(), i = this.timeline.getVisualTracks(), s = e.trackHeight * this.thresholds.dropZone.ratio;
    for (let n = 0; n <= i.length; n += 1) {
      const a = e.tracksY + n * e.trackHeight;
      if (Math.abs(t - a) < s) {
        let o;
        return n === 0 ? o = "above" : n === i.length ? o = "below" : o = "between", {
          type: o,
          position: n
        };
      }
    }
    return null;
  }
  handleDropZonePreview(t, e) {
    (!this.currentDropZone || this.currentDropZone.type !== t.type || this.currentDropZone.position !== t.position) && (this.currentDropZone = t, this.visualFeedback.showDropZone(t)), this.timeline.hideDragGhost(), this.visualFeedback.hideSnapGuidelines(), this.visualFeedback.hideTargetTrack();
  }
  handleNormalDragPreview(t) {
    if (!this.dragInfo) return;
    this.currentDropZone && (this.visualFeedback.hideDropZone(), this.currentDropZone = null);
    const e = this.timeline.getClipData(this.dragInfo.trackIndex, this.dragInfo.clipIndex);
    if (!e) return;
    const i = e.length || 0, s = t.track === this.dragInfo.trackIndex ? this.dragInfo.clipIndex : void 0, n = this.calculateFinalPosition(t.time, t.track, i, s), a = this.snapManager.findAlignedElements(n, i, t.track, s);
    a.length > 0 ? this.visualFeedback.showSnapGuidelines(a) : this.visualFeedback.hideSnapGuidelines(), this.visualFeedback.showTargetTrack(t.track), this.timeline.showDragGhost(t.track, n, t.ghostY);
  }
  calculateFinalPosition(t, e, i, s) {
    const n = this.snapManager.calculateSnapPosition(t, e, i, s);
    return this.collisionDetector.getValidDropPosition(n.time, i, e, s).validTime;
  }
  emitDragUpdate(t, e) {
    if (!this.dragInfo) return;
    const i = this.timeline.getClipData(this.dragInfo.trackIndex, this.dragInfo.clipIndex);
    if (!i) return;
    const s = i.length || 0, n = e ? t.time : this.calculateFinalPosition(
      t.time,
      t.track,
      s,
      t.track === this.dragInfo.trackIndex ? this.dragInfo.clipIndex : void 0
    );
    this.timeline.getEdit().events.emit("drag:moved", {
      ...this.dragInfo,
      currentTime: n,
      currentTrack: e ? -1 : t.track
    });
  }
  executeDropZoneMove(t, e, i) {
    const s = new Xs(t.position, e.trackIndex, e.clipIndex, i.time);
    this.timeline.getEdit().executeEditCommand(s);
  }
  executeNormalMove(t, e) {
    const i = this.timeline.getClipData(t.trackIndex, t.clipIndex);
    if (!i) return;
    const s = i.length || 0, n = e.track === t.trackIndex ? t.clipIndex : void 0, a = this.calculateFinalPosition(e.time, e.track, s, n);
    if (e.track !== t.trackIndex || Math.abs(a - t.startTime) > 0.01) {
      const l = new ni(t.trackIndex, t.clipIndex, e.track, a);
      this.timeline.getEdit().executeEditCommand(l);
    }
  }
  endDrag() {
    this.dragInfo = null, this.currentDropZone = null, this.visualFeedback.hideAll(), this.timeline.getPixiApp().canvas.style.cursor = "default", this.timeline.getEdit().events.emit("drag:ended", {});
  }
  getDragInfo() {
    return this.dragInfo;
  }
  dispose() {
    this.endDrag();
  }
}
class qs {
  constructor(t, e, i) {
    this.trackIndex = t, this.clipIndex = e, this.newLength = i;
  }
  name = "resizeClip";
  originalLength;
  player;
  execute(t) {
    if (!t) return;
    const e = t.getTrack(this.trackIndex);
    if (!e) {
      console.warn(`Invalid track index: ${this.trackIndex}`);
      return;
    }
    if (this.clipIndex < 0 || this.clipIndex >= e.length) {
      console.warn(`Invalid clip index: ${this.clipIndex} for track ${this.trackIndex}`);
      return;
    }
    this.player = e[this.clipIndex], this.originalLength = this.player.clipConfiguration.length, this.player.clipConfiguration.length = this.newLength, this.player.reconfigureAfterRestore(), this.player.draw(), t.updateDuration(), t.emitEvent("clip:updated", {
      previous: { clip: { ...this.player.clipConfiguration, length: this.originalLength }, trackIndex: this.trackIndex, clipIndex: this.clipIndex },
      current: { clip: this.player.clipConfiguration, trackIndex: this.trackIndex, clipIndex: this.clipIndex }
    });
  }
  undo(t) {
    !t || !this.player || this.originalLength === void 0 || (this.player.clipConfiguration.length = this.originalLength, this.player.reconfigureAfterRestore(), this.player.draw(), t.updateDuration(), t.emitEvent("clip:updated", {
      previous: { clip: { ...this.player.clipConfiguration, length: this.newLength }, trackIndex: this.trackIndex, clipIndex: this.clipIndex },
      current: { clip: this.player.clipConfiguration, trackIndex: this.trackIndex, clipIndex: this.clipIndex }
    }));
  }
}
class Qs {
  timeline;
  thresholds;
  resizeInfo = null;
  constructor(t, e) {
    this.timeline = t, this.thresholds = e;
  }
  activate() {
  }
  deactivate() {
    this.endResize();
  }
  isOnClipRightEdge(t, e) {
    const i = this.timeline.getVisualTracks()[t.trackIndex];
    if (!i) return !1;
    const s = i.getClip(t.clipIndex);
    if (!s) return !1;
    const a = s.getContainer().getBounds(), o = a.x + a.width, l = Math.abs(e.global.x - o), c = this.getResizeThreshold();
    return l <= c;
  }
  startResize(t, e) {
    const i = this.timeline.getClipData(t.trackIndex, t.clipIndex);
    if (!i) return !1;
    this.resizeInfo = {
      trackIndex: t.trackIndex,
      clipIndex: t.clipIndex,
      originalLength: i.length || 0,
      startX: e.global.x
    }, this.timeline.getPixiApp().canvas.style.cursor = "ew-resize";
    const s = this.timeline.getVisualTracks()[t.trackIndex];
    if (s) {
      const n = s.getClip(t.clipIndex);
      n && n.setResizing(!0);
    }
    return this.timeline.getEdit().events.emit("resize:started", this.resizeInfo), !0;
  }
  updateResize(t) {
    if (!this.resizeInfo) return;
    const e = t.global.x - this.resizeInfo.startX, i = this.timeline.getOptions().pixelsPerSecond || 50, s = e / i, n = Math.max(0.1, this.resizeInfo.originalLength + s), a = this.timeline.getVisualTracks()[this.resizeInfo.trackIndex];
    if (a) {
      const o = a.getClip(this.resizeInfo.clipIndex);
      if (o) {
        const l = n * i;
        o.setPreviewWidth(l), this.timeline.getEdit().events.emit("resize:updated", { width: l });
      }
    }
  }
  completeResize(t) {
    if (!this.resizeInfo) return;
    const e = t.global.x - this.resizeInfo.startX, i = this.timeline.getOptions().pixelsPerSecond || 50, s = e / i, n = Math.max(0.1, this.resizeInfo.originalLength + s), a = this.timeline.getVisualTracks()[this.resizeInfo.trackIndex];
    if (a) {
      const o = a.getClip(this.resizeInfo.clipIndex);
      o && (o.setResizing(!1), o.setPreviewWidth(null));
    }
    if (Math.abs(n - this.resizeInfo.originalLength) > 0.01) {
      const o = new qs(this.resizeInfo.trackIndex, this.resizeInfo.clipIndex, n);
      this.timeline.getEdit().executeEditCommand(o), this.timeline.getEdit().events.emit("resize:ended", { newLength: n });
    }
    this.endResize();
  }
  getCursorForPosition(t, e) {
    return t && this.isOnClipRightEdge(t, e) ? "ew-resize" : "";
  }
  getResizeThreshold() {
    const { trackHeight: t } = this.timeline.getLayout();
    return Math.max(this.thresholds.resize.min, Math.min(this.thresholds.resize.max, t * this.thresholds.resize.ratio));
  }
  endResize() {
    this.resizeInfo = null, this.timeline.getPixiApp().canvas.style.cursor = "default";
  }
  getResizeInfo() {
    return this.resizeInfo;
  }
  dispose() {
    this.endResize();
  }
}
class Js {
  timeline;
  thresholds;
  constructor(t, e) {
    this.timeline = t, this.thresholds = e;
  }
  getAllSnapPoints(t, e) {
    const i = [];
    this.timeline.getVisualTracks().forEach((a, o) => {
      a.getClips().forEach((c, h) => {
        if (o === t && h === e) return;
        const p = c.getClipConfig();
        p && (i.push({
          time: p.start || 0,
          type: "clip-start",
          trackIndex: o,
          clipIndex: h
        }), i.push({
          time: (p.start || 0) + (p.length || 0),
          type: "clip-end",
          trackIndex: o,
          clipIndex: h
        }));
      });
    });
    const n = this.timeline.getPlayheadTime();
    return i.push({ time: n, type: "playhead" }), i;
  }
  getTrackSnapPoints(t, e) {
    return this.getAllSnapPoints(t, e).filter((i) => i.trackIndex === void 0 || i.trackIndex === t);
  }
  calculateSnapPosition(t, e, i, s) {
    const n = this.timeline.getOptions().pixelsPerSecond || 50, a = this.thresholds.snap.pixels / n, o = this.getTrackSnapPoints(e, s);
    let l = null;
    for (const c of o) {
      const h = Math.abs(t - c.time);
      h < a && (!l || h < l.distance) && (l = { time: c.time, type: c.type, distance: h });
      const p = Math.abs(t + i - c.time);
      p < a && (!l || p < l.distance) && (l = {
        time: c.time - i,
        type: c.type,
        distance: p
      });
    }
    return l ? { time: l.time, snapped: !0, snapType: l.type } : { time: t, snapped: !1 };
  }
  findAlignedElements(t, e, i, s) {
    const a = t + e, o = /* @__PURE__ */ new Map();
    this.timeline.getVisualTracks().forEach((c, h) => {
      c.getClips().forEach((p, f) => {
        if (h === i && f === s) return;
        const y = p.getClipConfig();
        if (!y) return;
        const S = y.start || 0, b = S + (y.length || 0);
        [
          { time: S, aligns: [t, a] },
          { time: b, aligns: [t, a] }
        ].forEach(({ time: O, aligns: z }) => {
          z.some((it) => Math.abs(it - O) < 0.1) && (o.has(O) || o.set(O, { tracks: /* @__PURE__ */ new Set(), isPlayhead: !1 }), o.get(O).tracks.add(h));
        });
      });
    });
    const l = this.timeline.getPlayheadTime();
    return (Math.abs(t - l) < 0.1 || Math.abs(a - l) < 0.1) && (o.has(l) || o.set(l, { tracks: /* @__PURE__ */ new Set(), isPlayhead: !0 }), o.get(l).isPlayhead = !0), Array.from(o.entries()).map(([c, h]) => ({
      time: c,
      tracks: Array.from(h.tracks).concat(i),
      isPlayhead: h.isPlayhead
    }));
  }
}
class tn {
  timeline;
  graphics = /* @__PURE__ */ new Map();
  constructor(t) {
    this.timeline = t;
  }
  showDropZone(t) {
    this.hideDropZone();
    const e = new d.Graphics(), i = this.timeline.getLayout(), s = this.timeline.getExtendedTimelineWidth(), n = t.position * i.trackHeight, o = this.timeline.getTheme().timeline.trackInsertion;
    e.setStrokeStyle({ width: 4, color: o, alpha: 0.8 }), e.moveTo(0, n), e.lineTo(s, n), e.stroke(), e.setStrokeStyle({ width: 8, color: o, alpha: 0.3 }), e.moveTo(0, n), e.lineTo(s, n), e.stroke(), this.timeline.getContainer().addChild(e), this.graphics.set("dropZone", e);
  }
  hideDropZone() {
    this.hideGraphics("dropZone");
  }
  showSnapGuidelines(t) {
    this.hideSnapGuidelines();
    const e = new d.Graphics(), i = this.timeline.getLayout(), s = this.timeline.getTheme();
    t.forEach(({ time: n, tracks: a, isPlayhead: o }) => {
      const l = i.getXAtTime(n), c = Math.min(...a), h = Math.max(...a), p = c * i.trackHeight, f = (h + 1) * i.trackHeight, y = o ? s.timeline.playhead : s.timeline.snapGuide;
      e.setStrokeStyle({ width: 3, color: y, alpha: 0.3 }), e.moveTo(l, p), e.lineTo(l, f), e.stroke(), e.setStrokeStyle({ width: 1, color: y, alpha: 0.8 }), e.moveTo(l, p), e.lineTo(l, f), e.stroke();
    }), this.timeline.getContainer().addChild(e), this.graphics.set("snapGuidelines", e);
  }
  hideSnapGuidelines() {
    this.hideGraphics("snapGuidelines");
  }
  showTargetTrack(t) {
    this.hideTargetTrack();
    const e = new d.Graphics(), i = this.timeline.getLayout(), s = this.timeline.getExtendedTimelineWidth(), n = t * i.trackHeight, a = i.trackHeight, l = this.timeline.getTheme().timeline.dropZone;
    e.rect(0, n, s, a), e.fill({ color: l, alpha: 0.1 }), e.setStrokeStyle({ width: 1, color: l, alpha: 0.3 }), e.rect(0, n, s, a), e.stroke(), this.timeline.getContainer().addChild(e), this.graphics.set("targetTrack", e);
  }
  hideTargetTrack() {
    this.hideGraphics("targetTrack");
  }
  hideAll() {
    this.graphics.forEach((t, e) => this.hideGraphics(e));
  }
  hideGraphics(t) {
    const e = this.graphics.get(t);
    e && (e.clear(), e.parent && e.parent.removeChild(e), e.destroy(), this.graphics.delete(t));
  }
  dispose() {
    this.hideAll(), this.graphics.clear();
  }
}
class en {
  timeline;
  /** @internal */
  state = { type: "idle" };
  abortController;
  // Handlers
  dragHandler;
  resizeHandler;
  snapManager;
  collisionDetector;
  visualFeedback;
  // Default thresholds
  thresholds = {
    drag: {
      base: 3,
      small: 2
    },
    resize: {
      min: 12,
      max: 20,
      ratio: 0.4
    },
    dropZone: {
      ratio: 0.15
    },
    snap: {
      pixels: 10,
      time: 0.1
    }
  };
  constructor(t, e) {
    if (this.timeline = t, e) {
      const i = structuredClone(this.thresholds);
      e.drag && Object.assign(i.drag, e.drag), e.resize && Object.assign(i.resize, e.resize), e.dropZone && Object.assign(i.dropZone, e.dropZone), e.snap && Object.assign(i.snap, e.snap), this.thresholds = i;
    }
    this.snapManager = new Js(t, this.thresholds), this.collisionDetector = new Ys(t), this.visualFeedback = new tn(t), this.dragHandler = new js(t, this.thresholds, this.snapManager, this.collisionDetector, this.visualFeedback), this.resizeHandler = new Qs(t, this.thresholds);
  }
  activate() {
    this.abortController = new AbortController(), this.setupEventListeners(), this.dragHandler.activate(), this.resizeHandler.activate();
  }
  deactivate() {
    this.abortController && (this.abortController.abort(), this.abortController = void 0), this.resetState(), this.dragHandler.deactivate(), this.resizeHandler.deactivate();
  }
  /** @internal */
  setupEventListeners() {
    const t = this.timeline.getPixiApp();
    t.stage.interactive = !0, t.stage.on("pointerdown", this.handlePointerDown.bind(this), {
      signal: this.abortController?.signal
    }), t.stage.on("pointermove", this.handlePointerMove.bind(this), {
      signal: this.abortController?.signal
    }), t.stage.on("pointerup", this.handlePointerUp.bind(this), {
      signal: this.abortController?.signal
    }), t.stage.on("pointerupoutside", this.handlePointerUp.bind(this), {
      signal: this.abortController?.signal
    });
  }
  /** @internal */
  handlePointerDown(t) {
    const e = t.target;
    if (e.label) {
      const i = this.parseClipLabel(e.label);
      if (i) {
        if (this.resizeHandler.isOnClipRightEdge(i, t)) {
          if (this.resizeHandler.startResize(i, t)) {
            const s = this.resizeHandler.getResizeInfo();
            s && (this.state = { type: "resizing", resizeInfo: s });
          }
          return;
        }
        this.state = {
          type: "selecting",
          startPos: { x: t.global.x, y: t.global.y },
          clipInfo: i
        }, this.timeline.getPixiApp().canvas.style.cursor = "grab";
        return;
      }
    }
    this.timeline.getEdit().clearSelection();
  }
  /** @internal */
  handlePointerMove(t) {
    switch (this.state.type) {
      case "selecting":
        this.handleSelectingMove(t);
        break;
      case "dragging":
        this.timeline.getPixiApp().canvas.style.cursor = "grabbing", this.dragHandler.updateDrag(t);
        break;
      case "resizing":
        this.timeline.getPixiApp().canvas.style.cursor = "ew-resize", this.resizeHandler.updateResize(t);
        break;
      case "idle":
        this.updateCursorForPosition(t);
        break;
    }
  }
  /** @internal */
  handlePointerUp(t) {
    switch (this.state.type) {
      case "selecting":
        this.timeline.getEdit().selectClip(this.state.clipInfo.trackIndex, this.state.clipInfo.clipIndex);
        break;
      case "dragging":
        this.dragHandler.completeDrag(t);
        break;
      case "resizing":
        this.resizeHandler.completeResize(t);
        break;
    }
    this.resetState();
  }
  /** @internal */
  handleSelectingMove(t) {
    if (this.state.type !== "selecting") return;
    const e = { x: t.global.x, y: t.global.y };
    if (this.dragHandler.canStartDrag(this.state.startPos, e) && this.dragHandler.startDrag(this.state.clipInfo, t)) {
      const i = this.dragHandler.getDragInfo();
      i && (this.state = {
        type: "dragging",
        dragInfo: i
      });
    }
  }
  /** @internal */
  updateCursorForPosition(t) {
    const e = t.target;
    if (e.label) {
      const i = this.parseClipLabel(e.label);
      if (i) {
        const s = this.resizeHandler.getCursorForPosition(i, t);
        if (s) {
          this.timeline.getPixiApp().canvas.style.cursor = s;
          return;
        }
        this.timeline.getPixiApp().canvas.style.cursor = "grab";
        return;
      }
    }
    this.timeline.getPixiApp().canvas.style.cursor = "default";
  }
  /** @internal */
  parseClipLabel(t) {
    if (!t?.startsWith("clip-"))
      return null;
    const e = t.split("-");
    if (e.length !== 3)
      return null;
    const i = parseInt(e[1], 10), s = parseInt(e[2], 10);
    return Number.isNaN(i) || Number.isNaN(s) ? null : { trackIndex: i, clipIndex: s };
  }
  /** @internal */
  resetState() {
    this.state = { type: "idle" }, this.visualFeedback.hideAll(), this.timeline.getPixiApp().canvas.style.cursor = "default";
  }
  dispose() {
    this.deactivate(), this.dragHandler.dispose(), this.resizeHandler.dispose(), this.visualFeedback.dispose();
  }
}
class sn {
  constructor(t, e, i, s, n) {
    this.container = t, this.layout = e, this.getPixelsPerSecond = i, this.getTrackHeight = s, this.getVisualTracks = n;
  }
  dragPreviewContainer = null;
  dragPreviewGraphics = null;
  draggedClipInfo = null;
  showDragPreview(t, e, i) {
    if (!i) return;
    this.draggedClipInfo = { trackIndex: t, clipIndex: e, clipConfig: i }, this.dragPreviewContainer = new d.Container(), this.dragPreviewGraphics = new d.Graphics(), this.dragPreviewContainer.addChild(this.dragPreviewGraphics), this.container.addChild(this.dragPreviewContainer), this.getVisualTracks()[t]?.getClip(e)?.setDragging(!0), this.drawDragPreview(t, i.start || 0);
  }
  /** @internal */
  drawDragPreview(t, e) {
    if (!this.dragPreviewContainer || !this.dragPreviewGraphics || !this.draggedClipInfo) return;
    const { clipConfig: i } = this.draggedClipInfo, s = this.layout.getXAtTime(e), n = t * this.layout.trackHeight, a = (i.length || 0) * this.getPixelsPerSecond();
    this.dragPreviewGraphics.clear(), this.dragPreviewGraphics.roundRect(0, 0, a, this.getTrackHeight(), 4), this.dragPreviewGraphics.fill({ color: 9342611, alpha: 0.6 }), this.dragPreviewGraphics.stroke({ width: 2, color: 65280 }), this.dragPreviewContainer.position.set(s, n);
  }
  /** @internal */
  drawDragPreviewAtPosition(t, e, i) {
    if (!this.dragPreviewContainer || !this.dragPreviewGraphics || !this.draggedClipInfo) return;
    const { clipConfig: s } = this.draggedClipInfo, n = this.layout.getXAtTime(t), a = (s.length || 0) * this.getPixelsPerSecond(), o = this.getTrackHeight();
    this.dragPreviewGraphics.clear(), this.dragPreviewGraphics.roundRect(0, 0, a, o, 4), this.dragPreviewGraphics.fill({ color: 9342611, alpha: 0.6 });
    const l = i * this.layout.trackHeight, h = Math.abs(e - l) < 5 ? 65280 : 16755200;
    this.dragPreviewGraphics.stroke({ width: 2, color: h }), this.dragPreviewContainer.position.set(n, e);
  }
  hideDragPreview() {
    this.dragPreviewContainer && (this.dragPreviewContainer.destroy({ children: !0 }), this.dragPreviewContainer = null, this.dragPreviewGraphics = null), this.draggedClipInfo && (this.getVisualTracks()[this.draggedClipInfo.trackIndex]?.getClip(this.draggedClipInfo.clipIndex)?.setDragging(!1), this.draggedClipInfo = null);
  }
  hideDragGhost() {
    this.dragPreviewContainer && (this.dragPreviewContainer.visible = !1);
  }
  showDragGhost(t, e, i) {
    !this.dragPreviewContainer || !this.draggedClipInfo || (this.dragPreviewContainer.visible = !0, i !== void 0 ? this.drawDragPreviewAtPosition(e, i, t) : this.drawDragPreview(t, e));
  }
  getDraggedClipInfo() {
    return this.draggedClipInfo;
  }
  hasActivePreview() {
    return this.dragPreviewContainer !== null;
  }
  dispose() {
    this.hideDragPreview();
  }
}
class nn {
  constructor(t, e, i, s, n) {
    this.layout = t, this.trackLayer = e, this.overlayLayer = i, this.entityContainer = s, this.onRender = n;
  }
  scrollX = 0;
  scrollY = 0;
  zoomLevel = 1;
  viewport;
  rulerViewport;
  playheadContainer;
  async setupViewport() {
    this.rulerViewport = new d.Container(), this.rulerViewport.label = "ruler-viewport", this.overlayLayer.addChild(this.rulerViewport), this.playheadContainer = new d.Container(), this.playheadContainer.label = "playhead-container", this.overlayLayer.addChild(this.playheadContainer), this.viewport = new d.Container(), this.viewport.label = "viewport", this.trackLayer.addChild(this.viewport), this.viewport.addChild(this.entityContainer);
  }
  /** @internal */
  updateViewportTransform() {
    const t = this.layout.calculateViewportPosition(this.scrollX, this.scrollY);
    this.viewport.position.set(t.x, t.y), this.viewport.scale.set(this.zoomLevel, this.zoomLevel), this.rulerViewport.position.x = t.x, this.rulerViewport.scale.x = this.zoomLevel, this.playheadContainer.position.x = t.x, this.playheadContainer.scale.x = this.zoomLevel;
  }
  setScroll(t, e) {
    this.scrollX = t, this.scrollY = e, this.updateViewportTransform(), this.onRender();
  }
  setZoom(t) {
    this.zoomLevel = Math.max(0.1, Math.min(10, t)), this.updateViewportTransform(), this.onRender();
  }
  getViewport() {
    return {
      x: this.scrollX,
      y: this.scrollY,
      zoom: this.zoomLevel
    };
  }
  /** @internal */
  getMainViewport() {
    return this.viewport;
  }
  /** @internal */
  getRulerViewport() {
    return this.rulerViewport;
  }
  /** @internal */
  getPlayheadContainer() {
    return this.playheadContainer;
  }
}
const F = {
  MIN_WIDTH: 50,
  PADDING: 4,
  DEFAULT_ALPHA: 1,
  DRAG_OPACITY: 0.6,
  RESIZE_OPACITY: 0.9,
  BORDER_WIDTH: 2,
  CORNER_RADIUS: 4,
  SELECTED_BORDER_MULTIPLIER: 2,
  TEXT_FONT_SIZE: 12,
  TEXT_TRUNCATE_SUFFIX_LENGTH: 3
}, bt = {
  PADDING: 2,
  LABEL_PADDING: 8,
  DEFAULT_OPACITY: 0.8,
  BORDER_WIDTH: 1
}, G = {
  TOOLBAR_HEIGHT_RATIO: 0.12,
  // 12% of timeline height
  RULER_HEIGHT_RATIO: 0.133,
  // 13.3% of timeline height
  TOOLBAR_HEIGHT_DEFAULT: 36,
  RULER_HEIGHT_DEFAULT: 40,
  TRACK_HEIGHT_DEFAULT: 80,
  BORDER_WIDTH: 2,
  CORNER_RADIUS: 4,
  CLIP_PADDING: 4,
  LABEL_PADDING: 8,
  TRACK_PADDING: 2,
  MIN_CLIP_WIDTH: 50
};
function Bt(r) {
  const t = r.split("/");
  return t[t.length - 1] || r;
}
function rn(r) {
  switch (r.type) {
    case "video":
      return r.src ? Bt(r.src) : "Video";
    case "audio":
      return r.src ? Bt(r.src) : "Audio";
    case "image":
      return r.src ? Bt(r.src) : "Image";
    case "text":
      return r.text || "Text";
    case "shape":
      return r.shape || "Shape";
    case "html":
      return "HTML";
    case "luma":
      return r.src ? Bt(r.src) : "Luma";
    default:
      return "Unknown Asset";
  }
}
class an extends ot {
  clipConfig;
  options;
  graphics;
  background;
  text;
  selectionRenderer;
  lastGlobalX = -1;
  lastGlobalY = -1;
  /** @internal */
  visualState = { mode: "normal" };
  // Visual constants (some from theme)
  CLIP_PADDING = F.PADDING;
  BORDER_WIDTH = F.BORDER_WIDTH;
  get CORNER_RADIUS() {
    return this.options.theme.timeline.clips.radius || F.CORNER_RADIUS;
  }
  constructor(t, e) {
    super(), this.clipConfig = t, this.options = e, this.selectionRenderer = e.selectionRenderer, this.graphics = new d.Graphics(), this.background = new d.Graphics(), this.text = new d.Text(), this.setupContainer();
  }
  async load() {
    this.setupGraphics(), this.updateVisualState();
  }
  setupContainer() {
    const t = this.getContainer();
    t.label = `clip-${this.options.trackIndex}-${this.options.clipIndex}`, t.interactive = !0, t.cursor = "pointer", t.addChild(this.background), t.addChild(this.graphics), t.addChild(this.text);
  }
  setupGraphics() {
    this.text.style = new d.TextStyle({
      fontSize: F.TEXT_FONT_SIZE,
      fill: this.options.theme.timeline.toolbar.text,
      fontWeight: "bold",
      wordWrap: !1,
      fontFamily: "Arial, sans-serif"
    }), this.text.anchor.set(0, 0), this.text.x = this.CLIP_PADDING, this.text.y = this.CLIP_PADDING;
  }
  updateFromConfig(t) {
    this.clipConfig = t, this.updateVisualState();
  }
  /** @internal */
  updateVisualState() {
    this.updatePosition(), this.updateAppearance(), this.updateSize(), this.updateText();
  }
  setVisualState(t) {
    this.visualState = {
      ...this.visualState,
      ...t
    }, this.updateVisualState();
  }
  /** @internal */
  updatePosition() {
    const t = this.getContainer(), e = this.clipConfig.start || 0;
    t.x = e * this.options.pixelsPerSecond, t.y = 0;
  }
  /** @internal */
  updateSize() {
    const t = this.getEffectiveWidth(), e = this.options.trackHeight;
    this.drawClipBackground(t, e), this.drawClipBorder(t, e);
  }
  getEffectiveWidth() {
    if (this.visualState.previewWidth !== void 0)
      return this.visualState.previewWidth;
    const e = (this.clipConfig.length || 0) * this.options.pixelsPerSecond;
    return Math.max(F.MIN_WIDTH, e);
  }
  drawClipBackground(t, e) {
    const i = this.getClipColor(), s = this.getStateStyles();
    this.background.clear(), this.background.roundRect(0, 0, t, e, this.CORNER_RADIUS), this.background.fill({ color: i, alpha: s.alpha });
  }
  drawClipBorder(t, e) {
    const i = this.getStateStyles(), s = this.BORDER_WIDTH;
    this.graphics.clear(), this.graphics.roundRect(0, 0, t, e, this.CORNER_RADIUS), this.graphics.stroke({ width: s, color: i.borderColor }), this.updateSelectionState(t, e);
  }
  updateSelectionState(t, e) {
    if (!this.selectionRenderer) return;
    const i = this.visualState.mode === "selected", s = this.getClipId();
    if (!i) {
      this.selectionRenderer.clearSelection(s);
      return;
    }
    const a = this.getContainer().toGlobal(new d.Point(0, 0)), l = this.selectionRenderer.getOverlay().toLocal(a);
    this.selectionRenderer.renderSelection(
      s,
      {
        x: l.x,
        y: l.y,
        width: t,
        height: e,
        cornerRadius: this.CORNER_RADIUS,
        borderWidth: this.BORDER_WIDTH
      },
      i
    );
  }
  getClipColor() {
    const t = this.clipConfig.asset?.type, e = this.options.theme.timeline.clips;
    switch (t) {
      case "video":
        return e.video;
      case "audio":
        return e.audio;
      case "image":
        return e.image;
      case "text":
        return e.text;
      case "shape":
        return e.shape;
      case "html":
        return e.html;
      case "luma":
        return e.luma;
      default:
        return e.default;
    }
  }
  /** @internal */
  updateAppearance() {
    const t = this.getContainer();
    t.alpha = this.visualState.mode === "dragging" ? F.DRAG_OPACITY : F.DEFAULT_ALPHA;
  }
  /** @internal */
  updateText() {
    const t = this.clipConfig.asset ? rn(this.clipConfig.asset) : "Clip";
    this.text.text = t;
    const i = (this.clipConfig.length || 0) * this.options.pixelsPerSecond - this.CLIP_PADDING * 2;
    if (this.text.width > i) {
      const s = i / this.text.width, n = Math.floor(t.length * s) - F.TEXT_TRUNCATE_SUFFIX_LENGTH;
      this.text.text = `${t.substring(0, Math.max(1, n))}...`;
    }
  }
  getStateStyles() {
    const { theme: t } = this.options;
    switch (this.visualState.mode) {
      case "dragging":
        return { alpha: F.DRAG_OPACITY, borderColor: t.timeline.tracks.border };
      case "resizing":
        return { alpha: F.RESIZE_OPACITY, borderColor: t.timeline.dropZone };
      case "selected":
        return { alpha: F.DEFAULT_ALPHA, borderColor: t.timeline.clips.selected };
      default:
        return { alpha: F.DEFAULT_ALPHA, borderColor: t.timeline.tracks.border };
    }
  }
  // Public state management methods
  setSelected(t) {
    this.setVisualState({ mode: t ? "selected" : "normal" });
  }
  setDragging(t) {
    this.setVisualState({ mode: t ? "dragging" : "normal" });
  }
  setResizing(t) {
    this.setVisualState({
      mode: t ? "resizing" : "normal",
      ...t ? {} : { previewWidth: void 0 }
    });
  }
  setPreviewWidth(t) {
    this.setVisualState({ previewWidth: t || void 0 });
  }
  setPixelsPerSecond(t) {
    if (this.updateOptions({ pixelsPerSecond: t }), this.visualState.mode === "selected") {
      const e = this.getEffectiveWidth(), i = this.options.trackHeight;
      this.updateSelectionState(e, i);
    }
  }
  updateOptions(t) {
    this.options = {
      ...this.options,
      ...t
    }, this.updateVisualState();
  }
  // Getters
  getClipConfig() {
    return this.clipConfig;
  }
  getOptions() {
    return { ...this.options };
  }
  getVisualState() {
    return { ...this.visualState };
  }
  getSelected() {
    return this.visualState.mode === "selected";
  }
  getClipId() {
    return `${this.options.trackIndex}-${this.options.clipIndex}`;
  }
  getDragging() {
    return this.visualState.mode === "dragging";
  }
  getRightEdgeX() {
    const t = this.getEffectiveWidth();
    return (this.clipConfig.start || 0) * this.options.pixelsPerSecond + t;
  }
  // Required Entity methods
  /** @internal */
  update(t, e) {
    if (this.visualState.mode === "selected" && this.selectionRenderer) {
      const s = this.getContainer().toGlobal(new d.Point(0, 0));
      if (s.x !== this.lastGlobalX || s.y !== this.lastGlobalY) {
        this.lastGlobalX = s.x, this.lastGlobalY = s.y;
        const n = this.getEffectiveWidth(), a = this.options.trackHeight;
        this.updateSelectionState(n, a);
      }
    }
  }
  /** @internal */
  draw() {
  }
  /** @internal */
  dispose() {
    this.selectionRenderer && this.selectionRenderer.clearSelection(this.getClipId()), this.background.destroy(), this.graphics.destroy(), this.text.destroy();
  }
}
class on extends ot {
  clips = [];
  options;
  background;
  // Visual constants
  TRACK_PADDING = bt.PADDING;
  LABEL_PADDING = bt.LABEL_PADDING;
  constructor(t) {
    super(), this.options = t, this.background = new d.Graphics(), this.setupContainer();
  }
  async load() {
    this.updateTrackAppearance();
  }
  setupContainer() {
    const t = this.getContainer();
    t.label = `track-${this.options.trackIndex}`, t.addChild(this.background), t.y = this.options.trackIndex * this.options.trackHeight;
  }
  /** @internal */
  updateTrackAppearance() {
    const { width: t } = this.options, e = this.options.trackHeight, { theme: i } = this.options;
    this.background.clear();
    const s = this.options.trackIndex % 2 === 0 ? i.timeline.tracks.surface : i.timeline.tracks.surfaceAlt;
    this.background.rect(0, 0, t, e), this.background.fill({ color: s, alpha: bt.DEFAULT_OPACITY }), this.background.rect(0, 0, t, e), this.background.stroke({ width: bt.BORDER_WIDTH, color: i.timeline.tracks.border }), this.background.moveTo(0, e - 1), this.background.lineTo(t, e - 1), this.background.stroke({ width: bt.BORDER_WIDTH, color: i.timeline.divider });
  }
  rebuildFromTrackData(t, e) {
    this.options = {
      ...this.options,
      pixelsPerSecond: e
    }, this.clearAllClips(), t.clips && t.clips.forEach((i, s) => {
      const n = {
        pixelsPerSecond: this.options.pixelsPerSecond,
        trackHeight: this.options.trackHeight,
        trackIndex: this.options.trackIndex,
        clipIndex: s,
        theme: this.options.theme,
        selectionRenderer: this.options.selectionRenderer
      }, a = new an(i, n);
      this.addClip(a);
    }), this.updateTrackAppearance();
  }
  async addClip(t) {
    this.clips.push(t), await t.load(), this.getContainer().addChild(t.getContainer());
  }
  clearAllClips() {
    const t = this.getContainer();
    for (const e of this.clips)
      t.removeChild(e.getContainer()), e.dispose();
    this.clips = [];
  }
  removeClip(t) {
    if (t >= 0 && t < this.clips.length) {
      const e = this.clips[t];
      this.getContainer().removeChild(e.getContainer()), e.dispose(), this.clips.splice(t, 1);
    }
  }
  updateClip(t, e) {
    t >= 0 && t < this.clips.length && this.clips[t].updateFromConfig(e);
  }
  setPixelsPerSecond(t) {
    this.options = {
      ...this.options,
      pixelsPerSecond: t
    }, this.clips.forEach((e) => {
      e.setPixelsPerSecond(t);
    });
  }
  setWidth(t) {
    this.options = {
      ...this.options,
      width: t
    }, this.updateTrackAppearance();
  }
  setTrackIndex(t) {
    this.options = {
      ...this.options,
      trackIndex: t
    };
    const e = this.getContainer();
    e.y = t * this.options.trackHeight, this.clips.forEach((i, s) => {
      i.updateOptions({ trackIndex: t });
    });
  }
  // Selection methods
  selectClip(t) {
    this.clearAllSelections(), t >= 0 && t < this.clips.length && this.clips[t].setSelected(!0);
  }
  clearAllSelections() {
    this.clips.forEach((t) => {
      t.setSelected(!1);
    });
  }
  getSelectedClip() {
    return this.clips.find((t) => t.getSelected()) || null;
  }
  getSelectedClipIndex() {
    return this.clips.findIndex((t) => t.getSelected());
  }
  // Getters
  getClips() {
    return [...this.clips];
  }
  getClip(t) {
    return this.clips[t] || null;
  }
  getClipCount() {
    return this.clips.length;
  }
  getTrackIndex() {
    return this.options.trackIndex;
  }
  getTrackHeight() {
    return this.options.trackHeight;
  }
  getOptions() {
    return { ...this.options };
  }
  // Hit testing
  findClipAtPosition(t, e) {
    if (e < 0 || e > this.options.trackHeight)
      return null;
    const i = t / this.options.pixelsPerSecond;
    for (let s = 0; s < this.clips.length; s += 1) {
      const n = this.clips[s], a = n.getClipConfig(), o = a.start || 0, l = o + (a.length || 0);
      if (i >= o && i <= l)
        return { clip: n, clipIndex: s };
    }
    return null;
  }
  // Required Entity methods
  /** @internal */
  update(t, e) {
    this.clips.forEach((i) => {
      i.update(t, e);
    });
  }
  /** @internal */
  draw() {
    this.clips.forEach((t) => {
      t.draw();
    });
  }
  /** @internal */
  dispose() {
    this.clearAllClips(), this.background.destroy();
  }
}
class ln {
  constructor(t, e) {
    this.overlay = t, this.theme = e;
  }
  selectionGraphics = /* @__PURE__ */ new Map();
  renderSelection(t, e, i) {
    if (!i) {
      this.clearSelection(t);
      return;
    }
    let s = this.selectionGraphics.get(t);
    s || (s = new d.Graphics(), s.label = `selection-border-${t}`, this.selectionGraphics.set(t, s), this.overlay.addChild(s)), s.position.set(e.x, e.y), s.clear(), s.setStrokeStyle({
      width: e.borderWidth * F.SELECTED_BORDER_MULTIPLIER,
      color: this.theme.timeline.clips.selected
    }), s.roundRect(0, 0, e.width, e.height, e.cornerRadius), s.stroke();
  }
  clearSelection(t) {
    const e = this.selectionGraphics.get(t);
    e && (this.overlay.removeChild(e), e.destroy(), this.selectionGraphics.delete(t));
  }
  clearAllSelections() {
    this.selectionGraphics.forEach((t, e) => {
      this.clearSelection(e);
    });
  }
  updateTheme(t) {
    this.theme = t, this.selectionGraphics.forEach((e) => {
      e.clear();
    });
  }
  getOverlay() {
    return this.overlay;
  }
  dispose() {
    this.clearAllSelections();
  }
}
class cn {
  constructor(t, e, i, s, n) {
    this.container = t, this.layout = e, this.theme = i, this.getPixelsPerSecond = s, this.getExtendedTimelineWidth = n, this.selectionOverlay = new d.Container(), this.selectionOverlay.label = "selectionOverlay", this.container.addChild(this.selectionOverlay), this.selectionRenderer = new ln(this.selectionOverlay, this.theme);
  }
  visualTracks = [];
  selectionOverlay;
  selectionRenderer;
  async rebuildFromEdit(t, e) {
    if (t?.timeline?.tracks) {
      this.clearAllVisualState();
      for (let i = 0; i < t.timeline.tracks.length; i += 1) {
        const s = t.timeline.tracks[i], n = {
          pixelsPerSecond: e,
          trackHeight: this.layout.trackHeight,
          trackIndex: i,
          width: this.getExtendedTimelineWidth(),
          theme: this.theme,
          selectionRenderer: this.selectionRenderer
        }, a = new on(n);
        await a.load(), a.rebuildFromTrackData(s, e), this.container.addChild(a.getContainer()), this.visualTracks.push(a);
      }
      this.container.setChildIndex(this.selectionOverlay, this.container.children.length - 1);
    }
  }
  clearAllVisualState() {
    this.visualTracks.forEach((t) => {
      this.container.removeChild(t.getContainer()), t.dispose();
    }), this.visualTracks = [], this.selectionRenderer.clearAllSelections();
  }
  updateVisualSelection(t, e) {
    this.clearVisualSelection();
    const i = this.visualTracks[t];
    if (i) {
      const s = i.getClip(e);
      s && s.setSelected(!0);
    }
  }
  clearVisualSelection() {
    this.visualTracks.forEach((t) => {
      t.getClips().forEach((i) => {
        i.setSelected(!1);
      });
    });
  }
  findClipAtPosition(t, e) {
    const i = Math.floor(e / this.layout.trackHeight);
    if (i < 0 || i >= this.visualTracks.length)
      return null;
    const s = this.visualTracks[i], n = e - i * this.layout.trackHeight, a = s.findClipAtPosition(t, n);
    return a ? {
      trackIndex: i,
      clipIndex: a.clipIndex,
      clipConfig: a.clip.getClipConfig(),
      x: (a.clip.getClipConfig().start || 0) * this.getPixelsPerSecond(),
      y: i * this.layout.trackHeight,
      width: (a.clip.getClipConfig().length || 0) * this.getPixelsPerSecond(),
      height: this.layout.trackHeight
    } : null;
  }
  updateTrackWidths(t) {
    this.visualTracks.forEach((e) => {
      e.setWidth(t);
    });
  }
  getVisualTracks() {
    return this.visualTracks;
  }
  updatePixelsPerSecond(t) {
    this.visualTracks.forEach((e) => {
      e.setPixelsPerSecond(t);
    });
  }
  getSelectionOverlay() {
    return this.selectionOverlay;
  }
  getSelectionRenderer() {
    return this.selectionRenderer;
  }
  dispose() {
    this.clearAllVisualState(), this.selectionRenderer && this.selectionRenderer.dispose(), this.selectionOverlay && this.container && (this.container.removeChild(this.selectionOverlay), this.selectionOverlay.destroy());
  }
}
class hn {
  constructor(t, e) {
    this.edit = t, this.callbacks = e;
  }
  setupEventListeners() {
    this.edit.events.on("timeline:updated", this.handleTimelineUpdated.bind(this)), this.edit.events.on("clip:updated", this.handleClipUpdated.bind(this)), this.edit.events.on("clip:selected", this.handleClipSelected.bind(this)), this.edit.events.on("selection:cleared", this.handleSelectionCleared.bind(this)), this.edit.events.on("drag:started", this.handleDragStarted.bind(this)), this.edit.events.on("drag:ended", this.handleDragEnded.bind(this)), this.edit.events.on("track:created", this.handleTrackCreated.bind(this));
  }
  async handleTimelineUpdated(t) {
    await this.callbacks.onEditChange(t.current);
  }
  async handleClipUpdated() {
    await this.callbacks.onEditChange();
  }
  handleClipSelected(t) {
    this.callbacks.onClipSelected(t.trackIndex, t.clipIndex);
  }
  handleSelectionCleared() {
    this.callbacks.onSelectionCleared();
  }
  handleDragStarted(t) {
    this.callbacks.onDragStarted(t.trackIndex, t.clipIndex);
  }
  handleDragEnded() {
    this.callbacks.onDragEnded();
  }
  async handleTrackCreated() {
    await this.callbacks.onEditChange();
  }
  handleSeek(t) {
    this.callbacks.onSeek(t.time * 1e3);
  }
  dispose() {
    this.edit.events.off("timeline:updated", this.handleTimelineUpdated.bind(this)), this.edit.events.off("clip:updated", this.handleClipUpdated.bind(this)), this.edit.events.off("clip:selected", this.handleClipSelected.bind(this)), this.edit.events.off("selection:cleared", this.handleSelectionCleared.bind(this)), this.edit.events.off("drag:started", this.handleDragStarted.bind(this)), this.edit.events.off("drag:ended", this.handleDragEnded.bind(this)), this.edit.events.off("track:created", this.handleTrackCreated.bind(this));
  }
}
class dn {
  constructor(t, e) {
    this.options = t, this.onUpdate = e;
  }
  app;
  trackLayer;
  overlayLayer;
  animationFrameId = null;
  async initializePixiApp() {
    this.app = new d.Application(), await this.app.init({
      width: this.options.width,
      height: this.options.height,
      backgroundColor: this.options.backgroundColor,
      antialias: this.options.antialias,
      resolution: this.options.resolution,
      autoDensity: !0,
      preference: "webgl"
    });
    const t = document.querySelector("[data-shotstack-timeline]");
    if (!t)
      throw new Error("Timeline container element [data-shotstack-timeline] not found");
    t.appendChild(this.app.canvas);
  }
  async setupRenderLayers() {
    this.trackLayer = new d.Container(), this.overlayLayer = new d.Container(), this.trackLayer.label = "track-layer", this.overlayLayer.label = "overlay-layer", this.app.stage.addChild(this.trackLayer), this.app.stage.addChild(this.overlayLayer);
  }
  /** @internal */
  startAnimationLoop() {
    let t = performance.now();
    const e = (i) => {
      const s = i - t;
      t = i;
      const n = s / 16.667;
      this.onUpdate(n, s), this.draw(), this.animationFrameId = requestAnimationFrame(e);
    };
    this.animationFrameId = requestAnimationFrame(e);
  }
  /** @internal */
  draw() {
    this.app.render();
  }
  render() {
    this.app.render();
  }
  updateBackgroundColor(t) {
    this.app && (this.app.renderer.background.color = t);
  }
  getApp() {
    return this.app;
  }
  getStage() {
    return this.app.stage;
  }
  /** @internal */
  getTrackLayer() {
    return this.trackLayer;
  }
  /** @internal */
  getOverlayLayer() {
    return this.overlayLayer;
  }
  dispose() {
    this.animationFrameId !== null && (cancelAnimationFrame(this.animationFrameId), this.animationFrameId = null), this.app && this.app.destroy(!0);
  }
}
const vt = {
  RULER: {
    DEFAULT_HEIGHT: 40,
    LABEL_FONT_SIZE: 10,
    LABEL_PADDING_X: 2
  },
  PLAYHEAD: {
    LINE_WIDTH: 2
  },
  SCROLL: {
    HORIZONTAL_SPEED: 2,
    VERTICAL_SPEED: 0.5
  }
};
class We extends ot {
  events;
  rulerContainer;
  rulerBackground;
  timeMarkers;
  timeLabels;
  pixelsPerSecond;
  timelineDuration;
  rulerHeight;
  theme;
  constructor(t) {
    super(), this.events = new Mt(), this.pixelsPerSecond = t.pixelsPerSecond, this.timelineDuration = t.timelineDuration, this.rulerHeight = t.rulerHeight ?? vt.RULER.DEFAULT_HEIGHT, this.theme = t.theme, this.rulerContainer = new d.Container(), this.rulerBackground = new d.Graphics(), this.timeMarkers = new d.Graphics(), this.timeLabels = new d.Container();
  }
  async load() {
    this.setupRuler(), this.draw();
  }
  setupRuler() {
    this.rulerContainer.label = "ruler", this.rulerContainer.addChild(this.rulerBackground), this.rulerContainer.addChild(this.timeMarkers), this.rulerContainer.addChild(this.timeLabels), this.rulerContainer.eventMode = "static", this.rulerContainer.cursor = "pointer", this.rulerContainer.on("pointerdown", this.onRulerPointerDown.bind(this)), this.getContainer().addChild(this.rulerContainer);
  }
  drawRulerBackground() {
    this.rulerBackground.clear();
    const t = this.calculateRulerWidth(), e = this.theme?.timeline.ruler.background || 4210752, i = this.theme?.timeline.tracks.border || 6316128;
    this.rulerBackground.rect(0, 0, t, this.rulerHeight), this.rulerBackground.fill(e), this.rulerBackground.rect(0, this.rulerHeight - 1, t, 1), this.rulerBackground.fill(i);
  }
  drawTimeMarkers() {
    this.timeMarkers.clear();
    const t = this.getTimeInterval(), e = this.getVisibleDuration(), i = this.theme?.timeline.ruler.markers || 6710886, s = this.rulerHeight * 0.5;
    let n = 4;
    t === 10 ? n = 9 : (t === 30 || t === 60) && (n = 5);
    const a = t / (n + 1);
    for (let o = 0; o <= e; o += t)
      for (let l = 1; l <= n; l += 1) {
        const c = o + l * a;
        if (c <= e) {
          const h = c * this.pixelsPerSecond;
          this.timeMarkers.circle(h, s, 1.5), this.timeMarkers.fill(i);
        }
      }
  }
  drawTimeLabels() {
    this.timeLabels.removeChildren();
    const t = this.getTimeInterval(), e = this.getVisibleDuration(), i = this.theme?.timeline.ruler.text || 16777215, s = {
      fontSize: vt.RULER.LABEL_FONT_SIZE,
      fill: i,
      fontFamily: "Arial"
    };
    for (let n = 0; n <= e; n += t) {
      const a = new d.Text({
        text: this.formatTime(n),
        style: s
      }), o = n * this.pixelsPerSecond;
      n === 0 ? (a.anchor.set(0, 0.5), a.x = o + vt.RULER.LABEL_PADDING_X) : (a.anchor.set(0.5, 0.5), a.x = o), a.y = this.rulerHeight * 0.5, this.timeLabels.addChild(a);
    }
  }
  onRulerPointerDown(t) {
    const e = this.rulerContainer.toLocal(t.global), i = Math.max(0, e.x / this.pixelsPerSecond);
    this.events.emit("ruler:seeked", { time: i });
  }
  updateRuler(t, e) {
    this.pixelsPerSecond = t, this.timelineDuration = e, this.draw();
  }
  update(t, e) {
  }
  draw() {
    this.drawRulerBackground(), this.drawTimeMarkers(), this.drawTimeLabels();
  }
  dispose() {
    this.timeLabels.removeChildren(), this.rulerContainer.removeChildren(), this.events.clear("*");
  }
  getViewportWidth() {
    return this.getContainer().parent?.width || 800;
  }
  calculateRulerWidth() {
    const t = this.timelineDuration * this.pixelsPerSecond;
    return Math.max(t, this.getViewportWidth());
  }
  getVisibleDuration() {
    return Math.max(this.timelineDuration, this.getViewportWidth() / this.pixelsPerSecond);
  }
  getTimeInterval() {
    const t = [1, 5, 10, 30, 60, 120, 300, 600], e = 80;
    for (const i of t)
      if (i * this.pixelsPerSecond >= e)
        return i;
    return Math.ceil(this.getVisibleDuration() / 10);
  }
  formatTime(t) {
    if (t === 0) return "0s";
    const e = Math.floor(t / 60), i = t % 60;
    if (t < 60)
      return `${t}s`;
    if (i === 0)
      return `${e}m`;
    const s = i.toString().padStart(2, "0");
    return `${e}:${s}`;
  }
}
class Ke extends ot {
  constructor(t) {
    super(), this.options = t, this.graphics = new d.Graphics();
  }
  events = new Mt();
  graphics;
  currentTime = 0;
  isDragging = !1;
  async load() {
    this.setupPlayhead(), this.draw();
  }
  setupPlayhead() {
    this.graphics.label = "playhead", this.graphics.eventMode = "static", this.graphics.cursor = "pointer", this.graphics.on("pointerdown", this.onPointerDown.bind(this)).on("pointermove", this.onPointerMove.bind(this)).on("pointerup", this.onPointerUp.bind(this)).on("pointerupoutside", this.onPointerUp.bind(this)), this.getContainer().addChild(this.graphics);
  }
  /** @internal */
  drawPlayhead() {
    const t = this.currentTime * this.options.pixelsPerSecond, e = this.options.theme?.timeline.playhead ?? 16729156, i = vt.PLAYHEAD.LINE_WIDTH, s = t + i / 2;
    this.graphics.clear(), this.graphics.fill(e), this.graphics.rect(t, 0, i, this.options.timelineHeight);
    const n = 8;
    this.graphics.moveTo(s, 10), this.graphics.lineTo(s - n, 0), this.graphics.lineTo(s + n, 0), this.graphics.closePath(), this.graphics.fill();
  }
  /** @internal */
  onPointerDown(t) {
    this.isDragging = !0, this.graphics.cursor = "grabbing", this.updateTimeFromPointer(t);
  }
  /** @internal */
  onPointerMove(t) {
    this.isDragging && this.updateTimeFromPointer(t);
  }
  /** @internal */
  onPointerUp() {
    this.isDragging = !1, this.graphics.cursor = "pointer";
  }
  /** @internal */
  updateTimeFromPointer(t) {
    const e = this.graphics.parent.toLocal(t.global), i = Math.max(0, e.x / this.options.pixelsPerSecond);
    this.setTime(i), this.events.emit("playhead:seeked", { time: i });
  }
  setTime(t) {
    this.currentTime = t, this.draw(), this.events.emit("playhead:timeChanged", { time: t });
  }
  getTime() {
    return this.currentTime;
  }
  /** @internal */
  updatePlayhead(t, e) {
    this.options.pixelsPerSecond = t, this.options.timelineHeight = e, this.draw();
  }
  update() {
  }
  // Event-driven, no frame updates needed
  /** @internal */
  draw() {
    this.drawPlayhead();
  }
  dispose() {
    this.graphics.removeAllListeners(), this.events.clear("*");
  }
}
class un {
  events;
  timeline;
  abortController;
  // Scroll state
  scrollX = 0;
  scrollY = 0;
  constructor(t) {
    this.events = new Mt(), this.timeline = t.timeline;
  }
  async initialize() {
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.abortController = new AbortController();
    const { canvas: t } = this.timeline.getPixiApp();
    t.addEventListener("wheel", this.handleWheel.bind(this), {
      passive: !1,
      signal: this.abortController.signal
    });
  }
  handleWheel(t) {
    if (t.preventDefault(), t.ctrlKey || t.metaKey) {
      this.handleZoom(t);
      return;
    }
    this.handleScroll(t);
  }
  handleZoom(t) {
    const e = t.deltaY > 0 ? "out" : "in", i = this.timeline.getPlayheadTime(), s = this.timeline.getActualEditDuration();
    e === "in" ? this.timeline.zoomIn() : this.timeline.zoomOut();
    const n = this.timeline.getOptions().pixelsPerSecond || 50, a = i * n, o = this.timeline.getOptions().width || 800, c = this.timeline.timeRange.endTime * n, h = s * n, p = this.calculateZoomScrollPosition({
      playheadXAfterZoom: a,
      viewportWidth: o,
      contentWidth: c,
      maxPlayheadX: h,
      actualEditDuration: s,
      playheadTime: i
    });
    this.scrollX = p, this.timeline.setScroll(this.scrollX, this.scrollY);
    const f = a - p;
    this.events.emit("zoom", {
      pixelsPerSecond: n,
      focusX: f,
      focusTime: i
    });
  }
  handleScroll(t) {
    let { deltaX: e } = t, { deltaY: i } = t;
    t.shiftKey && (e = i, i = 0);
    const s = vt.SCROLL.HORIZONTAL_SPEED, n = vt.SCROLL.VERTICAL_SPEED;
    this.scrollX += e * s, this.scrollY += i * n, this.scrollX = this.clampScrollX(this.scrollX), this.scrollY = this.clampScrollY(this.scrollY), this.timeline.setScroll(this.scrollX, this.scrollY), this.events.emit("scroll", { x: this.scrollX, y: this.scrollY });
  }
  setScroll(t, e) {
    this.scrollX = this.clampScrollX(t), this.scrollY = this.clampScrollY(e), this.timeline.setScroll(this.scrollX, this.scrollY), this.events.emit("scroll", { x: this.scrollX, y: this.scrollY });
  }
  clampScrollX(t) {
    const e = this.timeline.getExtendedTimelineWidth(), i = this.timeline.getOptions().width || 0, s = Math.max(0, e - i);
    return Math.max(0, Math.min(t, s));
  }
  clampScrollY(t) {
    const e = this.timeline.getLayout(), i = this.timeline.getVisualTracks().length, s = this.timeline.getOptions().height || 0, n = Math.max(0, i * e.trackHeight - (s - e.rulerHeight));
    return Math.max(0, Math.min(t, n));
  }
  getScroll() {
    return { x: this.scrollX, y: this.scrollY };
  }
  calculateZoomScrollPosition(t) {
    const { playheadXAfterZoom: e, viewportWidth: i, contentWidth: s, maxPlayheadX: n, actualEditDuration: a, playheadTime: o } = t, l = e - i / 2, c = Math.max(0, s - i);
    let h;
    const p = l + i, f = Math.max(0, n - i);
    s <= i || l < 0 ? h = 0 : p > n && o <= a ? h = Math.min(f, c) : l > c ? h = c : h = l;
    const y = e - h;
    return (y < 0 || y > i) && (e > s - i ? h = Math.max(0, e - i + 50) : h = Math.max(0, e - 50), h = Math.max(0, Math.min(h, c))), h;
  }
  dispose() {
    this.abortController && (this.abortController.abort(), this.abortController = void 0), this.events.clear("*");
  }
}
const E = {
  // Layout
  BUTTON_SIZE: 24,
  BUTTON_HOVER_PADDING: 4,
  BORDER_RADIUS: 4,
  TEXT_SPACING: 16,
  EDGE_MARGIN: 10,
  // Playback
  FRAME_TIME_MS: 16.67,
  // milliseconds per frame
  // Icon dimensions
  ICON: {
    // Play icon (triangle)
    PLAY: {
      LEFT: 6,
      TOP: 4,
      RIGHT: 18,
      MIDDLE: 12,
      BOTTOM: 20
    },
    // Pause icon (two rectangles)
    PAUSE: {
      RECT1_X: 6,
      RECT2_X: 14,
      TOP: 4,
      WIDTH: 4,
      HEIGHT: 16
    },
    // Frame back/forward (double triangles)
    FRAME_STEP: {
      TRIANGLE1: {
        BACK: { LEFT: 11, RIGHT: 3, MIDDLE: 12 },
        FORWARD: { LEFT: 4, RIGHT: 12, MIDDLE: 12 }
      },
      TRIANGLE2: {
        BACK: { LEFT: 20, RIGHT: 12, MIDDLE: 12 },
        FORWARD: { LEFT: 13, RIGHT: 21, MIDDLE: 12 }
      },
      TOP: 4,
      BOTTOM: 20
    }
  },
  // Cut button
  CUT_BUTTON: {
    WIDTH: 60,
    HEIGHT: 24,
    FONT_SIZE: 12
  },
  // Time display
  TIME_DISPLAY: {
    FONT_SIZE: 14,
    FONT_FAMILY: "monospace"
  },
  // Animation
  HOVER_ANIMATION_ALPHA: 1,
  ACTIVE_ANIMATION_ALPHA: 0.3,
  DIVIDER_ALPHA: 0.5
};
class zt {
  static createIcon(t, e, i) {
    const s = i ? i / E.BUTTON_SIZE : 1;
    switch (t) {
      case "play":
        return this.createPlayIcon(e, s);
      case "pause":
        return this.createPauseIcon(e, s);
      case "frame-back":
        return this.createFrameBackIcon(e, s);
      case "frame-forward":
        return this.createFrameForwardIcon(e, s);
      default:
        throw new Error(`Unknown icon type: ${t}`);
    }
  }
  static createPlayIcon(t, e = 1) {
    const i = new d.Graphics(), { PLAY: s } = E.ICON;
    return i.fill({ color: t.timeline.toolbar.icon }), i.moveTo(s.LEFT * e, s.TOP * e), i.lineTo(s.RIGHT * e, s.MIDDLE * e), i.lineTo(s.LEFT * e, s.BOTTOM * e), i.closePath(), i.fill(), i;
  }
  static createPauseIcon(t, e = 1) {
    const i = new d.Graphics(), { PAUSE: s } = E.ICON;
    return i.fill({ color: t.timeline.toolbar.icon }), i.rect(s.RECT1_X * e, s.TOP * e, s.WIDTH * e, s.HEIGHT * e), i.rect(s.RECT2_X * e, s.TOP * e, s.WIDTH * e, s.HEIGHT * e), i.fill(), i;
  }
  static createFrameBackIcon(t, e = 1) {
    const i = new d.Graphics(), { FRAME_STEP: s } = E.ICON;
    return i.fill({ color: t.timeline.toolbar.icon }), i.moveTo(s.TRIANGLE1.BACK.LEFT * e, s.TOP * e), i.lineTo(s.TRIANGLE1.BACK.RIGHT * e, s.TRIANGLE1.BACK.MIDDLE * e), i.lineTo(s.TRIANGLE1.BACK.LEFT * e, s.BOTTOM * e), i.closePath(), i.moveTo(s.TRIANGLE2.BACK.LEFT * e, s.TOP * e), i.lineTo(s.TRIANGLE2.BACK.RIGHT * e, s.TRIANGLE2.BACK.MIDDLE * e), i.lineTo(s.TRIANGLE2.BACK.LEFT * e, s.BOTTOM * e), i.closePath(), i.fill(), i;
  }
  static createFrameForwardIcon(t, e = 1) {
    const i = new d.Graphics(), { FRAME_STEP: s } = E.ICON;
    return i.fill({ color: t.timeline.toolbar.icon }), i.moveTo(s.TRIANGLE1.FORWARD.LEFT * e, s.TOP * e), i.lineTo(s.TRIANGLE1.FORWARD.RIGHT * e, s.TRIANGLE1.FORWARD.MIDDLE * e), i.lineTo(s.TRIANGLE1.FORWARD.LEFT * e, s.BOTTOM * e), i.closePath(), i.moveTo(s.TRIANGLE2.FORWARD.LEFT * e, s.TOP * e), i.lineTo(s.TRIANGLE2.FORWARD.RIGHT * e, s.TRIANGLE2.FORWARD.MIDDLE * e), i.lineTo(s.TRIANGLE2.FORWARD.LEFT * e, s.BOTTOM * e), i.closePath(), i.fill(), i;
  }
  static updateIconColor(t, e) {
    const i = t.getBounds();
    t.clear(), t.position.set(i.x, i.y);
  }
}
class $e extends d.Container {
  background;
  hoverBackground;
  icon;
  alternateIcon;
  state = {
    isHovering: !1,
    isPressed: !1,
    isActive: !1
  };
  size;
  theme;
  onClick;
  constructor(t) {
    super(), this.size = t.size || E.BUTTON_SIZE, this.theme = t.theme, this.onClick = t.onClick, this.eventMode = "static", this.cursor = "pointer", this.background = new d.Graphics(), this.addChild(this.background), this.hoverBackground = new d.Graphics(), this.addChild(this.hoverBackground);
    const i = this.size * 0.6, s = (this.size - i) / 2;
    t.iconType && (this.icon = zt.createIcon(t.iconType, this.theme, i), this.icon.position.set(s, s), this.addChild(this.icon)), t.alternateIconType && (this.alternateIcon = zt.createIcon(t.alternateIconType, this.theme, i), this.alternateIcon.position.set(s, s), this.alternateIcon.visible = !1, this.addChild(this.alternateIcon)), this.setupEventListeners(), this.updateVisuals();
  }
  setupEventListeners() {
    this.on("pointerdown", this.handlePointerDown, this), this.on("pointerup", this.handlePointerUp, this), this.on("pointerupoutside", this.handlePointerUp, this), this.on("pointerover", this.handlePointerOver, this), this.on("pointerout", this.handlePointerOut, this);
  }
  handlePointerDown() {
    this.state.isPressed = !0, this.updateVisuals();
  }
  handlePointerUp() {
    this.state.isPressed && this.onClick(), this.state.isPressed = !1, this.updateVisuals();
  }
  handlePointerOver() {
    this.state.isHovering = !0, this.updateVisuals();
  }
  handlePointerOut() {
    this.state.isHovering = !1, this.state.isPressed = !1, this.updateVisuals();
  }
  updateVisuals() {
    const t = E.BUTTON_HOVER_PADDING, e = this.size / 2;
    this.background.clear(), this.background.circle(e, e, e), this.background.fill({
      color: this.theme.timeline.toolbar.surface,
      alpha: 0.8
    }), this.hoverBackground.clear(), this.hoverBackground.circle(e, e, e + t), this.state.isPressed ? this.hoverBackground.fill({
      color: this.theme.timeline.toolbar.active,
      alpha: E.ACTIVE_ANIMATION_ALPHA
    }) : this.state.isHovering ? this.hoverBackground.fill({
      color: this.theme.timeline.toolbar.hover,
      alpha: E.HOVER_ANIMATION_ALPHA
    }) : this.hoverBackground.fill({
      color: this.theme.timeline.toolbar.hover,
      alpha: 0
    });
  }
  setActive(t) {
    this.state.isActive = t, this.icon && this.alternateIcon && (this.icon.visible = !t, this.alternateIcon.visible = t);
  }
  updateTheme(t) {
    this.theme = t;
    const i = this.size * 0.6, s = (this.size - i) / 2;
    if (this.icon) {
      const n = this.getIconType(this.icon);
      n && (this.removeChild(this.icon), this.icon = zt.createIcon(n, t, i), this.icon.position.set(s, s), this.addChild(this.icon));
    }
    if (this.alternateIcon) {
      const n = this.getIconType(this.alternateIcon);
      n && (this.removeChild(this.alternateIcon), this.alternateIcon = zt.createIcon(n, t, i), this.alternateIcon.position.set(s, s), this.alternateIcon.visible = this.state.isActive, this.addChild(this.alternateIcon));
    }
    this.updateVisuals();
  }
  getIconType(t) {
    return null;
  }
  destroy() {
    this.removeAllListeners(), super.destroy();
  }
}
class pn extends d.Container {
  edit;
  theme;
  toolbarHeight;
  frameBackButton;
  playPauseButton;
  frameForwardButton;
  constructor(t, e, i) {
    super(), this.edit = t, this.theme = e, this.toolbarHeight = i || 36, this.createButtons(), this.subscribeToEditEvents(), this.updatePlayPauseState();
  }
  createButtons() {
    const t = this.calculateButtonSizes(), e = (t.playButton - t.regularButton) / 2, i = (s, n, a, o) => new $e({ iconType: s, onClick: n, tooltip: a, theme: this.theme, size: o });
    this.frameBackButton = i("frame-back", () => this.handleFrameBack(), "Previous frame", t.regularButton), this.frameBackButton.position.set(0, e), this.playPauseButton = new $e({
      iconType: "play",
      alternateIconType: "pause",
      onClick: () => this.handlePlayPause(),
      tooltip: "Play/Pause",
      theme: this.theme,
      size: t.playButton
    }), this.playPauseButton.position.set(t.regularButton + t.spacing, 0), this.frameForwardButton = i("frame-forward", () => this.handleFrameForward(), "Next frame", t.regularButton), this.frameForwardButton.position.set(t.regularButton + t.spacing + t.playButton + t.spacing, e), this.addChild(this.frameBackButton, this.playPauseButton, this.frameForwardButton);
  }
  calculateButtonSizes() {
    const t = Math.round(this.toolbarHeight * 0.5);
    return {
      regularButton: t,
      playButton: Math.round(t * 1.5),
      spacing: Math.round(this.toolbarHeight * 0.15)
    };
  }
  handleFrameBack() {
    this.edit.seek(this.edit.playbackTime - E.FRAME_TIME_MS);
  }
  handlePlayPause() {
    this.edit.isPlaying ? this.edit.pause() : this.edit.play();
  }
  handleFrameForward() {
    this.edit.seek(this.edit.playbackTime + E.FRAME_TIME_MS);
  }
  subscribeToEditEvents() {
    this.edit.events.on("playback:play", this.updatePlayPauseState), this.edit.events.on("playback:pause", this.updatePlayPauseState);
  }
  updatePlayPauseState = () => {
    this.playPauseButton.setActive(this.edit.isPlaying);
  };
  update() {
  }
  resize(t) {
  }
  updateTheme(t) {
    this.theme = t, this.frameBackButton.updateTheme(t), this.playPauseButton.updateTheme(t), this.frameForwardButton.updateTheme(t);
  }
  destroy() {
    this.edit.events.off("playback:play", this.updatePlayPauseState), this.edit.events.off("playback:pause", this.updatePlayPauseState), this.frameBackButton.destroy(), this.playPauseButton.destroy(), this.frameForwardButton.destroy(), super.destroy();
  }
  getWidth() {
    const t = this.calculateButtonSizes();
    return t.regularButton * 2 + t.playButton + t.spacing * 2;
  }
}
class fn extends d.Container {
  edit;
  theme;
  timeText;
  formatOptions;
  constructor(t, e, i = {}) {
    super(), this.edit = t, this.theme = e, this.formatOptions = {
      showMilliseconds: !1,
      showHours: !1,
      ...i
    }, this.createDisplay(), this.subscribeToEditEvents(), this.updateTimeDisplay();
  }
  createDisplay() {
    const t = new d.TextStyle({
      fontFamily: E.TIME_DISPLAY.FONT_FAMILY,
      fontSize: E.TIME_DISPLAY.FONT_SIZE,
      fill: this.theme.timeline.toolbar.text
    });
    this.timeText = new d.Text("0:00 / 0:00", t), this.timeText.anchor.set(0, 0.5), this.addChild(this.timeText);
  }
  subscribeToEditEvents() {
    this.edit.events.on("playback:time", this.updateTimeDisplay), this.edit.events.on("duration:changed", this.updateTimeDisplay);
  }
  updateTimeDisplay = () => {
    const t = this.formatTime(this.edit.playbackTime / 1e3), e = this.formatTime(this.edit.getTotalDuration() / 1e3);
    this.timeText.text = `${t} / ${e}`;
  };
  formatTime(t) {
    const e = Math.floor(t / 3600), i = Math.floor(t % 3600 / 60), s = Math.floor(t % 60), n = Math.floor(t % 1 * 10);
    let a = "";
    return this.formatOptions.showHours || e > 0 ? a += `${e}:${i.toString().padStart(2, "0")}` : a += `${i}`, a += `:${s.toString().padStart(2, "0")}`, this.formatOptions.showMilliseconds ? a += `.${n}` : a += `.${n}`, a;
  }
  update() {
    this.updateTimeDisplay();
  }
  resize(t) {
  }
  updateTheme(t) {
    this.theme = t, this.timeText.style.fill = t.timeline.toolbar.text;
  }
  destroy() {
    this.edit.events.off("playback:time", this.updateTimeDisplay), this.edit.events.off("duration:changed", this.updateTimeDisplay), super.destroy();
  }
  getWidth() {
    return this.timeText.width;
  }
}
class gn extends d.Container {
  edit;
  theme;
  cutButton;
  cutButtonBackground;
  cutButtonText;
  constructor(t, e) {
    super(), this.edit = t, this.theme = e, this.createCutButton();
  }
  createCutButton() {
    this.cutButton = new d.Container(), this.cutButton.eventMode = "static", this.cutButton.cursor = "pointer";
    const { WIDTH: t, HEIGHT: e, FONT_SIZE: i } = E.CUT_BUTTON;
    this.cutButtonBackground = new d.Graphics(), this.cutButtonBackground.roundRect(0, 0, t, e, E.BORDER_RADIUS), this.cutButtonBackground.fill({ color: this.theme.timeline.toolbar.surface || 4473924 }), this.cutButtonBackground.stroke({
      color: this.theme.timeline.tracks.border || 6710886,
      width: 1
    }), this.cutButton.addChild(this.cutButtonBackground);
    const s = new d.TextStyle({
      fontFamily: "Arial",
      fontSize: i,
      fill: this.theme.timeline.toolbar.text || 16777215
    });
    this.cutButtonText = new d.Text("SPLIT", s), this.cutButtonText.anchor.set(0.5), this.cutButtonText.position.set(t / 2, e / 2), this.cutButton.addChild(this.cutButtonText), this.cutButton.on("click", this.handleCutClick, this), this.cutButton.on("pointerdown", this.handlePointerDown, this), this.cutButton.on("pointerover", this.handlePointerOver, this), this.cutButton.on("pointerout", this.handlePointerOut, this), this.addChild(this.cutButton);
  }
  handleCutClick = (t) => {
    t.stopPropagation(), this.performCutClip();
  };
  handlePointerDown = (t) => {
    t.stopPropagation(), this.updateButtonVisual(!0, !1);
  };
  handlePointerOver = () => {
    this.updateButtonVisual(!1, !0);
  };
  handlePointerOut = () => {
    this.updateButtonVisual(!1, !1);
  };
  updateButtonVisual(t, e) {
    this.cutButtonBackground.clear(), this.cutButtonBackground.roundRect(
      0,
      0,
      E.CUT_BUTTON.WIDTH,
      E.CUT_BUTTON.HEIGHT,
      E.BORDER_RADIUS
    );
    let i = this.theme.timeline.toolbar.surface || 4473924;
    const s = 1;
    t ? i = this.theme.timeline.toolbar.active || 3355443 : e && (i = this.theme.timeline.toolbar.hover || 5592405), this.cutButtonBackground.fill({ color: i, alpha: s }), this.cutButtonBackground.stroke({
      color: this.theme.timeline.tracks.border || 6710886,
      width: 1
    });
  }
  performCutClip() {
    const t = this.edit.getSelectedClipInfo();
    if (!t)
      return;
    const { trackIndex: e, clipIndex: i } = t, s = this.edit.playbackTime / 1e3;
    this.edit.splitClip(e, i, s);
  }
  update() {
    const t = this.edit.getSelectedClipInfo() !== null;
    this.cutButton.alpha = t ? 1 : 0.5, this.cutButton.eventMode = t ? "static" : "none", this.cutButton.cursor = t ? "pointer" : "default";
  }
  resize(t) {
  }
  updateTheme(t) {
    this.theme = t, this.updateButtonVisual(!1, !1), this.cutButtonText.style.fill = t.timeline.toolbar.text || 16777215;
  }
  destroy() {
    this.cutButton.removeAllListeners(), super.destroy();
  }
  getWidth() {
    return E.CUT_BUTTON.WIDTH;
  }
}
class mn {
  config;
  constructor(t, e) {
    this.config = {
      width: t,
      height: e,
      buttonSize: Math.round(e * 0.5),
      buttonSpacing: Math.round(e * 0.15),
      edgeMargin: E.EDGE_MARGIN
    };
  }
  getPlaybackControlsPosition() {
    const t = this.calculatePlaybackControlsWidth(), e = (this.config.width - t) / 2, i = (this.config.height - this.getMaxButtonHeight()) / 2;
    return { x: e, y: i };
  }
  getMaxButtonHeight() {
    const t = this.config.buttonSize;
    return Math.round(t * 1.5);
  }
  getTimeDisplayPosition(t) {
    const i = (this.config.width - t) / 2 + t + E.TEXT_SPACING, s = this.config.height / 2;
    return { x: i, y: s };
  }
  getEditControlsPosition() {
    const t = this.config.width - E.CUT_BUTTON.WIDTH - this.config.edgeMargin, e = (this.config.height - E.CUT_BUTTON.HEIGHT) / 2;
    return { x: t, y: e };
  }
  calculatePlaybackControlsWidth() {
    const t = this.config.buttonSize, e = Math.round(t * 1.5);
    return t * 2 + e + this.config.buttonSpacing * 2;
  }
  updateWidth(t) {
    this.config.width = t;
  }
  getConfig() {
    return { ...this.config };
  }
}
class yn extends d.Container {
  constructor(t, e, i, s) {
    super(), this.edit = t, this.theme = e, this.layout = i, this.toolbarWidth = s, this.toolbarHeight = i.toolbarHeight, this.position.set(0, i.toolbarY), this.toolbarLayout = new mn(s, this.toolbarHeight), this.createBackground(), this.createComponents(), this.positionComponents(), this.subscribeToEditEvents();
  }
  background;
  playbackControls;
  timeDisplay;
  editControls;
  toolbarLayout;
  toolbarWidth;
  toolbarHeight;
  get width() {
    return this.toolbarWidth;
  }
  get height() {
    return this.toolbarHeight;
  }
  createBackground() {
    this.background = new d.Graphics(), this.drawBackground(), this.addChild(this.background);
  }
  drawBackground() {
    this.background.clear(), this.background.rect(0, 0, this.toolbarWidth, this.toolbarHeight), this.background.fill({ color: this.theme.timeline.toolbar.background }), this.background.setStrokeStyle({
      width: 1,
      color: this.theme.timeline.toolbar.divider,
      alpha: E.DIVIDER_ALPHA
    }), this.background.moveTo(0, this.toolbarHeight - 0.5), this.background.lineTo(this.toolbarWidth, this.toolbarHeight - 0.5), this.background.stroke();
  }
  createComponents() {
    this.playbackControls = new pn(this.edit, this.theme, this.toolbarHeight), this.addChild(this.playbackControls), this.timeDisplay = new fn(this.edit, this.theme), this.addChild(this.timeDisplay), this.editControls = new gn(this.edit, this.theme), this.addChild(this.editControls);
  }
  positionComponents() {
    const t = this.toolbarLayout.getPlaybackControlsPosition();
    this.playbackControls.position.set(t.x, t.y);
    const e = this.toolbarLayout.getTimeDisplayPosition(this.playbackControls.getWidth());
    this.timeDisplay.position.set(e.x, e.y);
    const i = this.toolbarLayout.getEditControlsPosition();
    this.editControls.position.set(i.x, i.y);
  }
  subscribeToEditEvents() {
    this.edit.events.on("clip:selected", this.updateEditControls), this.edit.events.on("selection:cleared", this.updateEditControls);
  }
  updateEditControls = () => {
    this.editControls.update();
  };
  resize(t) {
    this.toolbarWidth = t, this.toolbarLayout.updateWidth(t), this.drawBackground(), this.positionComponents(), this.playbackControls.resize(t), this.timeDisplay.resize(t), this.editControls.resize(t);
  }
  updateTheme(t) {
    this.theme = t, this.drawBackground(), this.playbackControls.updateTheme(t), this.timeDisplay.updateTheme(t), this.editControls.updateTheme(t);
  }
  updateTimeDisplay = () => {
    this.timeDisplay.update();
  };
  destroy() {
    this.edit.events.off("clip:selected", this.updateEditControls), this.edit.events.off("selection:cleared", this.updateEditControls), this.playbackControls.destroy(), this.timeDisplay.destroy(), this.editControls.destroy(), super.destroy();
  }
}
class Cn {
  constructor(t, e, i, s, n, a) {
    this.edit = t, this.layout = e, this.renderer = i, this.viewportManager = s, this.eventHandler = n, this.getTimelineContext = a;
  }
  toolbar;
  ruler;
  playhead;
  scroll;
  async setupTimelineFeatures(t, e, i, s, n) {
    this.toolbar = new yn(this.edit, t, this.layout, i), this.renderer.getStage().addChild(this.toolbar);
    const a = {
      pixelsPerSecond: e,
      timelineDuration: n,
      rulerHeight: this.layout.rulerHeight,
      theme: t
    };
    this.ruler = new We(a), await this.ruler.load(), this.ruler.getContainer().y = this.layout.rulerY, this.viewportManager.getRulerViewport().addChild(this.ruler.getContainer()), this.ruler.events.on("ruler:seeked", this.eventHandler.handleSeek.bind(this.eventHandler));
    const o = {
      pixelsPerSecond: e,
      timelineHeight: s,
      theme: t
    };
    this.playhead = new Ke(o), await this.playhead.load(), this.playhead.getContainer().y = this.layout.rulerY, this.viewportManager.getPlayheadContainer().addChild(this.playhead.getContainer()), this.playhead.events.on("playhead:seeked", this.eventHandler.handleSeek.bind(this.eventHandler));
    const l = {
      timeline: this.getTimelineContext()
    };
    this.scroll = new un(l), await this.scroll.initialize(), this.viewportManager.updateViewportTransform();
  }
  recreateTimelineFeatures(t, e, i, s) {
    if (this.ruler) {
      this.ruler.dispose();
      const n = t.dimensions?.rulerHeight || this.layout.rulerHeight, a = {
        pixelsPerSecond: e,
        timelineDuration: s,
        rulerHeight: n,
        theme: t
      };
      this.ruler = new We(a), this.ruler.load(), this.ruler.getContainer().y = this.layout.rulerY, this.viewportManager.getRulerViewport().addChild(this.ruler.getContainer()), this.ruler.events.on("ruler:seeked", this.eventHandler.handleSeek.bind(this.eventHandler));
    }
    if (this.playhead) {
      this.playhead.dispose();
      const n = {
        pixelsPerSecond: e,
        timelineHeight: i,
        theme: t
      };
      this.playhead = new Ke(n), this.playhead.load(), this.playhead.getContainer().y = this.layout.rulerY, this.viewportManager.getPlayheadContainer().addChild(this.playhead.getContainer()), this.playhead.events.on("playhead:seeked", this.eventHandler.handleSeek.bind(this.eventHandler));
    }
  }
  updateRuler(t, e) {
    this.ruler.updateRuler(t, e);
  }
  updatePlayhead(t, e) {
    this.playhead && this.playhead.updatePlayhead(t, e);
  }
  getFeatures() {
    return {
      toolbar: this.toolbar,
      ruler: this.ruler,
      playhead: this.playhead,
      scroll: this.scroll
    };
  }
  getToolbar() {
    return this.toolbar;
  }
  getPlayhead() {
    return this.playhead;
  }
  dispose() {
    this.toolbar && this.toolbar.destroy(), this.ruler && this.ruler.dispose(), this.playhead && this.playhead.dispose(), this.scroll && this.scroll.dispose();
  }
}
class Q {
  constructor(t, e) {
    this.options = t, this.theme = e, this.config = this.calculateLayout();
  }
  // Use constants from centralized location
  static TOOLBAR_HEIGHT_RATIO = G.TOOLBAR_HEIGHT_RATIO;
  static RULER_HEIGHT_RATIO = G.RULER_HEIGHT_RATIO;
  static TOOLBAR_HEIGHT_DEFAULT = G.TOOLBAR_HEIGHT_DEFAULT;
  static RULER_HEIGHT_DEFAULT = G.RULER_HEIGHT_DEFAULT;
  static TRACK_HEIGHT_DEFAULT = G.TRACK_HEIGHT_DEFAULT;
  static CLIP_PADDING = G.CLIP_PADDING;
  static BORDER_WIDTH = G.BORDER_WIDTH;
  static CORNER_RADIUS = G.CORNER_RADIUS;
  static LABEL_PADDING = G.LABEL_PADDING;
  static TRACK_PADDING = G.TRACK_PADDING;
  config;
  calculateLayout() {
    const t = this.options.height;
    let e = this.theme?.timeline.toolbar.height || Math.round(t * Q.TOOLBAR_HEIGHT_RATIO), i = this.theme?.timeline.ruler.height || Math.round(t * Q.RULER_HEIGHT_RATIO);
    e = Math.max(e, Q.TOOLBAR_HEIGHT_DEFAULT), i = Math.max(i, Q.RULER_HEIGHT_DEFAULT);
    const { trackHeight: s } = this.options;
    return {
      toolbarHeight: e,
      rulerHeight: i,
      trackHeight: s,
      toolbarY: 0,
      rulerY: e,
      tracksY: e + i,
      gridY: e + i,
      playheadY: e,
      viewportY: e + i
    };
  }
  // Layout getters
  get toolbarHeight() {
    return this.config.toolbarHeight;
  }
  get toolbarY() {
    return this.config.toolbarY;
  }
  get rulerHeight() {
    return this.config.rulerHeight;
  }
  get trackHeight() {
    return this.config.trackHeight;
  }
  get rulerY() {
    return this.config.rulerY;
  }
  get tracksY() {
    return this.config.tracksY;
  }
  get gridY() {
    return this.config.gridY;
  }
  get playheadY() {
    return this.config.playheadY;
  }
  get viewportY() {
    return this.config.viewportY;
  }
  // Positioning methods
  positionTrack(t) {
    return t * this.trackHeight;
  }
  positionClip(t) {
    return t * this.options.pixelsPerSecond;
  }
  calculateClipWidth(t) {
    return Math.max(G.MIN_CLIP_WIDTH, t * this.options.pixelsPerSecond);
  }
  calculateDropPosition(t, e) {
    const i = e - this.tracksY, s = Math.floor(i / this.trackHeight), n = Math.max(0, t / this.options.pixelsPerSecond);
    return {
      track: Math.max(0, s),
      time: n,
      x: t,
      y: i
    };
  }
  getTrackAtY(t) {
    const e = t - this.tracksY;
    return Math.floor(e / this.trackHeight);
  }
  getTimeAtX(t) {
    return t / this.options.pixelsPerSecond;
  }
  getXAtTime(t) {
    return t * this.options.pixelsPerSecond;
  }
  getYAtTrack(t) {
    return this.tracksY + t * this.trackHeight;
  }
  // Grid and ruler dimensions
  getGridHeight() {
    return this.options.height - this.toolbarHeight - this.rulerHeight;
  }
  getRulerWidth() {
    return this.options.width;
  }
  getGridWidth() {
    return this.options.width;
  }
  // Viewport scroll calculations
  calculateViewportPosition(t, e) {
    return {
      x: -t,
      y: this.viewportY - e
    };
  }
  // Update layout when options or theme change
  updateOptions(t, e) {
    this.options = t, this.theme = e, this.config = this.calculateLayout();
  }
  // Utility methods
  isPointInToolbar(t, e) {
    return e >= this.toolbarY && e <= this.toolbarY + this.toolbarHeight;
  }
  isPointInRuler(t, e) {
    return e >= this.rulerY && e <= this.rulerY + this.rulerHeight;
  }
  isPointInTracks(t, e) {
    return e >= this.tracksY && e <= this.options.height;
  }
  getVisibleTrackRange(t, e) {
    const i = t, s = Math.floor(i / this.trackHeight), n = Math.ceil((i + e) / this.trackHeight);
    return {
      start: Math.max(0, s),
      end: Math.max(0, n)
    };
  }
}
class Z {
  // 10% zoom per step
  constructor(t, e, i, s) {
    this.layout = i, this.onResize = s, this.width = t.width, this.height = t.height, this.pixelsPerSecond = 50;
    const n = e.timeline.tracks.height || Q.TRACK_HEIGHT_DEFAULT;
    this.trackHeight = Math.max(40, n), this.backgroundColor = e.timeline.background, this.antialias = !0, this.resolution = window.devicePixelRatio || 1;
  }
  pixelsPerSecond;
  trackHeight;
  backgroundColor;
  antialias;
  resolution;
  width;
  height;
  // Zoom constraints
  static MIN_PIXELS_PER_SECOND = 10;
  static MAX_PIXELS_PER_SECOND = 500;
  static ZOOM_FACTOR = 1.1;
  getOptions() {
    return {
      width: this.width,
      height: this.height,
      pixelsPerSecond: this.pixelsPerSecond,
      trackHeight: this.trackHeight,
      backgroundColor: this.backgroundColor,
      antialias: this.antialias,
      resolution: this.resolution
    };
  }
  setOptions(t) {
    t.width !== void 0 && (this.width = t.width, this.onResize && this.onResize(this.width)), t.height !== void 0 && (this.height = t.height), t.pixelsPerSecond !== void 0 && (this.pixelsPerSecond = t.pixelsPerSecond), t.trackHeight !== void 0 && (this.trackHeight = t.trackHeight), t.backgroundColor !== void 0 && (this.backgroundColor = t.backgroundColor), t.antialias !== void 0 && (this.antialias = t.antialias), t.resolution !== void 0 && (this.resolution = t.resolution), this.layout.updateOptions(this.getOptions());
  }
  updateFromTheme(t) {
    this.backgroundColor = t.timeline.background;
    const e = t.timeline.tracks.height || Q.TRACK_HEIGHT_DEFAULT;
    this.trackHeight = Math.max(40, e), this.layout.updateOptions(this.getOptions(), t);
  }
  // Individual getters
  getWidth() {
    return this.width;
  }
  getHeight() {
    return this.height;
  }
  getPixelsPerSecond() {
    return this.pixelsPerSecond;
  }
  getTrackHeight() {
    return this.trackHeight;
  }
  getBackgroundColor() {
    return this.backgroundColor;
  }
  getAntialias() {
    return this.antialias;
  }
  getResolution() {
    return this.resolution;
  }
  // Zoom methods
  zoomIn() {
    const t = Math.min(this.pixelsPerSecond * Z.ZOOM_FACTOR, Z.MAX_PIXELS_PER_SECOND);
    this.setPixelsPerSecond(t);
  }
  zoomOut() {
    const t = Math.max(this.pixelsPerSecond / Z.ZOOM_FACTOR, Z.MIN_PIXELS_PER_SECOND);
    this.setPixelsPerSecond(t);
  }
  setPixelsPerSecond(t) {
    this.pixelsPerSecond = Math.max(
      Z.MIN_PIXELS_PER_SECOND,
      Math.min(Z.MAX_PIXELS_PER_SECOND, t)
    ), this.layout.updateOptions(this.getOptions());
  }
  canZoomIn() {
    return this.pixelsPerSecond < Z.MAX_PIXELS_PER_SECOND;
  }
  canZoomOut() {
    return this.pixelsPerSecond > Z.MIN_PIXELS_PER_SECOND;
  }
}
class ri extends ot {
  constructor(t, e, i) {
    super(), this.edit = t, this.theme = Ze.resolveTheme(i), this.layout = new Q(
      {
        width: e.width,
        height: e.height,
        pixelsPerSecond: 50,
        trackHeight: Math.max(40, this.theme.timeline.tracks.height || Q.TRACK_HEIGHT_DEFAULT),
        backgroundColor: this.theme.timeline.background,
        antialias: !0,
        resolution: window.devicePixelRatio || 1
      },
      this.theme
    ), this.optionsManager = new Z(e, this.theme, this.layout, (s) => this.featureManager?.getToolbar()?.resize(s)), this.initializeManagers(), this.setupInteraction();
  }
  currentEditType = null;
  layout;
  theme;
  lastPlaybackTime = 0;
  // Timeline constants
  static TIMELINE_BUFFER_MULTIPLIER = 1.5;
  // 50% buffer for scrolling
  // Managers
  interaction;
  dragPreviewManager;
  viewportManager;
  visualTrackManager;
  eventHandler;
  renderer;
  featureManager;
  optionsManager;
  initializeManagers() {
    const t = this.optionsManager.getOptions();
    this.renderer = new dn(
      {
        width: t.width || 800,
        height: t.height || 600,
        backgroundColor: t.backgroundColor || 0,
        antialias: t.antialias ?? !0,
        resolution: t.resolution || window.devicePixelRatio || 1
      },
      (e, i) => this.update(e, i)
    ), this.eventHandler = new hn(this.edit, {
      onEditChange: this.handleEditChange.bind(this),
      onSeek: (e) => this.edit.seek(e),
      onClipSelected: (e, i) => this.visualTrackManager.updateVisualSelection(e, i),
      onSelectionCleared: () => this.visualTrackManager.clearVisualSelection(),
      onDragStarted: (e, i) => {
        const s = this.getClipData(e, i);
        s && this.dragPreviewManager.showDragPreview(e, i, s);
      },
      onDragEnded: () => this.dragPreviewManager.hideDragPreview()
    }), this.eventHandler.setupEventListeners();
  }
  async load() {
    await this.renderer.initializePixiApp(), await this.renderer.setupRenderLayers(), await this.setupViewport(), await this.setupTimelineFeatures(), this.interaction.activate();
    try {
      const t = this.edit.getEdit();
      t && (this.currentEditType = t, await this.rebuildFromEdit(t));
    } catch {
    }
    this.renderer.startAnimationLoop();
  }
  async setupViewport() {
    this.viewportManager = new nn(
      this.layout,
      this.renderer.getTrackLayer(),
      this.renderer.getOverlayLayer(),
      this.getContainer(),
      () => this.renderer.render()
    ), await this.viewportManager.setupViewport(), this.visualTrackManager = new cn(
      this.getContainer(),
      this.layout,
      this.theme,
      () => this.optionsManager.getPixelsPerSecond(),
      () => this.getExtendedTimelineWidth()
    ), this.dragPreviewManager = new sn(
      this.getContainer(),
      this.layout,
      () => this.optionsManager.getPixelsPerSecond(),
      () => this.optionsManager.getTrackHeight(),
      () => this.visualTrackManager.getVisualTracks()
    ), this.featureManager = new Cn(this.edit, this.layout, this.renderer, this.viewportManager, this.eventHandler, () => this);
  }
  async setupTimelineFeatures() {
    const t = this.getExtendedTimelineDuration();
    await this.featureManager.setupTimelineFeatures(
      this.theme,
      this.optionsManager.getPixelsPerSecond(),
      this.optionsManager.getWidth(),
      this.optionsManager.getHeight(),
      t
    );
  }
  recreateTimelineFeatures() {
    const t = this.getExtendedTimelineDuration();
    this.featureManager.recreateTimelineFeatures(
      this.theme,
      this.optionsManager.getPixelsPerSecond(),
      this.optionsManager.getHeight(),
      t
    );
  }
  // Viewport management methods for tools
  setScroll(t, e) {
    this.viewportManager.setScroll(t, e);
  }
  setZoom(t) {
    this.viewportManager.setZoom(t);
  }
  getViewport() {
    return this.viewportManager.getViewport();
  }
  // Combined getter for PIXI resources
  /** @internal */
  getPixiApp() {
    return this.renderer.getApp();
  }
  /** @internal */
  getTrackLayer() {
    return this.renderer.getTrackLayer();
  }
  /** @internal */
  getOverlayLayer() {
    return this.renderer.getOverlayLayer();
  }
  // Interaction integration methods
  getClipData(t, e) {
    return this.currentEditType?.timeline?.tracks && this.currentEditType.timeline.tracks[t]?.clips?.[e] || null;
  }
  // Layout access for interactions
  getLayout() {
    return this.layout;
  }
  // Visual tracks access for interactions
  getVisualTracks() {
    return this.visualTrackManager.getVisualTracks();
  }
  // Edit access for interactions
  getEdit() {
    return this.edit;
  }
  // Extended timeline dimensions
  getExtendedTimelineWidth() {
    const t = this.getExtendedTimelineDuration() * this.optionsManager.getPixelsPerSecond(), e = this.optionsManager.getWidth();
    return Math.max(t, e);
  }
  // Drag ghost control methods for TimelineInteraction
  hideDragGhost() {
    this.dragPreviewManager.hideDragGhost();
  }
  showDragGhost(t, e, i) {
    this.dragPreviewManager.showDragGhost(t, e, i);
  }
  // Playhead control methods
  setPlayheadTime(t) {
    this.featureManager.getPlayhead().setTime(t);
  }
  getPlayheadTime() {
    return this.featureManager.getPlayhead().getTime();
  }
  getActualEditDuration() {
    return this.edit.totalDuration / 1e3 || 60;
  }
  /** @internal */
  setupInteraction() {
    this.interaction = new en(this);
  }
  /** @internal */
  async handleEditChange(t) {
    this.dragPreviewManager.hideDragPreview();
    const e = t || this.edit.getEdit();
    e && (this.currentEditType = e, this.updateRulerDuration(), this.clearAllVisualState(), await this.rebuildFromEdit(e));
  }
  /** @internal */
  getExtendedTimelineDuration() {
    const t = this.edit.totalDuration / 1e3 || 60;
    return Math.max(60, t * ri.TIMELINE_BUFFER_MULTIPLIER);
  }
  /** @internal */
  updateRulerDuration() {
    const t = this.getExtendedTimelineDuration(), e = this.getExtendedTimelineWidth();
    this.featureManager.updateRuler(this.optionsManager.getPixelsPerSecond(), t), this.visualTrackManager.updateTrackWidths(e);
  }
  /** @internal */
  clearAllVisualState() {
    this.dragPreviewManager.hideDragPreview(), this.visualTrackManager.clearAllVisualState();
  }
  /** @internal */
  async rebuildFromEdit(t) {
    await this.visualTrackManager.rebuildFromEdit(t, this.optionsManager.getPixelsPerSecond()), this.renderer.render();
  }
  // Public API for tools to query cached state
  findClipAtPosition(t, e) {
    return this.currentEditType ? this.visualTrackManager.findClipAtPosition(t, e) : null;
  }
  // Theme management methods
  setTheme(t) {
    this.theme = Ze.resolveTheme(t), this.optionsManager.updateFromTheme(this.theme), this.featureManager.getToolbar() && this.featureManager.getToolbar().updateTheme(this.theme), this.recreateTimelineFeatures(), this.currentEditType && (this.clearAllVisualState(), this.rebuildFromEdit(this.currentEditType)), this.renderer.updateBackgroundColor(this.optionsManager.getBackgroundColor()), this.renderer.render();
  }
  getTheme() {
    return this.theme;
  }
  // Getters for current state
  getCurrentEditType() {
    return this.currentEditType;
  }
  getOptions() {
    return this.optionsManager.getOptions();
  }
  setOptions(t) {
    this.optionsManager.setOptions(t);
  }
  // Required Entity methods
  /** @internal */
  update(t, e) {
    (this.edit.isPlaying || this.lastPlaybackTime !== this.edit.playbackTime) && (this.featureManager.getPlayhead().setTime(this.edit.playbackTime / 1e3), this.lastPlaybackTime = this.edit.playbackTime, this.featureManager.getToolbar() && this.featureManager.getToolbar().updateTimeDisplay());
  }
  /** @internal */
  draw() {
    this.renderer.draw();
  }
  // Methods for TimelineReference interface
  getTimeDisplay() {
    return this.featureManager.getToolbar();
  }
  updateTime(t, e) {
    this.setPlayheadTime(t), e && this.edit.seek(t * 1e3);
  }
  get timeRange() {
    return {
      startTime: 0,
      endTime: this.getExtendedTimelineDuration()
    };
  }
  get viewportHeight() {
    return this.optionsManager.getHeight();
  }
  get zoomLevelIndex() {
    const t = this.viewportManager.getViewport();
    return Math.round(Math.log2(t.zoom) + 5);
  }
  zoomIn() {
    this.optionsManager.zoomIn(), this.onZoomChanged();
  }
  zoomOut() {
    this.optionsManager.zoomOut(), this.onZoomChanged();
  }
  onZoomChanged() {
    const t = this.optionsManager.getPixelsPerSecond();
    this.visualTrackManager.updatePixelsPerSecond(t);
    const e = this.getExtendedTimelineWidth();
    this.visualTrackManager.updateTrackWidths(e), this.featureManager.updateRuler(t, this.getExtendedTimelineDuration()), this.featureManager.updatePlayhead(t, this.optionsManager.getHeight()), this.renderer.render();
  }
  /** @internal */
  dispose() {
    this.dragPreviewManager.dispose(), this.visualTrackManager.dispose(), this.eventHandler.dispose(), this.featureManager.dispose(), this.interaction && this.interaction.dispose(), this.renderer.dispose();
  }
}
export {
  mt as Canvas,
  kn as Controls,
  Pt as Edit,
  ri as Timeline,
  Tn as VideoExporter
};

