'use strict';

var spawn = require("child_process").spawn,
    async = require('async'),
    util =  require('util'),
    moment = require('moment');

function WinScheduler(options) {
    this.options = options || {};
}

WinScheduler.prototype = {
    buildParameters: function(baseParams) {
        var me = this,
            args = [baseParams.action];

        if (me.options.host) {
            args.push.apply(args, ['/s', me.options.host]);
        }

        if (me.options.user) {
            args.push.apply(args, ['/u', me.options.user]);
        }

        if (me.options.pwd) {
            args.push.apply(args, ['/p', me.options.pwd]);
        }

        if (baseParams.additionals) {
            args.push.apply(args, baseParams.additionals);
        }

        return args;
    },

    exec: function (cmd, args, cb) {
        var spawn = require("child_process").spawn,
            command = spawn(cmd, args),
            result = '',
            errors = '';

        command.stdout.on('data', function(data) {
            result += data.toString();
        });

        command.stderr.on("data", function(data) {
            errors += data.toString();
        });

        command.on('close', function(code) {
            if (code == 0) {
                cb(null, result);
            } else {
                cb(new Error(util.format('%s. Exit code: %s.', errors, code)));
            }
        });
    },

    formatDate: function(d) {
        if (!d) {
            return '';
        }

        return moment(d, 'DD/MM/YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm');
    },

    getAdditionalInfo: function(scope, taskInfo, callback) {
        var me = scope,
            args = me.buildParameters({ 
                    action: "/query",
                    additionals: ['/v', '/fo', 'list', '/tn', taskInfo.name]
                }),
                rows;

        me.exec("schtasks.exe", args, function(err, content) {
            if (err) {
                callback(err);
                return;
            }

            rows = content.split('\r\n');

            taskInfo.lastRun = me.formatDate(rows[7].replace(/Last Run Time\:/g, '').trim());
            taskInfo.lastResult = rows[8].replace(/Last Result\:/g, '').trim() == '0' ? 'OK' : 'KO';
            taskInfo.actions = rows[10].replace(/Task To Run\:/g, '').trim();

            callback();
        });
    },

    list: function(callback) {
        var me = this,
            args = me.buildParameters({ 
                action:"/query",
                additionals: ['/fo', 'csv']
            });

        me.exec("schtasks.exe", args, function(err, content) {
            var parse = require('csv-parse'),
                tasks = [],
                taskName, mustAdd;

            var parser = parse(content, { delimiter: ',' }, function(err, data){
                if (err) {
                    return console.log(err);
                }

                data.forEach(function(item, index, array) {
                    if (item[0] == 'TaskName') {
                        return;
                    }

                    taskName = item[0] ? item[0].substring(1) : ('Unknown' + index);

                    mustAdd = ! tasks.find(function (item) { //Task scheduler duplicates jobs in case of multiple triggers
                            return item.name == taskName
                        }) 
                        && (!me.options.skipSystemTasks || item[0].substring(0, 10) != '\\Microsoft');

                    if (mustAdd) {
                        tasks.push({
                            name: taskName,
                            nextRun: me.formatDate(item[1]),
                            status: item[2],
                            hostName: me.options.name
                        });
                    }
                });

                var scopeProvisioner = function(taskInfo, cb) {
                    me.getAdditionalInfo(me, taskInfo, cb);
                };

                async.map(tasks, scopeProvisioner, function(err, result) {
                    callback(err, tasks);
                });
            });
        });
    },

    startStop: function(action, taskName, callback) {
        var me = this,
            args = me.buildParameters({
                action: "/" + action,
                additionals: ['/tn', taskName]
            });

        me.exec("schtasks.exe", args, callback);    
    },

    start: function(taskName, callback) {
        this.startStop('run', taskName, callback);
    },

    stop: function(taskName, callback) {
        this.startStop('end', taskName, callback);
    }
};


module.exports =  {
    adapter: WinScheduler
};