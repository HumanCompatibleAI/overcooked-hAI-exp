"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _jquery = require("jquery");

var _jquery2 = _interopRequireDefault(_jquery);

var _lodash = require("lodash");

var _lodash2 = _interopRequireDefault(_lodash);

var _pageblockSurvey = require("./js/pageblock-survey.js");

var _pageblockSurvey2 = _interopRequireDefault(_pageblockSurvey);

var _psiTurkPageblockController = require("./js/psiTurk-pageblock-controller.js");

var _psiTurkPageblockController2 = _interopRequireDefault(_psiTurkPageblockController);

var _conditions = require("./js/conditions.js");

var _conditions2 = _interopRequireDefault(_conditions);

var _gameserverIo = require("./js/gameserver-io.js");

var _gameserverIo2 = _interopRequireDefault(_gameserverIo);

var _overcookedSingle = require("./js/overcooked-single");

var _overcookedSingle2 = _interopRequireDefault(_overcookedSingle);

var _load_tf_model = require("./js/load_tf_model.js");

var _load_tf_model2 = _interopRequireDefault(_load_tf_model);

var _overcooked = require("overcooked");

var Overcooked = _interopRequireWildcard(_overcooked);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var OvercookedMDP = Overcooked.OvercookedMDP;
var Direction = OvercookedMDP.Direction;
var Action = OvercookedMDP.Action;

var _Direction$CARDINAL = _slicedToArray(Direction.CARDINAL, 4),
    NORTH = _Direction$CARDINAL[0],
    SOUTH = _Direction$CARDINAL[1],
    EAST = _Direction$CARDINAL[2],
    WEST = _Direction$CARDINAL[3];

var _ref = [Direction.STAY, Action.INTERACT],
    STAY = _ref[0],
    INTERACT = _ref[1];


var randomstring = require("randomstring");

//experimental variables
var EXP = {
    MAIN_TRIAL_TIME: 60, //seconds
    TIMESTEP_LENGTH: 150, //milliseconds
    DELIVERY_POINTS: 5,
    POINT_VALUE: .01,
    BASE_PAY: 1.00,
    PLAYER_INDEX: 1, // Either 0 or 1
    MODEL_TYPE: 'ppo_bc' // Either ppo_bc, ppo_sp, or pbt
};
var worker_bonus = 0;
var is_leader = void 0;

/***********************************
      Main trial order
 ************************************/

var layouts = {
    "cramped_room": ["XXPXX", "O  2O", "X1  X", "XDXSX"],
    "asymmetric_advantages": ["XXXXXXXXX", "O XSXOX S", "X   P 1 X", "X2  P   X", "XXXDXDXXX"],
    "coordination_ring": ["XXXPX", "X 1 P", "D2X X", "O   X", "XOSXX"],
    "random3": ["XXXPPXXX", "X      X", "D XXXX S", "X2    1X", "XXXOOXXX"],
    "random0": ["XXXPX", "O X1P", "O2X X", "D X X", "XXXSX"]
};
var main_trial_order = ["cramped_room", "asymmetric_advantages", "coordination_ring", "random3", "random0"];

(0, _jquery2.default)(document).ready(function () {
    /*
     * Requires:
     *     psiTurk.js
     *     utils.js
     */
    var participant_id = randomstring.generate({
        length: 12,
        charset: 'alphabetic'
    });
    // `condition` is passed by the psiturk server process
    var condition_name = _conditions2.default.condition_names[condition];
    console.log("Condition: " + condition_name);
    EXP.PLAYER_INDEX = Number(condition_name.split('-')[1]);
    EXP.MODEL_TYPE = condition_name.split('-')[0];

    var AGENT_INDEX = 1 - EXP.PLAYER_INDEX;

    var DEBUG = false;

    // Initalize psiTurk object
    var psiTurk = new PsiTurk(uniqueId, adServerLoc, mode);
    window.psiTurk = psiTurk;

    // All pages to be loaded
    var pages_to_preload = ["exp/pageblock.html", "exp/complete.html", "debug_initpage.html"];
    psiTurk.preloadPages(pages_to_preload);
    psiTurk.preloadImages([]);

    /***********************************
        Set up conditions and blocks
    ************************************/

    var instructions;

    var setup_exp_pages = function setup_exp_pages() {
        psiTurk.recordUnstructuredData("participant_id", participant_id);

        /***********************************
               Set up websockets server
         ***********************************/
        var HOST = "https://lit-mesa-15330.herokuapp.com/".replace(/^http/, "ws");
        var gameserverio = new _gameserverIo2.default({ HOST: HOST });

        /************************
         Pre-task and training
         ************************/
        var pre_task_pages = [
        // Instructions
        {
            pagename: 'exp/pageblock.html',
            pagefunc: function pagefunc() {
                (0, _jquery2.default)("#pageblock").addClass("center");
                (0, _jquery2.default)("#pageblock").css("width", "500px");
                (0, _jquery2.default)(".instructionsnav").hide();
                var survey = new _pageblockSurvey2.default({ containername: "pageblock" });
                survey.addone({
                    type: 'textdisplay',
                    questiontext: "\n                            <div>\n                            <h2>Instructions</h2>\n                            <p>\n                                Hello! In this task, you will be playing a\n                                cooking game. You will play one of two chefs\n                                in a restaurant that serves onion soup.\n                            </p>\n                            <p>\n                                This is what one level of the game looks like:\n                            </p>\n                            <img src=\"/static/images/training0.png\" style=\"width:400px\">\n                            <p>\n                                There are a number of objects in the game, labeled here:\n                            </p>\n                            <img src=\"/static/images/training0-annotated.png\" style=\"width:500px\">\n\n                            <br>\n                            <hr>\n                            <br>\n\n                            <h3>Movement and interactions</h3>\n                            <img src=\"/static/images/space-arrows.png\" style=\"width:250px\">\n                            <p>\n                                You can move up, down, left, and right using\n                                the <b>arrow keys</b>, and interact with objects\n                                using the <b>spacebar</b>.\n                            </p>\n                            <p>\n                                You can interact with objects by facing them and pressing\n                                <b>spacebar</b>. Here are some examples:\n                                <ul>\n                                <li>You can pick up onions by facing\n                                the onion area and pressing <b>spacebar</b>.</li>\n                                <li>If you are holding an onion, are facing an empty counter,\n                                and press <b>spacebar</b>, you put the onion on the counter.</li>\n                                <li>If you are holding an onion, are facing a pot that is not full,\n                                and press <b>spacebar</b>, you will put the onion in the pot.</li>\n                                </ul>\n                            </p>\n\n                            <br>\n                            <br>\n                            <p>\n                                Note that as you and your partner are moving around the kitchen\n                                you <u><b>cannot occupy the same location</b></u>.\n                            </p>\n                            <br>\n                            <hr>\n                            <br>\n\n                            <h3>Cooking</h3>\n                            <img src=\"/static/images/soup.png\" style=\"width:250px\">\n                            <p>\n                                Once 3 onions are in the pot, the soup begins to cook.\n                                After the timer gets to 20, the soup\n                                will be ready to be served. To serve the soup,\n                                bring a dish over and interact with the pot.\n                            </p>\n\n                            <br>\n                            <hr>\n                            <br>\n\n                            <h3>Serving</h3>\n                            <img src=\"/static/images/serving-counter.png\" style=\"width:500px\">\n                            <p>\n                            Once the soup is in a bowl, you can serve it by bringing it to\n                            a grey serving counter.\n                            </p>\n\n                            <br>\n                            <hr>\n                            <br>\n\n                            <h3>Goal</h3>\n                            <img src=\"/static/images/info-panel.png\" style=\"width:150px\">\n                            <p>\n                            Your goal in this task is to serve as many of the orders as you can\n                            before each level ends.  Serving an order gets you\n                            " + EXP.DELIVERY_POINTS + " points and 1 point adds 1 cent to your bonus.\n                            The current order list, score, and time left for you and your partner\n                            are shown in the upper left.\n                            </p>\n\n                            <br>\n                            <hr>\n                            <br>\n\n                            <h3>Final Instructions</h3>\n                            <p>\n                            Next, we will give you a couple of simple collaborative training rounds with a computer partner.\n                            </p>\n                            <p>Afterwards, in the main part of this task, you will be paired up with a computer partner on harder layouts, \n                            and you must collaborate with them to play the game.</p>\n                            <br>\n                            <p>Good luck!</p>\n                            </div>\n                        "
                });
                setTimeout(function () {
                    (0, _jquery2.default)(".instructionsnav").show();
                }, 15000);
            }
        },

        // Training
        {
            'pagename': 'exp/pageblock.html',
            'pagefunc': function pagefunc() {
                (0, _jquery2.default)(".instructionsnav").hide();
                var npc_policy = function () {
                    var a_seq = [STAY, STAY, STAY, STAY, STAY,

                    //get 3 onions
                    EAST, EAST, NORTH, INTERACT, WEST, WEST, NORTH, INTERACT, EAST, EAST, NORTH, INTERACT, WEST, WEST, NORTH, INTERACT, EAST, EAST, NORTH, INTERACT, WEST, WEST, NORTH, INTERACT,

                    //get a dish while it is cooking and wait
                    EAST, EAST, EAST, EAST, NORTH, INTERACT, WEST, WEST, WEST, WEST, NORTH, STAY, STAY, STAY, INTERACT,

                    //deliver to server
                    EAST, EAST, EAST, EAST, INTERACT, STAY, STAY, STAY, STAY, STAY,

                    //get 3 onions
                    WEST, WEST, NORTH, INTERACT, WEST, WEST, NORTH, INTERACT, EAST, EAST, NORTH, INTERACT, WEST, WEST, NORTH, INTERACT, EAST, EAST, NORTH, INTERACT, WEST, WEST, NORTH, INTERACT,

                    //get a dish while it is cooking and wait
                    EAST, EAST, EAST, EAST, NORTH, INTERACT, WEST, WEST, WEST, WEST, NORTH, STAY, STAY, STAY, INTERACT,

                    //deliver to server
                    EAST, EAST, EAST, EAST, INTERACT, STAY, STAY, STAY, STAY, STAY,

                    //get 3 onions
                    WEST, WEST, NORTH, INTERACT, WEST, WEST, NORTH, INTERACT, EAST, EAST, NORTH, INTERACT, WEST, WEST, NORTH, INTERACT, EAST, EAST, NORTH, INTERACT, WEST, WEST, NORTH, INTERACT,

                    //get a dish while it is cooking and wait
                    EAST, EAST, EAST, EAST, NORTH, INTERACT, WEST, WEST, WEST, WEST, NORTH, STAY, STAY, STAY, INTERACT,

                    //deliver to server
                    EAST, EAST, EAST, EAST, INTERACT];
                    var ai = 0;
                    var pause = 2;
                    return function (s) {
                        var a = STAY;
                        if (ai / pause < a_seq.length && ai % pause === 0) {
                            a = a_seq[ai / pause];
                        }
                        ai += 1;
                        return a;
                    };
                }();
                var start_grid = ["XXXXXXX", "XPXOXDX", "X2    S", "XPXOXDX", "X    1S", "XXXXXXX"];

                var game = new _overcookedSingle2.default({
                    container_id: "pageblock",
                    player_index: 0,
                    start_grid: start_grid,
                    npc_policies: { 1: npc_policy },
                    TIMESTEP: EXP.TIMESTEP_LENGTH,
                    MAX_TIME: 30, //seconds
                    init_orders: ['onion'],
                    completion_callback: function completion_callback() {
                        setTimeout(function () {
                            (0, _jquery2.default)(".instructionsnav").show();
                        }, 1500);
                    },
                    timestep_callback: function timestep_callback(data) {
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
                (0, _jquery2.default)("#pageblock").css("text-align", "center");
                game.init();
            }
        }, {
            pagename: 'exp/pageblock.html',
            pagefunc: function pagefunc() {
                (0, _jquery2.default)("#pageblock").addClass("center");
                (0, _jquery2.default)("#pageblock").css("width", "500px");
                psiTurk.recordUnstructuredData('PLAYER_INDEX', EXP.PLAYER_INDEX);
                psiTurk.recordUnstructuredData('MODEL_TYPE', EXP.MODEL_TYPE);
                var survey = new _pageblockSurvey2.default({ containername: "pageblock" });
                survey.addone({
                    type: 'textdisplay',
                    questiontext: "\n                            <div>\n                            <h2>Instructions</h2>\n                            <p>Next, you will cook soups and bring them to your partner\n                            who will bring them to be served.</p>\n                            </div>\n                        "
                });
            }
        }, {
            'pagename': 'exp/pageblock.html',
            'pagefunc': function pagefunc() {
                (0, _jquery2.default)(".instructionsnav").hide();
                var npc_policy = function () {
                    return function (s) {
                        var npc_loc = s.players[1].position;
                        var npc_or = s.players[1].orientation;
                        var npc_holding = typeof s.players[1].held_object !== 'undefined';

                        var npc_at_pickup = _lodash2.default.isEqual(npc_loc, [4, 2]) && _lodash2.default.isEqual(npc_or, [-1, 0]);
                        var npc_holding_soup = npc_holding && s.players[1].held_object.name === 'soup';
                        var soup_on_counter = typeof s.objects[[3, 2]] !== 'undefined' && s.objects[[3, 2]].name === 'soup';
                        var npc_at_server = _lodash2.default.isEqual(npc_loc, [5, 2]) && _lodash2.default.isEqual(npc_or, [1, 0]);

                        var a = WEST;
                        if (npc_at_pickup && !npc_holding_soup && soup_on_counter) {
                            a = INTERACT;
                        } else if (npc_holding_soup && !npc_at_server) {
                            a = EAST;
                        } else if (npc_holding_soup && npc_at_server) {
                            a = INTERACT;
                        }
                        return a;
                    };
                }();

                var start_grid = ["XXXXXXX", "XPDXXXX", "O1 X2 S", "XXXXXXX"];

                var game = new _overcookedSingle2.default({
                    container_id: "pageblock",
                    player_index: 0,
                    start_grid: start_grid,
                    npc_policies: { 1: npc_policy },
                    TIMESTEP: EXP.TIMESTEP_LENGTH,
                    MAX_TIME: 40, //seconds
                    init_orders: ['onion'],
                    always_serve: 'onion',
                    completion_callback: function completion_callback() {
                        // psiTurk.saveData()
                        setTimeout(function () {
                            (0, _jquery2.default)(".instructionsnav").show();
                        }, 1500);
                    },
                    timestep_callback: function timestep_callback(data) {
                        data.participant_id = participant_id;
                        data.layout_name = "training2";
                        data.layout = start_grid;
                        data.round_num = 0;
                        data.round_type = 'training';
                        psiTurk.recordTrialData(data);
                    },
                    DELIVERY_REWARD: EXP.DELIVERY_POINTS
                });
                (0, _jquery2.default)("#pageblock").css("text-align", "center");
                game.init();
            }
        }, {
            pagename: 'exp/pageblock.html',
            pagefunc: function pagefunc() {
                (0, _jquery2.default)("#pageblock").addClass("center");
                (0, _jquery2.default)("#pageblock").css("width", "500px");
                var survey = new _pageblockSurvey2.default({ containername: "pageblock" });
                survey.addone({
                    type: 'textdisplay',
                    questiontext: "\n                            <div>\n                            <h2>Instructions</h2>\n                            <p>Great! Now you will be paired up with another\n                            computer partner for a set of five harder layouts.</p>\n                            </div>\n                        "
                });
            }
        }];

        /*********
         Main task
         *********/
        var task_pages = _lodash2.default.map(_lodash2.default.range(main_trial_order.length), function (round_num) {

            var round_page = {
                'pagename': 'exp/pageblock.html',
                'pagefunc': function pagefunc() {
                    (0, _jquery2.default)('#next').addClass('instructionshidden');
                    (0, _jquery2.default)('#next').removeClass('instructionsshown');
                    (0, _jquery2.default)("#pageblock").html("<h2>Round " + (round_num + 1) + "</h2>");
                    setTimeout(function () {
                        (0, _jquery2.default)("#next").click();
                    }, 1000);
                }
            };
            var game_page = {
                'pagename': 'exp/pageblock.html',
                'pagefunc': function pagefunc() {
                    var layout_name = main_trial_order[round_num];
                    (0, _load_tf_model2.default)(EXP.MODEL_TYPE, layout_name, AGENT_INDEX).then(function (npc_policy) {
                        (0, _jquery2.default)(".instructionsnav").hide();
                        var npc_policies = {};
                        npc_policies[AGENT_INDEX] = npc_policy;
                        var game = new _overcookedSingle2.default({
                            container_id: "pageblock",
                            player_index: EXP.PLAYER_INDEX,
                            start_grid: layouts[layout_name],
                            npc_policies: npc_policies,
                            TIMESTEP: EXP.TIMESTEP_LENGTH,
                            MAX_TIME: EXP.MAIN_TRIAL_TIME, //seconds
                            init_orders: ['onion'],
                            always_serve: 'onion',
                            completion_callback: function completion_callback() {
                                setTimeout(function () {
                                    (0, _jquery2.default)("#next").click();
                                }, 1500);
                            },
                            timestep_callback: function timestep_callback(data) {
                                data.participant_id = participant_id;
                                data.layout_name = layout_name;
                                data.layout = layouts[layout_name];
                                data.round_num = round_num;
                                data.round_type = 'main';
                                psiTurk.recordTrialData(data);
                                // console.log(data);
                                if (data.reward > 0) {
                                    worker_bonus += EXP.POINT_VALUE * data.reward;
                                }
                            },
                            DELIVERY_REWARD: EXP.DELIVERY_POINTS
                        });
                        (0, _jquery2.default)("#pageblock").css("text-align", "center");
                        window.exit_hit = function () {
                            psiTurk.recordUnstructuredData("early_exit", true);
                            psiTurk.recordUnstructuredData('bonus_calc', worker_bonus);
                            psiTurk.recordUnstructuredData('is_leader', is_leader);
                            psiTurk.saveData({
                                success: function success() {
                                    console.log("Data sent");
                                    setTimeout(function () {
                                        instructions.finish();
                                    }, 1000);
                                }
                            });
                        };
                        game.init();
                    });
                }
            };
            return [round_page, game_page];
        });
        task_pages = _lodash2.default.flattenDeep(task_pages);

        /*********
         Post-task
         *********/
        var post_task_pages = [{
            pagename: 'exp/pageblock.html',
            pagefunc: function pagefunc() {
                var survey = new _pageblockSurvey2.default({ containername: "pageblock" });
                survey.add([{
                    type: 'textdisplay',
                    questiontext: "\n                                <h3>Survey</h3>\n                            "
                }, {
                    type: 'textbox',
                    name: "self_strategy",
                    questiontext: 'How would you describe your strategy?',
                    leftalign: false
                }, {
                    type: 'textbox',
                    name: "partner_strategy",
                    questiontext: "How would you describe your partner's strategy?",
                    leftalign: false
                }, {
                    type: 'textbox',
                    name: "video_games",
                    questiontext: "What is your experience playing video games?",
                    leftalign: false
                }, {
                    type: 'textbox',
                    name: "other_feedback",
                    questiontext: 'Do you have other comments on this game or how it could be improved?',
                    leftalign: false
                }]);
            }
        }, {
            pagename: 'exp/pageblock.html',
            pagefunc: function pagefunc() {
                var survey = new _pageblockSurvey2.default({ containername: "pageblock" });
                survey.add([{
                    type: 'textdisplay',
                    questiontext: "\n                                <h3>Survey</h3>\n                            "
                }, {
                    type: 'horizontal-radio',
                    name: 'difficulty',
                    questiontext: 'How difficult was this task?',
                    options: [{ value: '1', optiontext: 'Very Easy' }, { value: '2', optiontext: 'Easy' }, { value: '3', optiontext: 'Somewhat Easy' }, { value: '4', optiontext: 'Somewhat Difficult' }, { value: '5', optiontext: 'Difficult' }, { value: '6', optiontext: 'Very Difficult' }]
                }, {
                    type: 'horizontal-radio',
                    name: 'smoothness',
                    questiontext: 'How smooth was cooperation with your partner?',
                    options: [{ value: '1', optiontext: 'Very Unsmooth' }, { value: '2', optiontext: 'Unsmooth' }, { value: '3', optiontext: 'Somewhat Unsmooth' }, { value: '4', optiontext: 'Somewhat Smooth' }, { value: '5', optiontext: 'Smooth' }, { value: '6', optiontext: 'Very Smooth' }]
                }, {
                    type: 'horizontal-radio',
                    name: 'intuitiveness',
                    questiontext: 'How intuitive was this task?',
                    options: [{ value: '1', optiontext: 'Very Unintuitive' }, { value: '2', optiontext: 'Unintuitive' }, { value: '3', optiontext: 'Somewhat Unintuitive' }, { value: '4', optiontext: 'Somewhat Intuitive' }, { value: '5', optiontext: 'Intuitive' }, { value: '6', optiontext: 'Very Intuitive' }]
                }, {
                    type: 'horizontal-radio',
                    name: 'fun',
                    questiontext: 'How fun was this task?',
                    options: [{ value: '1', optiontext: 'Very Unfun' }, { value: '2', optiontext: 'Unfun' }, { value: '3', optiontext: 'Somewhat Unfun' }, { value: '4', optiontext: 'Somewhat Fun' }, { value: '5', optiontext: 'Fun' }, { value: '6', optiontext: 'Very Fun' }]
                }]);
            }
        },
        // Demographics
        {
            'pagename': 'exp/pageblock.html',
            'pagefunc': function pagefunc() {
                var questions = [{
                    type: 'numeric-text',
                    name: "age",
                    questiontext: 'Age'
                }, {
                    type: 'textbox',
                    name: 'gender',
                    questiontext: 'Gender',
                    rows: 1,
                    cols: 25,
                    leftalign: true,
                    required: true
                }];
                var survey = new _pageblockSurvey2.default({ containername: "pageblock" });
                survey.add(questions);
            }
        },

        //saving task
        {
            pagename: "exp/pageblock.html",
            pagefunc: function pagefunc() {
                (0, _jquery2.default)('#next').addClass('instructionshidden');
                (0, _jquery2.default)('#next').removeClass('instructionsshown');
                psiTurk.recordUnstructuredData('bonus_calc', worker_bonus);
                psiTurk.recordUnstructuredData('is_leader', is_leader);
                psiTurk.recordUnstructuredData("early_exit", false);

                var saving_timeout = setTimeout(function () {
                    (0, _jquery2.default)("#saving_msg").html("\n                                <p>There was an error saving your data. \n                                Please check that you are connected to the internet.</p>\n\n                                <p>\n                                Click the button below to save manually (it may take a second)\n                                </p>\n                                <div>\n                                <button type=\"button\" class=\"btn btn-primary btn-lg\" onclick=\"save_data();\">\n\t\t\t\t\t\t\t\t  Save\n\t\t\t\t\t\t\t\t</button>\n\t\t\t\t\t\t\t\t</div>\n                                ");
                }, 30000);
                window.save_data = function () {
                    psiTurk.saveData({
                        success: function success() {
                            clearTimeout(saving_timeout);
                            setTimeout(function () {
                                (0, _jquery2.default)("#next").click();
                            }, 2000);
                            (0, _jquery2.default)("#saving_msg").html("Success!");
                            console.log("Data sent");
                        }
                    });
                };

                window.save_data();

                (0, _jquery2.default)("#pageblock").html("\n                            <h2>Saving data</h2>\n                            <div id=\"saving_msg\">\n                                <p>Please wait while we save your results so we can compute your bonus...</p>\n                                <p>(This should take less than a minute).</p>\n                                <p>This page should automatically continue.</p>\n                            </div>\n                        ");
            }
        }, "exp/complete.html"];

        var exp_pages = _lodash2.default.flattenDeep([pre_task_pages, task_pages, post_task_pages]);
        instructions = new _psiTurkPageblockController2.default(psiTurk, //parent
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
