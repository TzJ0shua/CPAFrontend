FROM node:22-slim AS build

WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM=cpa
ARG VITE_KEYCLOAK_CLIENT_ID=cpa-frontend

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

COPY package.json package-lock.json ./
RUN npm ci --include=optional

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache jq
COPY docker/40-cpa-runtime-config.sh /docker-entrypoint.d/40-cpa-runtime-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-cpa-runtime-config.sh \
    && chmod +x /docker-entrypoint.d/40-cpa-runtime-config.sh

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
