FROM node:bookworm-slim

# Install dependencies.
RUN apt update -y && apt install -y \
    git \
    curl \
    build-essential

# Install Rust language tooling.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y  

# Enable PNPM.
RUN corepack enable pnpm