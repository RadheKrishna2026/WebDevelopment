# E-Cell Web Projects

This folder contains four sample websites for the E-Cell web selection tasks. The pages are written as simple HTML, CSS and JavaScript projects and can be edited to practice web development.

## How to open

1. Extract the ZIP file.
2. Open `index.html` in a browser.
3. Click a project to open it.

## Projects

- `ges.html` — event countdown, three-day schedule and speaker flip cards.
- `markdown.html` — live Markdown preview, multiple notes and browser storage.
- `player.html` — music controls, playlist, seek bar and volume slider.
- `arena.html` — pitch timer and sample investor bidding interface.

## Pitch Arena server (optional)

The arena page has a local practice mode. To try its shared-room mode, install Node.js, run `npm install`, then `npm start` from this folder and open `http://localhost:3000/arena.html`. The shared mode uses an in-memory store, so restarting the server clears it. This is a practice project, not a secure production investment platform.

## Notes

- Summit dates, speaker profiles, startup details, investors and offers are example information, not official event or investment details.
- The music player loads sample audio from the internet, so playback needs a connection.
- Browser LocalStorage is used to save Markdown notes on the current device/browser.
