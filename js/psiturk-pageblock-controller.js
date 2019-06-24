/**
 * Created by markho on 1/7/18.
 */

// var $ = require('jquery');

/***********************************
    Page Block Controller
************************************/
export default function PageBlockController(
    parent, pages, callback, closeAlert, manual_saveData
) {
    var psiturk = parent;
    var currentscreen = 0, timestamp;

    manual_saveData = typeof(manual_saveData) === 'undefined' ? false : manual_saveData;

    closeAlert = typeof(closeAlert) === 'undefined' ? true : closeAlert;
    if (closeAlert) {
        closeAlert = function(){
            return 'Please do not close or reload this window before ' +
                'completing the task. Doing so will invalidate your responses!';
        };
        $(window).bind('beforeunload', closeAlert);
    }

    if (typeof(callback) === 'undefined') {
        callback = function() {
            psiturk.computeBonus('compute_bonus', function(resp){
                console.log(resp);
                if (closeAlert) {
                    $(window).unbind('beforeunload', closeAlert);
                }
                psiturk.completeHIT(); // when finished saving compute bonus, the quit
            });
        };
    }

    var loadPage = function() {
        // show the page
        var continue_func = function (callback) {callback()};
        if (typeof(pages[currentscreen]) === "string") {
            psiturk.showPage(pages[currentscreen]);
        }
        else {
            psiturk.showPage(pages[currentscreen]['pagename']);
            if (pages[currentscreen].hasOwnProperty('pagefunc')) {
                pages[currentscreen]['pagefunc']();
            }
            if (pages[currentscreen].hasOwnProperty('continuefunc')) {
                continue_func = pages[currentscreen]['continuefunc'];
            }
        }

        // connect event handler to continue button
        $('.instructionsnav').on('click.psiturk.instructionsnav.next',
            '.continue', function() {
            continue_func(nextPageButtonPress);
            // nextPageButtonPress();
        });

        // Record the time that an exp page is first presented
        timestamp = new Date().getTime();
    };

    var question_validation = function () {
        //correct answer required
        if (_.contains(this.classList, "correct-answer-required")) {
            //check if required radio buttons have no answer
            if ($(this).find("input:radio").length > 0 &&
                    $(this).find("input:radio:checked").length === 0) {
                $(this).addClass("invalid-response");
                $(this).append("<div class='invalid-response-text'>Response required</div>");
                all_valid = false;
                window.scrollTo($(this).position()['left'], $(this).position()['top'])
            }

            //check if checked radio button is not correct
            if ($(this).find("input:radio").length > 0 &&
                    $(this).find("input:radio:checked").length > 0) {
                var checked_radio = $(this).find("input:radio:checked")[0];
                if (!_.contains(checked_radio.classList, "correct-answer")) {
                    $(this).addClass("invalid-response");
                    $(this).append(
                        "<div class='invalid-response-text'> Check your response</div>");
                    window.scrollTo($(this).position()['left'], $(this).position()['top'])
                }
            }
        }

        //any answer required
        if (_.contains(this.classList, "answer-required")) {
            //radio questions
            if ($(this).find("input:radio").length > 0 &&
                    $(this).find("input:radio:checked").length === 0) {
                $(this).addClass("invalid-response");
                $(this).append(
                    "<div class='invalid-response-text'>Response required</div>"
                );
                window.scrollTo($(this).position()['left'], $(this).position()['top'])
            }
            //slider questions
            if ($(this).find("input[type=range]").length > 0) {
                var slider = $(this).find("input[type=range]")[0];
                if (!_.contains(slider.classList, "selected-slider")) {
                    $(this).addClass("invalid-response");
                    $(this).append(
                        "<div class='invalid-response-text'>Response required</div>"
                    );
                    window.scrollTo($(this).position()['left'], $(this).position()['top'])
                }
            }
            
            //text questions
            if ($(this).find("textarea").length > 0) {
                var textarea = $(this).find("textarea")[0];
                var text = textarea.value;
                if (text.length == 0) {
                    $(this).addClass("invalid-response");
                    $(this).append(
                        "<div class='invalid-response-text'>Response required</div>"
                    );
                    window.scrollTo($(this).position()['left'], $(this).position()['top'])
                }
                else if (_.contains(this.classList, "number-required") && isNaN(text)) {
                    $(this).addClass("invalid-response");
                    $(this).append(
                        "<div class='invalid-response-text'>Number required</div>"
                    );
                    window.scrollTo($(this).position()['left'], $(this).position()['top'])
                }
            }

            //required interaction
            if ($(this).find(".no-interaction").length > 0) {
                var question = $(this).find(".no-interaction")[0];
                $(this).addClass("invalid-response");
                $(this).append(
                    "<div class='invalid-response-text'>Required</div>"
                );
                window.scrollTo($(this).position()['left'], $(this).position()['top'])
            }
        }
    };

    var nextPageButtonPress = function() {
        // validation
        $(".invalid-response-text").each(function () {this.remove()});
        $(".invalid-response").removeClass("invalid-response");

        $(".question").each(question_validation);

        if ($(".invalid-response").length) {
            return
        }

        // Record the response time
        var rt = (new Date().getTime()) - timestamp;
        var viewedscreen = currentscreen;
        currentscreen = currentscreen + 1;

        $('textarea').each( function(i, val) {
            console.log(this.id + " : " + this.value);
			psiturk.recordUnstructuredData(this.id, this.value);
		});
		$('select').each( function(i, val) {
		    console.log(this.id + " : " + this.value);
			psiturk.recordUnstructuredData(this.id, this.value);
		});
		$('input:radio:checked').each(function(i, val) {
		    console.log(this.name + " : " + this.value);
            psiturk.recordUnstructuredData(this.name, this.value);
        });
		$("input[type=range]").each(function () {
		    console.log(this.id + " : " + this.value);
		    psiturk.recordUnstructuredData(this.id, this.value);
		});
		$(".videocontainer").each(function () {
		    console.log(this.id + " : " + JSON.stringify(this.playdata));
		    psiturk.recordUnstructuredData(this.id, this.playdata);
        });

        if (currentscreen === pages.length) {
            psiturk.recordTrialData({
                "template":pages[viewedscreen],
                "indexOf":viewedscreen,
                "action":"FinishInstructions",
                "viewTime":rt
            });
            if (!manual_saveData) {
                psiturk.saveData({
                    'success': function () {
                        finish();
                        window.scrollTo(0, 0);
                    }
                });
            }
            else {
                finish();
                window.scrollTo(0, 0);
            }


        } else {
            psiturk.recordTrialData({
                "template":pages[viewedscreen],
                "indexOf":viewedscreen,
                "action":"NextPage",
                "viewTime":rt
            });

            if (!manual_saveData) {
                psiturk.saveData({
                    'success': function () {
                        loadPage();
                        window.scrollTo(0, 0);
                    }
                });
            }
            else {
                loadPage();
                window.scrollTo(0, 0);
            }
        }
    };

    var finish = function() {
        // unbind all instruction related events
        $('.continue').unbind('click.psiturk.instructionsnav.next');
        callback();
    };

    /* public interface */
    this.loadPage = loadPage;
    this.finish = finish;

    return this;
}

// module.exports = PageBlockController;