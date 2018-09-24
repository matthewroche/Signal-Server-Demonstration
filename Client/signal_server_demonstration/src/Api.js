const ByteBuffer = require("bytebuffer");
const libsignal = window.libsignal;
const KeyHelper = libsignal.KeyHelper;

export default class Api {

    baseUrl = "http://127.0.0.1:8000/"

    constructor(store) {
        this.store = store;
    }

    registerNewUser = (username, password) => {
        return new Promise(async (resolve, reject) => {
            let response = await fetch(this.baseUrl+"auth/users/", {
                method: "POST",
                mode: "cors",
                body: JSON.stringify({username: username, password: password}),
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
            })
            
            if (response.status === 201) {
                
                response = await this.obtainJwt(username, password)
                if (response.token) {
                    resolve(this.registerDevice(response.token, username))
                }
            } else {
                console.log("Error registering user");
                console.log(response);
                reject(response)
            }
        })
    }

    logUserIn = (username, password) => {
        return new Promise(async (resolve, reject) => {
            let response = await this.obtainJwt(username, password)
            if (response.token) {
                resolve(this.registerDevice(response.token, username))
            }
        })
    }

    obtainJwt = (username, password) => {
        return fetch(this.baseUrl+"auth/jwt/create", {
            method: "POST",
            mode: "cors",
            body: JSON.stringify({username: username, password: password}),
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
        }).then(function(response) {
            if (response.status === 200) {
                return response.json()
            } else {
                console.log("Error retrieving token");
                console.log(response);
                return(response)
            }
        })
          
    }

    registerDevice = (jwt, username) => {

        return new Promise(async (resolve, reject) => {

            //Create identity
            const address = new libsignal.SignalProtocolAddress(username, 1);
            await this.store.put('identityKey', KeyHelper.generateIdentityKeyPair())
            await this.store.put('registrationId', KeyHelper.generateRegistrationId())

            //Create keys
            let preKeys = []
            for (let i=1; i<10; i++) {
                preKeys.push(await KeyHelper.generatePreKey(i))
                await this.store.storePreKey(i, preKeys.slice(-1)[0].keyPair);
            }
            
            const signedPreKey = await KeyHelper.generateSignedPreKey(await this.store.getIdentityKeyPair(), 1)
            await this.store.storeSignedPreKey(1, signedPreKey.keyPair);

            const registrationId = await this.store.getLocalRegistrationId()

            fetch(this.baseUrl+"users/"+registrationId+"/", {
                method: "POST",
                mode: "cors",
                body: JSON.stringify({
                    identityKey: util.toString((await this.store.getIdentityKeyPair()).pubKey), 
                    registrationId: registrationId,
                    preKeys: preKeys.map((i) => {
                        return {keyId: i.keyId, publicKey: util.toString(i.keyPair.pubKey)}
                    }),
                    signedPreKey: {keyId: 1, publicKey: util.toString(signedPreKey.keyPair.pubKey), signature: util.toString(signedPreKey.signature)}
                }),
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    'Authorization': 'Bearer '+ jwt,
                },
            }).then(async function(response) {
                if (response.status === 201) {
                    response = await response.json()
                    response.address = address;
                    response.token = jwt
                    resolve(response)
                } else {
                    console.log("Error registering device");
                    console.log(response);
                    response = await response.json();
                    console.log(response);
                    reject(response)
                }
            })

        })

    }

    sendMessage = (message, recipientAddress, localAddress, jwt) => {

    }

    retrieveMessages = (jwt) => {
        
    }
    
}

var util = (function() {

    var StaticArrayBufferProto = new ArrayBuffer().__proto__;
  
    return {
        toString: function(thing) {
            if (typeof thing === 'string') {
                return thing;
            }
            return new ByteBuffer.wrap(thing).toString('binary');
        },
        toArrayBuffer: function(thing) {
            if (thing === undefined) {
                return undefined;
            }
            if (thing === Object(thing)) {
                if (thing.__proto__ === StaticArrayBufferProto) {
                    return thing;
                }
            }
  
            // eslint-disable-next-line
            var str;
            if (typeof thing === "string") {
                str = thing;
            } else {
                throw new Error("Tried to convert a non-string of type " + typeof thing + " to an array buffer");
            }
            return new ByteBuffer.wrap(thing, 'binary').toArrayBuffer();
        },
        isEqual: function(a, b) {
            // TODO: Special-case arraybuffers, etc
            if (a === undefined || b === undefined) {
                return false;
            }
            a = util.toString(a);
            b = util.toString(b);
            var maxLength = Math.max(a.length, b.length);
            if (maxLength < 5) {
                throw new Error("a/b compare too short");
            }
            return a.substring(0, Math.min(maxLength, a.length)) === b.substring(0, Math.min(maxLength, b.length));
        }
    };
})();