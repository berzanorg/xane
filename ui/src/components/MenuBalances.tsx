// import { createResource } from 'solid-js'
// import { client } from '../lib/client'
// import { store } from '../lib/store'

import { For, Show, createEffect, createSignal } from 'solid-js'
import { store } from '../lib/store'

// const getMinaBalance = async () => {
//     if (!store.address) return
//     return await client.getBalance({
//         address: store.address,
//     })
// }

export default function Balances() {
    // const [balance] = createResource(store.address, getMinaBalance)
    const [isOpen, setOpen] = createSignal(false)

    const showDialog = () => setOpen(true)
    const closeDialog = () => setOpen(false)

    return (
        <div class="flex flex-col gap-4">
            <For each={store.tokenBalances}>
                {(tokenBalance) => (
                    <div class="bg-slate-800 flex h-14 items-center px-4 rounded-xl justify-between">
                        <p class="sm:text-lg">
                            <span class="font-medium">
                                {(tokenBalance.amount / 10n ** tokenBalance.decimals).toLocaleString()}
                            </span>
                            &nbsp;
                            <span class="font-semibold">{tokenBalance.symbol}</span>
                        </p>
                        <div class="flex gap-4">
                            <Show when={tokenBalance.owner === store.address}>
                                <button class="font-semibold bg-blue-500 hover:bg-blue-400 px-5 text-lg rounded-full h-9">
                                    Mint
                                </button>
                            </Show>
                            <button class="font-semibold bg-blue-500 hover:bg-blue-400 px-5 text-lg rounded-full h-9">
                                Send
                            </button>
                        </div>
                    </div>
                )}
            </For>
            <div class="flex justify-center pt-2">
                <button
                    class="bg-blue-500 hover:bg-blue-400 rounded-full h-9 px-6 font-semibold text-lg"
                    onClick={showDialog}
                >
                    Create Your Own Token
                </button>
            </div>
            <Show when={isOpen()}>
                <div class="fixed top-0 left-0 w-full min-h-screen flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div class="p-4 bg-slate-800 rounded-3xl w-full max-w-xs">
                        <form class="flex flex-col gap-4" onSubmit={closeDialog}>
                            <input
                                placeholder="Symbol"
                                class="bg-slate-900 h-9 uppercase rounded-full outline-none text-white px-5 text-lg font-medium placeholder:text-slate-600"
                                type="text"
                                maxLength={5}
                                required
                            />
                            <input
                                placeholder="Max Supply"
                                class="bg-slate-900 h-9 rounded-full outline-none text-white px-5 text-lg font-medium placeholder:text-slate-600"
                                type="number"
                                maxLength={10}
                                required
                            />
                            <div class="flex  justify-between">
                                <button
                                    class="h-9 px-5 bg-slate-600 hover:bg-slate-500 text-white rounded-full font-semibold text-lg"
                                    type="button"
                                    onClick={closeDialog}
                                >
                                    Cancel
                                </button>
                                <button
                                    class="h-9 px-5 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-semibold text-lg"
                                    type="submit"
                                >
                                    Create Token
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Show>
        </div>
    )
}
