const crc32 = require('crc-32').str;
const sigmund = require('sigmund');
const Immutable = require('immutable');

const Patch = require('./Patch');

let _Remutable;

class Consumer {
  constructor(ctx) {
    if(__DEV__) {
      ctx.should.be.an.instanceOf(_Remutable);
    }
    this._ctx = ctx;
    // proxy all these methods to ctx
    ['toJS', 'toJSON']
    .forEach((m) => this[m] = ctx[m]);
    // proxy all these property getters to ctx
    ['head', 'hash', 'version']
    .forEach((p) => Object.defineProperty(this, p, {
        enumerable: true,
        get: () => ctx[p],
    }));
  }
}

class Producer {
  constructor(ctx) {
    if(__DEV__) {
      ctx.should.be.an.instanceOf(_Remutable);
    }
    this._ctx = ctx;
    // proxy all these methods to ctx
    ['delete', 'rollback', 'commit', 'match', 'toJS', 'toJSON']
    .forEach((m) => this[m] = ctx[m]);
    // proxy all these property getters to ctx
    ['head', 'working', 'hash', 'version']
    .forEach((p) => Object.defineProperty(this, p, {
      enumerable: true,
      get: () => ctx[p],
    }));
    _.bindAll(this);
  }

  set() { // intercept set to make it chainable
    this._ctx.set.apply(this._ctx, arguments);
    return this;
  }

  apply() { // intercept apply to make it chainable
    this._ctx.apply.apply(this._ctx, arguments);
    return this;
  }
}

class Remutable {
  constructor(data = {}, version = 0, hash = null) {
    hash = hash || Remutable.hashFn(Remutable.signFn(data));

    if(__DEV__) {
      data.should.be.an.Object;
      version.should.be.a.Number;
    }

    this._head = Immutable.Map(data);
    this._working = this._head;

    this._version = version;
    this._hash = hash;
    this._dirty = false;
    this._mutations = {};
    this._js = {
      hash: {},
      js: null,
    };
    this._json = {
      hash: {},
      json: null,
    };
    _.bindAll(this);
  }

  get dirty() {
    return this._dirty;
  }

  get hash() {
    return this._hash;
  }

  get version() {
    return this._version;
  }

  get head() {
    return this._head;
  }

  get working() {
    return this._working;
  }

  createConsumer() {
    return new Consumer(this);
  }

  createProducer() {
    return new Producer(this);
  }

  destroy() {
    // Explicitly nullify references
    this._head = null;
    this._working = null;
    this._dirty = null;
    this._mutations = null;
    this._serialized = null;
  }

  toJS() {
    if(this._js.hash !== this._hash) {
      this._js = {
        hash: this._hash,
        js: {
          h: this._hash,
          v: this._version,
          d: this._head.toJS(),
        },
      };
    }
    return this._js.js;
  }

  toJSON() {
    if(this._json.hash !== this._hash) {
      this._json = {
        hash: this._hash,
        json: JSON.stringify(this.toJS()),
      };
    }
    return this._json.json;
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
    const patch = Remutable.Patch.fromMutations({
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
    return this;
  }

  match(patch) {
    if(__DEV__) {
      patch.should.be.an.instanceOf(Remutable.Patch);
    }
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

  static fromJS({ h, v, d }) {
    return new Remutable(d, v, h);
  }

  static fromJSON(json) {
    return Remutable.fromJS(JSON.parse(json));
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

_Remutable = Remutable;

Remutable.hashFn = crc32;
Remutable.signFn = sigmund;
Remutable.Patch = Patch(Remutable);

Object.assign(Remutable, { Consumer, Producer });

module.exports = Remutable;
