# Party Hall SaaS – Next.js Frontend Dockerfile (production)
# Builds the Next.js bundle at image build time so pages load instantly.
# No "Rendering..." delays — every route is pre-compiled.

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# SERVER_API_URL must be known at build time because next.config.ts
# async rewrites() is evaluated during `next build`, not at runtime.
# Default: http://backend:8000/api (Docker Compose internal network)
ARG SERVER_API_URL=http://backend:8000/api
ENV SERVER_API_URL=${SERVER_API_URL}

# Build the production bundle with the correct backend URL baked in
RUN npm run build

EXPOSE 3000

# Serve the pre-built app — instant page loads, no on-demand compilation
CMD ["npm", "run", "start"]
