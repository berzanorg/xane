<script lang="ts">
	import { wallet } from '$lib/stores/wallet'
	import { createToken } from '$lib/utils/createToken'
	import { PublicKey } from 'o1js'

	const onClick = async () => {
		if ($wallet.address === null) return
		const tx = await createToken({
			decimals: 8,
			name: 'hello',
			signer: PublicKey.fromBase58($wallet.address),
			supplyMaximum: BigInt(100_000_000 * Math.pow(10, 8)),
			ticker: 'TKX'
		})

		if (tx === undefined) return

		await wallet.sendTransaction(tx.deployTransaction)
		await wallet.sendTransaction(tx.initMetadataTransaction)
	}
</script>

<p>Create a token.</p>

<button on:click={onClick}>Create A Token</button>
