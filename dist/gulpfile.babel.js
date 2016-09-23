'use strict';

var _gulpEslint = require('gulp-eslint');

var _gulpEslint2 = _interopRequireDefault(_gulpEslint);

var _gulp = require('gulp');

var _gulp2 = _interopRequireDefault(_gulp);

var _gulpBabel = require('gulp-babel');

var _gulpBabel2 = _interopRequireDefault(_gulpBabel);

var _gulpMocha = require('gulp-mocha');

var _gulpMocha2 = _interopRequireDefault(_gulpMocha);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_gulp2.default.task('lint', function () {
  return _gulp2.default.src('**/*.js').pipe((0, _gulpEslint2.default)()).pipe(_gulpEslint2.default.format());
});

_gulp2.default.task('build', ['lint'], function () {
  return _gulp2.default.src('**/*.js').pipe((0, _gulpBabel2.default)()).pipe(_gulp2.default.dest('dist'));
});

_gulp2.default.task('test', ['build'], function () {
  return _gulp2.default.src('test/**.spec.js').pipe((0, _gulpBabel2.default)()).pipe((0, _gulpMocha2.default)());
});

_gulp2.default.task('default', ['build']);