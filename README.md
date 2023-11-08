# Xane 📈

**Xane** (IPA: /ˈhane/) is an **Order Book Decentralized Exchange**.

Development version of UI is live: [xane.pages.dev](https://xane.pages.dev)

## Prerequirements
You need [TypeScript](https://www.typescriptlang.org/) knowledge for smart contract development. 
<br>
You need [Svelte](https://svelte.dev/) knowledge for user interface development.
<br>
You also need [zkApps](https://docs.minaprotocol.com/zkapps) knowledge to have a general understanding of [zkApps](https://docs.minaprotocol.com/zkapps).




## Resources
[TypeScript](https://www.typescriptlang.org/) resource: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)
<br>
[Svelte](https://svelte.dev/) resource: [https://learn.svelte.dev/tutorial/welcome-to-svelte](https://learn.svelte.dev/tutorial/welcome-to-svelte)
<br>
[zkApps](https://docs.minaprotocol.com/zkapps) resource: [https://docs.minaprotocol.com/zkapps](https://docs.minaprotocol.com/zkapps) 




## Setup A Development Environment
The easiest way to setup a development environment is to use [Dev Containers](https://containers.dev/). <br>
You just need [Docker](https://www.docker.com/) and [VS Code](https://code.visualstudio.com/) installed to use [Dev Containers](https://containers.dev/). <br>
When you open the project in [VS Code](https://code.visualstudio.com/), it will warn you to repeon it in a container. <br>
It also contains four different [VS Code](https://code.visualstudio.com/) extensions that will help you during the development.

If you prefer a more traditional way to setup a development environment, you only need to install the latest version of [NodeJS](https://nodejs.org/).




## Project Structure
This repository is a monorepo for both smart contracts and the user interface of **Xane**. 



## Smart Contracts
Smart contracts of **Xane** reside in [`contracts/`](https://github.com/BerzanXYZ/xane/tree/main/contracts) folder.
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
The user interface of **Xane** is built using [SvelteKit](https://kit.svelte.dev/).

It resides in [`ui/`](https://github.com/BerzanXYZ/xane/tree/main/ui) folder.
<br>
So you have to change the current working directory before working with it.
```sh
cd ui/
```

You can start a development server by running the command below. 

```sh
npm run dev #  then visit localhost:5173 too see the preview
```

**Made with sweat 💦 and love ❤️ by [Berzan](https://twitter.com/BerzanXYZ).**