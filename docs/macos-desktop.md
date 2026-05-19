# macOS Desktop Build

This project can be packaged as a local macOS desktop app with Electron.

## Development

```bash
npm install
npm run desktop:dev
```

`desktop:dev` builds the Vite frontend and starts Electron. Electron starts the
local Express API and the Python analysis service, then opens the app window.

## Packaging

```bash
npm run desktop:pack
npm run desktop:dist
```

- `desktop:pack` creates an unpacked `.app` in `release/`.
- `desktop:dist` creates a local `.dmg` in `release/`.

The first version is intended for local use and disables macOS code signing.
Gatekeeper may block copies distributed to other machines.

## Runtime Data

The desktop app writes mutable data outside the application bundle:

- SQLite database
- Claude runtime workspaces
- task outputs
- analysis workspace
- service logs

The location is `~/Library/Application Support/Digital Employee/`.

## Python Runtime

The packaged app expects `analysis_service/.venv/bin/python` to exist when
building if you want the app to run without a system Python installation:

```bash
cd analysis_service
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

If the bundled virtual environment is absent, the app falls back to `python3`
from the user's PATH.
