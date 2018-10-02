const ByteBuffer = require("bytebuffer");

export default {
    
    StaticArrayBufferProto: new ArrayBuffer().__proto__,
    
    toString: (thing) => {
        if (typeof thing === 'string') {
            return thing;
        }
        return new ByteBuffer.wrap(thing).toString('binary');
    },

    toArrayBuffer: (thing) => {
        if (thing === undefined) {
            return undefined;
        }
        if (thing === Object(thing)) {
            if (thing.__proto__ === this.StaticArrayBufferProto) {
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

    isEqual: (a, b) => {
        
        // TODO: Special-case arraybuffers, etc
        if (a === undefined || b === undefined) {
            return false;
        }
        a = this.toString(a);
        b = this.toString(b);
        var maxLength = Math.max(a.length, b.length);
        if (maxLength < 5) {
            throw new Error("a/b compare too short");
        }
        return a.substring(0, Math.min(maxLength, a.length)) === b.substring(0, Math.min(maxLength, b.length));
    }

}