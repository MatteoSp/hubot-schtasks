'use strict';

var util =  require('util');

function SlackResponder(options) {
    this.options = options || {};
}

SlackResponder.prototype = {
    lastResultIcon: function(taskInfo) {
        if (!taskInfo.lastResult) {
            return ':running:';
        } else if (taskInfo.lastResult == 'OK') {
            return ':large_blue_circle:';
        } else if (taskInfo.lastResult == 'KO')  {
            return ':red_circle:';
        } else {
            return ':question:';
        }
    },
    
    choseColor: function(taskInfo) {
        if (taskInfo.status == 'Disabled') {
            return '#555';
        } else if (!taskInfo.lastResult) {
            return '#FF00FF';
        } else if (taskInfo.lastResult == 'OK') {
            return 'good';
        } else if (taskInfo.lastResult == 'KO')  {
            return 'danger';
        } else {
            return 'warning';
        }
    },

    sendTaskList: function(msg, targets, tasks) {
        var me = this,
            hostNames = targets.map(function(target) {
                return target.name
            }),
            messageObject = {
                channel: msg.message.room,
                text: util.format("Tasks on hosts %s.", hostNames.join(',')),
                attachments: []
            }, title;

        tasks.forEach(function(taskInfo, index, array) {
            messageObject.attachments.push({
                fallback: "Required plain-text summary of the attachment.",
                color: me.choseColor(taskInfo),
                title: util.format(
                    '%s%s (%s%s)',
                    taskInfo.name,
                    targets.length > 1 ? ' @' + taskInfo.hostName : '',
                    taskInfo.status == 'Running' ? ':running: ' : '', 
                    taskInfo.status
                ),
                mrkdwn_in: ["text", "fields"],
                fields: [
                    { 
                        title: "Last Run", 
                        value: taskInfo.lastRun + ' ' + me.lastResultIcon(taskInfo), 
                        short: true 
                    },
                    { title: "Next Run", value: taskInfo.nextRun, short: true }
                ]
            });
        });

        // post the message using the tecnique explained here: https://github.com/slackhq/hubot-slack/issues/170
        msg.robot.adapter.customMessage(messageObject);
    },

    sendHostList: function(msg, hosts) {
        var output = '',
            hostAddress;

        hosts.forEach(function(item, index, array) {
            hostAddress = item.host;
            if (item.instanceName) {
                hostAddress += '\\' + item.instanceName;
            }

            output += util.format('\r\n:white_medium_small_square: %s: %s @ %s.', item.name, item.type, hostAddress);
        });

        msg.reply(output);        
    },

    sendError: function(msg, err) {
        err = err || '';
        var errMessage = typeof err == 'string' ? err : err.toString();

        msg.reply(":heavy_exclamation_mark: " + errMessage);
    },

    sendStartStop: function(msg, taskName, action) {
        msg.reply(util.format("Task '%s' %s", taskName, action == 'run' ? 'started' : 'stopped'));
    }
};


module.exports =  {
    responder: SlackResponder
};