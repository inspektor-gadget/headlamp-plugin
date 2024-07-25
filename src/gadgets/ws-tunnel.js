// randomKey() creates a base64 encoded random value to be used with the Sec-WebSocket-Key header
function randomKey() {
    const buffer = new ArrayBuffer(16);
    const view = new Uint8Array(buffer);
    crypto.getRandomValues(view);
    return btoa(Array.from(view, (byte) =>
        String.fromCodePoint(byte),
    ).join(''));
}

// sha1 hashes str and returns the hash value base64-encoded
async function sha1(str){
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-1', enc.encode(str));
    return btoa(Array.from(new Uint8Array(hash), (byte) => String.fromCodePoint(byte)).join(''));
}

// searchByteSequence searches for pattern in arrayBuffer and returns its position if found or -1 if not
function searchByteSequence(arrayBuffer, pattern) {
    const data = new Uint8Array(arrayBuffer);
    for (let i = 0; i <= data.length - pattern.length; i++) {
        // Compare slices of the data array with the pattern
        let match = true;
        for (let j = 0; j < pattern.length; j++) {
            if (data[i + j] !== pattern[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            // Return index of pattern
            return i;
        }
    }
    // Return -1 if the pattern was not found
    return -1;
}

const webSocketMagicUUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const NONE = 0;
const CONNECTING = 1;
const HANDSHAKE_SENT = 2;
const HANDSHAKE_DONE = 3;
const ERROR = 4;
const CLOSED = 5;

const OPCODE_TEXT = 1;
const OPCODE_BINARY = 2;
const OPCODE_CLOSE = 8;

const MAXUINT32 = 4294967295;

const httpHeaderEnd = new Uint8Array([13, 10, 13, 10]);

class ForwardedWebsocket {
    // bufOffset is 1 if the buffer has just been copied (instead of doing another copy removing the prefix byte that
    // names the channel)
    debug = false;
    onnewsocket = (url) => {
        return new WebSocket(url)
    }
    onmessage = null;
    onerror = null;
    onopen = null;
    onclose = null;
    channels = {};
    constructor(proxy) {
        this.proxy = proxy;
        this.textEncoder = new TextEncoder();
        this.textDecoder = new TextDecoder('utf-8');
        this.state = NONE;
    }
    addEventListener(ev, cb) {
        switch (ev) {
            case 'message':
                this.onmessage = cb;
                break;
            case 'open':
                this.onopen = cb;
                break;
        }
    }
    async connect(url) {
        this.state = CONNECTING;
        this.ws = this.onnewsocket(this.proxy);
        this.ws.binaryType = 'arraybuffer';
        this.key = randomKey();
        this.expectedKey = await sha1(this.key + webSocketMagicUUID);
        this.ws.onopen = () => {
            // create a random string
            if (this.debug) console.log("WebSocket opened");
            this.ws.send(this.sendString(0, "GET " + url + " HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Key: " + this.key + "\r\nSec-Websocket-Version: 13\r\n\r\n"));
            this.state = HANDSHAKE_SENT;
        }
        this.ws.onclose = () => {
            this.state = CLOSED;
            if (typeof this.onclose === 'function') this.onclose();
        }
        this.ws.onmessage = (ev) => {
            // Check channel
            const bufView = new Uint8Array(ev.data);
            if (bufView.length < 1) {
                // we always expect a prefix of one byte for the channel
                throw 'expected message with prefix'
            }

            const channelID = bufView[0];
            if (!this.channels[channelID]) {
                // add new channel; this is expected to have two additional bytes; for sake of simplicity we assume them
                // to be in this first message, otherwise we throw up
                if (bufView.length < 3) {
                    throw 'new channel expected to have port header'
                }
                const port = bufView[1] | (bufView[2] << 8);
                const channel = {
                    port,
                    bufOffset: 3,
                    buf: ev.data,
                    state: HANDSHAKE_SENT,
                };
                console.log('adding channel', channelID, 'port', port);
                this.channels[channelID] = channel;
                this.processData(channel);
                return;
            }

            const channel = this.channels[channelID];

            // append data to our buffer
            if (channel.buf === null) {
                channel.bufOffset = 1;
                channel.buf = ev.data;
                this.processData(channel);
                return;
            }
            const newLength = channel.buf.byteLength + ev.data.byteLength - channel.bufOffset - 1;
            const newBuffer = new ArrayBuffer(newLength);
            const view = new Uint8Array(newBuffer);
            const oldView  = new Uint8Array(channel.buf);
            const newView = new Uint8Array(ev.data);
            view.set(oldView.slice(channel.bufOffset));
            view.set(newView.slice(1), channel.buf.byteLength - channel.bufOffset);
            channel.bufOffset = 0;
            channel.buf = newBuffer;
            this.processData(channel);
        }
    }
    close(code = 1000, reason = null) {
        if (this.state !== HANDSHAKE_DONE) {
            this.ws.close(1000);
            return;
        }
        const buf = new Uint8Array(2);
        buf[1] = code & 0xff;
        buf[0] = (code >> 8) & 0xff;
        this.send(buf, OPCODE_CLOSE);
    }
    processData(channel) {
        switch (channel.state) {
            case HANDSHAKE_SENT: {
                // We're looking for \r\n\r\n and cut that off
                const pos = searchByteSequence(channel.buf, httpHeaderEnd);
                if (pos < 0) return; // not there, yet

                const headers = new Uint8Array(channel.buf, channel.bufOffset, pos - channel.bufOffset);
                const stringHeaders = this.textDecoder.decode(headers).split("\r\n");

                if (!stringHeaders[0].toLowerCase().startsWith('http/1.1 101')) {
                    channel.state = ERROR;
                    this.emitError('invalid http version or response code');
                    return;
                }

                let validatedAcceptHeader = false;
                for (let i = 1; i < stringHeaders.length; i++) {
                    const header = stringHeaders[i].split(':');
                    if (header.length < 2) {
                        channel.state = ERROR;
                        this.emitError('invalid header');
                        return;
                    }
                    if (header[0].toLowerCase().trim() === 'sec-websocket-accept') {
                        if (header[1].trim() !== this.expectedKey) {
                            channel.state = ERROR;
                            this.emitError('invalid key in sec-websocket-accept; expected ' + this.expectedKey + ', got ' + header[1].trim());
                            return;
                        }
                        validatedAcceptHeader = true;
                    }
                }
                if (!validatedAcceptHeader) {
                    channel.state = ERROR;
                    this.emitError('missing header sec-websocket-accept');
                    return;
                }

                // consume...
                const newBuffer = new ArrayBuffer(channel.buf.byteLength - pos - httpHeaderEnd.length);
                const newView = new Uint8Array(newBuffer);
                const oldView = new Uint8Array(channel.buf);
                newView.set(oldView.slice(pos + httpHeaderEnd.length));
                channel.bufOffset = 0;
                channel.buf = newBuffer;

                channel.state = HANDSHAKE_DONE;

                if (typeof this.onopen === 'function') this.onopen();

                this.processData(channel);
                break;
            }
            case HANDSHAKE_DONE: {
                // Need header
                if (channel.buf.byteLength < 2 + channel.bufOffset) return;
                const header = new Uint8Array(channel.buf, channel.bufOffset, 2);
                const fin = (header[0] & 0x80) !== 0;
                if (!fin) {
                    channel.state = ERROR;
                    this.emitError('not supporting non-fin messages for now');
                    return;
                }
                const opCode = header[0] & 0xf;
                const masked = (header[1] & 0x80) !== 0;
                let payloadSize = header[1] & 0x7f;
                let plOffs = 2;
                if (this.debug) console.log('fin', fin, 'opCode', opCode, 'masked', masked, 'pl', payloadSize);

                switch (payloadSize) {
                    case 126:
                        // 2 byte more
                        const lenView8 = new Uint8Array(channel.buf, channel.bufOffset + 2, 2);
                        payloadSize = (lenView8[0] << 8) | lenView8[1];
                        plOffs += 2;
                        break;
                    case 127:
                        const lenView64 = new Uint8Array(channel.buf, channel.bufOffset + 2, 2);
                        if (lenView64[5] !== 0 || lenView64[6] !== 0 || lenView64[7] !== 0 || lenView64[8] !== 0) {
                            throw 'not supporting super large messages';
                        }
                        payloadSize = (lenView64[4] << 24) | (lenView64[5] << 16) | (lenView64[6] << 8) | lenView64[7];
                        plOffs += 8;
                        break;
                }

                if (this.debug) console.log('payloadSize', payloadSize);

                // Check if payload is complete
                if (channel.buf.byteLength < plOffs + payloadSize + channel.bufOffset) {
                    if (this.debug) console.log('need more data');
                    return;
                }

                // consume
                const payloadView = new Uint8Array(channel.buf, channel.bufOffset + plOffs, payloadSize);
                // console.log('>', this.textDecoder.decode(payloadView));

                if (typeof this.onmessage === 'function') this.onmessage({
                    data: this.textDecoder.decode(payloadView),
                });

                const remainder = channel.buf.byteLength - (channel.bufOffset + plOffs + payloadSize);
                if (this.debug) console.log('remainder', remainder);
                if (remainder === 0) {
                    channel.bufOffset = 0;
                    channel.buf = null;
                    return;
                }
                const newBuffer = new ArrayBuffer(remainder);
                const newView = new Uint8Array(newBuffer);
                const oldView = new Uint8Array(channel.buf);
                newView.set(oldView.slice(channel.bufOffset + plOffs + payloadSize));
                channel.bufOffset = 0;
                channel.buf = newBuffer;

                this.processData(channel);
                break;
            }
        }
    }
    send(msg, channelID = 0, opCode = null) {
        const channel = this.channels[channelID];
        if (!channel) {
            throw 'invalid channel'
        }
        if (channel.state !== HANDSHAKE_DONE) {
            throw 'handshake not done'
        }

        let encodedMessage;
        if (msg instanceof ArrayBuffer) {
            encodedMessage = new Uint8Array(msg);
            opCode ??= 2; // binary
        } else if (msg instanceof Uint8Array) {
            encodedMessage = msg;
            opCode ??= 2; // binary
        } else if (typeof msg === 'string') {
            encodedMessage = this.textEncoder.encode(msg);
            opCode ??= 1; // text
        } else {
            throw 'invalid data type';
        }

        const msgLength = encodedMessage.length;

        let lengthFieldLen = 0;
        if (msgLength > MAXUINT32) {
            throw 'message too long';
        } else if (msgLength > 65535) {
            // need 8-byte length field
            lengthFieldLen = 8;
        } else if (msgLength > 125) {
            // need 2-byte length field
            lengthFieldLen = 2;
        }

        const sendBuffer = new ArrayBuffer(1 + 2 + lengthFieldLen + 4 + encodedMessage.length);
        const view = new Uint8Array(sendBuffer);
        view[0] = channel & 0xff;
        view[1] |= 0x80; // FIN
        view[1] |= opCode & 0xF; // text
        view[2] |= 0x80; // masked; client => server needs to be masked

        // Properly encode length
        switch (lengthFieldLen) {
            case 0:
                view[2] |= msgLength;
                break;
            case 2: {
                view[2] |= 126;
                const lengthView  = new Uint8Array(sendBuffer, 1 + 2, lengthFieldLen);
                lengthView[1] = msgLength & 0xff;
                lengthView[0] = (msgLength >> 8) & 0xff;
                break;
            }
            case 8: {
                view[2] |= 127;
                const lengthView  = new Uint8Array(sendBuffer, 1 + 2, lengthFieldLen);
                lengthView[7] = msgLength & 0xff;
                lengthView[6] = (msgLength >> 8) & 0xff;
                lengthView[5] = (msgLength >> 16) & 0xff;
                lengthView[4] = (msgLength >> 24) & 0xff;
                break;
            }
        }
        const mask = new Uint8Array(sendBuffer, 1 + 2 + lengthFieldLen, 4);
        crypto.getRandomValues(mask);

        const payloadView = new Uint8Array(sendBuffer, 1 + 2 + lengthFieldLen + 4);
        payloadView.set(encodedMessage);

        // actually mask
        for (let i = 0; i < payloadView.length; i++) {
            payloadView[i] = payloadView[i] ^ mask[i % 4];
        }

        this.ws.send(sendBuffer);
    }
    sendString(channel, str) {
        const encodedString = this.textEncoder.encode(str);
        const bufferWithChan = new ArrayBuffer(encodedString.byteLength + 1);
        const viewWithChan = new Uint8Array(bufferWithChan);
        viewWithChan[0] = channel;
        viewWithChan.set(encodedString, 1);
        return bufferWithChan;
    }
    emitError(msg) {
        throw msg;
    }
}

export default ForwardedWebsocket;
