"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) {
  if (staticProps) Object.defineProperties(child, staticProps);
  if (instanceProps) Object.defineProperties(child.prototype, instanceProps);
};

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
}
module.exports = function (Remutable) {
  var Patch = function Patch(_ref) {
    var mutations = _ref.mutations;
    var from = _ref.from;
    var to = _ref.to;
    if (__DEV__) {
      mutations.should.be.an.Object;
      from.should.be.an.Object;
      from.h.should.be.ok;
      from.v.should.be.a.Number;
      to.should.be.an.Object;
      to.h.should.be.ok;
      to.v.should.be.a.Number;
    }
    _.extend(this, {
      mutations: mutations,
      from: from,
      to: to });
    this._serialized = null;

    _.bindAll(this);
  };

  Patch.prototype.toJSON = function () {
    if (this._serialized === null) {
      this._serialized = JSON.stringify({
        m: this.mutations,
        f: this.from,
        t: this.to });
    }
    return this._serialized;
  };

  Patch.revert = function (patch) {
    var mutations = {};
    Object.keys(patch.mutations).forEach(function (key) {
      var f = patch.mutations[key].f;
      var t = patch.mutations[key].t;
      mutations[key] = { f: t, t: f };
    });
    return Patch.fromMutations({ mutations: mutations, hash: patch.to.h, version: patch.to.v });
  };

  Patch.fromMutations = function (_ref2, coerceTo) {
    var mutations = _ref2.mutations;
    var hash = _ref2.hash;
    var version = _ref2.version;
    var from = { h: hash, v: version };
    // New hash is calculated so that if two identical remutables are updated
    // using structurally equal mutations, then they will get the same hash.
    var to = coerceTo || { h: Remutable.hashFn(hash + Remutable.signFn(mutations)), v: version + 1 };
    return new Patch({ mutations: mutations, from: from, to: to });
  };

  Patch.fromJSON = function (json) {
    var _ref3 = JSON.parse(json);

    var m = _ref3.m;
    var f = _ref3.f;
    var t = _ref3.t;
    return new Patch({ mutations: m, from: f, to: t });
  };

  Patch.combine = function (patchA, patchB) {
    if (__DEV__) {
      patchA.should.be.an.instanceOf(Patch);
      patchB.should.be.an.instanceOf(Patch);
      // One can only combine compatible patches
      patchA.target.should.be.exactly(patchB.source);
    }
    return new Patch({
      mutations: _.extend(_.clone(patchA.mutations), patchB.mutations),
      from: _.clone(patchA.from),
      to: _.clone(patchB.to) });
  };

  Patch.fromDiff = function (prev, next) {
    if (__DEV__) {
      (prev instanceof Remutable || prev instanceof Remutable.Consumer).should.be.ok;
      (next instanceof Remutable || next instanceof Remutable.Consumer).should.be.ok;
      prev.version.should.be.below(next.version);
      prev.dirty.should.not.be.ok;
      next.dirty.should.not.be.ok;
    }
    var from = {
      h: prev.hash,
      v: prev.version };
    var to = {
      h: next.hash,
      v: next.version };
    var mutations = {};
    var diffKeys = {};
    [prev, next].forEach(function (rem) {
      return rem.head.forEach(function (val, key) {
        return prev.head.get(key) !== next.head.get(key) ? diffKeys[key] = null : void 0;
      });
    });
    Object.keys(diffKeys).forEach(function (key) {
      return mutations[key] = { f: prev.head.get(key), t: next.head.get(key) };
    });
    return new Patch({ mutations: mutations, from: from, to: to });
  };

  _prototypeProperties(Patch, null, {
    source: {
      get: function () {
        return this.from.h;
      },
      enumerable: true
    },
    target: {
      get: function () {
        return this.to.h;
      },
      enumerable: true
    }
  });

  return Patch;
};