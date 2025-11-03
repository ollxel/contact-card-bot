# -------------------------------------------------
# Use the official lightweight Node image
# -------------------------------------------------
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies (only package.json is copied first
# so Docker can cache this layer)
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the source code
COPY . .

# Expose the port (Render will map $PORT automatically)
EXPOSE 8080

# Run the bot
CMD ["npm", "start"]
