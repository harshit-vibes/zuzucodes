# 5. Calculating Booked Orders#

In this step of the workflow you will learn how n8n structures data and how to add custom JavaScript code to perform calculations using the Code node. After this step, your workflow should look like this:
The next step in Nathan's workflow is to calculate two values from the booked orders:
- The total number of booked orders
- The total value of all booked orders
To calculate data and add more functionality to your workflows you can use the Code node, which lets you write custom JavaScript code.

## About the Code node#

Code node modes
The Code node has two operationalmodes, depending on how you want to process items:
- Run Once for All Itemsallows you to write code to process all input items at once, as a group.
- Run Once for Each Itemexecutes your code once for each input item.
Learn more about how to use theCode node.
In n8n, the data that's passed between nodes is an array of objects with the following JSON structure:
12345678910111213141516171819

```
[{"json":{// (1)!"apple":"beets","carrot":{"dill":1}},"binary":{// (2)!"apple-picture":{// (3)!"data":"....",// (4)!"mimeType":"image/png",// (5)!"fileExtension":"png",// (6)!"fileName":"example.png",// (7)!}}},...]
```


```
[{"json":{// (1)!"apple":"beets","carrot":{"dill":1}},"binary":{// (2)!"apple-picture":{// (3)!"data":"....",// (4)!"mimeType":"image/png",// (5)!"fileExtension":"png",// (6)!"fileName":"example.png",// (7)!}}},...]
```

- (required) n8n stores the actual data within a nestedjsonkey. This property is required, but can be set to anything from an empty object (like{}) to arrays and deeply nested data. The code node automatically wraps the data in ajsonobject and parent array ([]) if it's missing.
json
{}
json
[]
- (optional) Binary data of item. Most items in n8n don't contain binary data.
- (required) Arbitrary key name for the binary data.
- (required) Base64-encoded binary data.
- (optional) Should set if possible.
- (optional) Should set if possible.
- (optional) Should set if possible.
You can learn more about the expected format on then8n data structurepage.

## Configure the Code node#

Now let's see how to accomplish Nathan's task using the Code node.
In your workflow, add aCode nodeconnected to thefalsebranch of theIf node.
false
With the Code node window open, configure these parameters:
- Mode: SelectRun Once for All Items.
- Language: SelectJavaScript.Using Python in code nodesWhile we use JavaScript below, you can also use Python in the Code node. To learn more, refer to theCode nodedocumentation.
Language: SelectJavaScript.
Using Python in code nodes
While we use JavaScript below, you can also use Python in the Code node. To learn more, refer to theCode nodedocumentation.
- Copy the Code below and paste it into theCodebox to replace the existing code:123456789letitems=$input.all();lettotalBooked=items.length;letbookedSum=0;for(leti=0;i<items.length;i++){bookedSum=bookedSum+items[i].json.orderPrice;}return[{json:{totalBooked,bookedSum}}];
Copy the Code below and paste it into theCodebox to replace the existing code:
123456789

```
letitems=$input.all();lettotalBooked=items.length;letbookedSum=0;for(leti=0;i<items.length;i++){bookedSum=bookedSum+items[i].json.orderPrice;}return[{json:{totalBooked,bookedSum}}];
```


```
letitems=$input.all();lettotalBooked=items.length;letbookedSum=0;for(leti=0;i<items.length;i++){bookedSum=bookedSum+items[i].json.orderPrice;}return[{json:{totalBooked,bookedSum}}];
```

Notice the format in which we return the results of the calculation:
1
return[{json:{totalBooked,bookedSum}}]
return[{json:{totalBooked,bookedSum}}]
Data structure error
If you don't use the correct data structure, you will get an error message:Error: Always an Array of items has to be returned!

```
Error: Always an Array of items has to be returned!
```

Now selectExecute stepand you should see the following results:

## What's next?#

Nathan 🙋: Wow, the Code node is powerful! This means that if I have some basic JavaScript skills I can power up my workflows.
You 👩‍🔧: Yes! You can progress from no-code to low-code!
Nathan 🙋: Now, how do I send the calculations for the booked orders to my team's Discord channel?
You 👩‍🔧: There's an n8n node for that. I'll set it up in the next step.