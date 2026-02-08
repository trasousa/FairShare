# FairShare - Couples Finance Tracker

A smart finance tracker designed for couples with separate incomes. It features dynamic split logic based on salary ratios, holiday project tracking, and wealth building insights.

## 🔗 Live Demo
Visit the live demo at: [fairshare.btopencloude.com](https://fairshare.btopencloude.com)
*(Note: The demo uses Local Storage mode. Your data stays in your browser.)*

## ✨ Features

- **Hybrid Storage**: Use it privately on your own server/NAS or publicly via Cloudflare.
- **Dynamic Split**: Automatically calculates "Fair Share" contributions based on relative income.
- **Trip Tracking**: Manage budgets for vacations and shared adventures.
- **Budgeting & Savings**: Set goals and track monthly progress.
- **Sankey Visualization**: Beautifully visualize money flow from income to categories.

## 🚀 Storage Modes

The app supports two modes via the `VITE_APP_MODE` environment variable:

1.  **`LOCAL_FIRST`** (Default for Cloudflare/Public Demo): Uses `localStorage`. All your data is stored securely in your browser and never leaves your device.
2.  **`SERVER_BASED`** (Default for Self-Hosting): Uses an Express + SQLite backend for persistent, multi-device storage.

## 🐳 Docker Deployment (Self-Hosting / NAS)

Ideal for running on a Synology, QNAP, or any home server where you want your data to persist and be accessible across devices.

1.  **Clone the repository**.
2.  **Start the application**:
    ```bash
    docker-compose up -d
    ```
3.  Access the app at `http://localhost:3000` (or your server's IP).

Your data is stored in the `./data/fairshare.db` SQLite database.

## 🛠️ Development

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Running Locally

```bash
# Full stack (Frontend + Backend)
npm run dev

# Frontend only (Local Storage mode - no backend needed)
npm run client:local
```

### Build for Production

```bash
# Build for Self-Hosting (Server-Based)
npm run build
npm start

# Build for Cloudflare Pages (Local-First)
npm run build:local
```

## 🔒 Privacy & Security

FairShare is designed with privacy in mind. In `SERVER_BASED` mode, all data is stored in a local SQLite database that you control. In `LOCAL_FIRST` mode, data never leaves your browser.