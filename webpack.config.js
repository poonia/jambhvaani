// Bundles the vanilla-JS ES modules under src/ into a single script for
// production hosting (e.g. GitHub Pages), and drives `webpack serve` for
// local development. Content (audio/covers/books.json), fonts, and icons
// are large static assets — copied through untouched, never run through a
// JS/CSS loader pipeline.
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const JS_BUNDLE = 'app.bundle.js';
const DEV_SERVER_PORT = Number(process.env.PORT) || 8125;

// Kept in sync with SHELL_ASSETS in sw.js by construction: the individual
// src/*.js entries collapse into the one bundle produced by this config,
// everything else is the same list of static shell assets sw.js already
// precaches for offline use.
const PROD_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  `./${JS_BUNDLE}`,
  './src/styles.css',
  './fonts/NotoSerif-latin.woff2',
  './fonts/NotoSerif-latin-italic.woff2',
  './fonts/Literata-latin.woff2',
  './fonts/Literata-latin-italic.woff2',
  './fonts/PlusJakartaSans-latin.woff2',
  './fonts/NotoSerifDevanagari.woff2',
  './fonts/NotoSansDevanagari.woff2',
  './fonts/siddhanta.ttf',
  './fonts/MaterialSymbolsOutlined.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

module.exports = (env, argv) => {
  // webpack-cli sets this when the config runs under `webpack serve` (not
  // for a one-shot `webpack --mode development` build) — used below both to
  // skip re-copying large static dirs (served straight from disk instead)
  // and to keep the service worker out of the dev server entirely.
  const isDevServer = !!env.WEBPACK_SERVE;

  return {
    entry: './src/app.js',
    output: {
      filename: JS_BUNDLE,
      path: path.resolve(__dirname, 'dist'),
      publicPath: '',
      clean: true,
    },
    devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
    plugins: [
      new webpack.DefinePlugin({
        // The service worker caches by a fixed URL/cache-name pair with no
        // build-time versioning, so it can't tell a rebuilt app.bundle.js
        // apart from the one it already cached — under the dev server's
        // live reload that means edits would keep getting masked by a
        // stale cached bundle. Registering it only outside `webpack serve`
        // sidesteps that; production and `serve:dist` still exercise the
        // real service worker.
        __DEV_NO_SW__: JSON.stringify(isDevServer),
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'index.html',
            to: 'index.html',
            transform(content) {
              return content
                .toString()
                .replace(
                  '<script type="module" src="src/app.js"></script>',
                  `<script src="${JS_BUNDLE}"></script>`
                );
            },
          },
          {
            from: 'sw.js',
            to: 'sw.js',
            transform(content) {
              return content
                .toString()
                .replace(
                  /const SHELL_ASSETS = \[[\s\S]*?\];/,
                  `const SHELL_ASSETS = ${JSON.stringify(PROD_SHELL_ASSETS, null, 2)};`
                );
            },
          },
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'src/styles.css', to: 'src/styles.css' },
          // Fonts/icons/content are tens to well over a hundred MB (the
          // real shabad audio). The dev server serves them straight from
          // disk via devServer.static below; only a real `build` needs
          // them actually copied into dist/.
          ...(isDevServer ? [] : [
            { from: 'fonts', to: 'fonts' },
            { from: 'icons', to: 'icons' },
            { from: 'content', to: 'content' },
          ]),
        ],
      }),
    ],
    optimization: {
      minimize: argv.mode === 'production',
    },
    // The JS bundle itself stays small; webpack's size hints are tuned for
    // JS/CSS and just add noise for the copied content (fonts, cover art,
    // and — especially — the multi-minute audio recordings), which are
    // expected to be large and aren't something a bundler setting can fix.
    performance: {
      hints: false,
    },
    devServer: {
      port: DEV_SERVER_PORT,
      open: false,
      hot: false, // plain vanilla JS with no HMR wiring — a full reload per change is more predictable
      liveReload: true,
      // Range requests matter here: the seek bar drags currentTime around
      // in the shabad audio stripe, and without proper 206 support Chrome
      // treats the file as non-seekable even once fully buffered. Express's
      // static middleware (which this ultimately runs on) handles that
      // correctly out of the box, unlike a bare python http.server.
      static: [
        { directory: path.resolve(__dirname, 'content'), publicPath: '/content' },
        { directory: path.resolve(__dirname, 'fonts'), publicPath: '/fonts' },
        { directory: path.resolve(__dirname, 'icons'), publicPath: '/icons' },
      ],
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
      client: {
        overlay: { errors: true, warnings: false, runtimeErrors: true },
      },
    },
  };
};
