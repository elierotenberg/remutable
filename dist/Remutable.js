'use strict';

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _Object$defineProperty = require('babel-runtime/core-js/object/define-property')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

_Object$defineProperty(exports, '__esModule', {
  value: true
});

var _crc32 = require('crc-32');

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

var _Patch = require('./Patch');

var _Patch2 = _interopRequireDefault(_Patch);

var _ = require('lodash');
var should = require('should');
var Promise = (global || window).Promise = require('bluebird');
var __DEV__ = process.env.NODE_ENV !== 'production';
var __PROD__ = !__DEV__;
var __BROWSER__ = typeof window === 'object';
var __NODE__ = !__BROWSER__;
if (__DEV__) {
  Promise.longStackTraces();
  Error.stackTraceLimit = Infinity;
}

var _Remutable = undefined;

var Consumer = function Consumer(ctx) {
  var _this = this;

  _classCallCheck(this, Consumer);

  if (__DEV__) {
    ctx.should.be.an.instanceOf(_Remutable);
  }
  this._ctx = ctx;
  // proxy all these methods to ctx
  ['toJS', 'toJSON'].forEach(function (m) {
    return _this[m] = ctx[m];
  });
  // proxy all these property getters to ctx
  ['head', 'hash', 'version'].forEach(function (p) {
    return _Object$defineProperty(_this, p, {
      enumerable: true,
      get: function get() {
        return ctx[p];
      } });
  });
};

var Producer = (function () {
  function Producer(ctx) {
    var _this2 = this;

    _classCallCheck(this, Producer);

    if (__DEV__) {
      ctx.should.be.an.instanceOf(_Remutable);
    }
    _.bindAll(this, ['set', 'apply']);
    this._ctx = ctx;
    // proxy all these methods to ctx
    ['delete', 'rollback', 'commit', 'match', 'toJS', 'toJSON'].forEach(function (m) {
      return _this2[m] = ctx[m];
    });
    // proxy all these property getters to ctx
    ['head', 'working', 'hash', 'version'].forEach(function (p) {
      return _Object$defineProperty(_this2, p, {
        enumerable: true,
        get: function get() {
          return ctx[p];
        } });
    });
  }

  _createClass(Producer, [{
    key: 'set',

    // intercept set to make it chainable
    value: function set() {
      this._ctx.set.apply(this._ctx, arguments);
      return this;
    }
  }, {
    key: 'apply',

    // intercept apply to make it chainable
    value: function apply() {
      this._ctx.apply.apply(this._ctx, arguments);
      return this;
    }
  }]);

  return Producer;
})();

var Remutable = (function () {
  function Remutable() {
    var data = arguments[0] === undefined ? {} : arguments[0];
    var version = arguments[1] === undefined ? 0 : arguments[1];
    var hash = arguments[2] === undefined ? null : arguments[2];

    _classCallCheck(this, Remutable);

    hash = hash || Remutable.hashFn(Remutable.signFn(data));

    if (__DEV__) {
      data.should.be.an.Object;
      version.should.be.a.Number;
    }
    _.bindAll(this, ['createConsumer', 'createProducer', 'destroy', 'toJS', 'toJSON', 'get', 'set', 'delete', 'commit', 'rollback', 'match', 'apply']);

    this._head = new _immutable2['default'].Map(data);
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

  _createClass(Remutable, [{
    key: 'dirty',
    get: function () {
      return this._dirty;
    }
  }, {
    key: 'hash',
    get: function () {
      return this._hash;
    }
  }, {
    key: 'version',
    get: function () {
      return this._version;
    }
  }, {
    key: 'head',
    get: function () {
      return this._head;
    }
  }, {
    key: 'working',
    get: function () {
      return this._working;
    }
  }, {
    key: 'createConsumer',
    value: function createConsumer() {
      return new Consumer(this);
    }
  }, {
    key: 'createProducer',
    value: function createProducer() {
      return new Producer(this);
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      // Explicitly nullify references
      this._head = null;
      this._working = null;
      this._dirty = null;
      this._mutations = null;
      this._serialized = null;
    }
  }, {
    key: 'toJS',
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
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      if (this._json.hash !== this._hash) {
        this._json = {
          hash: this._hash,
          json: JSON.stringify(this.toJS()) };
      }
      return this._json.json;
    }
  }, {
    key: 'get',
    value: function get(key) {
      return this._working.get(key);
    }
  }, {
    key: 'set',
    value: function set(key, val) {
      key.should.be.a.String;
      this._dirty = true;
      // Retain the previous value to make the patch reversible
      var f = this._head.get(key);
      var t = val;
      this._mutations[key] = { f: f, t: t };
      if (val === void 0) {
        this._working = this._working['delete'](key);
      } else {
        this._working = this._working.set(key, val);
      }
      return this;
    }
  }, {
    key: 'delete',
    value: function _delete(key) {
      return this.set(key, void 0);
    }
  }, {
    key: 'commit',
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
    }
  }, {
    key: 'rollback',
    value: function rollback() {
      this._working = this._head;
      this._mutations = {};
      this._dirty = false;
      return this;
    }
  }, {
    key: 'match',
    value: function match(patch) {
      if (__DEV__) {
        patch.should.be.an.instanceOf(Remutable.Patch);
      }
      return this._hash === patch.from.h;
    }
  }, {
    key: 'apply',
    value: function apply(patch) {
      this._dirty.should.not.be.ok;
      this.match(patch).should.be.ok;
      var head = this._head.withMutations(function (map) {
        _Object$keys(patch.mutations).forEach(function (key) {
          var t = patch.mutations[key].t;

          if (t === void 0) {
            map = map['delete'](key);
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
    }
  }], [{
    key: 'fromJS',
    value: function fromJS(_ref) {
      var h = _ref.h;
      var v = _ref.v;
      var d = _ref.d;

      return new Remutable(d, v, h);
    }
  }, {
    key: 'fromJSON',
    value: function fromJSON(json) {
      return Remutable.fromJS(JSON.parse(json));
    }
  }]);

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

Remutable.hashFn = _crc32.str;
Remutable.signFn = JSON.stringify.bind(JSON);
Remutable.Patch = (0, _Patch2['default'])(Remutable);

_Object$assign(Remutable, { Consumer: Consumer, Producer: Producer });

exports['default'] = Remutable;
module.exports = exports['default'];