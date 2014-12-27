"use strict";

var _classProps = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

require("6to5/polyfill");var Promise = (global || window).Promise = require("lodash-next").Promise;var __DEV__ = (process.env.NODE_ENV !== "production");var __PROD__ = !__DEV__;var __BROWSER__ = (typeof window === "object");var __NODE__ = !__BROWSER__;var _ = require("lodash-next");
var sha1 = require("sha1");
var sigmund = require("sigmund");

var Patch = (function () {
  var Patch = function Patch(_ref) {
    var m = _ref.m;
    var f = _ref.f;
    var t = _ref.t;
    _.extend(this, { m: m, f: f, t: t });
  };

  Patch.prototype.serialize = function () {
    var _ref2 = this;
    var m = _ref2.m;
    var f = _ref2.f;
    var t = _ref2.t;
    return JSON.stringify({ m: m, f: f, t: t });
  };

  Patch.prototype.reverse = function () {
    var _this = this;
    var m = {};
    Object.keys(this.m).forEach(function (k) {
      var f = _this.m[k].f;
      var t = _this.m[k].t;
      m[k] = { f: t, t: f };
    });
    var h = this.t.h;
    var v = this.t.v;
    return Patch.create({ m: m, h: h, v: v });
  };

  Patch.create = function (_ref3) {
    var m = _ref3.m;
    var h = _ref3.h;
    var v = _ref3.v;
    var f = { h: h, v: v };
    var t = { h: sha1(h + sigmund(m)), v: v + 1 };
    return new Patch({ m: m, f: f, t: t });
  };

  Patch.unserialize = function (str) {
    var _ref4 = JSON.parse(str);

    var m = _ref4.m;
    var f = _ref4.f;
    var t = _ref4.t;
    return new Patch({ m: m, f: f, t: t });
  };

  return Patch;
})();

var Remutable = (function () {
  var Remutable = function Remutable() {
    this._d = {}; // data
    this._m = {}; // mutations
    this._v = 0; // version
    this._h = sha1(sigmund({})); // hash
    this._x = false; // dirty
  };

  Remutable.prototype.get = function (k) {
    if (this._m[k] !== void 0) {
      return this._m[k].t;
    }
    return this._d[k];
  };

  Remutable.prototype.check = function (k) {
    return this._d[k];
  };

  Remutable.prototype.set = function (k, v) {
    this._x = true;
    var f = this._d[k];
    var t = v;
    this._m[k] = { f: f, t: t };
    return this;
  };

  Remutable.prototype.del = function (k) {
    return this.set(k, void 0);
  };

  Remutable.prototype.checkout = function (key) {
    return this._d[key];
  };

  Remutable.prototype.keys = function () {
    var _this2 = this;
    var m = {};
    Object.keys(this._d).forEach(function (k) {
      return m[k] = true;
    });
    Object.keys(this._m).forEach(function (k) {
      var f = _this2._m[t].f;
      var t = _this2._m[t].t;
      if (t === void 0 && f !== void 0) {
        delete m[k];
      } else {
        m[k] = true;
      }
    });
    return Object.keys(m);
  };

  Remutable.prototype.map = function (fn) {
    var _this3 = this;
    // fn(value, key): any
    return this.keys().map(function (key) {
      return fn(_this3.get(key), key);
    });
  };

  Remutable.prototype.destroy = function () {
    this._m = null;
    this._d = null;
    this._v = {}; // === {} will always be falsy unless referentially equal
    this._h = {}; // === {} will always be falsy unless rerefentially equal
  };

  Remutable.prototype.commit = function () {
    this.dirty.should.be.ok;
    var patch = Patch.create({ m: this._m, h: this._h, v: this._v });
    this._m = {};
    this._x = false;
    this.apply(patch);
    return patch;
  };

  Remutable.prototype.equals = function (r) {
    _.dev(function () {
      return r.should.be.an.instanceOf(Remutable);
    });
    this.dirty.should.not.be.ok;
    r.dirty.should.not.be.ok;
    return this._h === r._h;
  };

  Remutable.prototype.rollback = function () {
    this._m = {};
    this._x = false;
  };

  Remutable.prototype.canApply = function (patch) {
    _.dev(function () {
      return patch.should.be.an.instanceOf(Patch);
    });
    return (this._h === patch.f.h);
  };

  Remutable.prototype.apply = function (patch) {
    var _this4 = this;
    this.dirty.should.not.be.ok;
    this.canApply(patch).should.be.ok;
    Object.keys(patch.m).forEach(function (k) {
      var t = patch.m[k].t;
      if (t === void 0) {
        delete _this4._d[k];
      } else {
        _this4._d[k] = t;
      }
    });
    this._h = patch.t.h;
    this._v = patch.t.v;
    return this;
  };

  Remutable.prototype.serialize = function () {
    this.dirty.should.not.be.ok;
    return JSON.stringify({
      h: this._h,
      v: this._v,
      d: this._d });
  };

  Remutable.unserialize = function (serialized) {
    var _ref5 = JSON.parse(serialized);

    var h = _ref5.h;
    var v = _ref5.v;
    var d = _ref5.d;
    _.dev(function () {
      return h.should.be.a.String && v.should.be.a.Number && d.should.be.an.Object;
    });
    return _.extend(new Remutable(), {
      _h: h,
      _v: v,
      _d: d });
  };

  _classProps(Remutable, null, {
    dirty: {
      get: function () {
        return !!this._x;
      }
    },
    hash: {
      get: function () {
        return this._h;
      }
    },
    uid: {
      get: function () {
        return "" + this._h + ":" + this._v;
      }
    }
  });

  return Remutable;
})();

_.extend(Remutable.prototype, {
  _d: null,
  _m: null,
  _v: null,
  _h: null,
  _x: null });

module.exports = Remutable;