class Int64 {
    constructor(low, hi) {
        this.low = low >>> 0; // Asegura un entero sin signo de 32 bits
        this.hi = hi >>> 0; // Asegura un entero sin signo de 32 bits
    }

    // Método para sumar un entero de 32 bits a esta instancia de Int64
    add32(val) {
        const newLow = (this.low + val) >>> 0;
        const newHi = this.hi + (newLow < this.low ? 1 : 0);
        return new Int64(newLow, newHi);
    }

    // Método para restar un entero de 32 bits de esta instancia de Int64
    sub32(val) {
        const newLow = (this.low - val) >>> 0;
        const newHi = this.hi - (newLow > this.low ? 1 : 0);
        return new Int64(newLow, newHi);
    }

    // Método para sumar otro Int64
    add64(val) {
        const newLow = (this.low + val.low) >>> 0;
        const newHi = this.hi + val.hi + (newLow < this.low ? 1 : 0);
        return new Int64(newLow, newHi);
    }

    // Método para restar otro Int64
    sub64(val) {
        const newLow = (this.low - val.low) >>> 0;
        const newHi = this.hi - val.hi - (newLow > this.low ? 1 : 0);
        return new Int64(newLow, newHi);
    }

    // Realiza una operación AND con otro Int64
    and64(val) {
        const newLow = this.low & val.low;
        const newHi = this.hi & val.hi;
        return new Int64(newLow, newHi);
    }

    // Compara si dos instancias de Int64 son iguales
    equals(val) {
        return this.low === val.low && this.hi === val.hi;
    }

    // Compara si esta instancia de Int64 es mayor que otra
    greater(val) {
        return this.hi > val.hi || (this.hi === val.hi && this.low > val.low);
    }

    // Convierte el valor de Int64 a una cadena hexadecimal
    toString() {
        const loHex = this.low.toString(16).padStart(8, '0');
        const hiHex = this.hi.toString(16).padStart(8, '0');
        return hiHex + loHex;
    }

    // Obtiene los 32 bits inferiores de esta instancia
    low32() {
        return this.low;
    }

    // Obtiene los 32 bits superiores de esta instancia
    hi32() {
        return this.hi;
    }

    // Convierte el Int64 a un arreglo de bytes (8 bytes)
    toBytes() {
        const arr = new Uint8Array(8);
        arr.set(new Uint32Array([this.hi, this.low]).buffer);
        return arr;
    }

    // Convierte el Int64 a un valor de punto flotante de doble precisión (64-bit)
    asDouble() {
        const buffer = this.toBytes().buffer;
        const float64Array = new Float64Array(buffer);
        return float64Array[0];
    }

    // Convierte el Int64 a un número entero regular (JS number)
    asInteger() {
        const buffer = this.toBytes().buffer;
        const int64Array = new BigInt64Array(buffer);
        return int64Array[0];
    }

    // Crea un Int64 a partir de un valor de tipo doble (double)
    static fromDouble(d) {
        const buffer = new ArrayBuffer(8);
        new Float64Array(buffer)[0] = d;
        return new Int64(...new Uint32Array(buffer).reverse());
    }
}

// Ejemplo de uso:
const num1 = new Int64(0xFFFFFFFF, 0x00000001); // Crear un Int64 a partir de los valores bajos y altos
const num2 = new Int64(0x00000001, 0x00000001);

const sum = num1.add64(num2); // Sumar dos Int64
const difference = num1.sub64(num2); // Restar dos Int64

console.log('Suma:', sum.toString()); // Mostrar la suma en formato hexadecimal
console.log('Diferencia:', difference.toString()); // Mostrar la diferencia en formato hexadecimal
console.log('¿Iguales?', num1.equals(num2)); // Verificar si son iguales
console.log('¿Mayor?', num1.greater(num2)); // Verificar si num1 es mayor que num2
