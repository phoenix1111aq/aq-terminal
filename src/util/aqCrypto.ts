import * as config from '../manifest.json';
export type TAqCryptoOptions = {
    key: string;
};

export type TKeySets = 'upperCase' | 'lowerCase' | 'numbers';
export type TKeySetRange = Array<number>;

const keySetPresets: { [key in TKeySets]: TKeySetRange } = {
    upperCase: [97, 122],
    lowerCase: [65, 90],
    numbers: [48, 57]
};

class AqCrypto {
    private _key: string;

    public constructor(options: TAqCryptoOptions) {
        this._key = options.key;
    }

    public decrypt(message: string) {
        //First decrypt the string
        const outputBuffer = [];
        const messageLength = message.length;
        const keyLength = this._key.length;
        for (let index = 0; index < messageLength; index++) {
            const byteMessage = message.codePointAt(index);
            const byteKey = this._key.codePointAt(index % keyLength);
            const byteDecrypted = byteMessage ^ byteKey;
            outputBuffer[index] = String.fromCodePoint(byteDecrypted);
        }
        //The decrypted data is a base64
        const base64String = outputBuffer.join('').toString();
        //Decode from base64 to message string
        const decodedMessage = this.fromBase64(base64String);
        return decodedMessage;
    }

    public encrypt(message: string) {
        const outputBuffer = [];
        message = this.toBase64(message);
        const messageLength = message.length;
        const keyLength = this._key.length;
        for (let index = 0; index < messageLength; index++) {
            const byteMessage = message.codePointAt(index);
            const byteKey = this._key.codePointAt(index % keyLength);
            const byteEncrypted = byteMessage ^ byteKey;
            outputBuffer[index] = String.fromCodePoint(byteEncrypted);
        }
        const encryptedMessage = outputBuffer.join('').toString();
        return encryptedMessage;
    }

    public toBase64 = (text: string) => {
        const isBrowser = typeof window !== 'undefined';
        if (isBrowser) {
            //If btoa function exsists (in browser), use browser's function
            return btoa(text);
        } else if (Buffer) {
            //If buffer is not new
            return Buffer.from(text).toString('base64');
        } else {
            throw 'AQ Crypto Error: Base64 Conversion is Unsupported';
        }
    };

    public fromBase64 = (base64String: string) => {
        const isBrowser = typeof window !== 'undefined';
        if (isBrowser) {
            //If btoa function exsists (in browser), use browser's function
            return atob(base64String);
        } else if (Buffer) {
            //If buffer exists (nodejs), use node's function
            return Buffer.from(base64String, 'base64').toString('utf8');
        } else {
            throw 'AQ Crypto Error: Base64 Conversion is Unsupported';
        }
    };

    public generateKey(length: number, ...sets: TKeySets[]) {
        const charSets = [];
        for (const keySet of sets) {
            charSets.push(keySetPresets[keySet]);
        }
        const output = [];
        for (let index = 0; index < length; index++) {
            const randSet = Math.round(Math.random() * (charSets.length - 1));
            const charSet = charSets[randSet];
            const minValue = charSet[0];
            const maxValue = charSet[1];
            const range = maxValue - minValue;
            const random = Math.round(Math.random() * range);
            const charByte = minValue + random;
            const stringByte = String.fromCodePoint(charByte);
            output.push(stringByte);
        }
        const outputString = output.join('').toString();
        return outputString;
    }
}

export const aqCrypto = new AqCrypto({ key: config.crypto.key });
