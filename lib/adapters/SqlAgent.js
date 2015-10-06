'use strict';

var tedious = require('tedious'),
    dbRequest = tedious.Request,
    Connection = tedious.Connection,
    TYPES = tedious.TYPES,
    util =  require('util'),
    moment = require('moment');

var query = [
    "SELECT J.name Name,",
    "       CAST(J.enabled AS BIT) IsEnabled,",
    "       CASE",
    "            WHEN JA.run_requested_date Is Not Null and JA.stop_execution_date Is Null THEN 'Running'",
    "            WHEN J.enabled = 1 THEN 'Ready'",
    "            ELSE 'Disabled'",
    "       END AS [Status],",
    "       JH.run_status AS LastResult,",
    "       COALESCE(JA.start_execution_date, msdb.dbo.agent_datetime(JH.run_date, JH.run_time)) AS LastRun,",
    "       JA.next_scheduled_run_date AS NextRun",
    "  FROM msdb.dbo.SysJobs J",
    " OUTER APPLY (SELECT TOP 1 *",
    "                FROM msdb.dbo.sysJobActivity JA",
    "               WHERE J.job_id = JA.job_id",
    "               ORDER BY JA.run_requested_date DESC) JA",
    "  LEFT JOIN msdb.dbo.SysJobHistory JH ",
    "    ON J.job_id = JH.job_id",
    "       AND JA.job_history_id = JH.instance_id",
    " ORDER BY J.name, LastRun"
].join('\r\n');


function SqlAgent(options) {
    this.options = options || {};

    this.connectionSettings = {
        userName: options.user,
        password: options.pwd,
        server: options.host,
        options: {
            database: 'master'
        }
    };

    if (options.instanceName) {
        this.connectionSettings.options.instanceName = options.instanceName;
    }
}

SqlAgent.prototype = {
    execute: function(cmd, onRow, onAllDone) {
        var me = this,
            connection = new Connection(me.connectionSettings),
            request, colsMap; 

        connection.on('connect', function(err) {
            if (err) {
                console.log("Can't connect:");
                return console.log(err);
            } 

            request = new dbRequest(cmd.text, function(err, rowCount) {
                if (err) {
                    console.log("Can't execute query:");
                    return console.log(err);
                }

                if (onAllDone) {
                    onAllDone();
                }
            });

            request.on('columnMetadata', function(columns) {               
                colsMap = {};

                columns.forEach(function(column, index) {
                    colsMap[column.colName] = index;
                });
            });

            request.on('row', function(columns) {               
                columns.val = function (colName) {
                    var index = colsMap[colName];

                    return this[index].value;
                };

                onRow(columns);
            });

            if (cmd.params) {
                cmd.params.forEach(function(p) {
                    request.addParameter(p.name, p.type, p.value);
                })
            }

            if (cmd.type == 'text') {
                connection.execSql(request);
            } else if (cmd.type == 'storedProc') {
                connection.callProcedure(request);
            }
        }); 
    },

    formatDate: function(d) {
        if (!d) {
            return '';
        }

        return moment(d).format('YYYY-MM-DD HH:mm');
    },

    list: function(callback) {
        var me = this,
            tasks = [], lastResult;

        me.execute({
                type: 'text', 
                text: query 
            }, 
            function(columns) {
                lastResult = columns.val('LastResult');

                tasks.push({
                    name: columns.val('Name'),
                    actions: '',
                    lastRun: me.formatDate(columns.val('LastRun')),
                    lastResult: !lastResult ? null : (lastResult == 1 ? 'OK' : 'KO'),
                    nextRun: me.formatDate(columns.val('NextRun')),
                    status: columns.val('Status'),
                    hostName: me.options.name
                });
            }, function() {
                callback(null, tasks);
            }
        );
    },

    startStop: function(action, taskName, callback) {
        var me = this,
            cmd = {
                type: 'storedProc', 
                text: util.format('msdb.dbo.sp_%s_job', action),
                params: [{
                    name: 'job_name',
                    type: TYPES.NVarChar,
                    value: taskName
            }]};

        me.execute(cmd, null,  function() {
            callback(null, null);
        }); 
    },

    start: function(taskName, callback) {
        this.startStop('start', taskName, callback);
    },

    stop: function(taskName, callback) {
        this.startStop('stop', taskName, callback);
    }
};


module.exports =  {
    adapter: SqlAgent
};