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

module.exports = function(robot) {
    var common = require('../lib/common'),
        util =  require('util'),      
        async = require('async'),          
        config = require('config'),
        baseConfig = config.get('hubot_schtasks'),
        hosts = config.get('hubot_schtasks.hosts'),
        responderConfig, responderModule;

    var initialize = (function() {
        hosts.forEach(function(item, index, array) {
            if (item.skipSystemTasks == undefined) {
                item.skipSystemTasks = baseConfig.skipSystemTasks;
            }
        });

        if (config.has('hubot_schtasks.responder')) {
            responderConfig = config.get('hubot_schtasks.responder');
        } else {            
            responderConfig = {
                type: robot.adapterName == 'slack' ? 'Slack' : 'Shell'
            }
        }

        responderModule = common.safeRequire(process.cwd() + '/config/' + responderConfig.type);
        if (!responderModule) {
            responderModule = common.safeRequire('../lib/responders/' + responderConfig.type);        
        }

        if (! responderModule) {
            throw new Error("Unknown responder type: " + responderConfig.type);
        }
    })();

    var createAdapter = function(host) {
        var hostConfig,
            adapterModule;

        if (typeof host == 'string') {
            hostConfig = hosts.find(function(item) {
                return (item.name || '').toUpperCase() == host.toUpperCase();
            });

            if (!hostConfig) {
                return console.log("Unknown host: " + host);
            }
        } else {
            hostConfig = host;
        }

        adapterModule = common.safeRequire('../lib/adapters/' + hostConfig.type);

        if (! adapterModule) {
            return console.log("Unknow host type: " + hostConfig.type);
        }

        return new adapterModule.adapter(hostConfig);
    };

    var createResponder = function(msg) {
        return new responderModule.responder(responderConfig);
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

            console.log("listing tasks on " + hostConfig.namne);

            adapter.list(callback);
        };

        async.map(targets, collectTasks, function(err, results) {
            results.forEach(function(hostTasks) {
                tasks.push.apply(tasks, hostTasks);
            });

            var responder = createResponder(msg);

            responder.sendTaskList(msg, targets, tasks);
        });
    });


    robot.respond(/st (run|end) (.+) on (.+)/i, function(msg) {
        var action = msg.match[1],
            taskName = msg.match[2],
            host = msg.match[3],
            adapter = createAdapter(host),
            responder = createResponder(msg),
            callback;

        if (!adapter) {
            return responder.sendError(msg, "Unknown host: " + host);
        }

        callback = function(err, content) {
            if (err) {
                responder.sendError(msg, err.toString());
            } else {
                responder.sendStartStop(msg, taskName, action);
            }
        };

        if (action == 'run') {
            adapter.start(taskName, callback);
        } else {
            adapter.stop(taskName, callback);
        }
    });

    robot.respond(/st hosts/i, function(msg) {
        var responder = createResponder(msg);
        responder.sendHostList(msg, hosts);
    });
}