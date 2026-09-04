FROM node:22@sha256:8a34c4ab3ea2c5cd194f07e317b2a8f09461d3c8b05c4e34c8ccd56d56024c4d AS builder

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
    && cp /headlamp-plugins/$PLUGIN/main.wasm.gz /headlamp-plugins/build/${PLUGIN}/

FROM alpine:3.24.1@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b

# ARG values do not carry over between stages, redeclare it so the COPY below
# receives the same build argument as the builder stage.
ARG PLUGIN

# Create the target directory if it doesn't exist
RUN mkdir -p /plugins/headlamp-ig

# Copy the built plugin files from the builder image to /plugins/headlamp-ig
COPY --from=builder /headlamp-plugins/build/${PLUGIN}/ /plugins/headlamp-ig/

CMD ["sh", "-c", "echo Plugin(s) installed at /plugins/headlamp-ig/; ls /plugins/headlamp-ig/*"]
