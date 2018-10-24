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
  // Utilities
  // 
  keypairToString: function(keypair) {
    for (let key in keypair) {
      keypair[key] = util.toString(keypair[key])
    }
    return JSON.stringify(keypair)
  },
  keypairToBuffer: function(keypair) {
    keypair = JSON.parse(keypair)
    for (let key in keypair) {
      keypair[key] = util.toArrayBuffer(keypair[key])
    }
    return keypair
  },
  isTrustedIdentity: async function(identifier, identityKey, direction) {
    if (identifier === null || identifier === undefined) {
      throw new Error("tried to check identity key for undefined/null key");
    }
    if (!(identityKey instanceof ArrayBuffer)) {
      throw new Error("Expected identityKey to be an ArrayBuffer");
    }
    var trusted = await this.get('identityKey' + identifier);
    if (trusted === undefined) {
      return true;
    }
    return (util.toString(identityKey) === trusted);
  },




  // 
  // Storage and encryption
  // 
  put: async function(key, value) {

    console.log("Putting: " + key + " : " + value);

    if (key === undefined || value === undefined || key === null || value === null) {
      throw new Error("Tried to store undefined/null");
    }

    // Handle encryption
    const vector = crypto.getRandomValues(new Uint8Array(16));

    value = await window.crypto.subtle.encrypt({name: "AES-CBC", iv: vector}, this.userDetails.key, util.toArrayBuffer(value))
    value = util.toString(value, "base64") + ":" + util.toString(vector, "base64")
    
    this.store.setItem(key, value);
  },
  get: async function(key, defaultValue) {

    console.log("Getting: " + key);
    
    if (key === null || key === undefined)
      throw new Error("Tried to get value for undefined/null key");
    if (this.store.getItem(key)) {

      try {

        let result = this.store.getItem(key);

        // Handle decryption
        result = result.split(":")
        let value = result[0]
        let vector = result[1]
        //http://qnimate.com/passphrase-based-encryption-using-web-cryptography-api/
        vector = new Uint8Array(util.toArrayBuffer(vector, "base64"))
        value = new Uint8Array(util.toArrayBuffer(value, "base64"))
        
        value = await window.crypto.subtle.decrypt({name: "AES-CBC", iv: vector}, this.userDetails.key, value)
        value = util.toString(new Uint8Array(value))

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
  remove: function(key) {
    if (key === null || key === undefined)
      throw new Error("Tried to remove value for undefined/null key");
    this.store.removeItem(key);;
  },
  clearStore: function() {
    this.store.clear()
    this.clearUser()
    return Promise.resolve(true);
  },
  




  // 
  // Local user details
  // 
  storeUser: async function(username, password) {
    // Generate encryption key
    const hash = await crypto.subtle.digest({name: "SHA-256"}, util.toArrayBuffer(password))
    const key = await window.crypto.subtle.importKey("raw", hash, {name: "AES-CBC"}, false, ["encrypt", "decrypt"])

    this.userDetails = {
      username: username,
      password: password,
      key: key
    }
  },
  loadUser: function() {
    return this.userDetails
  },
  clearUser: function() {
    this.userDetails = {}
  },






  // 
  // Registration ID
  // 
  storeLocalRegistrationId: async function(registrationId) {
    return await this.put('registrationId', registrationId.toString());
  },
  getLocalRegistrationId: async function() {
    let registrationId = await this.get('registrationId')
    registrationId = parseInt(registrationId, 10)
    return registrationId;
  },






  // 
  // Local address
  // 
  storeAddress: async function(address) {
    return await this.put('address', address.toString());
  },
  loadAddress: async function() {
    const address = new libsignal.SignalProtocolAddress.fromString(await this.get('address'))
    console.log(address);
    return address;
  },




  // 
  // JWT
  // 
  storeJWT: async function(jwt) {
    return await this.put('jwt', jwt);
  },
  loadJWT: async function() {
    return await this.get('jwt');
  },






  // 
  // Local User's Identity Keys
  // 
  storeIdentityKeyPair: async function(keypair) {
    keypair = this.keypairToString(keypair)
    await this.put('identityKey', keypair)
  },
  getIdentityKeyPair: async function() {
    let keypair = await this.get('identityKey')
    keypair = this.keypairToBuffer(keypair)
    return Promise.resolve(keypair);
  },
  
  




  // 
  // Recipient identity keys
  // 
  loadIdentityKey: async function(identifier) {
    if (identifier === null || identifier === undefined)
      throw new Error("Tried to get identity key for undefined/null key");
    return util.toArrayBuffer(await this.get('identityKey' + identifier));
  },
  saveIdentity: async function(identifier, identityKey) {
    
    if (identifier === null || identifier === undefined) {
      throw new Error("Tried to put identity key for undefined/null key");
    }

    var address = new libsignal.SignalProtocolAddress.fromString(identifier);

    var existing = await this.get('identityKey' + address.getName());
    await this.put('identityKey' + address.getName(), util.toString(identityKey))

    if (existing && util.toString(identityKey) !== existing) {
      return true;
    } else {
      return false;
    }

  },

  





  // 
  // Local user's prekeys
  // 
  loadPreKey: async function(keyId) {
    var res = await this.get('25519KeypreKey' + keyId);
    if (res !== undefined) {
      res = this.keypairToBuffer(res)
      res = { pubKey: res.pubKey, privKey: res.privKey };
    }
    return res;
  },
  storePreKey: async function(keyId, keyPair) {
    keyPair = Object.assign({}, keyPair)
    keyPair = this.keypairToString(keyPair)
    return await this.put('25519KeypreKey' + keyId, keyPair);
  },
  removePreKey: function(keyId) {
    return Promise.resolve(this.remove('25519KeypreKey' + keyId));
  },
  countPreKeys: function() {
    let count = 0
    let maxPrekeyId = 1
    for (var id in this.store) {
      if (id.startsWith('25519KeypreKey')) {
        count ++
        const prekeyId = parseInt(id.replace('25519KeypreKey', ''), 10)
        if (prekeyId > maxPrekeyId) {
          maxPrekeyId = prekeyId
        }
      }
    }
    return Promise.resolve({count: count, maxPrekeyId: maxPrekeyId});
  },







  // 
  // Local user's signed pre-keys
  // 
  loadSignedPreKey: async function(keyId) {
    var res = await this.get('25519KeysignedKey' + keyId);
    if (res !== undefined) {
      res = JSON.parse(res)
      let keypair = res.keypair
      keypair = this.keypairToBuffer(keypair)
      res = { pubKey: keypair.pubKey, privKey: keypair.privKey };
    }
    return res;
  },
  /* Returns a signed keypair object or undefined */
  loadSignedPreKeyDates: async function(keyId) {
    const data = {}
    for (var id in this.store) {
      if (id.startsWith('25519KeysignedKey')) {
        var res = await this.get(id);
        res = JSON.parse(res);
        const creationDate = res.creationDate
        const signedPrekeyId = parseInt(id.replace('25519KeysignedKey', ''), 10)
        data[signedPrekeyId] = creationDate
      }
    }
    return data;
  },
  storeSignedPreKey: async function(keyId, keyPair) {
    keyPair = Object.assign({}, keyPair)
    keyPair = this.keypairToString(keyPair)
    const creationDate = Date.now();
    return await this.put('25519KeysignedKey' + keyId, JSON.stringify({keypair: keyPair, creationDate: creationDate}));
  },
  removeSignedPreKey: function(keyId) {
    return Promise.resolve(this.remove('25519KeysignedKey' + keyId));
  },







  // 
  // Sessions
  // 
  loadSession: async function(identifier) {
    var session = await this.get('session' + identifier)
    if (session) {
      session = JSON.parse(session)
    }
    return Promise.resolve(session);
  },
  storeSession: async function(identifier, record) {
    record = JSON.stringify(record)
    return await this.put('session' + identifier, record);
  },
  removeSession: function(identifier) {
    return Promise.resolve(this.remove('session' + identifier));
  },
  removeAllSessions: function(identifier) {
    for (var id in this.store) {
      if (id.startsWith('session' + identifier)) {
        delete this.store[id];
      }
    }
    return Promise.resolve();
  },
  checkSessionExists: async function(identifier) {
    identifier = identifier.toString()
    var session = await this.get('session' + identifier)
    return session !== undefined
  },
  checkPreExistingSessionsForUser: async function(username) {
    let devicesToReturn = []
    for (var id in this.store) {
      if (id.startsWith('session' + username)) {
        const sessionObject = JSON.parse(JSON.parse(await this.get(id)))
        const deviceId = parseInt(id.substring(('session' + username).length+1), 10)
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
  }
  
};