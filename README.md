# Grid Drawer Maker

A browser-based Gridfinity drawer layout designer. Arrange bins on a grid that maps to your physical drawer dimensions, then export STL/3MF files for 3D printing.

## Prerequisites

- **Node.js** (v18+)
- **[gridfinity-server](https://github.com/kiprepscher/gridfinity-server)** (optional) — required for STL and 3MF file generation

## Quick Start

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5174/grid-drawer-maker/`.

## Environment Variables

Copy `.env.example` to `.env` to customize:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:8000` | URL of your gridfinity-server instance |

You can also change the server URL at runtime via the settings gear on the Projects page.

## Deployment

The app is configured for GitHub Pages deployment:

```bash
npm run build    # Build to dist/
npm run deploy   # Deploy to GitHub Pages
```

## Features

- Create drawer projects with custom dimensions
- Visual bin placement editor with grid snapping
- Print queue with per-item and build-plate views
- STL export for individual items
- 3MF export for pre-arranged build plates
- Dark mode
