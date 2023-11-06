<script lang="ts">
	import { wallet } from '$lib/stores/wallet'
	import { createToken } from '$lib/utils/contracts'

	const makeTransaction = () => {
		createToken({
			decimals: 8,
			supplyMaximum: BigInt(100_000_000 * Math.pow(10, 8)),
			signer: $wallet.address,
			name: 'My Token',
			ticker: 'MYTKN'
		})
	}
</script>

<div class="flex flex-col">
	<div class="flex flex-col">
		<button on:click={makeTransaction}>Make TX</button>
	</div>
</div>
