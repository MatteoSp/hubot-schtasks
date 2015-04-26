# hubot-schtasks

A hubot script that can list, start and stop task on different scheduling systems (currently MS Widows Task Scheduler and MS SQL Server Agent)

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

Configuration is based on config `module` (see http://github.com/lorenwest/node-config). An example: 
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
            "pwd": "password"
        }]
    }
}
```

## Mini roadmap
- Support for Linux cron
- Some task update facilities (enable/disable, change triggers, etc)
