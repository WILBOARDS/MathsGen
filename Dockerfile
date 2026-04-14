# Build stage
FROM node:18-alpine AS build

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build the Vite app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /usr/src/app

# Install serve for static file hosting
RUN npm install -g serve

# Copy the built output
COPY --from=build /usr/src/app/dist ./dist

# Expose the Cloud Run port
EXPOSE 8080

# Serve the built app on port 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
