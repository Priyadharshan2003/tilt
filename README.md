<div align="center">
  <img src="src-tauri/icons/128x128.png" alt="Tilt Logo" width="128" />
  <h1>tilt.os</h1>
  <p><strong>The Operating System for Digital Self-Awareness.</strong></p>
  
  <p>
    <img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/Priyadharshan2003/tilt?style=for-the-badge&color=f97316">
    <img alt="GitHub forks" src="https://img.shields.io/github/forks/Priyadharshan2003/tilt?style=for-the-badge&color=3b82f6">
    <img alt="GitHub followers" src="https://img.shields.io/github/followers/Priyadharshan2003?style=for-the-badge&color=10b981">
    <img alt="GitHub License" src="https://img.shields.io/github/license/Priyadharshan2003/tilt?style=for-the-badge">
  </p>
</div>

<hr />

> **🎉 Version 2.0 is Live!**
> tilt.os has officially graduated from a passive dashboard to an active, system-level enforcer and contextual engine.

## 🧠 What is tilt.os?

**tilt.os** is a blazingly fast, deeply native desktop application built for developers who want to understand their workflow friction, procrastination triggers, and flow states. It acts as a mirror for your digital life. 

By running quietly in the background, tilt.os analyzes raw OS-level input metrics (like aggressive backspacing, rapid window switching, and active application context) to calculate real-time **Focus** and **Chaos** scores.

> **⚠️ Privacy First**: tilt.os is designed with a strict zero-content tracking manifesto. It **never** logs the characters you type or the content on your screen. It only tracks metadata and physical cadence. Data is stored entirely locally on your machine.

## ✨ v2.0 Features (The 10-Phase Roadmap Complete)

- **Digital Twin Archetypes:** Automatically assigns you a "Developer Personality" based on your telemetry (e.g., *The Execution Machine*, *The Refactorer*, *The Explorer*).
- **Rage Analytics:** Real-time detection of high-velocity backspaces and deletes, triggering native OS notifications to break you out of a tilt spiral.
- **Session Wrapped:** An Instagram-Story style, highly animated recap of your coding session, highlighting your longest deep focus streaks and top apps.
- **Life Heatmaps:** A 30-day GitHub-style contribution graph for your Focus score.
- **Timeline Replay:** A Git-history view of your life, tracking exactly when and where you lost focus.
- **Pro Mode:** A toggle that strips away the beautiful UI for a dense, terminal-style feed of your raw telemetry data.
- **Plugin Ecosystem Architecture:** Connect your digital DNA to the real world (e.g., Auto-muting Slack when your Focus > 80, or turning Philips Hue lights red during a Chaos Meltdown).
- **Featherweight Native Core:** Built on Tauri v2 and Rust, utilizing minimal CPU footprint and barely any RAM compared to Electron alternatives.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- *Note for Linux/macOS users:* Make sure you have the necessary system dependencies installed for Tauri.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Priyadharshan2003/tilt.git
   cd tilt
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run tauri dev
   ```
   *Note: Upon first launch, your OS (especially macOS) may prompt you to grant Accessibility permissions for global input hooking.*

## 🛠️ Architecture & Tech Stack

tilt.os is built with a modern, high-performance stack:

- **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **Backend / Daemon**: [Rust](https://www.rust-lang.org/)
- **Application Framework**: [Tauri v2](https://v2.tauri.app/)
- **Database**: [SQLite (rusqlite)](https://github.com/rusqlite/rusqlite)

### How it Works
1. **The Daemon (`daemon.rs`)**: Spawns a dedicated Rust thread on startup that uses `rdev` (currently mocked for multi-platform stability) and active-window tracking to capture OS events.
2. **The Buffer**: Events are aggregated anonymously in-memory to prevent locking.
3. **The Storage (`db.rs`)**: The buffer flushes to a local SQLite database in the OS `AppData` folder.
4. **The UI (`App.tsx`)**: The React frontend polls the backend via Tauri IPC commands and recalculates your live stats based on recent intensities.

## 🤝 Contributing

Contributions make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <sub>Built with ❤️ by prichan, for developers.</sub>
</div>
