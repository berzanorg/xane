FROM node:bookworm-slim

RUN apt update -y && apt install -y \
    git \
    curl

# Install Rust language tooling.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y  