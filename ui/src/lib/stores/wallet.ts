import type { o1js } from "xane-contracts"
import { writable } from "svelte/store"

/**
 * The type that represents `wallet` store. 
 * 
 * It has two possible variants, connected & not connected. 
 */
type StoreState = ConnectedState | NotConnectedState

/** The type that represents the store when Auro Wallet is connected. */
type ConnectedState = {
    isConnected: true
    address: string
    network: string
    balances: Array<{
        name: string
        ticker: string
        amount: bigint
    }>
}

/** The type that represents the store when Auro Wallet is not connected. */
type NotConnectedState = {
    isConnected: false
    address: null
    network: null
    balances: null
}


/** The function that creates & returns `wallet` store. */
const createStore = () => {
    const { set, subscribe, update } = writable<StoreState>({
        isConnected: false,
        address: null,
        network: null,
        balances: null
    })

    /** Requests to connect Auro Wallet. */
    const connect = async () => {
        if (!window.mina) return alert('Auro Wallet is not found.') // return if Auro Wallet is not found

        try {
            const accounts = await window.mina.requestAccounts()
            const mainAddress = accounts[0]
            if (!mainAddress) return
            const { chainId } = await window.mina.requestNetwork()
            set({
                isConnected: true,
                address: mainAddress,
                network: chainId,
                balances: []
            })
            _addEventListeners()
        } catch (err) {
            if (err?.code === 4001) return
            alert('Open browser console.')
            console.error('An error occured while connecting.')
            console.error(err)
        }
    }

    /** Connects Auro Wallet if the website is already authorized. */
    const connectIfAuthorized = async () => {
        if (!window.mina) return // returns if Auro Wallet is not found
        try {
            const accounts = await window.mina.getAccounts()
            const mainAddress = accounts[0]
            if (!mainAddress) return
            const { chainId } = await window.mina.requestNetwork()
            set({
                isConnected: true,
                address: mainAddress,
                network: chainId,
                balances: []
            })
            _addEventListeners()
        } catch (err) {
            if (err?.code === 4001) return
            alert('Open browser console.')
            console.error('An error occured while auto-connecting.')
            console.error(err)
        }
    }

    /** Adds event listeners to track changes of Auro Wallet. */
    const _addEventListeners = () => {
        if (!window.mina) return // returns if Auro Wallet is not found

        window.mina.on('accountsChanged', (accounts) => {
            const mainAddress = accounts[0]
            if (!mainAddress) {
                set({
                    isConnected: false,
                    address: null,
                    network: null,
                    balances: null,
                })
                window.mina?.removeAllListeners()
            } else {
                update(old => old.isConnected ? {
                    isConnected: true,
                    address: mainAddress,
                    network: old.network,
                    balances: []
                } : old)
            }
        })

        window.mina.on('chainChanged', (chainName) => {
            update(old => old.isConnected ? ({ ...old, network: chainName }) : old)
        })

    }

    /** Signs the given message. And logs the signed message to console. */
    const signMessage = async (message: string) => {
        if (!window.mina) return alert('Auro Wallet is not found.') // return if Auro Wallet is not found
        try {
            const signedMessage = await window.mina.signMessage({ message })
            console.log('Signed message is below.')
            console.log(signedMessage)
            alert('Open browser console to see the signed message.')
        } catch (err) {
            if (err?.code === 4001) return
            alert('Open browser console.')
            console.error('An error occured while message signing.')
            console.error(err)
        }
    }

    /** Signs the given fields. Returns the signature. If an error occurs, returns `null`. */
    const signFields = async (fields: Array<o1js.Field>): Promise<null | o1js.Signature> => {
        if (!window.mina) {
            alert('Auro Wallet is not found.') // return if Auro Wallet is not found
            return null
        }
        try {
            const message = fields.map(field => field.toString())
            const signedFields = await window.mina.signFields({ message })
            const { o1js: { Signature } } = await import('xane-contracts')
            return Signature.fromBase58(signedFields.signature)
        } catch (err) {
            if (err?.code === 4001) return null
            alert('Open browser console.')
            console.error('An error occured while fields signing.')
            console.error(err)
            return null
        }
    }

    /** Makes a request to send a transaction. */
    const sendTransaction = async (transactionAsJSON: string) => {
        if (!window.mina) return alert('Auro Wallet is not found.') // return if Auro Wallet is not found
        try {
            const transaction = transactionAsJSON
            const feePayer = {
                fee: 0.1,
                memo: 'zk',
            }
            const { hash } = await window.mina.sendTransaction({ transaction, feePayer })
            return hash
        } catch (err) {
            if (err?.code === 4001) return
            console.error('An error occured while transaction sending.')
            console.error(err)
            alert('Open browser console.')
        }
    }

    return {
        subscribe,
        connect,
        signMessage,
        signFields,
        sendTransaction,
        connectIfAuthorized,
    }
}

/**
 * # Custom Svelte Store
 * 
 * This store is for tracking the state of Auro Wallet.
 * 
 * ## How To Connect?
 * You can request to connect Auro Wallet by calling `connect` method.
 * ```svelte
 * <button on:click={wallet.connect}>
 *     Connect
 * </button>
 * ```
 * 
 * ## How To Connect If Authorized?
 * You can connect Auro Wallet if authorized by calling `connectIfAuthorized` method.
 * ```ts
 * onMount(wallet.connectIfAuthorized);
 * ```
 * 
 * ## How To Display User Address & Network?
 * ```svelte
 * <div>
 *     {#if $wallet.isConnected}
 *         <p>Network Name: {$wallet.network}</p>
 *         <p>Address: {$wallet.address}</p>
 *     {:else}
 *         <p>Wallet is not connected.</p>
 *     {/if}
 * </div>
 * ```
 * 
 * You can learn more about Svelte stores using the link below.
 * 
 * https://svelte.dev/docs/svelte-store
 */
export const wallet = createStore()