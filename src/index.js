const _ = require('lodash-next');

const MUTATIONS = {
  SET: 's',
  DEL: 'd',
};

function salt() {
  return _.random(0, Number.MAX_VALUE - 1);
}

class Remutable {
  constructor() {
    this._data = {};
    this._mutations = {};
    this._version = 0;
    this._hash = salt();
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
    this._mutations[key] = { d: MUTATIONS.SET, v: val };
  }

  del(key) {
    this._mutations[key] = { d: MUTATIONS.DEL };
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
    return this._applyPatchWithoutCheckingMutations({
      mutations: this._mutations,
      version: this._version,
      hash: this._hash,
      nextVersion: this._version + 1,
      nextHash: salt(),
    });
  }

  equals(remutable) {
    this._mutations.should.eql({});
    remutable._mutations.should.eql({});
    return this._hash === remutable._hash && this._version === remutable._version;
  }

  rollback() {
    this._mutations = {};
  }

  canApply(patch) {
    const { hash, version } = patch;
    return (this._hash === hash && this._version === version);
  }

  _applyPatchWithoutCheckingMutations(patch) {
    const { mutations, nextVersion, nextHash } = patch;
    this.canApply(patch).should.be.ok;
    Object.keys(mutations).forEach((key) => {
      const { m, v } = this._mutations[key];
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
    return patch;
  }

  apply(patch) {
    this._mutations.should.eql({});
    return this._applyPatchWithoutCheckingMutations(patch);
  }

  serialize() {
    return JSON.stringify({
      hash: this._hash,
      version: this._version,
      data: this._data,
    });
  }

  static unserialize(serialized) {
    const { hash, version, data } = JSON.parse(serialized);
    _.dev(() => hash.should.be.a.Number &&
      version.should.be.a.Number &&
      data.should.be.an.Object
    );
    const remutable = new Remutable();
    remutable._hash = hash;
    remutable._version = version;
    remutable._data = data;
    return remutable;
  }
}

_.extend(Remutable.prototype, {
  _data: null,
  _mutations: null,
  _version: null,
  _hash: null,
});

module.exports = Remutable;
