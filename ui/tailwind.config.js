/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            fontFamily: {
                'serif': "'Manrope',sans-serif",
                'mono': "'Jetbrains_Mono',monospace",
            },
            borderRadius: {
                'xlg': '0.625rem'
            },
            scale: {
                '85': '.85'
            }
        },
    },
    future: {
        hoverOnlyWhenSupported: true,
    },
    plugins: [],
}

