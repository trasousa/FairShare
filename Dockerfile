# Stage 1: Build the frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Create the production image
FROM node:20-alpine
WORKDIR /app

# Copy production dependencies from builder
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend files
COPY server.js .
COPY db.ts .
COPY types.ts .
COPY constants.ts .
COPY services ./services

# Ensure the data directory exists
RUN mkdir -p data

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
