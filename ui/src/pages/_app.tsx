import Header from '@/components/Header'
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Cairo } from 'next/font/google'

const cairo = Cairo({ subsets: ['latin'] })

export default function App({ Component, pageProps }: AppProps) {
    return (
        <>
            <style jsx global>{` 
                html {
                    font-family: ${cairo.style.fontFamily};
                }
            `}</style>
            <Header />
            <Component {...pageProps} />
        </>

    )
}
