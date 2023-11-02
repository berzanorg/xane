<script lang="ts">
	import { onMount } from 'svelte';
	import Section from '$lib/components/Section.svelte';
	import { wallet } from '$lib/stores/wallet';
	import { PublicKey } from 'o1js';
	import { TokenX } from '../../../contracts/build/src/TokenX';

	let zkApp: TokenX;

	onMount(async () => {
		const zkAppAddress = 'B62qoSKd89ksWtxN1b2zo1TZSLegB3Xaj6PAEGh2xg9fLgoZdhAeN1T';
		zkApp = new TokenX(PublicKey.fromBase58(zkAppAddress));
		console.log(zkApp.totalAmountInCirculation);
	});

	async function mintTokens() {
		//todo: implement contract interaction here
		// if (!$wallet.address) return alert('Not Connected');
		// const zkAppPrivateKey = null as never;
		// const deployerPrivateKey = null as never;
		// const receiver = PublicKey.fromBase58($wallet.address);
		// const amount = UInt64.from(42);
		// const signature = Signature.create(
		// 	zkAppPrivateKey,
		// 	amount.toFields().concat(receiver.toFields())
		// );
		// const tx = await Mina.transaction(receiver, () => {
		// 	zkApp.mint(receiver, amount, signature);
		// });
		// await tx.prove();
		// await tx.sign([deployerPrivateKey]).send();
	}
</script>

<svelte:head>
	<title>Xane - Decentralized Exchange</title>
</svelte:head>

<main class="flex flex-col">
	<Section>
		<h2 class="text-2xl font-bold">Network</h2>
		<p class="font-semibold text-amber-500">
			{$wallet.network ?? 'Auro Wallet is not connected'}
		</p>
	</Section>
	<Section>
		<h2 class="text-2xl font-bold">Address</h2>
		<p class="font-mono text-xs sm:text-base text-amber-500">
			{$wallet.address ?? 'Auro Wallet is not connected'}
		</p>
	</Section>
	<Section>
		<h2 class="text-2xl font-bold">Mint Tokens</h2>
		<button
			disabled
			class="h-8 px-6 font-semibold duration-200 rounded-full disabled:cursor-not-allowed bg-amber-600 disabled:hover:bg-amber-600 disabled:hover:scale-100 hover:bg-amber-500 active:bg-amber-500 hover:scale-95 active:scale-90"
			on:click={mintTokens}
		>
			Mint
		</button>
	</Section>
</main>
