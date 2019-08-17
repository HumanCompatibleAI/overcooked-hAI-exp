import * as Overcooked from "overcooked"
let OvercookedGame = Overcooked.OvercookedGame.OvercookedGame;
let OvercookedMDP = Overcooked.OvercookedMDP;
let Direction = OvercookedMDP.Direction;
let Action = OvercookedMDP.Action;
let [NORTH, SOUTH, EAST, WEST] = Direction.CARDINAL;
let [STAY, INTERACT] = [Direction.STAY, Action.INTERACT];

export default class OvercookedInteractiveTask{
    constructor ({
        container_id,
        gameserverio,

        start_grid = [
                'XXXXXPXX',
                'O     2O',
                'T1     T',
                'XXXDPSXX'
            ],
        TIMESTEP = 150,
        MAX_TIME = 20, //seconds
        init_orders=['onion'],
        always_serve='onion',
        completion_callback = () => {console.log("Time up")},
        timestep_callback = (data) => {},
        DELIVERY_REWARD = 5
    }) {

        this.init_orders = init_orders;
        this.gameserverio = gameserverio;
        let playerids = [
            this.gameserverio.roomdata['client_id'],
            this.gameserverio.roomdata['partners'][0]
        ];
        playerids.sort();
        this.client_id = this.gameserverio.roomdata['client_id'];
        this.partner_id = this.gameserverio.roomdata['partners'][0];
        this.is_leader = playerids[0] === this.client_id;
        console.log(this.is_leader ? "leader" : "follower")

        let player_colors = {0: 'green', 1: 'blue'}
        if (!this.is_leader) {
            player_colors = {0: 'blue', 1: 'green'}
        }

        this.game = new OvercookedGame({
            start_grid,
            container_id,
            assets_loc: "/static/assets/",
            ANIMATION_DURATION: TIMESTEP*.9,
            tileSize: 80,
            COOK_TIME: 20,
            explosion_time: Number.MAX_SAFE_INTEGER,
            DELIVERY_REWARD: DELIVERY_REWARD,
            always_serve: always_serve,
            player_colors: player_colors
        });
        this.container_id = container_id;

        this.TIMESTEP = TIMESTEP;
        this.MAX_TIME = MAX_TIME;
        this.time_left = MAX_TIME;
        this.score = 0;
        this.cur_gameloop = 0;
        this.completion_callback = completion_callback;
        this.timestep_callback = timestep_callback;
    }

    leader_init () {
        //the leader client listens for the follower client to send actions
        //or other messages, and acts as the global clock
        this.gameserverio.set_message_callback((msg) => {
            if (msg['client_id'] !== this.client_id) {
                if (msg['data']['type'] === 'action') {
                    this.joint_action[1] = msg['data']['action'];
                }
                else if (msg['data']['type'] === 'heartbeat') {
                    this.follower_connected = true;
                }
            }
        });

        this.start_time = new Date().getTime();
        this.state = this.game.mdp.get_start_state(this.init_orders);
        this.game.drawState(this.state);
        this.gameserverio.send_message({
            type: 'state',
            state: JSON.stringify(this.state),
            score: this.score,
            time_left: this.time_left,
            reward: 0
        });
        this.joint_action = [STAY, STAY];

        this.gameloop = setInterval(() => {

            //at every interval, the leader calculates the next state
            // with whatever actions it has set, broadcasts it
            let  [[next_state, prob], reward] =
                this.game.mdp.get_transition_states_and_probs({
                    state: this.state,
                    joint_action: this.joint_action
                });

            //update next round
            this.game.drawState(next_state);
            this.score += reward;
            this.game.drawScore(this.score);
            let time_elapsed = (new Date().getTime() - this.start_time)/1000;
            this.time_left = Math.round(this.MAX_TIME - time_elapsed);
            this.game.drawTimeLeft(this.time_left);

            //send info to follower
            this.gameserverio.send_message({
                type: 'state',
                state: JSON.stringify(next_state),
                reward: reward,
                score: this.score,
                time_left: this.time_left
            });

            //record data
            this.timestep_callback({
                state: this.state,
                joint_action: this.joint_action,
                next_state: next_state,
                reward: reward,
                time_left: this.time_left,
                score: this.score,
                time_elapsed: time_elapsed,
                cur_gameloop: this.cur_gameloop,
                client_id: this.client_id,
                is_leader: this.is_leader,
                partner_id: this.partner_id,
                datetime: +new Date()
            });

            //set up next timestep
            this.state = next_state;
            this.cur_gameloop += 1;
            this.joint_action = [STAY, STAY];
            this.activate_response_listener();

            //time run out
            if (this.time_left < 0) {
                this.time_left = 0;
                this.gameserverio.send_message({
                    type: 'close'
                });
                this.close();
            }
        }, this.TIMESTEP)
        this.activate_response_listener();
    }

    follower_init() {
        //the follower client listens for the leader to send state updates
        //and enables actions sychronized with what the leader sends
        this.gameserverio.set_message_callback((msg) => {
            if (msg['client_id'] !== this.client_id) {
                if (msg['data']['type'] === 'state') {
                    let next_state = JSON.parse(msg['data']['state']);
                    this.game.drawState(next_state);

                    let score = JSON.parse(msg['data']['score']);
                    this.game.drawScore(score);

                    let time_left = JSON.parse(msg['data']['time_left']);
                    this.game.drawTimeLeft(time_left);

                    let reward = JSON.parse(msg['data']['reward']);

                    this.activate_response_listener();

                    this.score = score;
                    this.time_left = time_left;


                    //record data
                    this.timestep_callback({
                        state: this.state,
                        joint_action: undefined,
                        next_state: next_state,
                        reward: reward,
                        time_left: this.time_left,
                        score: this.score,
                        time_elapsed: undefined,
                        cur_gameloop: undefined,
                        client_id: this.client_id,
                        is_leader: this.is_leader,
                        partner_id: this.partner_id,
                        datetime: +new Date()
                    });
                    this.state = next_state;
                }
                if (msg['data']['type'] === 'close') {
                    this.close();
                }
            }
        });
        this.activate_response_listener();
    }

    init () {
        this.game.init();
        if (this.is_leader) {
            this.leader_init();
        }
        else {
            this.follower_init();
        }
    }

    close () {
        if (typeof(this.gameloop) !== 'undefined') {
            clearInterval(this.gameloop);
        }
        this.game.close();
        this.disable_response_listener();
        this.completion_callback();
    }

    activate_response_listener () {
        $(document).on("keydown", (e) => {
            let action;
            switch(e.which) {
                case 37: // left
                action = WEST;
                break;

                case 38: // up
                action = NORTH;
                break;

                case 39: // right
                action = EAST;
                break;

                case 40: // down
                action = SOUTH;
                break;

                case 32: //space
                action = INTERACT;
                break;

                default: return; // exit this handler for other keys
            }
            e.preventDefault(); // prevent the default action (scroll / move caret)

            if (this.is_leader) {
                this.joint_action[0] = action;
            }
            else {
                this.gameserverio.send_message({
                    type: 'action',
                    action
                });
            }
            this.disable_response_listener();
        });
    }

    disable_response_listener () {
        $(document).off('keydown');
    }
}