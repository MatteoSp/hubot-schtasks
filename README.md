# hubot-schtasks

A hubot script that can list, start and stop task on different scheduling systems. Replies can be customized to fully integrate with your favourite chat, with Slack supported out-of-the-box.

## Installation

In hubot project repo, run:

`npm install hubot-schtasks --save`

Then add **hubot-schtasks** to your `external-scripts.json`:

```json
["hubot-schtasks"]
```

## Sample Interaction

```
user1>> hubot st
hubot>> 
task_1 (status: Ready). Last run: 10/04/2015 01:00:00 (result: 0), next: 11/04/2015 01:00:00.
task_2 (status: Running). Last run: 10/04/2015 14:00:00 (result: 0), next: 11/04/2015 01:30:00.
```

```
user1>> hubot st run task_1 on host_A
hubot>> task_1 started
```

```
user1>> hubot st end task_2 on host_B
hubot>> task_2 stopped
```

## Configuration

Configuration is based on `config` module (see http://github.com/lorenwest/node-config). An example: 
```
{
    "hubot_schtasks": {
        "skipSystemTasks": true,
        "hosts": [{
            "type": "WinScheduler",
            "name": "MyServer",
            "host": "myServer.myDomain.pri",
            "user": "username",
            "pwd": "password"
        }, {
            "type": "SqlAgent",
            "name": "MySqlServer",
            "host": "mySqlServer.myDomain.pri",
            "user": "username",
            "pwd": "password",
            "instanceName": "myInstance" /*optional*/
        }]
    }
}
```

## Responders

The script does not directly send replies. It relies on components - responders - that receive tasks data, compose responses and send them to the chat users or channels. Currently there are 2 out-of-the-box responders: one for Slack and one for the Shell. Other responders will come or - hopefully - contributed. 

Without specific configuration the script will choose the respoder by checking the adapter the robot is working on. To force one specific respoder you can specify it by:

```
{
    "hubot_schtasks": {
        "skipSystemTasks": true,
        "responder": {
            "type": "Shell"    
        },
        "hosts": [
            /* ... */
        ]
    }
}
```

Or you can use your custom responder, take a look at the following code. It's a customized version of the native Slack responder, in whick I specifiy my customer emoji to quickly recognize host types.

```
'use strict';

var util =  require('util'),
    baseModule =  require('hubot-schtasks/lib/responders/Slack');

function CustomSlackResponder(options) {
    this.options = options || {};

    this.base = new baseModule.responder(this.options);
}

CustomSlackResponder.prototype = {
    sendTaskList: function(msg, targets, tasks) {
        this.base.sendTaskList(msg, targets, tasks);
    },

    sendHostList: function(msg, hosts) {
        console.log(msg.robot.adapterName);

        var output = '',
            hostAddress, emojy;

        hosts.forEach(function(item, index, array) {
            hostAddress = item.host;

            if (item.instanceName) {
                hostAddress += '\\' + item.instanceName;
            }

            if (item.type == 'WinScheduler') {
                emojy = 'task_scheduler';
            } else if (item.type == 'SqlAgent') {
                emojy = 'sql_server';
            } else {
                emojy = 'question';
            }

            output += util.format('\r\n:%s: %s: %s @ %s.', emojy, item.name, item.type, hostAddress);
        });

        msg.reply(output);    
    },

    sendError: function(msg, err) {
        this.base.sendError(msg, err);
    },

    sendStartStop: function(msg, taskName, action) {
        this.base.sendStartStop(msg, taskName, action);
    }
};

module.exports =  {
    responder: CustomSlackResponder
};
```

To configure your custom responder put in a file within the `config` folder, then configure it by specifying the file name in the `type` attribute. So if you named your file `CustomSlack.js`:

```
{
    "hubot_schtasks": {
        "skipSystemTasks": true,
        "responder": {
            "type": "CustomSlack"    
        },
        "hosts": [
            /* ... */
        ]
    }
}
```

## Mini roadmap
- Support for Linux cron
- Some task update facilities (enable/disable, change triggers, etc)
