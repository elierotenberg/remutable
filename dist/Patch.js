"use strict";

require("6to5/polyfill");var Promise = (global || window).Promise = require("lodash-next").Promise;var __DEV__ = process.env.NODE_ENV !== "production";var __PROD__ = !__DEV__;var __BROWSER__ = typeof window === "object";var __NODE__ = !__BROWSER__;var _ = require("lodash-next");
var sha1 = require("sha1");
var sigmund = require("sigmund");

var Patch = function Patch(_ref) {
  var mutations = _ref.mutations;
  var from = _ref.from;
  var to = _ref.to;
  _.dev(function () {
    return mutations.should.be.an.Object && from.should.be.an.Object && from.h.should.be.a.String && from.v.should.be.a.Number && to.should.be.an.Object && to.h.should.be.a.String && to.v.should.be.a.Number;
  });
  _.extend(this, {
    mutations: mutations,
    from: from,
    to: to });
  this._serialized = null;
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

Patch.fromMutations = function (_ref2) {
  var mutations = _ref2.mutations;
  var hash = _ref2.hash;
  var version = _ref2.version;
  var from = { h: hash, v: version };
  // New hash is calculated so that if two identical remutables are updated
  // using structurally equal mutations, then they will get the same hash.
  var to = { h: sha1(hash + sigmund(mutations)), v: version + 1 };
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
  _.dev(function () {
    return patchA.should.be.an.instanceOf(Patch) && patchB.should.be.an.instanceOf(Patch) &&
    // One can only combine compatible patches
    patchA.to.h.should.be.exactly(patchB.from.h);
  });
  return new Patch({
    mutations: _.extend(_.clone(patchA.mutations), patchB.mutations),
    from: _.clone(patchA.from),
    to: _.clone(patchB.to) });
};

module.exports = Patch;