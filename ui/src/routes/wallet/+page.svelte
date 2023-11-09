<script>
	import { wallet } from '$lib/stores/wallet'

	import iconCopySvg from '$lib/assets/icon-copy.svg'
	import { copy } from '$lib/utils/copy'
</script>

<div class="flex flex-col gap-8 py-4">
	<div class="flex flex-col gap-2">
		<h1 class="text-3xl font-bold">Wallet</h1>

		<div class="flex flex-col gap-1.5 text-lg font-semibold text-neutral-500">
			{#if $wallet.isConnected}
				{#if $wallet.network === 'berkeley'}
					Berkeley Network
				{:else}
					Unsupported Network
				{/if}
				<div class="flex gap-4 text-lg">
					<p>{$wallet.address.slice(0, 6)}...{$wallet.address.slice(-4)}</p>
					<button
						class="flex items-center pl-1.5 pr-2 hover:scale-95 duration-150 active:scale-85 text-sm font-bold text-black bg-white gap-0.5 rounded-lg"
						on:click={() => copy($wallet.address)}
					>
						<img src={iconCopySvg} alt="copy icon" />
						Copy
					</button>
				</div>
			{:else}
				Not Connected
			{/if}
		</div>
	</div>

	<!--
		<h2 class="text-2xl font-bold">Assets</h2>
	-->
</div>
