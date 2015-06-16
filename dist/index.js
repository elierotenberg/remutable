'use strict';

var _Object$defineProperty = require('babel-runtime/core-js/object/define-property')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

_Object$defineProperty(exports, '__esModule', {
  value: true
});

var _Remutable = require('./Remutable');

var _Remutable2 = _interopRequireDefault(_Remutable);

var _Patch = require('./Patch');

var _Patch2 = _interopRequireDefault(_Patch);

_Object$assign(_Remutable2['default'], { Patch: _Patch2['default'] });

exports['default'] = _Remutable2['default'];
module.exports = exports['default'];