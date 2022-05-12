require('colors');
const fs = require('fs');
const path = require('path');
const cryptojs = require('crypto-js');

//Get project's package.json to read version info
const packageJson = require('./package.json');

//Get version.json to update
const manifest = require('./src/manifest.json');

const keyHash = cryptojs.MD5(manifest.terminal.serial).toString().toUpperCase();

//Update the version.json in src folder to match to package.json version
manifest.name = packageJson.name;
manifest.main = packageJson.main;
manifest.description = packageJson.description;
manifest.version = packageJson.version;
manifest.crypto.keyHash = keyHash;

manifest.build = {
    date: Date.now(),
    number: (manifest.build.number || 0) + 1
};

const serial = cryptojs.MD5(JSON.stringify(manifest)).toString().toUpperCase();
manifest.terminal.serial = serial;

console.log('Post Build Version Details'.magenta, manifest);

//Write changes to "version.json"
fs.writeFileSync('./src/manifest.json', JSON.stringify(manifest, null, 4), 'utf8');

function generateSerial(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
