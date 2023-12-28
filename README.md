# Xane 📈

**Xane** (IPA: /seɪn/) is a **zero knowledge order book decentralized exchange**.

**Xane** is live at [xane.berzan.org](https://xane.berzan.org/).

> **Note**: Currently, the user interface is not functioning because there is no <br> backend server running on the web and there are issues with Mina nodes. <br>
> However you can visit it and see how it looks like.

## Prerequirements

You need [o1js](https://docs.minaprotocol.com/zkapps/o1js) knowledge for smart contract development.
<br>
You need [~~Rust~~](https://www.rust-lang.org/), (currently) [TypeScript](https://www.typescriptlang.org/) knowledge for backend development.
<br>
You need [Astro.js](https://astro.build/) & [Solid.js](https://www.solidjs.com/) knowledge for user interface development.

## Resources

[o1js](https://docs.minaprotocol.com/zkapps/o1js) resource: [https://docs.minaprotocol.com/zkapps/o1js](https://docs.minaprotocol.com/zkapps/o1js)
<br>
[TypeScript](https://www.typescriptlang.org/) resource: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)
<br>
[Astro.js](https://astro.build/) resource: [https://docs.astro.build/en/getting-started/](https://docs.astro.build/en/getting-started/)
<br>
[Solid.js](https://www.solidjs.com/) resource: [https://www.solidjs.com/guides/getting-started#learn-solid](https://www.solidjs.com/guides/getting-started#learn-solid)

## Setup A Development Environment

The easiest way to setup a development environment is to use [Dev Containers](https://containers.dev/). <br>
You just need [Docker](https://www.docker.com/) and [VS Code](https://code.visualstudio.com/) installed to use [Dev Containers](https://containers.dev/). <br>
When you open the project in [VS Code](https://code.visualstudio.com/), it will warn you to repeon it in a container. <br>
It also contains six different [VS Code](https://code.visualstudio.com/) extensions that will help you during the development.

If you prefer a more traditional way to setup a development environment, you only need to install the latest version of [NodeJS](https://nodejs.org/).

## Project Structure

This repository is a monorepo for the smart contracts, the user interface, and the backend server of **Xane**.

## Smart Contracts

It currently contains [`Token`](contracts/src/Token.ts), [`Exchange`](contracts/src/Exchange.ts) and [`Vault`](contracts/src/Vault.ts) smart contracts.
<br>
All the smart contracts are working as expected even tho they are non-secure implementations.

[`Token`](contracts/src/Token.ts) contract is a simple token standard implementation for Mina.
<br>
It has all the basic methods a token needs such as `mint`, `burn`, `transfer`, `approveUpdate`, `approveCallbackAndTransfer`, `approveUpdateAndTransfer`, etc.
<br>
Its unit tests reside in [`Token.test.ts`](contracts/src/Token.test.ts) file.

[`Exchange`](contracts/src/Exchange.ts) contract is a decentralized exchange
<br>
that currently allows placing, cancelling and executing a single order at a time.
<br>
It has methods such as `createPair`, `placeBuyOrder`, `cancelSellOrder`, `executeBuyOrder`, etc.
<br>
Its unit tests reside in [`Exchange.test.ts`](contracts/src/Exchange.test.ts) file.

[`Vault`](contracts/src/Vault.ts) contract is a vault that holds a specific token on behalf of the exchange.
<br>
It is created to support unlimited kind of tokens on the exchange.
<br>
Its unit tests reside in [`Vault.test.ts`](contracts/src/Vault.test.ts) file.

Smart contracts of **Xane** reside in [`contracts/`](contracts) folder.
<br>
So you have to change the current working directory before working with them.

```sh
cd contracts/
```

You can run all the tests by running the command below.

```sh
npm run test
```

## User Interface

The user interface of **Xane** is built using [Astro.js](https://astro.build/) & [Solid.js](https://www.solidjs.com/).

It resides in [`ui/`](ui) folder.
<br>
So you have to change the current working directory before working with it.

```sh
cd ui/
```

You can start a development server by running the command below.

```sh
npm run dev #  then visit localhost:4321 too see the preview
```

## Backend

The backend of **Xane** is built using [TypeScript](https://www.typescriptlang.org/) & [tinyhttp](https://tinyhttp.v1rtl.site/).

It acts like an authority that is responsible for storing data and generating proofs.

It resides in [`backend/`](backend) folder.
<br>
So you have to change the current working directory before working with it.

```sh
cd backend/
```

You can build the backend by running the command below.

```sh
npm run start # then the backend server will be live on localhost:3000
```

**Made with sweat 💦 and love ❤️ by [Berzan](https://berzan.org/).**
