# बिश्नोई शब्दवाणी — Jambhvaani

An offline-first Progressive Web App (PWA) for reading and listening to the
Shabadvaani of Shri Guru Jambheshwar Bhagwan, along with aarti and other
collections for the Bishnoi Samaj.

- **Live site:** https://poonia.github.io/jambhvaani/
- **Repository:** https://github.com/poonia/jambhvaani

## Features

- Read all 120 shabads, with the Devanagari text for each one
- Listen to each shabad. It plays as a time slice of one shared recording.
- Aarti collection and bookmarks
- Works offline. A service worker caches the app shell and all content after
  the first visit.
- Can be installed on phones and desktops (web app manifest and icons)

## Tech stack

- Plain JavaScript ES modules. No framework.
- [webpack](https://webpack.js.org/) bundles `src/` into one `app.bundle.js`
  for production and runs the dev server
- A service worker (`sw.js`) handles offline caching
- Hosted on GitHub Pages via the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package

## Project structure

```
.
├── index.html            # App entry page (loads src/app.js as an ES module in dev)
├── manifest.json         # PWA manifest
├── sw.js                 # Service worker (shell + content caching)
├── webpack.config.js     # Build + dev server config
├── src/
│   ├── app.js            # App bootstrap and routing
│   ├── state.js          # App state
│   ├── content.js        # Loads content/books.json
│   ├── audio-player.js   # Plays shabad slices from the shared audio file
│   ├── icons.js, util.js
│   ├── styles.css
│   └── views/            # home, book, shabad, aarti, bookmarks
├── content/
│   ├── books.json        # All books and shabads, with text and audio timestamps
│   └── assets/           # audio/, covers/, images/
├── fonts/                # Self-hosted web fonts
├── icons/                # PWA / home-screen icons
└── scripts/
    ├── dev-server.py     # Static server with Range support, used to test dist/
    └── check-audio.py    # Checks that every MP3 is constant bitrate (CBR)
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer, and npm
- Python 3, used by `serve:dist` and `check:audio`
- Git
- Optional: [`ffmpeg`](https://ffmpeg.org/), to re-encode audio when needed

## Local development

```bash
git clone https://github.com/poonia/jambhvaani.git
cd jambhvaani
npm install
npm run dev
```

Open http://localhost:8125. To use a different port, set it with
`PORT=9000 npm run dev`.

About the dev server:

- It reloads the page automatically when files in `src/` change. There is no
  hot module replacement.
- It serves `content/`, `fonts/` and `icons/` straight from disk instead of
  copying them.
- **The service worker is turned off** under `npm run dev`, so a cached bundle
  can't hide your edits. To test offline behaviour, use the production build
  described below.

## Validating locally before you deploy

Always check the production build before deploying. It is what GitHub Pages
will serve, and it is the only mode where the service worker runs.

1. **Check the audio files.** Shabads are played by seeking to exact
   timestamps, so every MP3 must be constant bitrate (CBR):

   ```bash
   npm run check:audio
   ```

   If a file shows `FAIL`, re-encode it as CBR:

   ```bash
   ffmpeg -i in.mp3 -map 0:a -map_metadata 0 -c:a libmp3lame -b:a 128k out.mp3
   ```

2. **Build for production.** This writes to `dist/`:

   ```bash
   npm run build
   ```

3. **Serve the built site** at http://localhost:8124:

   ```bash
   npm run serve:dist
   ```

4. **Check in the browser.** Chrome DevTools works well for this:
   - The home page loads, books open, and shabad text displays correctly
   - Audio plays and the seek bar works for a shabad partway through the book
     (for example shabad 50)
   - There are no errors in the Console
   - **Application → Service Workers:** `sw.js` is activated
   - **Application → Cache Storage:** `shabadvaani-shell-*` and
     `shabadvaani-content-*` are filled
   - **Network → Offline**, then reload: the app still works
   - **Application → Manifest:** no install errors are listed

If an old version keeps showing up, go to DevTools → Application → Storage and
click **Clear site data**, then reload.

### Changing cached files

`sw.js` caches files by fixed names and does not version them per build. When
you change app code or content that users already have cached, **increase the
cache version** in `sw.js` so browsers download the new files:

```js
const SHELL_CACHE = 'shabadvaani-shell-v9';     // bump when code, styles, fonts or icons change
const CONTENT_CACHE = 'shabadvaani-content-v3'; // bump when content/ changes
```

If you add or rename a file in `src/`, `fonts/` or `icons/`, also update
`SHELL_ASSETS` in `sw.js` and `PROD_SHELL_ASSETS` in `webpack.config.js`.

## Committing changes

`main` holds the source code. The built site lives on the separate `gh-pages`
branch, which the deploy script manages for you. `dist/` and `node_modules/`
are listed in `.gitignore`, so never commit them to `main`.

```bash
git checkout -b feature/short-description
git status
git add src/ content/ sw.js
git commit -m "Add bookmarks export"
git push -u origin feature/short-description
```

Then open a pull request on GitHub and merge it into `main`. If you work alone,
you can commit to `main` directly:

```bash
git checkout main
git pull
git add -A
git commit -m "Describe the change"
git push
```

Tips:

- Write short commit messages in the imperative, such as "Fix seek on
  shabad 12"
- Run `npm run build` before you commit to confirm the build still works
- Large files: GitHub rejects any file over **100 MB** and warns above 50 MB.
  `shabadvaani.mp3` is about 84 MB, so check new recordings with
  `du -h content/assets/audio/*` before you commit them.

## Deploying to GitHub Pages

### First-time setup

1. Push `main` to GitHub, as shown above.
2. Deploy once (see below). This creates the `gh-pages` branch.
3. On GitHub, go to **Settings → Pages → Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `gh-pages`, folder `/ (root)`
   - Click **Save**
4. After a minute or two the site is live at
   https://poonia.github.io/jambhvaani/

### Each deploy

Start from an up-to-date `main` that has passed the checks under
[Validating locally](#validating-locally-before-you-deploy):

```bash
git checkout main
git pull
npm run deploy
```

`npm run deploy` runs `npm run build` and then pushes the **contents** of
`dist/` to the top level of the `gh-pages` branch, with a `.nojekyll` file so
GitHub serves the files as-is. Don't push a `dist/` folder to `gh-pages` by
hand: Pages can only publish from `/ (root)` or `/docs`, so it will never
offer `dist` as a folder option. GitHub Pages usually updates within 1–2 minutes. You
can follow progress under the repository's **Actions** tab
("pages build and deployment").

Once it's live, open the site, reload it once so the new service worker
activates, and check that your change appears.

The build uses relative paths (`publicPath: ''`), so the app works under the
`/jambhvaani/` subpath without extra configuration.

## npm scripts

| Command               | What it does                                                   |
| --------------------- | -------------------------------------------------------------- |
| `npm run dev`         | Dev server with live reload on port 8125, service worker off   |
| `npm run build`       | Production build written to `dist/`                            |
| `npm run build:dev`   | Unminified development build written to `dist/`                |
| `npm run serve:dist`  | Serves `dist/` on port 8124, with Range support for audio      |
| `npm run check:audio` | Checks that every MP3 in `content/assets/audio` is CBR         |
| `npm run deploy`      | Builds, then publishes `dist/` to the `gh-pages` branch        |

## Troubleshooting

- **Changes don't show after a deploy.** The service worker is serving cached
  files. Bump the cache version in `sw.js` and deploy again. On your own
  device, clear the site data.
- **Audio starts or ends at the wrong time.** The MP3 is probably variable
  bitrate. Run `npm run check:audio` and re-encode the file as CBR.
- **Seeking doesn't work locally.** Use `npm run dev` or `npm run serve:dist`.
  Both support HTTP Range requests. `python3 -m http.server` does not.
- **`npm run deploy` fails to push.** Make sure `git push` works for this
  repository (credentials or the `gh auth login` command), and that
  `origin` points to `https://github.com/poonia/jambhvaani.git`.
- **On macOS, git says "You have not agreed to the Xcode license agreements".**
  Run `sudo xcodebuild -license` in Terminal and accept it, then try again.
