# 6. Notifying the Team#

In this step of the workflow, you will learn how to send messages to a Discord channel using theDiscord node. After this step, your workflow should look like this:
Now that you have a calculated summary of the booked orders, you need to notify Nathan's team in their Discord channel. For this workflow, you will send messages to then8n serveron Discord.
Before you begin the steps below, use the link above to connect to the n8n server on Discord. Be sure you can access the#course-level-1channel.
#course-level-1
Communication app nodes
You can replace the Discord node with another communication app. For example, n8n also has nodes forSlackandMattermost.
In your workflow, add a Discord node connected to the Code node.
When you search for the Discord node, look forMessage Actionsand selectSend a messageto add the node.
In the Discord node window, configure these parameters:
- Connection Type: SelectWebhook.
- Credential for Discord Webhook: Select- Create New Credential -.Copy theWebhook URLfrom the email you received when you signed up for this course and paste it into theWebhook URLfield of the credentials.SelectSaveand then close the credentials dialog.
- Copy theWebhook URLfrom the email you received when you signed up for this course and paste it into theWebhook URLfield of the credentials.
- SelectSaveand then close the credentials dialog.
- Operation: SelectSend a Message.
- Message:Select theExpressiontab on the right side of the Message field.Copy the text below and paste it into theExpressionwindow, or construct it manually using theExpression Editor.1This week we've {{$json["totalBooked"]}} booked orders with a total value of {{$json["bookedSum"]}}. My Unique ID: {{ $('HTTP Request').params["headerParameters"]["parameters"][0]["value"] }}
- Select theExpressiontab on the right side of the Message field.
- Copy the text below and paste it into theExpressionwindow, or construct it manually using theExpression Editor.1This week we've {{$json["totalBooked"]}} booked orders with a total value of {{$json["bookedSum"]}}. My Unique ID: {{ $('HTTP Request').params["headerParameters"]["parameters"][0]["value"] }}
1

```
This week we've {{$json["totalBooked"]}} booked orders with a total value of {{$json["bookedSum"]}}. My Unique ID: {{ $('HTTP Request').params["headerParameters"]["parameters"][0]["value"] }}
```


```
This week we've {{$json["totalBooked"]}} booked orders with a total value of {{$json["bookedSum"]}}. My Unique ID: {{ $('HTTP Request').params["headerParameters"]["parameters"][0]["value"] }}
```

Now selectExecute stepin the Discord node. If all works well, you should see this output in n8n:
And your message should appear in the Discord channel #course-level-1:

## What's next?#

Nathan 🙋: Incredible, you've saved me hours of tedious work already! Now I can execute this workflow when I need it. I just need to remember to run it every Monday morning at 9 AM.
You 👩‍🔧: Don't worry about that, you can actually schedule the workflow to run on a specific day, time, or interval. I'll set this up in the next step.