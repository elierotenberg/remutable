"use strict";

var _classProps = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

require("6to5/polyfill");var Promise = (global || window).Promise = require("lodash-next").Promise;var __DEV__ = (process.env.NODE_ENV !== "production");var __PROD__ = !__DEV__;var __BROWSER__ = (typeof window === "object");var __NODE__ = !__BROWSER__;var _ = require("lodash-next");
var sha1 = require("sha1");
var sigmund = require("sigmund");

var Patch = require("./Patch");

var Remutable = (function () {
  var Remutable = function Remutable() {
    this._data = {};
    this._mutations = {};
    this._version = 0;
    this._hash = sha1(sigmund({}));
    this._dirty = false;
    this._serialized = {
      h: this._hash,
      v: this._version,
      s: JSON.stringify({ h: this._hash, v: this._version, d: this._data }) };
  };

  Remutable.prototype.get = function (key) {
    if (this._mutations[key] !== void 0) {
      return this._mutations[key].t;
    }
    return this._data[key];
  };

  Remutable.prototype.check = function (key) {
    return this._data[key];
  };

  Remutable.prototype.set = function (key, val) {
    this._dirty = true;
    var f = this._data[key];
    var t = val;
    this._mutations[key] = { f: f, t: t };
    return this;
  };

  Remutable.prototype.del = function (key) {
    return this.set(key, void 0);
  };

  Remutable.prototype.checkout = function (key) {
    return this._data[key];
  };

  Remutable.prototype.keys = function () {
    var _this = this;
    var mutations = {};
    Object.keys(this._data).forEach(function (key) {
      return mutations[key] = true;
    });
    Object.keys(this._mutations).forEach(function (key) {
      var f = _this._mutations[t].f;
      var t = _this._mutations[t].t;
      if (t === void 0 && f !== void 0) {
        delete mutations[key];
      } else {
        mutations[key] = true;
      }
    });
    return Object.keys(mutations);
  };

  Remutable.prototype.map = function (fn) {
    var _this2 = this;
    // fn(value, key): any
    return this.keys().map(function (key) {
      return fn(_this2.get(key), key);
    });
  };

  Remutable.prototype.destroy = function () {
    this._mutations = null;
    this._data = null;
    this._version = {}; // === {} will always be falsy unless referentially equal
    this._hash = {}; // === {} will always be falsy unless rerefentially equal
  };

  Remutable.prototype.commit = function () {
    this.dirty.should.be.ok;
    var patch = Patch.create({
      mutations: this._mutations,
      hash: this._hash,
      version: this._version });
    this._mutations = {};
    this._dirty = false;
    this.apply(patch);
    return patch;
  };

  Remutable.prototype.equals = function (otherRemutable) {
    _.dev(function () {
      return otherRemutable.should.be.an.instanceOf(Remutable);
    });
    this.dirty.should.not.be.ok;
    otherRemutable.dirty.should.not.be.ok;
    return this._hash === otherRemutable._hash;
  };

  Remutable.prototype.rollback = function () {
    this._mutations = {};
    this._dirty = false;
  };

  Remutable.prototype.canApply = function (patch) {
    _.dev(function () {
      return patch.should.be.an.instanceOf(Patch);
    });
    return (this._hash === patch.from.h);
  };

  Remutable.prototype.apply = function (patch) {
    var _this3 = this;
    this.dirty.should.not.be.ok;
    this.canApply(patch).should.be.ok;
    Object.keys(patch.mutations).forEach(function (key) {
      var t = patch.mutations[key].t;
      if (t === void 0) {
        delete _this3._data[key];
      } else {
        _this3._data[key] = t;
      }
    });
    this._hash = patch.to.h;
    this._version = patch.to.v;
    return this;
  };

  Remutable.prototype.serialize = function () {
    if (this._serialized.h !== this._hash || this._serialized.v !== this._version) {
      this._serialized = {
        h: this._hash,
        v: this._version,
        s: JSON.stringify({ h: this._hash, v: this._version, d: this._data }) };
    }
    return this._serialized.s;
  };

  Remutable.unserialize = function (serialized) {
    var _ref = JSON.parse(serialized);

    var h = _ref.h;
    var v = _ref.v;
    var d = _ref.d;
    _.dev(function () {
      return h.should.be.a.String && v.should.be.a.Number && d.should.be.an.Object;
    });
    return _.extend(new Remutable(), {
      _hash: h,
      _version: v,
      _data: d });
  };

  _classProps(Remutable, null, {
    dirty: {
      get: function () {
        return !!this._dirty;
      }
    },
    hash: {
      get: function () {
        return this._hash;
      }
    },
    uid: {
      get: function () {
        return "" + this._hash + ":" + this._version;
      }
    }
  });

  return Remutable;
})();

_.extend(Remutable.prototype, {
  _data: null,
  _mutations: null,
  _version: null,
  _hash: null,
  _dirty: null });

Remutable.Patch = Patch;

module.exports = Remutable;