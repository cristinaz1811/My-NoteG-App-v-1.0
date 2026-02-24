###############
# Build stage #
###############
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build-time env vars (overridable via docker-compose build args)
ARG REACT_APP_API_URL=/api
ARG REACT_APP_WS_URL=
ARG REACT_APP_DASHBOARD_URL=https://my-noteg.com:8501
ARG REACT_APP_GOOGLE_CLIENT_ID=
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV REACT_APP_DASHBOARD_URL=$REACT_APP_DASHBOARD_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID

RUN npm run build

#################
# Runtime stage #
#################
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
