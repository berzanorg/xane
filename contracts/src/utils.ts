/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Field } from "o1js";

/**
 * Converts a `string` to a `Field`.
 * 
 * Expects the given `string` is no longer than 32 bytes & only supports ASCII characters.
 * 
 * Throws if the expectations are not met.
 * 
 * ## Usage
 * ```ts
 * const field: Field = stringToField('hello world')
 * ```
 */
export function stringToField(input: string): Field {
    if (input.length > 32) throw 'string is longer than 32 bytes'

    const bytes: Array<number> = [];
    for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i)
        if (charCode > 255) throw 'non ASCII character is found'
        bytes.push(charCode);
    }

    let bigint = BigInt(0)
    for (let i = 0; i < bytes.length; i++) {
        // @ts-ignore because we already know it is impossible to see out of bounds error.  
        bigint = (bigint << BigInt(8)) + BigInt(bytes[i])
    }

    return Field.from(bigint)
}

/**
 * Converts a `Field` to a `string`.
 * 
 * Expects the given `Field` contains ASCII formatted `string`.
 * 
 * Throws if the expectation is not met.
 * 
 * ## Usage
 * ```ts
 * const str: string = fieldToString(field)
 * ```
 */
export function fieldToString(field: Field): string {
    let bigint = field.toBigInt()

    const bytes: Array<number> = [];
    while (bigint > 0) {
        const charCode = Number(bigint & BigInt(0xff))
        if (charCode > 255) throw 'non ASCII character is found'
        bytes.unshift(charCode);
        bigint >>= BigInt(8);
    }

    return String.fromCharCode(...bytes)
}