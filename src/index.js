const _ = require('lodash-next');
const sha1 = require('sha1');
const sigmund = require('sigmund');

class Patch {
  constructor({ m, f, t }) {
    _.extend(this, { m, f, t });
  }

  serialize() {
    const { m, f, t } = this;
    return JSON.stringify({ m, f, t });
  }

  reverse() {
    const m = {};
    Object.keys(this.m).forEach((k) => {
      const { f, t } = this.m[k];
      m[k] = { f: t, t: f };
    });
    const { h, v } = this.t;
    return Patch.create({ m, h, v });
  }

  static create({ m, h, v }) {
    const f = { h, v };
    const t = { h: sha1(h + sigmund(m)), v: v + 1 };
    return new Patch({ m, f, t });
  }

  static unserialize(str) {
    const { m, f, t } = JSON.parse(str);
    return new Patch({ m, f, t });
  }
}

class Remutable {
  constructor() {
    this._d = {};                 // data
    this._m = {};                 // mutations
    this._v = 0;                  // version
    this._h = sha1(sigmund({}));  // hash
    this._x = false;              // dirty
  }

  get dirty() {
    return !!this._x;
  }

  get hash() {
    return this._h;
  }

  get uid() {
    return `${this._h}:${this._v}`;
  }

  get(k) {
    if(this._m[k] !== void 0) {
      return this._m[k].t;
    }
    return this._d[k];
  }

  check(k) {
    return this._d[k];
  }

  set(k, v) {
    this._x = true;
    const f = this._d[k];
    const t = v;
    this._m[k] = { f, t };
    return this;
  }

  del(k) {
    return this.set(k, void 0);
  }

  checkout(key) {
    return this._d[key];
  }

  keys() {
    const m = {};
    Object.keys(this._d).forEach((k) => m[k] = true);
    Object.keys(this._m).forEach((k) => {
      const { f, t } = this._m[t];
      if(t === void 0 && f !== void 0) {
        delete m[k];
      }
      else {
        m[k] = true;
      }
    });
    return Object.keys(m);
  }

  map(fn) { // fn(value, key): any
    return this.keys().map((key) => fn(this.get(key), key));
  }

  destroy() {
    this._m = null;
    this._d = null;
    this._v = {}; // === {} will always be falsy unless referentially equal
    this._h = {}; // === {} will always be falsy unless rerefentially equal
  }

  commit() {
    this.dirty.should.be.ok;
    const patch = Patch.create({ m: this._m, h: this._h, v: this._v });
    this._m = {};
    this._x = false;
    this.apply(patch);
    return patch;
  }

  equals(r) {
    _.dev(() => r.should.be.an.instanceOf(Remutable));
    this.dirty.should.not.be.ok;
    r.dirty.should.not.be.ok;
    return this._h === r._h;
  }

  rollback() {
    this._m = {};
    this._x = false;
  }

  canApply(patch) {
    _.dev(() => patch.should.be.an.instanceOf(Patch));
    return (this._h === patch.f.h);
  }

  apply(patch) {
    this.dirty.should.not.be.ok;
    this.canApply(patch).should.be.ok;
    Object.keys(patch.m).forEach((k) => {
      const { t } = patch.m[k];
      if(t === void 0) {
        delete this._d[k];
      }
      else {
        this._d[k] = t;
      }
    });
    this._h = patch.t.h;
    this._v = patch.t.v;
    return this;
  }

  serialize() {
    this.dirty.should.not.be.ok;
    return JSON.stringify({
      h: this._h,
      v: this._v,
      d: this._d,
    });
  }

  static unserialize(serialized) {
    const { h, v, d } = JSON.parse(serialized);
    _.dev(() => h.should.be.a.String &&
      v.should.be.a.Number &&
      d.should.be.an.Object
    );
    return _.extend(new Remutable(), {
      _h: h,
      _v: v,
      _d: d,
    });
  }
}

_.extend(Remutable.prototype, {
  _d: null,
  _m: null,
  _v: null,
  _h: null,
  _x: null,
});

module.exports = Remutable;
