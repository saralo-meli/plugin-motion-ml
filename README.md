# Motion Handoff Timeline Builder

Figma plugin to generate visual motion handoff timelines directly on the canvas.

## Features

- **Visual timeline** with time rulers (ms), colored animation bars, and trigger panels
- **After Effects JSON import** via ExtendScript script (`ae-exporter/`)
- **Library components** — uses instances from "Library HO components" (Name-component, Delay, Timeline-container, Trigger-Flow)
- **Multiple tracks** with properties: Position, Opacity, Scale, Rotation, Color, State
- **Triggers**: Tap, Automatic, Swipe, Scroll
- **Re-generation** — regenerates on the same frame, replacing the previous timeline
- **Persistence** — saves wizard state in localStorage

## Structure

```
├── manifest.json          # Figma plugin configuration
├── package.json           # Dependencies (TypeScript + Figma typings)
├── tsconfig.json          # TypeScript configuration
├── code.ts                # Main plugin logic (sandbox)
├── code.js                # Compiled version
├── ui.html                # User interface (3-step wizard)
└── ae-exporter/
    ├── HO Motion Exporter.jsx   # ExtendScript for After Effects
    └── exemplo-saida.json       # Sample AE exporter output
```

## Setup

```bash
npm install
npm run build    # compiles code.ts → code.js
npm run watch    # watch mode
```

## Usage

1. Open the plugin in Figma
2. Select a Frame or Section as the target
3. Configure trigger and time scale
4. Add components and properties manually, or import a JSON from After Effects
5. Click "Generate timeline"

## Required Library

The plugin imports components from the **"Library HO components"** library. Make sure it is enabled in the Figma file where you use the plugin.
