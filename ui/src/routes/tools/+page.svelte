<script lang="ts">
	import { wallet } from '$lib/stores/wallet'
	import { WorkerClient } from '$lib/workers/client'
	import { PublicKey, UInt64 } from 'o1js'
	import { onMount } from 'svelte'
	import { utils } from 'xane-contracts'

	let status: 'loading' | 'loaded' | 'compiling' | 'compiled' | 'deploying' | 'deployed' = 'loading'

	let buttonDisabled: boolean = false
	let inputsDisabled: boolean = false

	let bindedTokenName: string = ''
	let bindedTokenTicker: string = ''
	let bindedTokenSupply: string = ''

	let txHash: string = ''
	let workerClient: null | WorkerClient = null

	onMount(async () => {
		workerClient = await WorkerClient.create()

		workerClient.on('loadContract', {
			async ok() {
				status = 'loaded'
			},
			err() {
				alert('Contract Loading Error')
			}
		})
		workerClient.on('ready', {
			async ok() {
				workerClient?.send({ kind: 'loadContract' })
				console.log('load contract message is sent to worker')
			},
			err() {
				console.log('err is called')
				alert('Worker Error')
			}
		})
	})

	const compileContract = async () => {
		buttonDisabled = true
		inputsDisabled = true

		status = 'compiling'
		workerClient?.on('compileContract', {
			async ok() {
				status = 'compiled'
				buttonDisabled = false
			},
			err() {
				status = 'loaded'
				buttonDisabled = false
				alert('Compilation Error')
			}
		})
		workerClient?.send({ kind: 'compileContract' })
	}

	const deployContract = async () => {
		if (!$wallet.isConnected) return

		buttonDisabled = true

		status = 'deploying'
		workerClient?.on('deployContract', {
			async ok(txAsJson) {
				const hash = await wallet.sendTransaction(txAsJson)
				if (typeof hash === 'string') {
					status = 'deployed'
					txHash = hash
				} else {
					status = 'compiled'
					buttonDisabled = false
					alert('Transaction Sending Error')
				}
			},
			err() {
				status = 'compiled'
				buttonDisabled = false
				alert('Deployment Error')
			}
		})
		try {
			workerClient?.send({
				kind: 'deployContract',
				args: {
					name: utils.stringToField(bindedTokenName),
					ticker: utils.stringToField(bindedTokenTicker),
					supply: UInt64.from(parseInt(bindedTokenSupply)),
					signerPublicKey: PublicKey.fromBase58($wallet.address)
				}
			})
		} catch (error) {
			console.error('Conversion error.')
			console.error(error)
			alert('Open console to see the error.')
		}
	}
</script>

<div class="flex flex-col max-w-md gap-8 py-4">
	<form
		class="flex flex-col gap-5"
		action=""
		on:submit={status === 'loaded'
			? compileContract
			: status === 'compiled'
			? deployContract
			: () => {}}
	>
		<h1 class="text-3xl font-bold">Create Your Own Token</h1>
		<div class="flex items-center gap-2.5">
			<p class="text-xl font-bold min-w-max">Token Name:</p>
			<input
				class="px-2.5 w-full placeholder:text-neutral-700 bg-neutral-900 border h-8 border-neutral-700 outline-none rounded-xlg disabled:cursor-not-allowed"
				maxlength={32}
				type="text"
				disabled={inputsDisabled || !$wallet.isConnected || status === 'loading'}
				required
				placeholder="My Token"
			/>
		</div>
		<div class="flex items-center gap-2.5">
			<p class="text-xl font-bold min-w-max">Token Ticker:</p>
			<input
				class="px-2.5 w-full placeholder:text-neutral-700 bg-neutral-900 border h-8 border-neutral-700 outline-none rounded-xlg uppercase disabled:cursor-not-allowed"
				maxlength={3}
				type="text"
				disabled={inputsDisabled || !$wallet.isConnected || status === 'loading'}
				required
				placeholder="MYT"
			/>
		</div>

		<div class="flex items-center gap-2.5">
			<p class="text-xl font-bold min-w-max">Token Supply:</p>
			<input
				class="px-2.5 w-full placeholder:text-neutral-700 bg-neutral-900 border h-8 border-neutral-700 outline-none rounded-xlg disabled:cursor-not-allowed"
				maxlength={32}
				type="number"
				disabled={inputsDisabled || !$wallet.isConnected || status === 'loading'}
				required
				placeholder="1000"
			/>
		</div>
		<div class="flex items-center">
			<button
				class="self-start h-10 px-5 font-bold text-black duration-150 bg-white rounded-xlg hover:scale-95 active:scale-85 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
				disabled={buttonDisabled || !$wallet.isConnected || status === 'loading'}
				type="submit"
			>
				{#if status === 'loading'}
					Loading...
				{:else if status === 'loaded'}
					Compile Contract
				{:else if status === 'compiling'}
					Compiling...
				{:else if status === 'compiled'}
					Deploy Contract
				{:else if status === 'deploying'}
					Deploying...
				{:else if status === 'deployed'}
					Success
				{/if}
			</button>
		</div>

		<div class="flex items-center gap-1">
			<p class="text-lg font-bold">Info:</p>
			<p class="text-lg font-semibold text-neutral-600">
				{#if $wallet.isConnected}
					{#if status === 'loading'}
						Contract is loading...
					{:else if status === 'loaded'}
						Contract is ready to be compiled.
					{:else if status === 'compiling'}
						Compiling token contract...
					{:else if status === 'compiled'}
						Token is ready to be deployed.
					{:else if status === 'deploying'}
						Deploying token contract...
					{:else if status === 'deployed'}
						Success. Check the
						<a
							href="https://berkeley.minaexplorer.com/transaction/{txHash}"
							class="text-white underline"
							target="_blank"
						>
							transaction
						</a>.
					{/if}
				{:else}
					Auro Wallet is not connected.
				{/if}
			</p>
		</div>
	</form>
</div>
