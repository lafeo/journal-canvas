# Journal Canvas

**An open-source AI-powered knowledge graph for your notes.**

Journal Canvas reads your `.md` and `.txt` files, extracts people, places, events, themes, and concepts using Claude AI, and builds a live force-directed graph so you can see how everything connects.

![Journal Canvas](docs/assets/preview.png)

---

## Features

- **Knowledge graph** — entities cluster by connection strength, not by type
- **Reader** — click any node to read the documents it appears in, with every entity highlighted inline
- **Themes & Concepts sidebar** — click a theme to illuminate connected nodes on the graph
- **Inline editing** — click any document text to edit it; saves automatically
- **Entity deduplication** — Claude recognises existing people and themes across new documents
- **Bar gauge nodes** — each node's bar height reflects its relative connection count in the graph

---

## Getting started

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- An [Anthropic API key](https://console.anthropic.com)

### Install & run

```bash
git clone https://github.com/lafeo/journal-canvas.git
cd journal-canvas
npm install
npm run dev
```

### Build a distributable

```bash
npm run package
# Output → release/
```

---

## How it works

1. Point Journal Canvas at a folder of `.md` or `.txt` files
2. Each file is sent to Claude, which extracts structured entities (people, places, events, themes, concepts, characters, todos)
3. Entities that appear in multiple documents are automatically merged — one "Dr. Priya Sharma" node, connected to every document she appears in
4. The graph renders as a live D3 force simulation — connected nodes cluster together naturally

---

## Tech stack

- **Electron** — desktop shell
- **React + Vite** — UI
- **React Flow (@xyflow/react)** — graph canvas
- **D3-force** — physics simulation
- **Zustand** — state management
- **Claude API (Anthropic)** — entity extraction

---

## Contributing

Pull requests welcome. Open an issue first for major changes.

## License

MIT
