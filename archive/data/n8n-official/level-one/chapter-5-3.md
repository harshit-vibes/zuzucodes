# 3. Filtering Orders#

In this step of the workflow, you will learn how to filter data using conditional logic and how to use expressions in nodes using theIf node.
After this step, your workflow should look like this:
To insert only processing orders into Airtable we need to filter our data byorderStatus. Basically, we want to tell the program thatiftheorderStatusis processing,theninsert all records with this status into Airtable;else, for example, if theorderStatusisn'tprocessing, calculate the sum of all orders with the otherorderStatus(booked).
orderStatus
orderStatus
orderStatus
orderStatus
booked
This if-then-else command is conditional logic. In n8n workflows, you can add conditional logic with theIf node, which splits a workflow conditionally based on comparison operations.
If vs. Switch
If you need to filter data on more than boolean values (true and false), use theSwitch node. The Switch node is similar to the If node, but supports multiple output connectors.

## Add If node before the Airtable node#

First, let's add an If node between the connection from the HTTP Request node to the Airtable node:
- Hover over the arrow connection theHTTP Requestnode and theAirtablenode.
- Select the+sign between the HTTP Request node and the Airtable node.

## Configure the If node#

Selecting the plus removes the connection to the Airtable node to the HTTP request. Now, let's add an If node connected to the HTTP Request node:
- Search for the If node.
- Select it when it appears in the search.
For the If node, we'll use an expression.
Expressions
Anexpressionis a string of characters and symbols in a programming language that can be evaluated to get a value, often according to its input. In n8n workflows, you can use expressions in a node to refer to another node for input data. In our example, the If node references the data output by the HTTP Request node.
In the If node window, configure the parameters:
- Set thevalue1placeholder to{{ $json.orderStatus }}with the following steps:Hover over the value1 field.Select theExpressiontab on the right side of thevalue1field.Next, open the expression editor by selecting the link icon:Opening the Expression EditorUse the left-side panel to selectHTTP Request>orderStatusand drag it into theExpressionfield in the center of the window.Expression Editor in the If nodeOnce you add the expression, close theEdit Expressiondialog.
Set thevalue1placeholder to{{ $json.orderStatus }}with the following steps:
value1
{{ $json.orderStatus }}
- Hover over the value1 field.
- Select theExpressiontab on the right side of thevalue1field.
value1
- Next, open the expression editor by selecting the link icon:Opening the Expression Editor
- Use the left-side panel to selectHTTP Request>orderStatusand drag it into theExpressionfield in the center of the window.Expression Editor in the If node
- Once you add the expression, close theEdit Expressiondialog.
- Operation: SelectString>is equal to
Operation: SelectString>is equal to
- Set thevalue2placeholder toprocessing.
value2
processing
Data Type
Make sure to select the correct data type (boolean, date & time, number, or string) when you select theOperation.
SelectExecute stepto test the If node.
Your results should look like this:
Note that the orders with aprocessingorder status should show for theTrue Branchoutput, while the orders with abookedorder status should show in theFalse Branchoutput.
processing
booked
Close the If node detail view when you're finished.

## Insert data into Airtable#

Next, we want to insert this data into Airtable. Remember what Nathan said at the end of theInserting data into Airtablelesson?
I actually need to insert only processing orders in the table...
Since Nathan only needs theprocessingorders in the table, we'll connect the Airtable node to the If node'strueconnector.
processing
true
In this case, since the Airtable node is already on our canvas, select theIf nodetrueconnector and drag it to the Airtable node.
true
It's a good idea at this point to retest the Airtable node. Before you do, open your table in Airtable and delete all existing rows. Then open the Airtable node window in n8n and selectExecute step.
Review your data in Airtable to be sure your workflow only added the correct orders (those withorderStatusofprocessing). There should be 14 records now instead of 30.
orderStatus
processing
At this stage, your workflow should look like this:

## What's next?#

Nathan 🙋: This If node is so useful for filtering data! Now I have all the information about processing orders. I actually only need theemployeeNameandorderID, but I guess I can keep all the other fields just in case.
employeeName
orderID
You 👩‍🔧: Actually, I wouldn't recommend doing that. Inserting more data requires more computational power, the data transfer is slower and takes longer, and takes up more storage resources in your table. In this particular case, 14 records with 5 fields might not seem like it'd make a significant difference, but if your business grows to thousands of records and dozens of fields, things add up and even one extra column can affect performance.
Nathan 🙋: Oh, that's good to know. Can you select only two fields from the processing orders?
You 👩‍🔧: Sure, I'll do that in the next step.