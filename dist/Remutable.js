"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

require("6to5/polyfill");var Promise = (global || window).Promise = require("lodash-next").Promise;var __DEV__ = process.env.NODE_ENV !== "production";var __PROD__ = !__DEV__;var __BROWSER__ = typeof window === "object";var __NODE__ = !__BROWSER__;var _ = require("lodash-next");
var crc32 = require("crc-32").str;
var sigmund = require("sigmund");
var Immutable = require("immutable");

var Patch = require("./Patch");

var Remutable = function Remutable(data, version, hash) {
  if (data === undefined) data = {};
  if (version === undefined) version = 0;
  if (hash === undefined) hash = null;
  hash = hash || Remutable.hashFn(Remutable.signFn(data));

  _.dev(function () {
    data.should.be.an.Object;
    version.should.be.a.Number;
  });

  this._head = Immutable.Map(data);
  this._working = this._head;

  this._version = version;
  this._hash = hash;
  this._dirty = false;
  this._mutations = {};
  this._serialized = {
    hash: {}, // Never match ===
    json: null };
};

Remutable.prototype.toJSON = function () {
  if (this._serialized.hash !== this._hash) {
    this._serialized = {
      hash: this._hash,
      json: JSON.stringify({
        h: this._hash,
        v: this._version,
        d: this._head.toObject()
      }) };
  }
  return this._serialized.json;
};

Remutable.prototype.get = function (key) {
  return this._working.get(key);
};

Remutable.prototype.set = function (key, val) {
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
};

Remutable.prototype["delete"] = function (key) {
  return this.set(key, void 0);
};

Remutable.prototype.commit = function () {
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
};

Remutable.prototype.rollback = function () {
  this._working = this._head;
  this._mutations = {};
  this._dirty = false;
};

Remutable.prototype.match = function (patch) {
  _.dev(function () {
    return patch.should.be.an.instanceOf(Remutable.Patch);
  });
  return this._hash === patch.from.h;
};

Remutable.prototype.apply = function (patch) {
  this._dirty.should.not.be.ok;
  this.match(patch).should.be.ok;
  var _head = this._head.withMutations(function (map) {
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
  this._working = this._head = _head;
  this._hash = patch.to.h;
  this._version = patch.to.v;
  return this;
};

Remutable.fromJSON = function (json) {
  var _ref = JSON.parse(json);

  var h = _ref.h;
  var v = _ref.v;
  var d = _ref.d;
  return new Remutable(d, v, h);
};

_prototypeProperties(Remutable, null, {
  dirty: {
    get: function () {
      return this._dirty;
    },
    enumerable: true
  },
  hash: {
    get: function () {
      return this._hash;
    },
    enumerable: true
  },
  head: {
    get: function () {
      return this._head;
    },
    enumerable: true
  },
  working: {
    get: function () {
      return this._working;
    },
    enumerable: true
  }
});

_.extend(Remutable.prototype, {
  _head: null,
  _working: null,
  _mutations: null,
  _hash: null,
  _version: null,
  _dirty: null });

Remutable.hashFn = crc32;
Remutable.signFn = sigmund;
Remutable.Patch = Patch(Remutable);

module.exports = Remutable;