FROM node:alpine

# Install GIT.
RUN apk add git

# NOTE: Might be needed in the future.
# Install Rust language tooling.
#RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y  

# Update NPM to latest version.
RUN corepack enable npm