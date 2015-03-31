"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

require("babel/polyfill");
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
module.exports = function (Remutable) {
  var Patch = (function () {
    function Patch(_ref) {
      var mutations = _ref.mutations;
      var from = _ref.from;
      var to = _ref.to;

      _classCallCheck(this, Patch);

      if (__DEV__) {
        mutations.should.be.an.Object;
        from.should.be.an.Object;
        from.h.should.be.ok;
        from.v.should.be.a.Number;
        to.should.be.an.Object;
        to.h.should.be.ok;
        to.v.should.be.a.Number;
      }
      Object.assign(this, {
        mutations: mutations,
        from: from,
        to: to,
        _js: null,
        _json: null });
      _.bindAll(this, ["toJS", "toJSON"]);
    }

    _createClass(Patch, {
      source: {
        get: function () {
          return this.from.h;
        }
      },
      target: {
        get: function () {
          return this.to.h;
        }
      },
      toJS: {
        value: function toJS() {
          if (this._js === null) {
            this._js = {
              m: this.mutations,
              f: this.from,
              t: this.to };
          }
          return this._js;
        }
      },
      toJSON: {
        value: function toJSON() {
          if (this._json === null) {
            this._json = JSON.stringify(this.toJS());
          }
          return this._json;
        }
      }
    }, {
      revert: {
        value: function revert(patch) {
          var mutations = {};
          Object.keys(patch.mutations).forEach(function (key) {
            var _patch$mutations$key = patch.mutations[key];
            var f = _patch$mutations$key.f;
            var t = _patch$mutations$key.t;

            mutations[key] = { f: t, t: f };
          });
          return new Patch({
            mutations: mutations,
            from: { h: patch.to.h, v: patch.to.v },
            to: { h: patch.from.h, v: patch.from.v }
          });
        }
      },
      fromMutations: {
        value: function fromMutations(_ref) {
          var mutations = _ref.mutations;
          var hash = _ref.hash;
          var version = _ref.version;

          var from = { h: hash, v: version };
          // New hash is calculated so that if two identical remutables are updated
          // using structurally equal mutations, then they will get the same hash.
          var to = { h: Remutable.hashFn(hash + Remutable.signFn(mutations)), v: version + 1 };
          return new Patch({ mutations: mutations, from: from, to: to });
        }
      },
      fromJS: {
        value: function fromJS(_ref) {
          var m = _ref.m;
          var f = _ref.f;
          var t = _ref.t;

          if (__DEV__) {
            m.should.be.an.Object;
            f.should.be.an.Object;
            t.should.be.an.Object;
          }
          return new Patch({ mutations: m, from: f, to: t });
        }
      },
      fromJSON: {
        value: function fromJSON(json) {
          return Patch.fromJS(JSON.parse(json));
        }
      },
      combine: {
        value: function combine(patchA, patchB) {
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
        }
      },
      fromDiff: {
        value: function fromDiff(prev, next) {
          if (__DEV__) {
            (prev instanceof Remutable || prev instanceof Remutable.Consumer).should.be.ok;
            (next instanceof Remutable || next instanceof Remutable.Consumer).should.be.ok;
            prev.version.should.be.below(next.version);
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
        }
      }
    });

    return Patch;
  })();

  return Patch;
};