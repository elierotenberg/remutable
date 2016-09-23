import eslint from 'gulp-eslint';
import gulp from 'gulp';
import babel from 'gulp-babel';
import mocha from 'gulp-mocha';

gulp.task('lint', () =>
  gulp.src(['src/**/*.js', 'test/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
);

gulp.task('build', ['lint'], () =>
  gulp.src('src/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('dist'))
  );

gulp.task('test', ['build'], () =>
  gulp.src('test/**.spec.js')
    .pipe(babel())
    .pipe(mocha())
);

gulp.task('default', ['build']);
