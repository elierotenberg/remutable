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
    var mutations = _ref.mutations;
    var from = _ref.from;
    var to = _ref.to;
    _.extend(this, { mutations: mutations, from: from, to: to });
  };

  Patch.prototype.serialize = function () {
    var _ref2 = this;
    var mutations = _ref2.mutations;
    var from = _ref2.from;
    var to = _ref2.to;
    return JSON.stringify({
      m: mutations,
      f: from,
      t: to });
  };

  Patch.prototype.reverse = function () {
    var _this = this;
    var mutations = {};
    Object.keys(this.mutations).forEach(function (key) {
      var f = _this.mutations[key].f;
      var t = _this.mutations[key].t;
      mutations[key] = { f: t, t: f };
    });
    return Patch.create({ mutations: mutations, hash: this.to.h, version: this.to.v });
  };

  Patch.create = function (_ref3) {
    var mutations = _ref3.mutations;
    var hash = _ref3.hash;
    var version = _ref3.version;
    var from = { h: hash, v: version };
    var to = { h: sha1(hash + sigmund(mutations)), v: version + 1 };
    return new Patch({ mutations: mutations, from: from, to: to });
  };

  Patch.unserialize = function (str) {
    var _ref4 = JSON.parse(str);

    var m = _ref4.m;
    var f = _ref4.f;
    var t = _ref4.t;
    return new Patch({ mutations: m, from: f, to: t });
  };

  _classProps(Patch, null, {
    hash: {
      get: function () {
        return "" + this.from.hash + ":" + this.to.hash;
      }
    }
  });

  return Patch;
})();

module.exports = Patch;