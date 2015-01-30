"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

require("6to5/polyfill");
var _ = require("lodash");
var should = require("should");
var Promise = (global || window).Promise = require("bluebird");
var __DEV__ = process.env.NODE_ENV !== "production";
var __PROD__ = !__DEV__;
var __BROWSER__ = typeof window === "object";
var __NODE__ = !__BROWSER__;
if (__DEV__) {
  Promise.longStackTraces();
  Error.stackTraceLimit = Infinity;
}
var crc32 = require("crc-32").str;
var sigmund = require("sigmund");
var Immutable = require("immutable");

var Patch = require("./Patch");

var _Remutable = undefined;

var Consumer = function Consumer(ctx) {
  var _this = this;
  if (__DEV__) {
    ctx.should.be.an.instanceOf(_Remutable);
  }
  this._ctx = ctx;
  // proxy all these methods to ctx
  ["toJS", "toJSON"].forEach(function (m) {
    return _this[m] = ctx[m];
  });
  // proxy all these property getters to ctx
  ["head", "hash", "version"].forEach(function (p) {
    return Object.defineProperty(_this, p, {
      enumerable: true,
      get: function () {
        return ctx[p];
      } });
  });
};

var Producer = (function () {
  function Producer(ctx) {
    var _this = this;
    if (__DEV__) {
      ctx.should.be.an.instanceOf(_Remutable);
    }
    _.bindAll(this, ["set", "apply"]);
    this._ctx = ctx;
    // proxy all these methods to ctx
    ["delete", "rollback", "commit", "match", "toJS", "toJSON"].forEach(function (m) {
      return _this[m] = ctx[m];
    });
    // proxy all these property getters to ctx
    ["head", "working", "hash", "version"].forEach(function (p) {
      return Object.defineProperty(_this, p, {
        enumerable: true,
        get: function () {
          return ctx[p];
        } });
    });
  }

  _prototypeProperties(Producer, null, {
    set: {
      value: function set() {
        // intercept set to make it chainable
        this._ctx.set.apply(this._ctx, arguments);
        return this;
      },
      writable: true,
      configurable: true
    },
    apply: {
      value: function apply() {
        // intercept apply to make it chainable
        this._ctx.apply.apply(this._ctx, arguments);
        return this;
      },
      writable: true,
      configurable: true
    }
  });

  return Producer;
})();

var Remutable = (function () {
  function Remutable() {
    var data = arguments[0] === undefined ? {} : arguments[0];
    var version = arguments[1] === undefined ? 0 : arguments[1];
    var hash = arguments[2] === undefined ? null : arguments[2];
    hash = hash || Remutable.hashFn(Remutable.signFn(data));

    if (__DEV__) {
      data.should.be.an.Object;
      version.should.be.a.Number;
    }
    _.bindAll(this, ["createConsumer", "createProducer", "destroy", "toJS", "toJSON", "get", "set", "delete", "commit", "rollback", "match", "apply"]);

    this._head = Immutable.Map(data);
    this._working = this._head;

    this._version = version;
    this._hash = hash;
    this._dirty = false;
    this._mutations = {};
    this._js = {
      hash: {},
      js: null };
    this._json = {
      hash: {},
      json: null };
  }

  _prototypeProperties(Remutable, {
    fromJS: {
      value: function fromJS(_ref) {
        var h = _ref.h;
        var v = _ref.v;
        var d = _ref.d;
        return new Remutable(d, v, h);
      },
      writable: true,
      configurable: true
    },
    fromJSON: {
      value: function fromJSON(json) {
        return Remutable.fromJS(JSON.parse(json));
      },
      writable: true,
      configurable: true
    }
  }, {
    dirty: {
      get: function () {
        return this._dirty;
      },
      configurable: true
    },
    hash: {
      get: function () {
        return this._hash;
      },
      configurable: true
    },
    version: {
      get: function () {
        return this._version;
      },
      configurable: true
    },
    head: {
      get: function () {
        return this._head;
      },
      configurable: true
    },
    working: {
      get: function () {
        return this._working;
      },
      configurable: true
    },
    createConsumer: {
      value: function createConsumer() {
        return new Consumer(this);
      },
      writable: true,
      configurable: true
    },
    createProducer: {
      value: function createProducer() {
        return new Producer(this);
      },
      writable: true,
      configurable: true
    },
    destroy: {
      value: function destroy() {
        // Explicitly nullify references
        this._head = null;
        this._working = null;
        this._dirty = null;
        this._mutations = null;
        this._serialized = null;
      },
      writable: true,
      configurable: true
    },
    toJS: {
      value: function toJS() {
        if (this._js.hash !== this._hash) {
          this._js = {
            hash: this._hash,
            js: {
              h: this._hash,
              v: this._version,
              d: this._head.toJS() } };
        }
        return this._js.js;
      },
      writable: true,
      configurable: true
    },
    toJSON: {
      value: function toJSON() {
        if (this._json.hash !== this._hash) {
          this._json = {
            hash: this._hash,
            json: JSON.stringify(this.toJS()) };
        }
        return this._json.json;
      },
      writable: true,
      configurable: true
    },
    get: {
      value: function get(key) {
        return this._working.get(key);
      },
      writable: true,
      configurable: true
    },
    set: {
      value: function set(key, val) {
        key.should.be.a.String;
        this._dirty = true;
        // Retain the previous value to make the patch reversible
        var f = this._head.get(key);
        var t = val;
        this._mutations[key] = { f: f, t: t };
        if (val === void 0) {
          this._working = this._working["delete"](key);
        } else {
          this._working = this._working.set(key, val);
        }
        return this;
      },
      writable: true,
      configurable: true
    },
    "delete": {
      value: function _delete(key) {
        return this.set(key, void 0);
      },
      writable: true,
      configurable: true
    },
    commit: {
      value: function commit() {
        this._dirty.should.be.ok;
        var patch = Remutable.Patch.fromMutations({
          mutations: this._mutations,
          hash: this._hash,
          version: this._version });
        this._head = this._working;
        this._mutations = {};
        this._dirty = false;
        this._hash = patch.to.h;
        this._version = patch.to.v;
        return patch;
      },
      writable: true,
      configurable: true
    },
    rollback: {
      value: function rollback() {
        this._working = this._head;
        this._mutations = {};
        this._dirty = false;
        return this;
      },
      writable: true,
      configurable: true
    },
    match: {
      value: function match(patch) {
        if (__DEV__) {
          patch.should.be.an.instanceOf(Remutable.Patch);
        }
        return this._hash === patch.from.h;
      },
      writable: true,
      configurable: true
    },
    apply: {
      value: function apply(patch) {
        this._dirty.should.not.be.ok;
        this.match(patch).should.be.ok;
        var head = this._head.withMutations(function (map) {
          Object.keys(patch.mutations).forEach(function (key) {
            var t = patch.mutations[key].t;
            if (t === void 0) {
              map = map["delete"](key);
            } else {
              map = map.set(key, t);
            }
          });
          return map;
        });
        this._working = this._head = head;
        this._hash = patch.to.h;
        this._version = patch.to.v;
        return this;
      },
      writable: true,
      configurable: true
    }
  });

  return Remutable;
})();

_.extend(Remutable.prototype, {
  _head: null,
  _working: null,
  _mutations: null,
  _hash: null,
  _version: null,
  _dirty: null });

_Remutable = Remutable;

Remutable.hashFn = crc32;
Remutable.signFn = sigmund;
Remutable.Patch = Patch(Remutable);

Object.assign(Remutable, { Consumer: Consumer, Producer: Producer });

module.exports = Remutable;