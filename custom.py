# this file imports custom routes into the experiment server
from flask import Blueprint, render_template, request, jsonify, Response, abort, current_app
from jinja2 import TemplateNotFound
from functools import wraps
from sqlalchemy import or_

from psiturk.psiturk_config import PsiturkConfig
from psiturk.experiment_errors import ExperimentError, InvalidUsage
from psiturk.user_utils import PsiTurkAuthorization, nocache

# # Database setup
from psiturk.db import db_session, init_db
from psiturk.models import Participant
from json import dumps, loads

# Command line stuff
import psiturk.psiturk_shell as psiturk_shell

# load the configuration options
config = PsiturkConfig()
config.load_config()
myauth = PsiTurkAuthorization(config)  # if you want to add a password protect route use this

# explore the Blueprint
custom_code = Blueprint('custom_code', __name__, template_folder='templates', static_folder='static')



###########################################################
#  serving warm, fresh, & sweet custom, user-provided routes
#  add them here
###########################################################

import logging
import StringIO
import csv
logger = logging.getLogger(__name__)

#----------------------------------------------
# example custom route
#----------------------------------------------
@custom_code.route('/my_custom_view')
def my_custom_view():
    current_app.logger.info("Reached /my_custom_view")  # Print message to server.log for debugging
    try:
        return render_template('custom.html')
    except TemplateNotFound:
        abort(404)

#----------------------------------------------
# example using HTTP authentication
#----------------------------------------------
@custom_code.route('/my_password_protected_route')
@myauth.requires_auth
def my_password_protected_route():
    try:
        return render_template('custom.html')
    except TemplateNotFound:
        abort(404)

# @custom_code.route('/create_hit')
# @myauth.requires_auth
# def create_hit():
#     psiturk_shell.run(cabinmode=True, execute="hit create 1 0.50 1", quiet=True)
#     return 'whatevs'

#----------------------------------------------
# paying bonus - careful with this!!!
#----------------------------------------------
#from psiturk.amt_services import MTurkServices
#@custom_code.route("/pay_bonus")
#@myauth.requires_auth
#def pay_bonus():
#    amt_services = MTurkServices(
#        config.get('AWS Access', 'aws_access_key_id'), \
#        config.get('AWS Access', 'aws_secret_access_key'),
#        config.getboolean('Shell Parameters', 'launch_in_sandbox_mode'))


#----------------------------------------------
# example computing bonus
#----------------------------------------------

#@custom_code.route('/compute_bonus', methods=['GET'])
#def compute_bonus():
#    # check that user provided the correct keys
#    # errors will not be that gracefull here if being
#    # accessed by the Javascrip client
#    if not request.args.has_key('uniqueId'):
#        raise ExperimentError('improper_inputs')  # i don't like returning HTML to JSON requests...  maybe should change this
#    uniqueId = request.args['uniqueId']
#
#    try:
#        # lookup user in database
#        user = Participant.query.\
#               filter(Participant.uniqueid == uniqueId).\
#               one()
#
#        bonus = 0
#        user_data = loads(user.datastring) # load datastring from JSON
#        for qname, resp in user_data['questiondata'].items():
#            if qname == 'bonus_calc':
#                bonus = resp
#                break
#        bonus = min(bonus, 10)
#
#        user.bonus = bonus
#        db_session.add(user)
#        db_session.commit()
#        resp = {"bonusComputed": "success", 'bonus': bonus}
#        return jsonify(**resp)
#    except:
#        abort(404)  # again, bad to display HTML, but...

    
