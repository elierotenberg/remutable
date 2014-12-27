const _ = require('lodash-next');
const sha1 = require('sha1');
const sigmund = require('sigmund');

const Patch = require('./Patch');

class Remutable {
  constructor() {
    this._data = {};
    this._mutations = {};
    this._version = 0;
    this._hash = sha1(sigmund({}));
    this._dirty = false;
    this._serialized = {
      h: this._hash,
      v: this._version,
      s: JSON.stringify({ h: this._hash, v: this._version, d: this._data }),
    };
  }

  get dirty() {
    return !!this._dirty;
  }

  get hash() {
    return this._hash;
  }

  get uid() {
    return `${this._hash}:${this._version}`;
  }

  get(key) {
    if(this._mutations[key] !== void 0) {
      return this._mutations[key].t;
    }
    return this._data[key];
  }

  check(key) {
    return this._data[key];
  }

  set(key, val) {
    this._dirty = true;
    const f = this._data[key];
    const t = val;
    this._mutations[key] = { f, t };
    return this;
  }

  del(key) {
    return this.set(key, void 0);
  }

  checkout(key) {
    return this._data[key];
  }

  keys() {
    const mutations = {};
    Object.keys(this._data).forEach((key) => mutations[key] = true);
    Object.keys(this._mutations).forEach((key) => {
      const { f, t } = this._mutations[t];
      if(t === void 0 && f !== void 0) {
        delete mutations[key];
      }
      else {
        mutations[key] = true;
      }
    });
    return Object.keys(mutations);
  }

  map(fn) { // fn(value, key): any
    return this.keys().map((key) => fn(this.get(key), key));
  }

  destroy() {
    this._mutations = null;
    this._data = null;
    this._version = {}; // === {} will always be falsy unless referentially equal
    this._hash = {}; // === {} will always be falsy unless rerefentially equal
  }

  commit() {
    this.dirty.should.be.ok;
    const patch = Patch.create({
      mutations: this._mutations,
      hash: this._hash,
      version: this._version,
    });
    this._mutations = {};
    this._dirty = false;
    this.apply(patch);
    return patch;
  }

  equals(otherRemutable) {
    _.dev(() => otherRemutable.should.be.an.instanceOf(Remutable));
    this.dirty.should.not.be.ok;
    otherRemutable.dirty.should.not.be.ok;
    return this._hash === otherRemutable._hash;
  }

  rollback() {
    this._mutations = {};
    this._dirty = false;
  }

  canApply(patch) {
    _.dev(() => patch.should.be.an.instanceOf(Patch));
    return (this._hash === patch.from.h);
  }

  apply(patch) {
    this.dirty.should.not.be.ok;
    this.canApply(patch).should.be.ok;
    Object.keys(patch.mutations).forEach((key) => {
      const { t } = patch.mutations[key];
      if(t === void 0) {
        delete this._data[key];
      }
      else {
        this._data[key] = t;
      }
    });
    this._hash = patch.to.h;
    this._version = patch.to.v;
    return this;
  }

  serialize() {
    if(this._serialized.h !== this._hash || this._serialized.v !== this._version) {
      this._serialized = {
        h: this._hash,
        v: this._version,
        s: JSON.stringify({ h: this._hash, v: this._version, d: this._data }),
      };
    }
    return this._serialized.s;
  }

  static unserialize(serialized) {
    const { h, v, d } = JSON.parse(serialized);
    _.dev(() => h.should.be.a.String &&
      v.should.be.a.Number &&
      d.should.be.an.Object
    );
    return _.extend(new Remutable(), {
      _hash: h,
      _version: v,
      _data: d,
    });
  }
}

_.extend(Remutable.prototype, {
  _data: null,
  _mutations: null,
  _version: null,
  _hash: null,
  _dirty: null,
});

Remutable.Patch = Patch;

module.exports = Remutable;
