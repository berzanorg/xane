import { For, Show, createSignal } from 'solid-js'
import { store } from '../lib/store'
import IconTransfer from '../icons/IconTransfer'
import IconMint from '../icons/IconMint'
import DialogTokenCreation, { showTokenCreationDialog } from './DialogTokenCreation'
import DialogTransfer, { showTransferDialog } from './DialogTransfer'
import DialogMint, { showMintDialog } from './DialogMint'

export default function Balances() {
    return (
        <div class="flex flex-col gap-4">
            <For each={store.tokenBalances}>
                {(tokenBalance) => (
                    <div class="bg-slate-800 flex h-14 items-center px-4 rounded-full justify-between">
                        <p class="text-lg font-semibold">
                            {(tokenBalance.amount / 10n ** tokenBalance.decimals).toLocaleString()}
                            &nbsp;{tokenBalance.symbol}
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
