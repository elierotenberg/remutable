"use strict";

require("6to5/polyfill");var Promise = (global || window).Promise = require("lodash-next").Promise;var __DEV__ = (process.env.NODE_ENV !== "production");var __PROD__ = !__DEV__;var __BROWSER__ = (typeof window === "object");var __NODE__ = !__BROWSER__;var _ = require("lodash-next");

var MUTATIONS = {
  SET: "s",
  DEL: "d" };

var Remutable = (function () {
  var Remutable = function Remutable() {
    this._data = {};
    this._mutations = {};
    this._version = 0;
    this._remutableId = _.random(0, 4294967296);
  };

  Remutable.prototype.get = function (key) {
    if (this._mutations[key] !== void 0) {
      var m = this._mutations[key].m;
      var v = this._mutations[key].v;
      if (m === MUTATIONS.DEL) {
        return void 0;
      }
      if (m === MUTATIONS.SET) {
        return v;
      }
    }
    return this._data[key];
  };

  Remutable.prototype.set = function (key, val) {
    this._mutations[key] = { d: MUTATIONS.SET, v: val };
  };

  Remutable.prototype.del = function (key) {
    this._mutations[key] = { d: MUTATIONS.DEL };
  };

  Remutable.prototype.commit = function () {
    return this._applyPatchWithoutCheckingMutations({
      remutableId: this._remutableId,
      mutations: this._mutations,
      prev: this._version,
      next: this._version + 1 });
  };

  Remutable.prototype.rollback = function () {
    this._mutations = {};
  };

  Remutable.prototype._applyPatchWithoutCheckingMutations = function (patch) {
    var _this = this;
    var remutableId = patch.remutableId;
    var mutations = patch.mutations;
    var prev = patch.prev;
    var next = patch.next;
    this._remutableId.should.be.exactly(remutableId);
    this._version.should.be.exactly(prev);
    Object.keys(mutations).forEach(function (key) {
      var m = _this._mutations[key].m;
      var v = _this._mutations[key].v;
      if (m === MUTATIONS.DEL) {
        delete _this._data[key];
      }
      if (m === MUTATIONS.SET) {
        _this._data[key] = v;
      }
    });
    this._version = next;
    this._mutations = {};
    return patch;
  };

  Remutable.prototype.apply = function (patch) {
    this._mutations.should.eql({});
    return this._applyPatchWithoutCheckingMutations(patch);
  };

  Remutable.prototype.serialize = function () {
    return JSON.stringify({
      remutableId: this._remutableId,
      version: this._version,
      data: this._data });
  };

  Remutable.unserialize = function (serialized) {
    var _ref = JSON.parse(serialized);

    var remutableId = _ref.remutableId;
    var version = _ref.version;
    var data = _ref.data;
    _.dev(function () {
      return remutableId.should.be.a.Number && version.should.be.a.Number && data.should.be.an.Object;
    });
    var remutable = new Remutable();
    remutable._remutableId = remutableId;
    remutable._version = version;
    remutable._data = data;
    return remutable;
  };

  return Remutable;
})();

_.extend(Remutable.prototype, {
  _data: null,
  _mutations: null,
  _version: null,
  _remutableId: null });

module.exports = Remutable;