// Description:
//   Lists, starts and stops Windows scheduled tasks.
//
// Dependencies:
//   None
//
// Configuration:
//
// Commands:
//   hubot st - Gets scheduled tasks info on all configured hosts
//   hubot st on HOST_NAME - Gets scheduled tasks info on the specified host
//   hubot st run TASK_NAME on HOST_NAME - Runs the specified task
//   hubot st end TASK_NAME on HOST_NAME - Stops the specified task
//   hubot st hosts - Gets the list of all configured hosts
//
// Author:
//   MatteoSp

require('../lib/common');

module.exports = function(robot) {
    var util =  require('util'),      
        async = require('async'),          
        config = require('config'),
        baseConfig = config.get('hubot_schtasks'),
        hosts = config.get('hubot_schtasks.hosts');

    hosts.forEach(function(item, index, array) {
        if (item.skipSystemTasks == undefined) {
            item.skipSystemTasks = baseConfig.skipSystemTasks;
        }
    });

    var sendTaskList = function(msg, targets, tasks) {
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
    };

    var createAdapter = function(host) {
        var hostConfig,
            adapterModule;

        if (typeof host == 'string') {
            hostConfig = hosts.find(function(item) {
                return item.name == host;
            });

            if (!hostConfig) {
                return console.log("Unknown host: " + host);
            }
        } else {
            hostConfig = host;
        }

        adapterModule = require('../lib/adapters/' + hostConfig.type);

        if (! adapterModule) {
            return console.log("Unknow host type: " + hostConfig.type);
        }

        return new adapterModule.adapter(hostConfig);
    };

    robot.respond(/st\s*(on (.[^\s]+))*$/i, function(msg) {
        var hostName = msg.match[2],
            tasks = [],
            targets;

        if (hostName) {
            targets = hosts.filter(function(item) {
                return item.name == hostName;
            });
        } else {
            targets = hosts;
        }

        var collectTasks = function(hostConfig, callback) {
            var adapter = createAdapter(hostConfig);

            if (! adapter) {
                return callback(null, null);
            }

            console.log("listing tasks on " + hostConfig.host);

            adapter.list(callback);
        };

        async.map(targets, collectTasks, function(err, results) {
            results.forEach(function(hostTasks) {
                tasks.push.apply(tasks, hostTasks);
            });

            sendTaskList(msg, targets, tasks);
        });
    });


    robot.respond(/st (run|end) (.+) on (.+)/i, function(msg) {
        var action = msg.match[1],
            taskName = msg.match[2],
            host = msg.match[3],
            adapter = createAdapter(host),
            callback;

        if (!adapter) {
            return msg.reply("Unknown host: " + host);
        }

        callback = function(err, content) {
            if (err) {
                msg.reply("ERROR: " + err.toString());
            } else {
                msg.reply(util.format("Task '%s' %s", taskName, action == 'run' ? 'started' : 'stopped'));
            }
        };

        if (action == 'run') {
            adapter.start(taskName, callback);
        } else {
            adapter.stop(taskName, callback);
        }
    });

    robot.respond(/st hosts/i, function(msg) {
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
    });
}