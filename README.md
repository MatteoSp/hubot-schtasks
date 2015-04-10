# hubot-schtasks

A hubot script that can list, start and stop Windows scheduled tasks (works only on a Windows machine)

See [`src/schtasks.js`](src/schtasks.js) for full documentation.

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
user1>> hubot st run task_1
hubot>> task_1 started
```

```
user1>> hubot st end task_1
hubot>> task_1 stopped
```

## Configuration

`SCHTASKS_SKIP_SYS_TASKS`: set this to 0 if you don't want sys tasks to be listed, to 1 if you want to see them.
`SCHTASKS_HOST`, `SCHTASKS_USER` and `SCHTASKS_PWD`: (optionals) set these if the machine you need to manage isn't the one running Hubot.


## Mini roadmap

- Multiple host support
- Host (and maybe credentials) passed on messages
- Some task update facilities (enable/disable, change triggers, etc)
