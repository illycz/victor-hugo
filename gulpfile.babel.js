import gulp from "gulp";
import gulpLoadPlugins from "gulp-load-plugins";
import {spawn} from "child_process";
import hugoBin from "hugo-bin";
import gutil from "gulp-util";
import BrowserSync from "browser-sync";
import watch from "gulp-watch";
import webpack from "webpack";
import webpackConfig from "./webpack.conf";

const $ = gulpLoadPlugins();
const browserSync = BrowserSync.create();

// Hugo arguments
const hugoArgsDefault = ["-d", "../dist", "-s", "site", "-v"];
const hugoArgsPreview = ["--buildDrafts", "--buildFuture"];

// Development tasks
gulp.task("hugo", (cb) => buildSite(cb));
gulp.task("hugo-preview", (cb) => buildSite(cb, hugoArgsPreview));

// Build/production tasks
gulp.task("build", ["css:production", "js"], (cb) => buildSite(cb, [], "production"));
gulp.task("build-preview", ["css:production", "js"], (cb) => buildSite(cb, hugoArgsPreview, "production"));

// Compile CSS with Sass
gulp.task("css:development", () => (
  gulp.src("./src/css/*.scss")
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass.sync({
      outputStyle: "expanded",
      precision: 10,
      includePaths: ["."]
    }).on("error", $.sass.logError))
    .pipe($.autoprefixer({browsers: ["> 1%", "last 2 versions", "Firefox ESR"]}))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest("./dist/css"))
    .pipe(browserSync.stream())
));

gulp.task("css:production", () => (
  gulp.src("./src/css/*.scss")
    .pipe($.plumber())
    .pipe($.sass.sync({
      outputStyle: "expanded",
      precision: 10,
      includePaths: ["."]
    }).on("error", $.sass.logError))
    .pipe($.autoprefixer({browsers: ["> 1%", "last 2 versions", "Firefox ESR"]}))
    .pipe($.cssnano({safe: true, autoprefixer: false}))
    .pipe(gulp.dest("./dist/css"))
    .pipe(browserSync.stream())
));

// Compile Javascript
gulp.task("js", (cb) => {
  const myConfig = Object.assign({}, webpackConfig);

  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      colors: true,
      progress: true
    }));
    browserSync.reload();
    cb();
  });
});

// Development server with browsersync
gulp.task("server", ["hugo", "css:development", "js"], () => {
  browserSync.init({
    server: {
      baseDir: "./dist"
    }
  });
  watch("./src/js/**/*.js", () => { gulp.start(["js"]); });
  watch("./src/css/**/*.scss", () => { gulp.start(["css:development"]); });
  watch("./site/**/*", () => { gulp.start(["hugo"]); });
});

/**
 * Run hugo and build the site
 */
function buildSite(cb, options, environment = "development") {
  const args = options ? hugoArgsDefault.concat(options) : hugoArgsDefault;

  process.env.NODE_ENV = environment;

  return spawn(hugoBin, args, {stdio: "inherit"}).on("close", (code) => {
    if (code === 0) {
      browserSync.reload();
      cb();
    } else {
      browserSync.notify("Hugo build failed :(");
      cb("Hugo build failed");
    }
  });
}
