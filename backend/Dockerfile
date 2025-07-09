#Backend Dockerfile

FROM rust:1.88.0

WORKDIR /usr/src/backend

COPY . .

RUN cargo install --path .

# Expose the port the app runs on
EXPOSE 8000

# Start the application
CMD ["backend"]