# FairShare Finance Tracker (Self-Hosted)

A privacy-focused, self-hosted finance tracker for couples. This application uses a local SQLite database to store your data, ensuring nothing leaves your network.

## Features
- **Real Database:** Uses SQLite (`fairshare.db`) for persistent storage.
- **Local Network Access:** Deploy once, access from phones and laptops on your WiFi.
- **Privacy:** Data lives on your disk, not in a browser cache or the cloud.

## How to Run with Docker

1. **Build the Image**
   ```bash
   docker build -t fairshare .
   ```

2. **Run the Container**
   You need to mount a volume to persist the database file (`.db`) outside the container.
   
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v $(pwd)/data:/app/data \
     --name fairshare-app \
     fairshare
   ```

3. **Access the App**
   - **On this computer:** Open [http://localhost:3000](http://localhost:3000)
   - **On your Local Network:** Find your computer's local IP (e.g., `192.168.1.15`) and open `http://192.168.1.15:3000` on your phone.

## Data Location
Your database file will be created at `./data/fairshare.db` in the current folder. You can back up this file anytime.

## Development
To run locally without Docker:

1. `npm install`
2. `npm run dev` (Frontend)
3. `npm start` (Backend - run in a separate terminal)
