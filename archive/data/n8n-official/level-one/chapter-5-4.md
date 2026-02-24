# 4. Setting Values for Processing Orders#

In this step of the workflow, you will learn how to select and set data before transferring it to Airtable using the Edit Fields (Set) node. After this step, your workflow should look like this:
The next step in Nathan's workflow is to filter the data to only insert theemployeeNameandorderIDof allprocessingorders into Airtable.
employeeName
orderID
processing
For this, you need to use theEdit Fields (Set) node, which allows you to select and set the data you want to transfer from one node to another.
Edit Fields node
The Edit Fields node can set completely new data as well as overwrite data that already exists. This node is crucial in workflows which expect incoming data from previous nodes, such as when inserting values into spreadsheets or databases.

## Add another node before the Airtable node#

In your workflow, add another node before theAirtable nodefrom theIf nodein the same way we did it in theFiltering Orderslesson on the If node'strueconnector. Feel free to drag the Airtable node further away if your canvas feels crowded.
true

## Configure the Edit Fields node#

Now search for theEdit Fields (Set) nodeafter you've selected the+sign coming off the If node'strueconnector.
true
With the Edit Fields node window open, configure these parameters:
- EnsureModeis set toManual Mapping.
- While you can use theExpression editorwe used in theFiltering Orderslesson, this time, let's drag the fields from theInputinto theFields to Set:DragIf>orderIDas the first field.DragIf>employeeNameas the second field.
- DragIf>orderIDas the first field.
- DragIf>employeeNameas the second field.
- Ensure thatInclude Other Input Fieldsis set to false.
SelectExecute step. You should see the following results:

## Add data to Airtable#

Next, let's insert these values into Airtable:
- Go to your Airtable base.
- Add a new table calledprocessingOrders.
processingOrders
- Replace the existing columns with two new columns:orderID(primary field): NumberemployeeName: Single line textReminderIf you get stuck, refer to theInserting data into Airtablelesson.
Replace the existing columns with two new columns:
- orderID(primary field): Number
orderID
- employeeName: Single line text
employeeName
Reminder
If you get stuck, refer to theInserting data into Airtablelesson.
- Delete the three empty rows in the new table.
Delete the three empty rows in the new table.
- In n8n, connect the Edit Fields nodeconnector to theAirtable node**.
- Update the Airtable node configuration to point to the newprocessingOrderstable instead of theorderstable.
processingOrders
orders
- Test your Airtable node to be sure it inserts records into the newprocessingOrderstable.
processingOrders
At this stage, your workflow should now look like this:

## What's next?#

Nathan 🙋: You've already automated half of my work! Now I still need to calculate the booked orders for my colleagues. Can we automate that as well?
You 👩‍🔧: Yes! In the next step, I'll use some JavaScript code in a node to calculate the booked orders.