const _ = require('lodash-next');

const MUTATIONS = {
  SET: 's',
  DEL: 'd',
};

const INT_MAX = 9007199254740992;

function salt() {
  return _.random(0, INT_MAX - 1);
}

class Remutable {
  constructor() {
    this._data = {};
    this._mutations = {};
    this._version = 0;
    this._hash = salt();
    this._dirty = false;
  }

  get uid() {
    return `${this._hash}:${this._version}`;
  }

  get dirty() {
    return this._dirty;
  }

  get(key) {
    if(this._mutations[key] !== void 0) {
      const { m, v } = this._mutations[key];
      if(m === MUTATIONS.DEL) {
        return void 0;
      }
      if(m === MUTATIONS.SET) {
        return v;
      }
    }
    return this._data[key];
  }

  checkout(key) {
    return this._data[key];
  }

  set(key, val) {
    this._dirty = true;
    this._mutations[key] = { m: MUTATIONS.SET, v: val };
  }

  del(key) {
    this._dirty = true;
    this._mutations[key] = { m: MUTATIONS.DEL };
  }

  keys() {
    let keysMap = {};
    Object.keys(this._data).forEach((key) => {
      keysMap[key] = true;
    });
    Object.keys(this._mutations).forEach((key) => {
      const { m } = this._mutations[key];
      if(m === MUTATIONS.SET) {
        keysMap[key] = true;
      }
      if(m === MUTATIONS.DEL) {
        delete keysMap[key];
      }
    });
    return Object.keys(keysMap);
  }

  map(fn) { // fn(value, key): any
    return this.keys().map((key) => fn(this.get(key), key));
  }

  destroy() {
    this._mutations = null;
    this._data = null;
    this._version = {}; // === this._version will always be falsy
    this._hash = {}; // === this._hash will always be falsy
  }

  commit() {
    this.dirty.should.be.ok;
    return this._applyPatchWithoutDirtyChecking({
      m: this._mutations,
      v: this._version,
      h: this._hash,
      nv: this._version + 1,
      nh: salt(),
    });
  }

  equals(remutable) {
    this.dirty.should.not.be.ok;
    remutable.dirty.should.not.be.ok;
    return this._hash === remutable._hash && this._version === remutable._version;
  }

  rollback() {
    this._mutations = {};
    this._dirty = false;
  }

  canApply(patch) {
    const hash = patch.h;
    const version = patch.v;
    return (this._hash === hash && this._version === version);
  }

  _applyPatchWithoutDirtyChecking(patch) {
    const mutations = patch.m;
    const nextVersion = patch.nv;
    const nextHash = patch.nh;
    this.canApply(patch).should.be.ok;
    Object.keys(mutations).forEach((key) => {
      const { m, v } = mutations[key];
      if(m === MUTATIONS.DEL) {
        delete this._data[key];
      }
      if(m === MUTATIONS.SET) {
        this._data[key] = v;
      }
    });
    this._version = nextVersion;
    this._hash = nextHash;
    this._mutations = {};
    this._dirty = false;
    return patch;
  }

  apply(patch) {
    this.dirty.should.not.be.ok;
    return this._applyPatchWithoutDirtyChecking(patch);
  }

  serialize() {
    this.dirty.should.not.be.ok;
    return JSON.stringify({
      h: this._hash,
      v: this._version,
      d: this._data,
    });
  }

  static unserialize(serialized) {
    const { h, v, d } = JSON.parse(serialized);
    _.dev(() => h.should.be.a.Number &&
      v.should.be.a.Number &&
      d.should.be.an.Object
    );
    const remutable = new Remutable();
    remutable._hash = h;
    remutable._version = v;
    remutable._data = d;
    return remutable;
  }
}

_.extend(Remutable.prototype, {
  _data: null,
  _mutations: null,
  _version: null,
  _hash: null,
  _dirty: null,
});

module.exports = Remutable;
