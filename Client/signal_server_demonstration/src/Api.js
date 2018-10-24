import util from './util';
const libsignal = window.libsignal;
const KeyHelper = libsignal.KeyHelper;

export default class Api {

    // Handles construction of API and sets defaults
    // Aruments:
    //   baseUrl: Url to send API calls to (required)
    //   store: reference to the signalProtocolStore (required)
    //   minPreKeys: minimum number of prekeys required remaining, below 
    //     which more will be created (optional)
    //   signedPreKeyExpiryLength: length in ms to keep signed preKey active, 
    //     after which a new one will be created and registered on the server
    //   signedPreKeyDeletionLength: length in ms to keep signed preKey stored locally,
    //     beyond which it will be deleted
    // Returns:
    //   null
    constructor(baseUrl, store, minPreKeys=5, signedPreKeyExpiryLength=30000, signedPreKeyDeletionLength=90000) {
        this.baseUrl = baseUrl
        this.store = store;
        this.minPreKeys = minPreKeys
        this.signedPreKeyExpiryLength = signedPreKeyExpiryLength
        this.signedPreKeyDeletionLength = signedPreKeyDeletionLength
    }

    // Registers a new user on the server, requests a JWT and creates a new device
    // Arguments:
    //   username: The user's desired username (Required)
    //   password: The user's desired password (Required)
    // Returns:
    //   A promise which when complete will return on object with the device's details and the current JWT
    registerNewUser = async (username, password) => {

        try {
            // Register user
            let response = await fetch(this.baseUrl+"auth/users/", {
                method: "POST",
                mode: "cors",
                body: JSON.stringify({username: username, password: password}),
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
            })
            if (response.status !== 201) { // If not successful
                throw await this.handleFetchError("Error registering user", response)
            }
    
            await this.store.storeUser(username, password) // Store user details
            await this.obtainJwt() // Get a JWT
            return(this.registerDevice()) // Return the promise to register the device
        } catch (e) {
            console.log(e);
        }
    }

    // Handles logging an existing user in to the server, obtains a JWT and registers the device
    // Arguments:
    //   username: The user's username (Required)
    //   password: The user's password (Required)
    // Returns:
    //   A promise which when complete will return on object with the device's details and the current JWT
    logUserIn = async (username, password) => {
        try {
            await this.store.storeUser(username, password) //Store the user details
            await this.obtainJwt() // Get a JWT

            if (! await this.store.getLocalRegistrationId()) {
                console.log('Registering a new device');
                return(this.registerDevice()) // Return the promise to register the device if the device is not previously registered
            } else {
                return(true)
            }
        } catch (e) {
            return(false)
        }
    }

    // Handles logging a user out locally
    // Arguments:
    //   None
    // Returns:
    //   True (if successful)
    logUserOut = async () => {
        try {
            await this.store.clearUser() //Delete stored user details
            return true
        } catch (e) {
            console.log(e)
        }
    }

    // Handles logging a user out locally, and deletes their device details locally and on the server
    // Arguments:
    //   None
    // Returns:
    //   True (if successful)
    deleteDevice = async () => {
        try {
            const registrationId = await this.store.getLocalRegistrationId()
            let response = await this.fetchWithJWTCheck(this.baseUrl+"users/"+registrationId+"/", {
                method: "DELETE",
                mode: "cors",
                body: JSON.stringify({}),
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
            })
            if (response.status !== 204) { //If unsuccessful deleting on the server
                throw await this.handleFetchError("Error deleting device from server", response)
            }
            await this.store.clearStore() //Delete all the details locally
            return true
        } catch (e) {
            console.log(e)
        }
    }

    // Obtains a JWT using the user's username and password
    // Arguments:
    //   None
    // Returns:
    //   An object containing the JWT token (This does not need to be stored by the user, it
    //     will be kept by the API in the signalProtocolStore
    obtainJwt = async () => {
        try {
            const userobject = await this.store.loadUser()
            let response = await fetch(this.baseUrl+"auth/jwt/create", {
                method: "POST",
                mode: "cors",
                body: JSON.stringify({username: userobject.username, password: userobject.password}),
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
            })
            if (response.status !== 200) { // If unsuccessful
                throw await this.handleFetchError("Error obtaining JWT", response)
            } 
            response = await response.json() // Parse the JSON to obtain the token
            await this.store.storeJWT(response.token) // Store the token in the signalProtocolStore
            return response.token
        } catch (e) {
            console.log(e);
            throw e
        }
    }

    // Handles registering a device for a user that is already logged in
    // Arguments:
    //   None (The user's username and password must be stored prior to calling this, and a
    //     JWT should be available)
    // Returns:
    // An object containing the user's device's details

    registerDevice = async () => {

        try {

            const userobject = await this.store.loadUser() //Get the current user's details

            //Create identity
            const address = new libsignal.SignalProtocolAddress(userobject.username, 1); // Make an address
            await this.store.storeAddress(address); // Store the address locally
            await this.store.storeIdentityKeyPair(await this.generateIdentityKey()) // Create and store the identity keys
            await this.store.storeLocalRegistrationId(KeyHelper.generateRegistrationId()) //Create and store a registration ID

            //Create preKeys
            let preKeys = []
            for (let i=1; i<11; i++) { // Create 10 keys initially (DO NOT CREATE A KEY WITH ID 0)
                preKeys.push(await this.generatePreKey(i)) // Generate the key
                await this.store.storePreKey(i, preKeys.slice(-1)[0].keyPair); //Store the key locally
                // Prekeys are registered on the server below
            }
            
            // Create signed preKey
            
            const signedPreKey = await this.generateSignedPreKey(await this.store.getIdentityKeyPair(), 1) // Generate key
            await this.store.storeSignedPreKey(1, signedPreKey.keyPair); // Store the key locally
            // Signed prekeys are stored on the server below

            const registrationId = await this.store.getLocalRegistrationId()

            console.log(registrationId);
            

            // Send keys to server
            // All keys are converted to base64 strings
            // Only public keys are sent to the server
            let response = await this.fetchWithJWTCheck(this.baseUrl+"users/"+registrationId+"/", {
                method: "POST",
                mode: "cors",
                body: JSON.stringify({
                    address: address.toString(), // Turn address object to string
                    identityKey: util.toString((await this.store.getIdentityKeyPair()).pubKey, 'base64'), 
                    registrationId: registrationId,
                    preKeys: preKeys.map((i) => {
                        return {
                            keyId: i.keyId, 
                            publicKey: util.toString(i.keyPair.pubKey, 'base64')
                        }
                    }),
                    signedPreKey: {
                        keyId: 1, 
                        publicKey: util.toString(signedPreKey.keyPair.pubKey, 'base64'), 
                        signature: util.toString(signedPreKey.signature, 'base64')
                    }
                }),
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
            })
            
            if (response.status === 201) { // If successful
                response = await response.json() //Parse JSON
                response.address = address; // Add local address to response
                return(response)
            } else {
                throw await this.handleFetchError("Error registering device", response)
            }

        } catch (e) {
            console.log(e);
            this.store.clearStore()
        }

    } // register device

    // Sends an encrypted message to the server
    // Arguments:
    //   content: A string message that the user wishes to send
    //   recipientUsername: The username to which the user wishes to send the message
    // Returns:
    //   An array containing details of the messages sent (multiple messages are sent if the recipient
    //     has multiple devices)
    sendMessage = async (content, recipientUsername) => {

        try {

            const localDeviceAddress = (await this.store.loadAddress()).toString()

            content = util.toArrayBuffer(content); //Turn the message string to a buffer
            let newDevices = []
            let messages = []

            // Get devices we already have sessions for for this user
            const preexistingSessionsForUser = await this.store.checkPreExistingSessionsForUser(recipientUsername)

            // Get recipient's current registered devices, excluding those with existing sessions
            let url = new URL(this.baseUrl+"prekeybundle/"+recipientUsername+"/")
            const params = {exclude: JSON.stringify(preexistingSessionsForUser.map(o => o.registrationId))}
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
            
            let response = await this.fetchWithJWTCheck(url, {
                method: "GET",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
            })

            if (response.status === 200) {
                newDevices = await response.json() //If successful parse JSON
            } else {
                throw await this.handleFetchError("Error getting devices", response)
            }

            for (let device of newDevices) { // For each of the recipient's new devices

                console.log('Creating new session for device: ' + device.address);

                const address = new libsignal.SignalProtocolAddress.fromString(device.address) //Calculate recipient's address

                // Need to convert keys from strings returned by server to ArrayBuffers
                const preKeyBundle = this.preKeyBundleStringToArrayBuffer(device);

                console.log(preKeyBundle);
                

                // Build session and process prekeys
                const session = new libsignal.SessionBuilder(this.store, address);

                console.log(session);
                
                await session.processPreKey(preKeyBundle)
            }

            //Amalgamate all required recipient addresses (those with new sessions and those with pre-esisting)
            let allRecipientAddresses = newDevices.map((i) => i.address)
            allRecipientAddresses = [...allRecipientAddresses, ...preexistingSessionsForUser.map(o => o.address)]

            for (let address of allRecipientAddresses) {

                console.log("Sending message to: " + address);

                // Actually encrypt message
                address = new libsignal.SignalProtocolAddress.fromString(address)
                const sessionCipher = new libsignal.SessionCipher(this.store, address);
                const messageContent = await sessionCipher.encrypt(content)
                

                // Push message to array which will be sent to server
                messages.push({
                    senderAddress: localDeviceAddress,
                    recipientAddress: address.toString(),
                    content: JSON.stringify(messageContent) //Stringify the content object
                })

            }

            console.log(messages);
            
            
            // Send messages to server
            response = await this.fetchWithJWTCheck(this.baseUrl+"messages/", {
                method: "POST",
                mode: "cors",
                body: JSON.stringify(messages),
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
            })

            if (response.status === 201) {
                response = await response.json()
                return(response) //If successful return details of the messages stored
            } else {
                throw await this.handleFetchError("Error sending message", response)
            }

        } catch (e) {
            console.log(e);
        }

    }

    // Handles retriving messages from the server for the local device
    // Arguments:
    //   None (The user's device must be registered to the sever before calling this function)
    // Returns:
    //   An array of decrypted messages
    retrieveMessages = async () => {

        try {
            const registrationId = await this.store.getLocalRegistrationId()

            let response = await this.fetchWithJWTCheck(this.baseUrl+"messages/"+registrationId+"/", {
                method: "GET",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
            })

            if (response.status !== 200) {
                throw await this.handleFetchError("Error getting messages from server", response)
            }
            
            const messages = await response.json() // If successful parse JSON

            for (let message of messages) { // For each message
                
                message.content = JSON.parse(message.content) //Parse the content object from string
                message.senderAddress = new libsignal.SignalProtocolAddress.fromString(message.senderAddress) //Create a device address
                message.sender = message.senderAddress.getName() // Get user readable name
                const sessionCipher = new libsignal.SessionCipher(this.store, message.senderAddress); //Create a cipher
                if (message.content.type === 3) {
                    // Decrypting preKeyWhisperMessages
                    console.log("Decrypting PreKeyWhisperMessage");
                    message.content = util.toString(await sessionCipher.decryptPreKeyWhisperMessage(message.content.body, 'binary'));
                } else {
                    // Decrypting simple whisperMessages
                    console.log("Decrypting WhisperMessage");
                    message.content = util.toString(await sessionCipher.decryptWhisperMessage(message.content.body, 'binary'));
                }
            }

            // Delete the retrieved messages
            response = await this.fetchWithJWTCheck(this.baseUrl+"messages/", {
                method: "DELETE",
                mode: "cors",
                body: JSON.stringify(messages.map(o => o.id)),
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
            })
            
            if (response.status !== 200) {
                this.handleFetchError("Error deleting messages from server", response)
            }

            // Update prekeys and signedPrekey
            this.updateIdentity()

            return(messages)

        } catch (e) {
            console.log(e);
        }
    }

    // Handles updating preKeys and signed preKeys
    // Default expiry times and minimum prekey levels can be set in the constructor function
    // Arguments:
    //   None
    // Returns: 
    updateIdentity = async () => {

        const registrationId = await this.store.getLocalRegistrationId()

        // Checking preKeys:
        try {
            // Check preKey number remaining
            const {count, maxPreKeyId} = await this.store.countPreKeys()
            if (count < this.minPreKeys) { //If below minimum level

                console.log("Creating new preKeys...");

                //Create keys
                let preKeys = []
                for (let i=maxPreKeyId; i<(maxPreKeyId+10); i++) { //Create 10 more keys
                    preKeys.push(await this.generatePreKey(i)) //Create key
                    await this.store.storePreKey(i, preKeys.slice(-1)[0].keyPair); // Store key locally
                }
                preKeys = preKeys.map((i) => {
                    return {keyId: i.keyId, publicKey: util.toString(i.keyPair.pubKey, 'base64')} // Strip private keys before sending to server
                })
                let response = await this.fetchWithJWTCheck(this.baseUrl+"prekeys/"+registrationId+"/", {
                    method: "POST",
                    mode: "cors",
                    body: JSON.stringify({preKeys: preKeys}),
                    headers: {
                        "Content-Type": "application/json; charset=utf-8"
                    },
                })
                if (response.status !== 200) {
                    throw await this.handleFetchError("Error registering new preKeys", response)
                }
            }
        } catch (e) {
            console.log(e);
        } // try {

        // Checking signedPreKey
        try {

            // Get stored signedPreKey expiry dates
            const signedPreKeyCreationDates = await this.store.loadSignedPreKeyDates()

            // Delete expired keys
            for (let key in signedPreKeyCreationDates) {
                if (signedPreKeyCreationDates[key] < Date.now()-this.signedPreKeyDeletionLength) {
                    await this.store.removeSignedPreKey(key);
                }
            }


            // Check most recent signedPreKey is valid
            // Get most recent key
            const recentSignedPreKeyId = Math.max(...Object.keys(signedPreKeyCreationDates).map(o => parseInt(o, 10)))
            // If expired
            if (signedPreKeyCreationDates[recentSignedPreKeyId] < Date.now()-this.signedPreKeyExpiryLength) {

                const newSignedPreKeyId = recentSignedPreKeyId+1 //Increment keyId
                
                const signedPreKey = await this.generateSignedPreKey(await this.store.getIdentityKeyPair(), newSignedPreKeyId)
                await this.store.storeSignedPreKey(newSignedPreKeyId, signedPreKey.keyPair); // Store locally
                // Send to server
                let response = await this.fetchWithJWTCheck(this.baseUrl+"signedprekey/"+registrationId+"/", {
                    method: "POST",
                    mode: "cors",
                    body: JSON.stringify({signedPreKey: { //Strip privKey
                        keyId: newSignedPreKeyId, 
                        publicKey: util.toString(signedPreKey.keyPair.pubKey, 'base64'), 
                        signature: util.toString(signedPreKey.signature, 'base64')
                    }}),
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                    },
                })
                if (response.status !== 200) {
                    throw await this.handleFetchError("Error registering new signed preKeys", response)
                }
            }

        } catch (e) {
            console.log(e);
        }
    } //Update identity

    // Generates a preKey that is guaranteed to fulfil protocol and server requirements
    // Sometimes the API generates incorrect keys, this protects against these instances
    generatePreKey = async (keyId) => {
        let preKey = {}
        while (true) {
            preKey = await KeyHelper.generatePreKey(keyId)
            if (preKey.keyPair.pubKey.byteLength !== 33) {continue}
            if (preKey.keyPair.privKey.byteLength !== 32) {continue}
            break
        }
        return preKey
    }

    // Generates an identity key that is guaranteed to fulfil protocol and server requirements
    generateIdentityKey = async () => {
        let identityKey = {}
        while (true) {
            identityKey = await KeyHelper.generateIdentityKeyPair()
            if (identityKey.pubKey.byteLength !== 33) {continue}
            if (identityKey.privKey.byteLength !== 32) {continue}
            break
        }
        return identityKey
    }

    // Generates a signed preKey that is guaranteed to fulfil protocol and server requirements
    generateSignedPreKey = async (identityKey, keyId) => {
        let signedPreKey = {}
        while (true) {
            signedPreKey = await KeyHelper.generateSignedPreKey(identityKey, keyId)
            if (signedPreKey.keyPair.pubKey.byteLength !== 33) {continue}
            if (signedPreKey.keyPair.privKey.byteLength !== 32) {continue}
            if (signedPreKey.signature.byteLength !== 64) {continue}
            break
        }
        return signedPreKey
    }

    // Sends a fetch request with the stored JWT, fetches a new JWT if exired and repeats call
    // Arguments (as per fetch protocol):
    //  url: URL wo send request to (required)
    //  arguments: Arguments as defined by the standard fetch protocol
    // Returns:
    //  Response to request
    fetchWithJWTCheck = async (url, args) => {
        const jwt = await this.store.loadJWT() //Load local JWT
        args.headers.Authorization = 'Bearer '+ jwt // Add jwt token to request correctly
        let response = await fetch(url, args) //Send fetch request
        if (response.status === 401) { //If unauthorised
            const userobject = this.store.loadUser(); //Get stored user details
            const jwt = await this.obtainJwt(userobject.username, userobject.password) //Get new JWT
            args.headers.Authorization = 'Bearer '+ jwt //Adds new JWT to request
            response = await fetch(url, args) // Send new request
            return response
        } else {
            return response
        }
    }

    // Converts a preKeyBundle obtained from the server (in which the keys are strings) to 
    //   one useable by the signal protocol (in which keys are array buffers)
    preKeyBundleStringToArrayBuffer = (preKeyBundle) => {
        preKeyBundle.identityKey = util.toArrayBuffer(preKeyBundle.identityKey, 'base64')
        preKeyBundle.preKey.publicKey =  util.toArrayBuffer(preKeyBundle.preKey.publicKey, 'base64')
        preKeyBundle.signedPreKey.publicKey = util.toArrayBuffer(preKeyBundle.signedPreKey.publicKey, 'base64')
        preKeyBundle.signedPreKey.signature = util.toArrayBuffer(preKeyBundle.signedPreKey.signature, 'base64')
        return(preKeyBundle)
    }

    // Handles a fetch error
    // Arguments:
    //   message: message for user (required)
    //   response: the fetch response (required)
    // Returns:
    //   null
    handleFetchError = async (message, response) => {
        if (response.status === 500) {
            console.error({
                message: message,
                response: response
            })
        } else {
            console.error({
                message: message,
                response: response,
                json: await response.clone().json()
            })
        }
        return new Error(message)
    }
    
}