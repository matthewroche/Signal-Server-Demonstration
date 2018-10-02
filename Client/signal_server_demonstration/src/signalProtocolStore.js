import util from './util';

const libsignal = window.libsignal;

export default function SignalProtocolStore() {
  this.store = window.sessionStorage;
}

SignalProtocolStore.prototype = {
  Direction: {
    SENDING: 1,
    RECEIVING: 2,
  },

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
  storeIdentityKeyPair: function(keypair) {
    keypair = this.keypairToString(keypair)
    return Promise.resolve(this.put('identityKey', keypair));
  },
  getIdentityKeyPair: function() {
    let keypair = this.get('identityKey')
    keypair = this.keypairToBuffer(keypair)
    return Promise.resolve(keypair);
  },
  getLocalRegistrationId: function() {
    const registrationId = parseInt(this.get('registrationId'), 10)
    return Promise.resolve(registrationId);
  },
  put: function(key, value) {
    if (key === undefined || value === undefined || key === null || value === null)
      throw new Error("Tried to store undefined/null");
    this.store.setItem(key, value);
  },
  get: function(key, defaultValue) {
    if (key === null || key === undefined)
      throw new Error("Tried to get value for undefined/null key");
    if (this.store.getItem(key)) {
      return this.store.getItem(key);
    } else {
      return defaultValue;
    }
  },
  remove: function(key) {
    if (key === null || key === undefined)
      throw new Error("Tried to remove value for undefined/null key");
    this.store.removeItem(key);;
  },

  isTrustedIdentity: function(identifier, identityKey, direction) {
    if (identifier === null || identifier === undefined) {
      throw new Error("tried to check identity key for undefined/null key");
    }
    if (!(identityKey instanceof ArrayBuffer)) {
      throw new Error("Expected identityKey to be an ArrayBuffer");
    }
    var trusted = this.get('identityKey' + identifier);
    if (trusted === undefined) {
      return Promise.resolve(true);
    }
    return Promise.resolve(util.toString(identityKey) === trusted);
  },
  loadIdentityKey: function(identifier) {
    if (identifier === null || identifier === undefined)
      throw new Error("Tried to get identity key for undefined/null key");
    return Promise.resolve(util.toArrayBuffer(this.get('identityKey' + identifier)));
  },
  saveIdentity: function(identifier, identityKey) {
    
    if (identifier === null || identifier === undefined) {
      throw new Error("Tried to put identity key for undefined/null key");
    }

    var address = new libsignal.SignalProtocolAddress.fromString(identifier);

    var existing = this.get('identityKey' + address.getName());
    this.put('identityKey' + address.getName(), util.toString(identityKey))

    if (existing && util.toString(identityKey) !== existing) {
      return Promise.resolve(true);
    } else {
      return Promise.resolve(false);
    }

  },

  /* Returns a prekeypair object or undefined */
  loadPreKey: function(keyId) {
    var res = this.get('25519KeypreKey' + keyId);
    if (res !== undefined) {
      res = this.keypairToBuffer(res)
      res = { pubKey: res.pubKey, privKey: res.privKey };
    }
    return Promise.resolve(res);
  },
  storePreKey: function(keyId, keyPair) {
    keyPair = this.keypairToString(keyPair)
    return Promise.resolve(this.put('25519KeypreKey' + keyId, keyPair));
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

  /* Returns a signed keypair object or undefined */
  loadSignedPreKey: function(keyId) {
    var res = this.get('25519KeysignedKey' + keyId);
    if (res !== undefined) {
      res = JSON.parse(res)
      let keypair = res.keypair
      keypair = this.keypairToBuffer(keypair)
      res = { pubKey: keypair.pubKey, privKey: keypair.privKey };
    }
    return Promise.resolve(res);
  },
  /* Returns a signed keypair object or undefined */
  loadSignedPreKeyDates: function(keyId) {
    const data = {}
    for (var id in this.store) {
      if (id.startsWith('25519KeysignedKey')) {
        var res = this.get(id);
        res = JSON.parse(res);
        const creationDate = res.creationDate
        const signedPrekeyId = parseInt(id.replace('25519KeysignedKey', ''), 10)
        data[signedPrekeyId] = creationDate
      }
    }
    return Promise.resolve(data);
  },
  storeSignedPreKey: function(keyId, keyPair) {
    keyPair = this.keypairToString(keyPair)
    const creationDate = Date.now();
    return Promise.resolve(this.put('25519KeysignedKey' + keyId, JSON.stringify({keypair: keyPair, creationDate: creationDate})));
  },
  removeSignedPreKey: function(keyId) {
    return Promise.resolve(this.remove('25519KeysignedKey' + keyId));
  },

  checkSessionExists: function(identifier) {
    identifier = identifier.toString()
    var session = this.get('session' + identifier)
    return session !== undefined
  },
  checkSessionDeviceNamesForUser: function(username) {
    let devicesToReturn = []
    for (var id in this.store) {
      if (id.startsWith('session' + username)) {
        devicesToReturn.push(parseInt(id.substring(('session' + username).length+1), 10))
      }
    }
    return Promise.resolve(devicesToReturn);
  },
  loadSession: function(identifier) {
    var session = this.get('session' + identifier)
    if (session) {
      session = JSON.parse(session)
    }
    return Promise.resolve(session);
  },
  storeSession: function(identifier, record) {
    record = JSON.stringify(record)
    return Promise.resolve(this.put('session' + identifier, record));
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
  storeUser: function(username, password) {
    return Promise.resolve(this.put('user', JSON.stringify({username: username, password: password})));
  },
  loadUser: function() {
    const userObject = this.get('user');
    if (userObject) {
      return Promise.resolve(JSON.parse(this.get('user')));
    } else {
      return Promise.resolve(false);
    }
  },
  storeAddress: function(address) {
    return Promise.resolve(this.put('address', address));
  },
  loadAddress: function() {
    return Promise.resolve(this.get('address'));
  },
  storeJWT: function(jwt) {
    return Promise.resolve(this.put('jwt', jwt));
  },
  loadJWT: function() {
    return Promise.resolve(this.get('jwt'));
  },
  clearStore: function() {
    this.store.clear()
    return Promise.resolve(true);
  }
};