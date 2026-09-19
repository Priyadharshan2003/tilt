<div align="center">
  <img src="src-tauri/icons/128x128.png" alt="Tilt Logo" width="128" />
  <h1>Tilt</h1>
  <p><strong>A privacy-first developer stress and friction tracking daemon.</strong></p>
  
  <p>
    <a href="https://github.com/your-username/tilt/stargazers"><img src="https://img.shields.io/github/stars/your-username/tilt?style=for-the-badge&color=f97316" alt="Stars" /></a>
    <a href="https://github.com/your-username/tilt/network/members"><img src="https://img.shields.io/github/forks/your-username/tilt?style=for-the-badge&color=3b82f6" alt="Forks" /></a>
    <a href="https://github.com/your-username/tilt/issues"><img src="https://img.shields.io/github/issues/your-username/tilt?style=for-the-badge&color=ef4444" alt="Issues" /></a>
    <a href="https://github.com/your-username/tilt/blob/main/LICENSE"><img src="https://img.shields.io/github/license/your-username/tilt?style=for-the-badge&color=10b981" alt="License" /></a>
  </p>
</div>

<hr />

## 🧠 What is Tilt?

**Tilt** is a blazingly fast, deeply native desktop application built for developers who want to understand their workflow friction and stress patterns. 

By running quietly in the background, Tilt analyzes raw OS-level input metrics (like aggressive backspacing, rapid clicking, and mouse movement intensity) to calculate a real-time **Stress Score**.

> **⚠️ Privacy First**: Tilt is designed with a strict zero-content tracking manifesto. It **never** logs the characters you type, the applications you use, or the content on your screen. It only tracks metadata and physical cadence.

## ✨ Features

- **Global Input Hooking**: Tracks keystroke friction and mouse movement intensity across the entire operating system.
- **Privacy-First Daemon**: 100% anonymous processing. Zero character logging.
- **Real-time Dashboard**: A sleek, buttery-smooth Framer Motion dashboard tracking your live stress score.
- **Local SQLite Storage**: Your data never leaves your machine. Everything is stored locally in an optimized, batched SQLite database.
- **Featherweight**: Built on Tauri and Rust, utilizing minimal CPU footprint and barely any RAM compared to Electron alternatives.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- *Note for Linux/macOS users:* Make sure you have the necessary system dependencies installed for Tauri.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tilt.git
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

Tilt is built with a modern, high-performance stack:

- **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/)
- **Backend / Daemon**: [Rust](https://www.rust-lang.org/)
- **Application Framework**: [Tauri v2](https://v2.tauri.app/)
- **Database**: [SQLite (rusqlite)](https://github.com/rusqlite/rusqlite)
- **Input Hooking**: [rdev](https://github.com/Narsil/rdev)

### How it Works
1. **The Daemon (`daemon.rs`)**: Spawns a dedicated Rust thread on startup that uses `rdev` to capture OS events.
2. **The Buffer**: Events are aggregated anonymously in-memory to prevent locking.
3. **The Storage (`db.rs`)**: Every 5 seconds, the buffer flushes to a local SQLite database in the OS `AppData` folder.
4. **The UI (`App.tsx`)**: The React frontend polls the backend via Tauri IPC commands and recalculates your live stress score based on recent intensities.

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
  <sub>Built with ❤️ by developers, for developers.</sub>
</div>
