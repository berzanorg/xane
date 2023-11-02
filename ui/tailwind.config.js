/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,js,svelte,ts}'],
    theme: {
        extend: {
            fontFamily: {
                'serif': "'Manrope',sans-serif",
                'mono': "'Jetbrains_Mono',monospace",
            }
        },
    },
    future: {
        hoverOnlyWhenSupported: true,
    },
    plugins: [],
}

