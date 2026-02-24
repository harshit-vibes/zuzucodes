# 2. Inserting data into Airtable#

In this step of the workflow, you will learn how to insert the data received from the HTTP Request node into Airtable using theAirtable node.
Spreadsheet nodes
You can replace the Airtable node with another spreadsheet app/service. For example, n8n also has a node forGoogle Sheets.
After this step, your workflow should look like this:

## Configure your table#

If we're going to insert data into Airtable, we first need to set up a table there. To do this:
- Create an Airtable account.
- In your Airtable workspace add a new base from scratch and name it, for example,beginner course.Create an Airtable base
In your Airtable workspace add a new base from scratch and name it, for example,beginner course.
- In the beginner course base, by default, you have a table calledTable 1with four fields:Name,Notes,Assignee, andStatus.  These fields aren't relevant for us since they aren't in our "orders" data set. This brings us to the next point: the names of the fields in Airtable have to match the names of the columns in the node result. Prepare the table by doing the following:Rename the table fromTable 1toordersto make it easier to identify.Delete the 3 blank records created by default.Delete theNotes,Assignee, andStatusfields.Edit theNamefield (the primary field) to readorderID, with theNumberfield type.Add the rest of the fields, and their field types, using the table below as a reference:Field nameField typeorderIDNumbercustomerIDNumberemployeeNameSingle line textorderPriceNumberorderStatusSingle line text
In the beginner course base, by default, you have a table calledTable 1with four fields:Name,Notes,Assignee, andStatus.  These fields aren't relevant for us since they aren't in our "orders" data set. This brings us to the next point: the names of the fields in Airtable have to match the names of the columns in the node result. Prepare the table by doing the following:
Name
Notes
Assignee
Status
- Rename the table fromTable 1toordersto make it easier to identify.
- Delete the 3 blank records created by default.
- Delete theNotes,Assignee, andStatusfields.
Notes
Assignee
Status
- Edit theNamefield (the primary field) to readorderID, with theNumberfield type.
Name
orderID
- Add the rest of the fields, and their field types, using the table below as a reference:
orderID
customerID
employeeName
orderPrice
orderStatus
Now your table should look like this:
Now that the table is ready, let's return to the workflow in the n8n Editor UI.

## Add an Airtable node to the HTTP Request node#

Add an Airtable node connected to the HTTP Request node.
Remember
You can add a node connected to an existing node by selecting the+icon next to the existing node.
In the node panel:
- Search for Airtable.
- SelectCreate a recordfrom theRecord Actionssearch results.
This will add the Airtable node to your canvas and open the node details window.
In the Airtable node window, configure the following parameters:
- Credential to connect with:SelectCreate new credential.Keep the default optionConnect using: Access Tokenselected.Access token: Follow the instructions from theAirtable credentialpage to create your token. Use the recommended scopes and add access to your beginners course base. Save the credential and close the Credential window when you're finished.
- SelectCreate new credential.
- Keep the default optionConnect using: Access Tokenselected.
- Access token: Follow the instructions from theAirtable credentialpage to create your token. Use the recommended scopes and add access to your beginners course base. Save the credential and close the Credential window when you're finished.
- Resource: Record.
- Operation: Create. This operation will create new records in the table.
- Base: You can pick your base from a list (for example, beginner course).
- Table: orders.
- Mapping Column Mode: Map automatically. In this mode, the incoming data fields must have the same as the columns in Airtable.

## Test the Airtable node#

Once you've finished configuring the Airtable node, execute it by selectingExecute step. This might take a moment to process, but you can follow the progress by viewing the base in Airtable.
Your results should look like this:
All 30 data records will now appear in the orders table in Airtable:

## What's next?#

Nathan 🙋: Wow, this automation is already so useful! But this inserts all collected data from the HTTP Request node into Airtable. Remember that I actually need to insert only processing orders in the table and calculate the price of booked orders?
You 👩‍🔧: Sure, no problem. As a next step, I'll use a new node to filter the orders based on their status.