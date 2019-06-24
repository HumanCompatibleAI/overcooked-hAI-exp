import io from "socket.io-client"

export default class GameServerIO {
    constructor({
        HOST,
        message_callback,
        DEBUG = false
    }) {
        this.socket = io(HOST);
        this.message_callback = message_callback;

        this.socket.on('partnered', (data) => {
            this.roomdata = data;
            this.partner_req_callback(data);
            if (DEBUG) {
                console.log("Partnered");
                console.log("Room Data:");
                console.log(data);
            }
        });

        this.socket.on("room-message", (data) => {
            if (DEBUG) {
                console.log(data);
            }
            if (typeof(this.message_callback) !== 'undefined') {
                this.message_callback(data);
            }
        });
    }

    request_partners({n_partners = 1, callback = ()=>{}}) {
        this.socket.emit("partner-request", n_partners);
        this.partner_req_callback = callback;
    }

    get_room() {
        let everyone = [this.roomdata['client_id'],];
        everyone.push(...this.roomdata['partners']);
        everyone.sort();
        return everyone
    }

    send_message(data) {
        this.socket.emit('message-room', {
            'roomname': this.roomdata['roomname'],
            'msg': {
                client_number: this.roomdata['client_id'],
                data: data
            }
        });
    }

    set_message_callback(message_callback) {
        this.message_callback = message_callback;
    }

    remove_message_callback() {
        this.message_callback = undefined;
    }
}

