// import { createResource } from 'solid-js'
// import { client } from '../lib/client'
// import { store } from '../lib/store'

import { For, Show, createSignal } from 'solid-js'
import { store } from '../lib/store'
import IconTransfer from '../icons/IconTransfer'
import IconMint from '../icons/IconMint'
import DialogTokenCreation, { showTokenCreationDialog } from './DialogTokenCreation'
import DialogTransfer, { showTransferDialog } from './DialogTransfer'
import DialogMint, { showMintDialog } from './DialogMint'

// const getMinaBalance = async () => {
//     if (!store.address) return
//     return await client.getBalance({
//         address: store.address,
//     })
// }

export default function Balances() {
    // const [balance] = createResource(store.address, getMinaBalance)

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
                                <button
                                    onClick={() => showMintDialog(tokenBalance.id)}
                                    class="bg-blue-500 hover:bg-blue-400 w-9 flex items-center justify-center duration-75 rounded-full h-9"
                                >
                                    <IconMint />
                                </button>
                            </Show>
                            <button
                                onClick={() => showTransferDialog(tokenBalance.id)}
                                class="bg-blue-500 hover:bg-blue-400 w-9 flex items-center justify-center duration-75 rounded-full h-9"
                            >
                                <IconTransfer />
                            </button>
                        </div>
                    </div>
                )}
            </For>
            <div class="flex justify-center pt-2">
                <button
                    class="bg-blue-500 duration-75 hover:bg-blue-400 rounded-full h-9 px-6 font-semibold text-lg"
                    onClick={showTokenCreationDialog}
                >
                    Create Your Own Token
                </button>
            </div>
            <DialogTokenCreation />
            <DialogTransfer />
            <DialogMint />
        </div>
    )
}
