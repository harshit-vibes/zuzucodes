# 7. Scheduling the Workflow#

In this step of the workflow, you will learn how to schedule your workflow so that it runs automatically at a set time/interval using the Schedule Trigger node. After this step, your workflow should look like this:
The workflow you've built so far executes only when you click onExecute Workflow. But Nathan needs it to run automatically every Monday morning. You can do this with theSchedule Trigger, which allows you to schedule workflows to run periodically at fixed dates, times, or intervals.
To achieve this, we'll remove the Manual Trigger node we started with and replace it with a Schedule Trigger node instead.

## Remove the Manual Trigger node#

First, let's remove the Manual Trigger node:
- Select the Manual Trigger node connected to your HTTP Request node.
- Select the trash can icon to delete.
This removes the Manual Trigger node and you'll see an "Add first step" option.

## Add the Schedule Trigger node#

- Open the nodes panel and search forSchedule Trigger.
- Select it when it appears in the search results.
In the Schedule Trigger node window, configure these parameters:
- Trigger Interval: SelectWeeks.
- Weeks Between Triggers: Enter1.
1
- Trigger on weekdays: SelectMonday(and removeSundayif added by default).
- Trigger at Hour: Select9am.
- Trigger at Minute: Enter0.
0
Your Schedule Trigger node should look like this:
Keep in mind
To ensure accurate scheduling with the Schedule Trigger node, be sure to set the correct timezone for yourn8n instanceor theworkflow's settings. The Schedule Trigger node will use the workflow's timezone if it's set; it will fall back to the n8n instance's timezone if it's not.

## Connect the Schedule Trigger node#

Return to the canvas and connect your Schedule Trigger node to the HTTP Request node by dragging the arrow from it to the HTTP Request node.
Your full workflow should look like this:

## What's next?#

You 👩‍🔧: That was it for the workflow! I've added and configured all necessary nodes. Now every time you click onExecute workflow, n8n will execute all the nodes: getting, filtering, calculating, and transferring the sales data.
Nathan 🙋: This is just what I needed! My workflow will run automatically every Monday morning, correct?
You 👩‍🔧: Not so fast. To do that, you need to publish your workflow. I'll do this in the next step and show you how to interpret the execution log.