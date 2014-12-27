const _ = require('lodash-next');
const sha1 = require('sha1');
const sigmund = require('sigmund');
const Immutable = require('immutable');

const Patch = require('./Patch');

class Remutable {
  constructor(data = {}, version = 0, hash = null) {
    hash = hash || sha1(sigmund(data));

    _.dev(() => data.should.be.an.Object &&
      version.should.be.a.Number &&
      hash.should.be.a.String
    );

    this._head = Immutable.Map(data);
    this._working = this._head;

    this._version = version;
    this._hash = hash;
    this._dirty = false;
    this._mutations = {};
    this._serialized = {
      hash: {}, // Never match ===
      json: null,
    };
  }

  get hash() {
    return this._hash;
  }

  get head() {
    return this._head;
  }

  get working() {
    return this._working;
  }

  toJSON() {
    if(this._serialized.hash !== this._hash) {
      this._serialized = {
        hash: this._hash,
        json: JSON.stringify({
          h: this._hash,
          v: this._version,
          d: this._head.toObject()
        }),
      };
    }
    return this._serialized.json;
  }

  get(key) {
    return this._working.get(key);
  }

  set(key, val) {
    key.should.be.a.String;
    this._dirty = true;
    // Retain the previous value to make the patch reversible
    const f = this._head.get(key);
    const t = val;
    this._mutations[key] = { f, t };
    if(val === void 0) {
      this._working = this._working.delete(key);
    }
    else {
      this._working = this._working.set(key, val);
    }
    return this;
  }

  delete(key) {
    return this.set(key, void 0);
  }

  commit() {
    this._dirty.should.be.ok;
    const patch = Patch.fromMutations({
      mutations: this._mutations,
      hash: this._hash,
      version: this._version,
    });
    this._head = this._working;
    this._mutations = {};
    this._dirty = false;
    this._hash = patch.to.h;
    this._version = patch.to.v;
    return patch;
  }

  rollback() {
    this._working = this._head;
    this._mutations = {};
    this._dirty = false;
  }

  match(patch) {
    _.dev(() => patch.should.be.an.instanceOf(Patch));
    return (this._hash === patch.from.h);
  }

  apply(patch) {
    this._dirty.should.not.be.ok;
    this.match(patch).should.be.ok;
    const head = this._head.withMutations((map) => {
      Object.keys(patch.mutations).forEach((key) => {
        const { t } = patch.mutations[key];
        if(t === void 0) {
          map = map.delete(key);
        }
        else {
          map = map.set(key, t);
        }
      });
      return map;
    });
    this._working = this._head = head;
    this._hash = patch.to.h;
    this._version = patch.to.v;
    return this;
  }

  static fromJSON(json) {
    const { h, v, d } = JSON.parse(json);
    return new Remutable(d, v, h);
  }
}

_.extend(Remutable.prototype, {
  _head: null,
  _working: null,
  _mutations: null,
  _hash: null,
  _version: null,
  _dirty: null,
});

Remutable.Patch = Patch;

module.exports = Remutable;
