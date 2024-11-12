FROM node:18@sha256:d0bbfdbad0bff8253e6159dcbee42141db4fc309365d5b8bcfce46ed71569078 AS builder

WORKDIR /headlamp-plugins

# Add a build argument for the desired plugin to be built
ARG PLUGIN

# Check if the PLUGIN argument is provided
RUN if [ -z "$PLUGIN" ]; then \
      echo "Error: PLUGIN argument is required"; \
      exit 1; \
    fi

RUN mkdir -p /headlamp-plugins/build/${PLUGIN}

COPY ${PLUGIN} /headlamp-plugins/${PLUGIN}

# Build the specified plugin
RUN echo "Installing deps for plugin $PLUGIN..."; \
    cd /headlamp-plugins/$PLUGIN; \
    npm ci

RUN echo "Building plugin $PLUGIN..."; \
    cd /headlamp-plugins/$PLUGIN; \
    npm run build

RUN echo "Extracting plugin $PLUGIN..."; \
    cd /headlamp-plugins/$PLUGIN; npx --no-install headlamp-plugin extract . /headlamp-plugins/build/${PLUGIN} \
    && cp /headlamp-plugins/$PLUGIN/main.wasm /headlamp-plugins/build/${PLUGIN}/

FROM alpine:3.20.3@sha256:beefdbd8a1da6d2915566fde36db9db0b524eb737fc57cd1367effd16dc0d06d

# Create the target directory if it doesn't exist
RUN mkdir -p /plugins/headlamp-ig

# Copy the built plugin files from the builder image to /plugins/headlamp-ig
COPY --from=builder /headlamp-plugins/build/${PLUGIN}/ /plugins/headlamp-ig/

CMD ["echo Plugin(s) installed at /plugins/headlamp-ig/; ls /plugins/headlamp-ig/*"]
