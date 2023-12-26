import { For, Match, Switch } from 'solid-js'
import { store } from '../lib/store'
import DialogOrderPlacing, { showOrderPlacingDialog } from './DialogOrderPlacing'

export default function MenuTrading() {
    const onBuy = async () => {}
    const onSell = async () => {}

    return (
        <div class="flex flex-col gap-4">
            <For each={store.orders}>
                {(order) => (
                    <div class="flex justify-between items-center px-4 h-14 bg-slate-800 rounded-full">
                        <p class="text-lg font-medium">
                            <span class="font-semibold">
                                {(order.amount / 10n ** order.baseCurrencyDecimals).toLocaleString()}
                                &nbsp
                                {order.baseCurrencySymbol}
                            </span>
                            &nbsp at price &nbsp
                            <span class="font-semibold">
                                {(order.price / 10n ** order.quoteCurrencyDecimals).toLocaleString()}
                                &nbsp
                                {order.quoteCurrencySymbol}
                            </span>
                        </p>
                        <div></div>
                        <Switch>
                            <Match when={order.side === 'BUY'}>
                                <button
                                    onClick={onBuy}
                                    class="h-9 px-5 rounded-full bg-blue-500 hover:bg-blue-400 duration-75 text-lg font-semibold"
                                >
                                    Buy
                                </button>
                            </Match>
                            <Match when={order.side === 'SELL'}>
                                <button
                                    onClick={onSell}
                                    class="h-9 px-5 rounded-full bg-rose-500 hover:bg-rose-400 duration-75 text-lg font-semibold"
                                >
                                    Sell
                                </button>
                            </Match>
                        </Switch>
                    </div>
                )}
            </For>

            <div class="flex justify-center pt-2">
                <button
                    onClick={showOrderPlacingDialog}
                    class="bg-blue-500 duration-75 hover:bg-blue-400 rounded-full h-9 px-6 font-semibold text-lg"
                >
                    Place New Order
                </button>
            </div>
            <DialogOrderPlacing />
        </div>
    )
}
