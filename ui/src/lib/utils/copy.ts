/** 
 * Copies the given text to clipboard.
 * 
 * ## Usage
 * 
 * ```ts
 * copy('B62qo3EUgRfVbJf9Pbs8VMbqrNeoS8ACM8NkZ7WNf5n6diKs2PqXqjt')
 * ```
 */
export const copy = (text: string | null) => {
    text && navigator.clipboard.writeText(text)
}