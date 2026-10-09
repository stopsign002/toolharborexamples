# Hello Node — Toolhub container-tier example.
# node:22-alpine, express+pg, runs as the built-in non-root `node` user.
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
EXPOSE 3000
USER node
CMD ["node", "server.js"]
