# --- build ---------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# CRA inlines this at build time, so it must be known before `yarn build`
ARG REACT_APP_BACKEND_URL=http://localhost:8101
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# CRA treats lint warnings as errors when CI is set, and this codebase has
# react-hooks/exhaustive-deps warnings. Pin it so the image builds the same on a
# laptop and on a CI runner that exports CI=true.
ENV CI=false

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# --- serve ---------------------------------------------------------------
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# react-router needs unknown paths to fall through to index.html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / { try_files $uri $uri/ /index.html; }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
