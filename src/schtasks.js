// Description:
//   Lists, starts and stops Windows scheduled tasks.
//
// Dependencies:
//   None
//
// Configuration:
//   SCHTASKS_SKIP_SYS_TASKS, SCHTASKS_HOST, SCHTASKS_USER, SCHTASKS_PWD
//
// Commands:
//   hubot st - Gets scheduled tasks info
//   hubot st run TASK_NAME - Runs the specified task
//   hubot st end TASK_NAME - Stops the specified task
//
// Author:
//   MatteoSp
module.exports = function(robot) {
    var fs = require('fs'),
        util =  require('util'),
        spawn = require("child_process").spawn,
        async = require('async');

    var run = function (cmd, args, cb) {
        var command = spawn(cmd, args),
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
    };


    var getAdditionalInfo = function(taskInfo, callback) {
        var args = buildParameters({ 
                action: "/query",
                additionals: [
                    '/v',
                    '/fo', 'list',
                    '/tn', taskInfo.name
                ]
            }),
            rows;

        run("schtasks.exe", args, function(err, content) {
            if (err) {
                callback(err);
                return;
            }

            rows = content.split('\r\n');

            taskInfo.lastRun = rows[7].replace(/Last Run Time\:/g, '').trim();
            taskInfo.lastResult = rows[8].replace(/Last Result\:/g, '').trim();
            taskInfo.actions = rows[10].replace(/Task To Run\:/g, '').trim();

            callback();
        });
    };


    var buildParameters = function(baseParams) {
        var args = [baseParams.action];

        if (baseParams.host || process.env.SCHTASKS_HOST) {
            args.push('/s');
            args.push(baseParams.host || process.env.SCHTASKS_HOST);
        }

        if (baseParams.user || process.env.SCHTASKS_USER) {
            args.push('/u');
            args.push(baseParams.user || process.env.SCHTASKS_USER);
        }

        if (baseParams.pwd || process.env.SCHTASKS_PWD) {
            args.push('/p');
            args.push(baseParams.pwd || process.env.SCHTASKS_PWD);
        }

        if (baseParams.additionals) {
            args.push.apply(args, baseParams.additionals); //add range
        }

        return args;
    };


    var sendTaskList = function(msg, tasks) {
        var output = '';

        tasks.forEach(function(taskInfo, index, array) {
            output = util.format(
                '%s %s (status: %s). Last run: %s (result: %s), next: %s.\r\n', 
                output, 
                taskInfo.name, 
                taskInfo.status,
                taskInfo.lastRun,
                taskInfo.lastResult,
                taskInfo.nextRun
            );
        });

        msg.reply(output);
    };

    robot.respond(/st$/i, function(msg) {
        var args = buildParameters({ 
            action:"/query",
            additionals: ['/fo', 'csv']
        });

        run("schtasks.exe", args, function(err, content) {
            var parse = require('csv-parse'),
                tasks = [];

            var parser = parse(content, { delimiter: ',' }, function(err, data){
                if (err) {
                    console.log(err);
                    return;
                }

                data.forEach(function(item, index, array) {
                    if (item[0] == 'TaskName') {
                        return;
                    }

                    if (!process.env.SCHTASKS_SKIP_SYS_TASKS || item[0].substring(0, 10) != '\\Microsoft') {
                        tasks.push({
                            name: item[0],
                            nextRun: item[1],
                            status: item[2]
                        });
                    }
                });

                async.map(tasks, getAdditionalInfo, function(err, result) {
                    sendTaskList(msg, tasks);
                });
            });
        });
    });

    robot.respond(/st (run|end) (.+)/i, function(msg) {
        var args = buildParameters({
            action: "/" + msg.match[1],
            additionals: ['/tn', msg.match[2]]
        });

        run("schtasks.exe", args, function(err, content) {
            if (err) {
                msg.reply("ERROR: " + err.toString());
            } else {
                msg.reply(util.format("Task '%s' %s", msg.match[1], args.action == '/run' ? 'started' : 'stopped'));
            }
        });
    });
}