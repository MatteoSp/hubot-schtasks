'use strict';

var util =  require('util');

function ShellResponder(options) {
    this.options = options || {};
}

ShellResponder.prototype = {
    sendTaskList: function(msg, targets, tasks) {
        var output = '';

        tasks.forEach(function(taskInfo, index, array) {
            output = util.format(
                '%s %s%s (status: %s). Last run: %s (result: %s), next: %s.\r\n', 
                output, 
                taskInfo.name, 
                targets.length > 1 ? '@' + taskInfo.hostName : '',
                taskInfo.status,
                taskInfo.lastRun,
                taskInfo.lastResult,
                taskInfo.nextRun
            );
        });

        msg.reply(output);
    },

    sendHostList: function(msg, hosts) {
        var output = '',
            hostAddress;

        hosts.forEach(function(item, index, array) {
            hostAddress = item.host;
            if (item.instanceName) {
                hostAddress += '\\' + item.instanceName;
            }

            output += util.format('\r\n%s: %s @ %s.', item.name, item.type, hostAddress);
        });

        msg.reply(output);        
    },

    sendError: function(msg, err) {
        err = err || '';
        var errMessage = typeof err == 'string' ? err : err.toString();

        msg.reply("ERROR: " + errMessage);
    },

    sendStartStop: function(msg, taskName, action) {
        msg.reply(util.format("Task '%s' %s", taskName, action == 'run' ? 'started' : 'stopped'));
    }
};


module.exports =  {
    responder: ShellResponder
};