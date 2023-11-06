<script lang="ts">
	import { wallet } from '$lib/stores/wallet'
</script>

<button
	on:click={wallet.connect}
	disabled={$wallet.isConnected}
	class="h-10 px-5 font-bold text-black duration-150 bg-white rounded-xlg hover:scale-95 active:scale-85 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
>
	{#if $wallet.isConnected}
		Connected
	{:else}
		Connect
	{/if}
</button>
