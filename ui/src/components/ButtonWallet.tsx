import { Show, createEffect, createSignal, onMount } from 'solid-js'
import { store } from '../lib/store'

export default function ButtonWallet() {
    const [isAuroFound, setAuroFound] = createSignal(false)
    const [isMouseOverButton, setMouseOverButton] = createSignal(false)

    createEffect(() => {
        console.log(isMouseOverButton())
    })

    const showTooltip = () => !isAuroFound() && isMouseOverButton()

    onMount(async () => {
        if (!window.mina) return
        setAuroFound(true)
        const accounts = await window.mina.getAccounts()
        store.address = accounts[0]
    })

    const connect = async () => {
        const addresses = await window.mina!.requestAccounts()
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
                <>
                    <button
                        disabled={!isAuroFound()}
                        onClick={connect}
                        onMouseEnter={() => setMouseOverButton(true)}
                        onMouseLeave={() => setMouseOverButton(false)}
                        class="bg-blue-500 hover:bg-blue-400 duration-75 h-9 px-5 rounded-full font-semibold text-lg disabled:cursor-not-allowed disabled:hover:bg-blue-500"
                    >
                        Connect
                        <Show when={showTooltip()}>
                            <div class="absolute bg-slate-600 top-16 right-4 sm:right-6 rounded-2xl px-5 h-9 flex items-center justify-center">
                                Auro Wallet is not found.
                            </div>
                        </Show>
                    </button>
                </>
            }
        >
            <button
                onClick={disconnect}
                class="bg-blue-500 hover:bg-blue-400 duration-75 h-9 px-5 rounded-full font-semibold text-lg"
            >
                Disconnect
            </button>
        </Show>
    )
}
