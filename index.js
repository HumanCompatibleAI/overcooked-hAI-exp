import $ from "jquery"
import _ from "lodash"
import PageBlockSurveyHandler from "./js/pageblock-survey.js"
import PageBlockController from "./js/psiTurk-pageblock-controller.js"
import Conditions from "./js/conditions.js"
import GameServerIO from "./js/gameserver-io.js"
import OvercookedSinglePlayerTask from "./js/overcooked-single";
import getOvercookedPolicy from "./js/load_tf_model.js";

import * as Overcooked from "overcook"
let OvercookedMDP = Overcooked.OvercookedMDP;
let Direction = OvercookedMDP.Direction;
let Action = OvercookedMDP.Action;
let [NORTH, SOUTH, EAST, WEST] = Direction.CARDINAL;
let [STAY, INTERACT] = [Direction.STAY, Action.INTERACT];

var randomstring = require("randomstring");

//experimental variables
let EXP = {
    MAIN_TRIAL_TIME: 60, //seconds
    TIMESTEP_LENGTH: 150, //milliseconds
    DELIVERY_POINTS: 5,
    POINT_VALUE: .01,
    BASE_PAY: 1.00,
    PLAYER_INDEX: 1,  // Either 0 or 1
    MODEL_TYPE: 'ppo_bc'  // Either ppo_bc, ppo_sp, or pbt
};
let worker_bonus = 0;
let is_leader;

/***********************************
      Main trial order
 ************************************/


let layouts = {
    "cramped_room":[
        "XXPXX",
        "O  2O",
        "X1  X",
        "XDXSX"
    ],
    "asymmetric_advantages":[
        "XXXXXXXXX",
        "O XSXOX S",
        "X   P 1 X",
        "X2  P   X",
        "XXXDXDXXX"
    ],
    "coordination_ring":[
        "XXXPX",
        "X 1 P",
        "D2X X",
        "O   X",
        "XOSXX"
    ],
    "random3":[
        "XXXPPXXX",
        "X      X",
        "D XXXX S",
        "X2    1X",
        "XXXOOXXX"
    ],
    "random0": [
        "XXXPX",
        "O X1P",
        "O2X X",
        "D X X",
        "XXXSX"
    ]
};
let main_trial_order =
    ["cramped_room", "asymmetric_advantages", "coordination_ring", "random3", "random0"];

$(document).ready(() => {
    /*
     * Requires:
     *     psiTurk.js
     *     utils.js
     */
    let participant_id = randomstring.generate({
      length: 12,
      charset: 'alphabetic'
    });
    // `condition` is passed by the psiturk server process
    var condition_name = Conditions.condition_names[condition];
    console.log("Condition: " + condition_name);
    EXP.PLAYER_INDEX = Number(condition_name.split('-')[1]);
    EXP.MODEL_TYPE = condition_name.split('-')[0];

    let AGENT_INDEX = 1 - EXP.PLAYER_INDEX;

    var DEBUG = false;

    // Initalize psiTurk object
    var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);
    window.psiTurk = psiTurk;

    // All pages to be loaded
    var pages_to_preload = [
        "exp/pageblock.html",
        "exp/complete.html",
        "debug_initpage.html"
    ];
    psiTurk.preloadPages(pages_to_preload);
    psiTurk.preloadImages([]);

    /***********************************
        Set up conditions and blocks
    ************************************/

    var instructions;

    var setup_exp_pages = function () {
        psiTurk.recordUnstructuredData("participant_id", participant_id);

        /***********************************
               Set up websockets server
         ***********************************/
        let HOST = "https://lit-mesa-15330.herokuapp.com/".replace(/^http/, "ws");
        let gameserverio = new GameServerIO({HOST});

        /************************
         Pre-task and training
         ************************/
        var pre_task_pages = [
            // Instructions
            {
                pagename: 'exp/pageblock.html',
                pagefunc: () => {
                    $("#pageblock").addClass("center");
                    $("#pageblock").css("width", "500px");
                    $(".instructionsnav").hide();
                    let survey = new PageBlockSurveyHandler({containername: "pageblock"});
                    survey.addone({
                        type: 'textdisplay',
                        questiontext: `
                            <div>
                            <h2>Instructions</h2>
                            <p>
                                Hello! In this task, you will be playing a
                                cooking game. You will play one of two chefs
                                in a restaurant that serves onion soup.
                            </p>
                            <p>
                                This is what one level of the game looks like:
                            </p>
                            <img src="/static/images/training0.png" style="width:400px">
                            <p>
                                There are a number of objects in the game, labeled here:
                            </p>
                            <img src="/static/images/training0-annotated.png" style="width:500px">

                            <br>
                            <hr>
                            <br>

                            <h3>Movement and interactions</h3>
                            <img src="/static/images/space-arrows.png" style="width:250px">
                            <p>
                                You can move up, down, left, and right using
                                the <b>arrow keys</b>, and interact with objects
                                using the <b>spacebar</b>.
                            </p>
                            <p>
                                You can interact with objects by facing them and pressing
                                <b>spacebar</b>. Here are some examples:
                                <ul>
                                <li>You can pick up onions by facing
                                the onion area and pressing <b>spacebar</b>.</li>
                                <li>If you are holding an onion, are facing an empty counter,
                                and press <b>spacebar</b>, you put the onion on the counter.</li>
                                <li>If you are holding an onion, are facing a pot that is not full,
                                and press <b>spacebar</b>, you will put the onion in the pot.</li>
                                </ul>
                            </p>

                            <br>
                            <br>
                            <p>
                                Note that as you and your partner are moving around the kitchen
                                you <u><b>cannot occupy the same location</b></u>.
                            </p>
                            <br>
                            <hr>
                            <br>

                            <h3>Cooking</h3>
                            <img src="/static/images/soup.png" style="width:250px">
                            <p>
                                Once 3 onions are in the pot, the soup begins to cook.
                                After the timer gets to 20, the soup
                                will be ready to be served. To serve the soup,
                                bring a dish over and interact with the pot.
                            </p>

                            <br>
                            <hr>
                            <br>

                            <h3>Serving</h3>
                            <img src="/static/images/serving-counter.png" style="width:500px">
                            <p>
                            Once the soup is in a bowl, you can serve it by bringing it to
                            a grey serving counter.
                            </p>

                            <br>
                            <hr>
                            <br>

                            <h3>Goal</h3>
                            <img src="/static/images/info-panel.png" style="width:150px">
                            <p>
                            Your goal in this task is to serve as many of the orders as you can
                            before each level ends.  Serving an order gets you
                            ${EXP.DELIVERY_POINTS} points and 1 point adds 1 cent to your bonus.
                            The current order list, score, and time left for you and your partner
                            are shown in the upper left.
                            </p>

                            <br>
                            <hr>
                            <br>

                            <h3>Final Instructions</h3>
                            <p>
                            Next, we will give you a couple of simple collaborative training rounds with a computer partner.
                            </p>
                            <p>Afterwards, in the main part of this task, you will be paired up with a computer partner on harder layouts, 
                            and you must collaborate with them to play the game.</p>
                            <br>
                            <p>Good luck!</p>
                            </div>
                        `
                    });
                    setTimeout(() => {
                        $(".instructionsnav").show();
                    }, 15000)
                }
            },

            // Training
            {
                'pagename': 'exp/pageblock.html',
                'pagefunc': function() {
                    $(".instructionsnav").hide();
                    let npc_policy = (function() {
                        let a_seq = [
                            STAY, STAY, STAY, STAY, STAY,

                            //get 3 onions
                            EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, NORTH, INTERACT,
                            EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, NORTH, INTERACT,
                            EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, NORTH, INTERACT,

                            //get a dish while it is cooking and wait
                            EAST, EAST, EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, WEST, WEST, NORTH,
                            STAY, STAY, STAY, INTERACT,

                            //deliver to server
                            EAST, EAST, EAST, EAST, INTERACT,
                            STAY, STAY, STAY, STAY, STAY,

                            //get 3 onions
                            WEST, WEST, NORTH, INTERACT,
                            WEST, WEST, NORTH, INTERACT,
                            EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, NORTH, INTERACT,
                            EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, NORTH, INTERACT,

                            //get a dish while it is cooking and wait
                            EAST, EAST, EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, WEST, WEST, NORTH,
                            STAY, STAY, STAY, INTERACT,

                            //deliver to server
                            EAST, EAST, EAST, EAST, INTERACT,
                            STAY, STAY, STAY, STAY, STAY,

                            //get 3 onions
                            WEST, WEST, NORTH, INTERACT,
                            WEST, WEST, NORTH, INTERACT,
                            EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, NORTH, INTERACT,
                            EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, NORTH, INTERACT,

                            //get a dish while it is cooking and wait
                            EAST, EAST, EAST, EAST, NORTH, INTERACT,
                            WEST, WEST, WEST, WEST, NORTH,
                            STAY, STAY, STAY, INTERACT,

                            //deliver to server
                            EAST, EAST, EAST, EAST, INTERACT,

                            //put an onion on the table
                            // WEST, WEST, NORTH, INTERACT, SOUTH, INTERACT
                        ];
                        let ai = 0;
                        let pause = 2;
                        return (s) => {
                            let a = STAY;
                            if (((ai/pause) < a_seq.length) && (ai % pause === 0)) {
                                a = a_seq[ai/pause];
                            }
                            ai += 1;
                            return a
                        }
                    })();
                    let start_grid = [
                        "XXXXXXX",
                        "XPXOXDX",
                        "X2    S",
                        "XPXOXDX",
                        "X    1S",
                        "XXXXXXX"
                    ];

                    let game = new OvercookedSinglePlayerTask({
                        container_id: "pageblock",
			player_index: 0,
                        start_grid : start_grid,
                        npc_policies: {1: npc_policy},
                        TIMESTEP : EXP.TIMESTEP_LENGTH,
                        MAX_TIME : 30, //seconds
                        init_orders: ['onion'],
                        completion_callback: () => {
                            setTimeout(() => {
                                $(".instructionsnav").show();
                            }, 1500);
                        },
                        timestep_callback: (data) => {
                            data.participant_id = participant_id;
                            data.layout_name = "training0";
                            data.layout = start_grid;
                            data.round_num = 0;
                            data.round_type = 'training';
                            psiTurk.recordTrialData(data);
                            is_leader = data.is_leader;
                        },
                        DELIVERY_REWARD: EXP.DELIVERY_POINTS
                    });
                    $("#pageblock").css("text-align", "center");
                    game.init();
                }
            },

            {
                pagename: 'exp/pageblock.html',
                pagefunc: () => {
                    $("#pageblock").addClass("center");
                    $("#pageblock").css("width", "500px");
                    psiTurk.recordUnstructuredData('PLAYER_INDEX', EXP.PLAYER_INDEX);
                    psiTurk.recordUnstructuredData('MODEL_TYPE', EXP.MODEL_TYPE);
                    let survey = new PageBlockSurveyHandler({containername: "pageblock"});
                    survey.addone({
                        type: 'textdisplay',
                        questiontext: `
                            <div>
                            <h2>Instructions</h2>
                            <p>Next, you will cook soups and bring them to your partner
                            who will bring them to be served.</p>
                            </div>
                        `
                    });
                }
            },
            {
                'pagename': 'exp/pageblock.html',
                'pagefunc': function() {
                    $(".instructionsnav").hide();
                    let npc_policy = (function() {
                        return (s) => {
                            let npc_loc = s.players[1].position;
                            let npc_or = s.players[1].orientation;
                            let npc_holding = typeof(s.players[1].held_object) !== 'undefined';

                            let npc_at_pickup = _.isEqual(npc_loc, [4, 2]) && _.isEqual(npc_or, [-1, 0])
                            let npc_holding_soup = npc_holding && s.players[1].held_object.name === 'soup';
                            let soup_on_counter = typeof(s.objects[[3, 2]]) !== 'undefined' &&
                                s.objects[[3,2]].name === 'soup';
                            let npc_at_server = _.isEqual(npc_loc, [5, 2]) && _.isEqual(npc_or, [1, 0])

                            let a = WEST;
                            if (npc_at_pickup && !npc_holding_soup && soup_on_counter) {
                                a = INTERACT;
                            }
                            else if (npc_holding_soup && !npc_at_server) {
                                a = EAST;
                            }
                            else if (npc_holding_soup && npc_at_server) {
                                a = INTERACT;
                            }
                            return a
                        }
                    })();

                    let start_grid = [
                        "XXXXXXX",
                        "XPDXXXX",
                        "O1 X2 S",
                        "XXXXXXX"
                    ];

                    let game = new OvercookedSinglePlayerTask({
                        container_id: "pageblock",
			player_index: 0,
                        start_grid : start_grid,
                        npc_policies: {1: npc_policy},
                        TIMESTEP : EXP.TIMESTEP_LENGTH,
                        MAX_TIME : 40, //seconds
                        init_orders: ['onion'],
                        always_serve: 'onion',
                        completion_callback: () => {
                            // psiTurk.saveData()
                            setTimeout(() => {
                                $(".instructionsnav").show();
                            }, 1500);
                        },
                        timestep_callback: (data) => {
                            data.participant_id = participant_id;
                            data.layout_name = "training2";
                            data.layout = start_grid;
                            data.round_num = 0;
                            data.round_type = 'training';
                            psiTurk.recordTrialData(data);
                        },
                        DELIVERY_REWARD: EXP.DELIVERY_POINTS
                    });
                    $("#pageblock").css("text-align", "center");
                    game.init();
                }
            },
            {
                pagename: 'exp/pageblock.html',
                pagefunc: () => {
                    $("#pageblock").addClass("center");
                    $("#pageblock").css("width", "500px");
                    let survey = new PageBlockSurveyHandler({containername: "pageblock"});
                    survey.addone({
                        type: 'textdisplay',
                        questiontext: `
                            <div>
                            <h2>Instructions</h2>
                            <p>Great! Now you will be paired up with another
                            computer partner for a set of five harder layouts.</p>
                            </div>
                        `
                    });
                }
            }
        ];

        /*********
         Main task
         *********/
        var task_pages = _.map(_.range(main_trial_order.length), (round_num) => {

            let round_page = {
                'pagename': 'exp/pageblock.html',
                'pagefunc': () => {
                    $('#next').addClass('instructionshidden');
                    $('#next').removeClass('instructionsshown');
                    $("#pageblock").html(`<h2>Round ${round_num + 1}</h2>`);
                    setTimeout(() => {
                        $("#next").click()
                    }, 1000);
                }
            }
            let game_page = {
                'pagename': 'exp/pageblock.html',
                'pagefunc': function () {
                    let layout_name = main_trial_order[round_num];
		    getOvercookedPolicy(EXP.MODEL_TYPE, layout_name, AGENT_INDEX).then(function(npc_policy) {
                        $(".instructionsnav").hide();
			let npc_policies = {};
			npc_policies[AGENT_INDEX] = npc_policy;
                        let game = new OvercookedSinglePlayerTask({
                            container_id: "pageblock",
			    player_index: EXP.PLAYER_INDEX,
                            start_grid : layouts[layout_name],
			    npc_policies: npc_policies,
                            TIMESTEP : EXP.TIMESTEP_LENGTH,
                            MAX_TIME : EXP.MAIN_TRIAL_TIME, //seconds
                            init_orders: ['onion'],
                            always_serve: 'onion',
                            completion_callback: () => {
                                setTimeout(() => {
                                    $("#next").click()
                                }, 1500);
                            },
                            timestep_callback: (data) => {
                                data.participant_id = participant_id;
                                data.layout_name = layout_name;
                                data.layout = layouts[layout_name];
                                data.round_num = round_num;
                                data.round_type = 'main';
                                psiTurk.recordTrialData(data);
                                // console.log(data);
                                if (data.reward > 0) {
                                    worker_bonus += EXP.POINT_VALUE*data.reward;
                                }
                            },
                            DELIVERY_REWARD: EXP.DELIVERY_POINTS
                        });
                        $("#pageblock").css("text-align", "center");
                        window.exit_hit = () => {
                            psiTurk.recordUnstructuredData("early_exit", true);
                            psiTurk.recordUnstructuredData('bonus_calc', worker_bonus);
                            psiTurk.recordUnstructuredData('is_leader', is_leader);
                            psiTurk.saveData({
                                success: () =>  {
                                    console.log("Data sent");
                                    setTimeout(function () {
                                        instructions.finish();
                                    }, 1000);
                                }
                            });
                        }
                        game.init();
                    });
                }
            }
            return [round_page, game_page]
        });
        task_pages = _.flattenDeep(task_pages);

        /*********
         Post-task
         *********/
        let post_task_pages = [
            {
                pagename: 'exp/pageblock.html',
                pagefunc: () => {
                    let survey = new PageBlockSurveyHandler({containername: "pageblock"});
                    survey.add([
                        {
                            type: 'textdisplay',
                            questiontext: `
                                <h3>Survey</h3>
                            `
                        },
                        {
                            type: 'textbox',
                            name: "self_strategy",
                            questiontext: 'How would you describe your strategy?',
                            leftalign: false
                        },
                        {
                            type: 'textbox',
                            name: "partner_strategy",
                            questiontext: "How would you describe your partner's strategy?",
                            leftalign: false
                        },
                        {
                            type: 'textbox',
                            name: "video_games",
                            questiontext: "What is your experience playing video games?",
                            leftalign: false
                        },
                        {
                            type: 'textbox',
                            name: "other_feedback",
                            questiontext: 'Do you have other comments on this game or how it could be improved?',
                            leftalign: false
                        }
                    ]);
                }
            },
            {
                pagename: 'exp/pageblock.html',
                pagefunc: () => {
                    let survey = new PageBlockSurveyHandler({containername: "pageblock"});
                    survey.add([
                        {
                            type: 'textdisplay',
                            questiontext: `
                                <h3>Survey</h3>
                            `
                        },
                        {
                            type: 'horizontal-radio',
                            name: 'difficulty',
                            questiontext: 'How difficult was this task?',
                            options: [
                                {value: '1', optiontext: 'Very Easy'},
                                {value: '2', optiontext: 'Easy'},
                                {value: '3', optiontext: 'Somewhat Easy'},
                                {value: '4', optiontext: 'Somewhat Difficult'},
                                {value: '5', optiontext: 'Difficult'},
                                {value: '6', optiontext: 'Very Difficult'}
                            ]
                        },
                        {
                            type: 'horizontal-radio',
                            name: 'smoothness',
                            questiontext: 'How smooth was cooperation with your partner?',
                            options: [
                                {value: '1', optiontext: 'Very Unsmooth'},
                                {value: '2', optiontext: 'Unsmooth'},
                                {value: '3', optiontext: 'Somewhat Unsmooth'},
                                {value: '4', optiontext: 'Somewhat Smooth'},
                                {value: '5', optiontext: 'Smooth'},
                                {value: '6', optiontext: 'Very Smooth'}
                            ]
                        },
                        {
                            type: 'horizontal-radio',
                            name: 'intuitiveness',
                            questiontext: 'How intuitive was this task?',
                            options: [
                                {value: '1', optiontext: 'Very Unintuitive'},
                                {value: '2', optiontext: 'Unintuitive'},
                                {value: '3', optiontext: 'Somewhat Unintuitive'},
                                {value: '4', optiontext: 'Somewhat Intuitive'},
                                {value: '5', optiontext: 'Intuitive'},
                                {value: '6', optiontext: 'Very Intuitive'}
                            ]
                        },
                        {
                            type: 'horizontal-radio',
                            name: 'fun',
                            questiontext: 'How fun was this task?',
                            options: [
                                {value: '1', optiontext: 'Very Unfun'},
                                {value: '2', optiontext: 'Unfun'},
                                {value: '3', optiontext: 'Somewhat Unfun'},
                                {value: '4', optiontext: 'Somewhat Fun'},
                                {value: '5', optiontext: 'Fun'},
                                {value: '6', optiontext: 'Very Fun'}
                            ]
                        },
                    ]);
                }
            },
            // Demographics
            {
                'pagename': 'exp/pageblock.html',
                'pagefunc': () => {
                    let questions = [
                        {
                            type: 'numeric-text',
                            name: "age",
                            questiontext: 'Age',
                        },
                        {
                            type: 'textbox',
                            name: 'gender',
                            questiontext: 'Gender',
                            rows: 1,
                            cols: 25,
                            leftalign: true,
                            required: true
                        },
                    ];
                    let survey = new PageBlockSurveyHandler({containername: "pageblock"});
                    survey.add(questions);
                }
            },

            //saving task
            {
                pagename: "exp/pageblock.html",
                pagefunc: () => {
                    $('#next').addClass('instructionshidden');
                    $('#next').removeClass('instructionsshown');
                    psiTurk.recordUnstructuredData('bonus_calc', worker_bonus);
                    psiTurk.recordUnstructuredData('is_leader', is_leader);
                    psiTurk.recordUnstructuredData("early_exit", false);

                    let saving_timeout = setTimeout(() => {
                        $("#saving_msg").html(
                            `
                                <p>There was an error saving your data. 
                                Please check that you are connected to the internet.</p>

                                <p>
                                Click the button below to save manually (it may take a second)
                                </p>
                                <div>
                                <button type="button" class="btn btn-primary btn-lg" onclick="save_data();">
								  Save
								</button>
								</div>
                                `
                        )
                    }, 30000);
                    window.save_data = () => {
                        psiTurk.saveData({
                            success: () =>  {
                                clearTimeout(saving_timeout);
                                setTimeout(function () {
                                    $("#next").click();
                                }, 2000);
                                $("#saving_msg").html("Success!");
                                console.log("Data sent");
                            }
                        });
                    };

                    window.save_data();

                    $("#pageblock").html(
                        `
                            <h2>Saving data</h2>
                            <div id="saving_msg">
                                <p>Please wait while we save your results so we can compute your bonus...</p>
                                <p>(This should take less than a minute).</p>
                                <p>This page should automatically continue.</p>
                            </div>
                        `
                    );
                }
            },

            "exp/complete.html"
        ]

        let exp_pages =
            _.flattenDeep([pre_task_pages, task_pages, post_task_pages])
        instructions = new PageBlockController(
            psiTurk, //parent
            exp_pages, //pages
            undefined, //callback
            undefined, //closeAlert
            true //manual_saveData
        );
    };

    /*******************
     * Run Task
     ******************/
    setup_exp_pages();
    instructions.loadPage();
});
