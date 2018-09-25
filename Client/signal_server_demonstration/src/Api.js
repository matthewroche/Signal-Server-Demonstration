import util from './util';
const libsignal = window.libsignal;
const KeyHelper = libsignal.KeyHelper;

export default class Api {

    baseUrl = "http://127.0.0.1:8000/"

    constructor(store) {
        this.store = store;
    }

    registerNewUser = async (username, password) => {

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
                this.store.storeUser(username, password)
                return(this.registerDevice(response.token, username))
            }
        } else {
            console.log("Error registering user");
            console.log(response);
            return(response)
        }
    }

    logUserIn = async (username, password) => {
        
        await this.store.storeUser(username, password)
        let response = await this.obtainJwt(username, password)
        if (response.token) {
            return(this.registerDevice(response.token, username))
        }

    }

    checkUserExists = async () => {
        const userobject = await this.store.loadUser()
        if (userobject && userobject.username) {
            userobject.address = await this.store.loadAddress()
            return userobject
        } else {
            return false
        }
    }

    logUserOut = async () => {
        const registrationId = await this.store.getLocalRegistrationId()
        const jwt = await this.store.loadJWT()
        let response = await this.fetchWithJWTCheck(this.baseUrl+"users/"+registrationId+"/", {
            method: "DELETE",
            mode: "cors",
            body: JSON.stringify({}),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                'Authorization': 'Bearer '+ jwt,
            },
        })
        if (response.status === 204) {
            await this.store.clearStore()
            return true
        }
    }

    obtainJwt = async () => {
        const userobject = await this.store.loadUser()
        return fetch(this.baseUrl+"auth/jwt/create", {
            method: "POST",
            mode: "cors",
            body: JSON.stringify({username: userobject.username, password: userobject.password}),
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
        }).then(async (response) => {
            if (response.status === 200) {
                response = await response.json()
                this.store.storeJWT(response.token)
                return response
            } else {
                console.log("Error retrieving token");
                console.log(response);
                return(response)
            }
        })
          
    }

    fetchWithJWTCheck = async (url, args) => {
        let response = await fetch(url, args)
        if (response.status === 401) {
            const userobject = this.store.loadUser();
            const jwt = await this.obtainJwt(userobject.username, userobject.password)
            args.headers.Authorization = 'Bearer '+ jwt.token
            response = await fetch(url, args)
            return response
        } else {
            return response
        }
    }

    registerDevice = async (username) => {

        const jwt = await this.store.loadJWT()
        const userobject = await this.store.loadUser()

        //Create identity
        const address = new libsignal.SignalProtocolAddress(userobject.username, 1);
        await this.store.storeAddress(address);
        await this.store.storeIdentityKeyPair(await KeyHelper.generateIdentityKeyPair())
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

        let response = await this.fetchWithJWTCheck(this.baseUrl+"users/"+registrationId+"/", {
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
        })
        
        if (response.status === 201) {
            response = await response.json()
            response.address = address;
            response.token = jwt
            return(response)
        } else {
            console.log("Error registering device");
            console.log(response);
            response = await response.json();
            console.log(response);
            return(response)
        }

    }

    sendMessage = (message, recipientAddress, localAddress, jwt) => {

    }

    retrieveMessages = (jwt) => {
        
    }
    
}