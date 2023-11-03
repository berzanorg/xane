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
}

/** The type that represents the store when Auro Wallet is not connected. */
type NotConnectedState = {
    isConnected: false
    address: null
    network: null
}


/** The function that creates & returns `wallet` store. */
const createStore = () => {
    const { set, subscribe, update } = writable<StoreState>({
        isConnected: false,
        address: null,
        network: null,
    })

    /** Requests to connect Auro Wallet. */
    const connect = async () => {
        if (!window.mina) return alert('Auro Wallet is not found.') // return if Auro Wallet is not found

        try {
            const accounts = await window.mina.requestAccounts()
            const mainAddress = accounts[0]
            if (!mainAddress) return
            const network = await window.mina.requestNetwork()
            set({
                isConnected: true,
                address: mainAddress,
                network,
            })
            _addEventListeners()
        } catch (err) {
            if (err?.code === 4001) return
            alert('Open browser console.')
            console.error('An error occured.')
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
            const network = await window.mina.requestNetwork()
            set({
                isConnected: true,
                address: mainAddress,
                network,
            })
            _addEventListeners()
        } catch (err) {
            if (err?.code === 4001) return
            alert('Open browser console.')
            console.error('An error occured.')
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
                })
                window.mina?.removeAllListeners()
            } else {
                update(old => old.isConnected ? {
                    isConnected: true,
                    address: mainAddress,
                    network: old.network,
                } : old)
            }
        })

        window.mina.on('chainChanged', (chainName) => {
            update(old => old.isConnected ? ({ ...old, network: chainName }) : old)
        })

    }

    /** Signs the given message. And logs the signedMessage to console. */
    const signMessage = async (message: string) => {
        if (!window.mina) return // returns if Auro Wallet is not found
        try {
            const signedMessage = await window.mina.signMessage({ message })
            console.log('Signed message is below.')
            console.log(signedMessage)
            alert('Open browser console to see the signed message.')
        } catch (err) {
            if (err?.code === 4001) return
            alert('Open browser console.')
            console.error('An error occured.')
            console.error(err)
        }
    }

    return {
        subscribe,
        connect,
        signMessage,
        connectIfAuthorized
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