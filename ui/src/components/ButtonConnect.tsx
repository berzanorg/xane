import { Show } from 'solid-js'
import { state, setState } from '../lib/store'
import { createWorker } from '../lib/createWorker'

export default function ButtonConnect() {
    console.log('hey')

    const connect = async () => {
        if (!window.mina) return alert('Auro Wallet is not installed.')
        const addresses = await window.mina.requestAccounts()
        if (addresses[0]) {
            setState('address', addresses[0])
        }
    }

    const disconnect = async () => {
        setState('address', undefined)
    }

    const worker = createWorker()

    return (
        <Show
            when={state.address}
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
