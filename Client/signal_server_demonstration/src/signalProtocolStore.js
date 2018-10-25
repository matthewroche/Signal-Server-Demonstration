import util from './util';

const libsignal = window.libsignal;

export default function SignalProtocolStore() {
  this.store = window.sessionStorage;
  this.userDetails = {}
}

SignalProtocolStore.prototype = {
  Direction: {
    SENDING: 1,
    RECEIVING: 2,
  },



  // 
  // 
  // STORAGE AND ENCRYPTION
  // 
  // These functions handle storage and retrieval locally and provide local encryption using AES-GCM
  // To function these values require a user to have been registered using storeUser()
  // 
  // _______________________________________________________________________________________________
  // Stores a key-value pair
  put: async function(key, value) {
    if (key === undefined || value === undefined || key === null || value === null) {
      throw new Error("Tried to store undefined/null");
    }

    // Handle encryption
    const vector = window.crypto.getRandomValues(new Uint8Array(12)); //Create injection vector
    const additionalData = util.toArrayBuffer(key) //Validate key to check for tampering
    value = await window.crypto.subtle.encrypt({name: "AES-GCM", iv: vector, additionalData: additionalData, tagLength: 128}, this.userDetails.key, util.toArrayBuffer(value))
    value = util.toString(value, "base64") + ":" + util.toString(vector, "base64") //Covert to Base64 for storage and combine ciphertext with IV
    
    // Store encrypted value
    this.store.setItem(key, value);
  },
  // Retrieves a key from the store
  get: async function(key, defaultValue) {
    if (key === null || key === undefined)
      throw new Error("Tried to get value for undefined/null key");
    if (this.store.getItem(key)) { //If item exists
      try {

        let result = this.store.getItem(key); //Get encrypted value

        // Handle decryption
        result = result.split(":") //Split string to get Cipher Text and IV
        let value = result[0]
        let vector = result[1]
        //http://qnimate.com/passphrase-based-encryption-using-web-cryptography-api/
        vector = new Uint8Array(util.toArrayBuffer(vector, "base64"))
        value = new Uint8Array(util.toArrayBuffer(value, "base64"))
        const additionalData = util.toArrayBuffer(key) //Get key for validation
        value = await window.crypto.subtle.decrypt({name: "AES-GCM", iv: vector, additionalData: additionalData, tagLength: 128}, this.userDetails.key, value)
        value = util.toString(new Uint8Array(value)) //Convert to string

        return value
      } catch (e) {
        console.log(e);
        console.log("Error decrypting");
        throw e
      }

    } else {
      return defaultValue;
    }

  },
  // Removes a key-value pair from the local storage
  remove: function(key) {
    if (key === null || key === undefined)
      throw new Error("Tried to remove value for undefined/null key");
    this.store.removeItem(key);
  },
  // Removes all data from the store and forgets the current user
  clearStore: function() {
    for (var key in this.store) {
      if (key.startsWith(this.userDetails.username)) {
        this.store.removeItem(key);
      }
    }
    this.clearUser()
    return Promise.resolve(true);
  },
  







  // 
  // 
  // LOCAL USER DETAILS
  // 
  // Handle the registration, retrieval and deletion of a user
  // 
  // _________________________________________________________
  // Stores a user in memory and calculates the key used for encryption
  storeUser: async function(username, password) {
    // Generate encryption key
    const hash = await crypto.subtle.digest({name: "SHA-256"}, util.toArrayBuffer(password))
    const key = await window.crypto.subtle.importKey("raw", hash, {name: "AES-GCM"}, false, ["encrypt", "decrypt"])

    this.userDetails = {
      username: username,
      password: password,
      key: key
    }
  },
  // Loads the details for a user
  loadUser: function() {
    return this.userDetails
  },
  // Removes details of the user from memory
  clearUser: function() {
    this.userDetails = {}
  },








  // 
  // 
  // REGISTRATION ID
  // 
  // Handles storage and retrieval of the user's registration ID
  // 
  // ___________________________________________________________
  // Storage
  storeLocalRegistrationId: async function(registrationId) {
    return await this.put(this.userDetails.username + ':registrationId', registrationId.toString());
  },
  // Retrieval
  getLocalRegistrationId: async function() {
    let registrationId = await this.get(this.userDetails.username + ':registrationId')
    registrationId = parseInt(registrationId, 10)
    return registrationId;
  },









  // 
  // 
  // Local address
  // 
  // Handles storage and retrieval of the local user's address
  // 
  // _________________________________________________________
  // Storage
  storeAddress: async function(address) {
    return await this.put(this.userDetails.username + ':address', address.toString());
  },
  // Retrieval
  loadAddress: async function() {
    const address = new libsignal.SignalProtocolAddress.fromString(await this.get(this.userDetails.username + ':address'))
    return address;
  },









  //
  //  
  // JWT
  // 
  // Handles storage and retrieval of the user's current JWT
  // 
  // _______________________________________________________
  // Storage
  storeJWT: async function(jwt) {
    return await this.put(this.userDetails.username + ':jwt', jwt);
  },
  // Retrieval
  loadJWT: async function() {
    return await this.get(this.userDetails.username + ':jwt');
  },









  // 
  // 
  // LOCAL USER'S IDENTITY KEY PAIR
  // 
  // Handles storage and retrieval of the local user's identity keypair
  // 
  // __________________________________________________________________
  // Storage
  storeIdentityKeyPair: async function(keypair) {
    keypair = this.keypairToString(keypair)
    await this.put(this.userDetails.username + ':identityKey', keypair)
  },
  // Retrieval
  getIdentityKeyPair: async function() {
    let keypair = await this.get(this.userDetails.username + ':identityKey')
    keypair = this.keypairToBuffer(keypair)
    return Promise.resolve(keypair);
  },
  
  








  // 
  // 
  // RECIPIENT IDENTITY KEYS
  // 
  // Handles storage and retrieval of a remote user's identity key
  // 
  // _____________________________________________________________
  // Stoarage
  loadIdentityKey: async function(identifier) {
    if (identifier === null || identifier === undefined)
      throw new Error("Tried to get identity key for undefined/null key");
    return util.toArrayBuffer(await this.get(this.userDetails.username + ':identityKey' + identifier));
  },
  // Retrieval - Also return's true if the identity key was updated (used internally by Signal)
  saveIdentity: async function(identifier, identityKey) {
    
    if (identifier === null || identifier === undefined) {
      throw new Error("Tried to put identity key for undefined/null key");
    }

    var address = new libsignal.SignalProtocolAddress.fromString(identifier);

    var existing = await this.get(this.userDetails.username + ':identityKey' + address.getName());
    await this.put(this.userDetails.username + ':identityKey' + address.getName(), util.toString(identityKey))

    if (existing && util.toString(identityKey) !== existing) {
      return true;
    } else {
      return false;
    }

  },

  








  // 
  // 
  // LOCAL USER'S PREKEYS
  // 
  // Handles storage, retrieval and removal of the local user's prekeys
  // 
  // __________________________________________________________________
  // Storage
  storePreKey: async function(keyId, keyPair) {
    keyPair = Object.assign({}, keyPair)
    keyPair = this.keypairToString(keyPair)
    return await this.put(this.userDetails.username + ':25519KeypreKey' + keyId, keyPair);
  },
  // Retrieval
  loadPreKey: async function(keyId) {
    var res = await this.get(this.userDetails.username + ':25519KeypreKey' + keyId);
    if (res !== undefined) {
      res = this.keypairToBuffer(res)
      res = { pubKey: res.pubKey, privKey: res.privKey };
    }
    return res;
  },
  // Removal
  removePreKey: function(keyId) {
    return Promise.resolve(this.remove(this.userDetails.username + ':25519KeypreKey' + keyId));
  },
  // Return total number of prekeys (to calculate next prekey ID)
  countPreKeys: function() {
    let count = 0
    let maxPrekeyId = 1
    for (var id in this.store) {
      if (id.startsWith(this.userDetails.username + ':25519KeypreKey')) {
        count ++
        const prekeyId = parseInt(id.replace(this.userDetails.username + ':25519KeypreKey', ''), 10)
        if (prekeyId > maxPrekeyId) {
          maxPrekeyId = prekeyId
        }
      }
    }
    return Promise.resolve({count: count, maxPrekeyId: maxPrekeyId});
  },









  // 
  // 
  // LOCAL USER'S SIGNED PRE-KEYS
  // 
  // Handles storage, retrieval and removal of local user's signed prekeys
  // 
  // _____________________________________________________________________
  // Storage
  storeSignedPreKey: async function(keyId, keyPair) {
    keyPair = Object.assign({}, keyPair)
    keyPair = this.keypairToString(keyPair)
    const creationDate = Date.now();
    return await this.put(this.userDetails.username + ':25519KeysignedKey' + keyId, JSON.stringify({keypair: keyPair, creationDate: creationDate}));
  },
  // Retrieval
  loadSignedPreKey: async function(keyId) {
    var res = await this.get(this.userDetails.username + ':25519KeysignedKey' + keyId);
    if (res !== undefined) {
      res = JSON.parse(res)
      let keypair = res.keypair
      keypair = this.keypairToBuffer(keypair)
      res = { pubKey: keypair.pubKey, privKey: keypair.privKey };
    }
    
    return res;
  },
  // Returns creation dates for each signed prekey
  // (For calculation of update and deletion)
  loadSignedPreKeyDates: async function(keyId) {
    const data = {}
    for (var id in this.store) {
      if (id.startsWith(this.userDetails.username + ':25519KeysignedKey')) {
        var res = await this.get(id);
        res = JSON.parse(res);
        const creationDate = res.creationDate
        const signedPrekeyId = parseInt(id.replace(this.userDetails.username + ':25519KeysignedKey', ''), 10)
        data[signedPrekeyId] = creationDate
      }
    }
    return data;
  },
  // Removal
  removeSignedPreKey: function(keyId) {
    return Promise.resolve(this.remove(this.userDetails.username + ':25519KeysignedKey' + keyId));
  },









  // 
  // 
  // SESSIONS
  // 
  // Handles storage, retrieval and removal of remote session data
  // 
  // _____________________________________________________________
  // Storage
  storeSession: async function(identifier, record) {
    record = JSON.stringify(record)
    return await this.put(this.userDetails.username + ':session' + identifier, record);
  },
  // Retrieval
  loadSession: async function(identifier) {
    var session = await this.get(this.userDetails.username + ':session' + identifier)
    if (session) {
      session = JSON.parse(session)
    }
    return Promise.resolve(session);
  },
  // Removal
  removeSession: function(identifier) {
    return Promise.resolve(this.remove(this.userDetails.username + ':session' + identifier));
  },
  // Deletion of all session data
  removeAllSessions: function(identifier) {
    for (var id in this.store) {
      if (id.startsWith(this.userDetails.username + ':session' + identifier)) {
        delete this.store[id];
      }
    }
    return Promise.resolve();
  },
  // Check for the existance of a specific session
  checkSessionExists: async function(identifier) {
    identifier = identifier.toString()
    var session = await this.get(this.userDetails.username + ':session' + identifier)
    return session !== undefined
  },
  // Check all existing sessions for a single remote user
  checkPreExistingSessionsForUser: async function(username) {
    let devicesToReturn = []
    for (var id in this.store) {
      if (id.startsWith(this.userDetails.username + ':session' + username)) {
        const sessionObject = JSON.parse(JSON.parse(await this.get(id)))
        const deviceId = parseInt(id.substring((this.userDetails.username + ':session' + username).length+1), 10)
        const address = new libsignal.SignalProtocolAddress(username, deviceId);
        for (let session in sessionObject.sessions) {
          devicesToReturn.push({
            registrationId: sessionObject.sessions[session].registrationId,
            address: address.toString()
          })
        }
      }
    }
    
    return devicesToReturn;
  },







  // 
  // UTILITIES
  // 
  // These are just generic functions used to handle data processing within the app or by Signal
  // 
  // Takes a keypair in Buffer form and returns a JSON encoded representation
  keypairToString: function(keypair) {
    for (let key in keypair) {
      keypair[key] = util.toString(keypair[key])
    }
    return JSON.stringify(keypair)
  },
  // Converts a JSON encoded representation of a keypair and returns the relevant buffers
  keypairToBuffer: function(keypair) {
    keypair = JSON.parse(keypair)
    for (let key in keypair) {
      keypair[key] = util.toArrayBuffer(keypair[key])
    }
    return keypair
  },
  // Checks whether a provided identity key matches that previously seen for a user
  // NB: Used internally by Signal
  isTrustedIdentity: async function(identifier, identityKey, direction) {
    if (identifier === null || identifier === undefined) {
      throw new Error("tried to check identity key for undefined/null key");
    }
    if (!(identityKey instanceof ArrayBuffer)) {
      throw new Error("Expected identityKey to be an ArrayBuffer");
    }
    var trusted = await this.get(this.userDetails.username + ':identityKey' + identifier);
    if (trusted === undefined) {
      return true;
    }
    return (util.toString(identityKey) === trusted);
  }
  
};