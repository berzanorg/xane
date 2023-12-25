import { Show } from 'solid-js'
import { store } from '../lib/store'

export default function ButtonWallet() {
    const connect = async () => {
        if (!window.mina) return alert('Auro Wallet is not installed.')
        const addresses = await window.mina.requestAccounts()
        if (addresses[0]) {
            store.address = addresses[0]
        }
    }

    const disconnect = async () => {
        store.address = undefined
    }

    return (
        <Show
            when={store.address}
            fallback={
                <button
                    onClick={connect}
                    class="bg-blue-500 hover:bg-blue-400 h-10 px-6 rounded-full font-semibold text-lg"
                >
                    Connect
                </button>
            }
        >
            <button
                onClick={disconnect}
                class="bg-blue-500 hover:bg-blue-400 h-10 px-6 rounded-full font-semibold text-lg"
            >
                Disconnect
            </button>
        </Show>
    )
}
