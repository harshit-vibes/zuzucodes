# Processing different data types#

In this chapter, you will learn how to process different types of data usingn8n core nodes.

## HTML and XML data#

You're most likely familiar with HTML and XML.
HTML vs. XML
HTML is a markup language used to describe the structure and semantics of a web page. XML looks similar to HTML, but the tag names are different, as they describe the kind of data they hold.
If you need to process HTML or XML data in your n8n workflows, use theHTML nodeor theXML node.
Use theHTML nodeto extract HTML content of a webpage by referencing CSS selectors. This is useful if you want to collect structured information from a website (web-scraping).

### HTML Exercise#

Let's get the title of the latest n8n blog post:
- Use theHTTP Request nodeto make a GET request to the URLhttps://blog.n8n.io/(this endpoint requires no authentication).
https://blog.n8n.io/
- Connect anHTML nodeand configure it to extract the title of the first blog post on the page.Hint: If you're not familiar with CSS selectors or reading HTML, the CSS selector.post .item-title  ashould help!
- Hint: If you're not familiar with CSS selectors or reading HTML, the CSS selector.post .item-title  ashould help!
.post .item-title  a
- Configure the HTTP Request node with the following parameters:Authentication: NoneRequest Method: GETURL: https://blog.n8n.io/
The result should look like this:
- Authentication: None
- Request Method: GET
- URL: https://blog.n8n.io/
The result should look like this:
- Connect anHTML nodeto theHTTP Request nodeand configure the former's parameters:Operation: Extract HTML ContentSource Data: JSONJSON Property: dataExtraction Values:Key: titleCSS Selector:.post .item-title  aReturn Value: HTML
- Operation: Extract HTML Content
- Source Data: JSON
- JSON Property: data
- Extraction Values:Key: titleCSS Selector:.post .item-title  aReturn Value: HTML
- Key: title
- CSS Selector:.post .item-title  a
.post .item-title  a
- Return Value: HTML
You can add more values to extract more data.
The result should look like this:
Use theXML nodeto convert XML to JSON and JSON to XML. This operation is useful if you work with different web services that use either XML or JSON and need to get and submit data between them in the two formats.

### XML Exercise#

In thefinal exercise of Chapter 1, you used anHTTP Request nodeto make a request to the PokéAPI. In this exercise, we'll return to that same API but we'll convert the output to XML:
- Add anHTTP Request nodethat makes the same request to the PokéAPI athttps://pokeapi.co/api/v2/pokemon.
https://pokeapi.co/api/v2/pokemon
- Use the XML node to convert the JSON output to XML.
- To get the pokemon from the PokéAPI, execute theHTTP Request nodewith the following parameters:Authentication: NoneRequest Method: GETURL: https://pokeapi.co/api/v2/pokemon
- Authentication: None
- Request Method: GET
- URL: https://pokeapi.co/api/v2/pokemon
- Connect anXML nodeto it with the following parameters:Mode: JSON to XMLProperty name: data
- Mode: JSON to XML
- Property name: data
The result should look like this:
To transform data the other way around, select the modeXML to JSON.

## Date, time, and interval data#

Date and time data types includeDATE,TIME,DATETIME,TIMESTAMP, andYEAR. The dates and times can be passed in different formats, for example:
DATE
TIME
DATETIME
TIMESTAMP
YEAR
- DATE: March 29 2022, 29-03-2022, 2022/03/29
DATE
- TIME: 08:30:00, 8:30, 20:30
TIME
- DATETIME: 2022/03/29 08:30:00
DATETIME
- TIMESTAMP: 1616108400 (Unix timestamp), 1616108400000 (Unix ms timestamp)
TIMESTAMP
- YEAR: 2022, 22
YEAR
There are a few ways you can work with dates and times:
- Use theDate & Time nodeto convert date and time data to different formats and calculate dates.
- UseSchedule Trigger nodeto schedule workflows to run at a specific time, interval, or duration.
Sometimes, you might need to pause the workflow execution. This might be necessary if you know that a service doesn't process the data instantly or it's slow to return all the results. In these cases, you don't want n8n to pass incomplete data to the next node.
If you run into situations like this, use theWait nodeafter the node that you want to delay. TheWait nodepauses the workflow execution and will resume execution:
- At a specific time.
- After a specified time interval.
- On a webhook call.

### Date Exercise#

Build a workflow that adds five days to an input date from the Customer Datastore node that you used before. Then, if the calculated date occurred after 1959, the workflow waits 1 minute beforesettingthe calculated date as a value. The workflow should be triggered every 30 minutes.
To begin:
- Add theCustomer Datastore (n8n training) nodewith theGet All Peopleaction selected. Return All.
- Add theDate & Time nodeto Round Up the created Date from the datastore to End of Month. Output this to field new-date. Include all input fields.
- Add theIf nodeto check if that new rounded date is after1960-01-01 00:00:00.
1960-01-01 00:00:00
- Add theWait nodeto the True output of that node and set it to wait for one minute.
- Add theEdit Fields (Set) nodeto set a new field called outputValue to a String containing new-date. Include all input fields.
- Add theSchedule Trigger nodeat the beginning of the workflow to trigger it every 30 minutes. (You can keep theManual Trigger nodefor testing!)
- Add theCustomer Datastore (n8n training) nodewith theGet All Peopleaction selected.Select the option toReturn All.
- Select the option toReturn All.
- Add aDate & Time nodeconnected to the Customer Datastore node. Select the option toRound a Date.Add thecreateddate as theDateto round.SelectRound Upas theModeandEnd of Monthas theTo.Set theOutput Field Nameasnew-date.InOptions, selectAdd Optionand use the control toInclude Input Fields
- Add thecreateddate as theDateto round.
created
- SelectRound Upas theModeandEnd of Monthas theTo.
Round Up
End of Month
- Set theOutput Field Nameasnew-date.
new-date
- InOptions, selectAdd Optionand use the control toInclude Input Fields
- Add anIf nodeconnected to theDate & Time node.Add the new-date field as the first part of the condition.Set the comparison toDate &Time > is afterAdd1960-01-01 00:00:00as the second part of the expression. (This should produce 3 items in the True Branch and 2 items in the False Branch)
- Add the new-date field as the first part of the condition.
- Set the comparison toDate &Time > is after
- Add1960-01-01 00:00:00as the second part of the expression. (This should produce 3 items in the True Branch and 2 items in the False Branch)
1960-01-01 00:00:00
- Add aWait nodeto the True output of theIf node.SetResumetoAfter Time interval.SetWait Amountto1.00.SetWait UnittoMinutes.
- SetResumetoAfter Time interval.
After Time interval
- SetWait Amountto1.00.
1.00
- SetWait UnittoMinutes.
Minutes
- Add anEdit Fields (Set) nodeto theWait node.Use either JSON or Manual MappingMode.Set a new field calledoutputValueto be the value of the new-date field.Select the option toInclude Other Input Fieldsand includeAllfields.
- Use either JSON or Manual MappingMode.
- Set a new field calledoutputValueto be the value of the new-date field.
outputValue
- Select the option toInclude Other Input Fieldsand includeAllfields.
- Add aSchedule Trigger nodeat the beginning of the workflow.Set theTrigger Intervalto useMinutes.Set theMinutes Between Triggersto 30.To test your schedule, be sure to publish the workflow.Be sure to connect this node to theCustomer Datastore (n8n training) nodeyou began with!
- Set theTrigger Intervalto useMinutes.
Minutes
- Set theMinutes Between Triggersto 30.
- To test your schedule, be sure to publish the workflow.
- Be sure to connect this node to theCustomer Datastore (n8n training) nodeyou began with!
The workflow should look like this:
To check the configuration of each node, you can copy the JSON code of this workflow and either paste it into the Editor UI or save it as a file and import from file into a new workflow. SeeExport and import workflowsfor more information.

```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899100101102103104105106107108109110111112113114115116117118119120121122123124125126127128129130131132133134135136137138139140141142143144145146147148149150151152153154155156157158159160161162163164165166167168169170171172173174175176177178179180181182183184185186187188189190191192193194195196197198199200201202203204205206207208209
```


```
{"name":"Course 2, Ch 2, Date exercise","nodes":[{"parameters":{},"id":"6bf64d5c-4b00-43cf-8439-3cbf5e5f203b","name":"When clicking \"Execute workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[620,280]},{"parameters":{"operation":"getAllPeople","returnAll":true},"id":"a08a8157-99ee-4d50-8fe4-b6d7e16e858e","name":"Customer Datastore (n8n training)","type":"n8n-nodes-base.n8nTrainingCustomerDatastore","typeVersion":1,"position":[840,360]},{"parameters":{"operation":"roundDate","date":"={{ $json.created }}","mode":"roundUp","outputFieldName":"new-date","options":{"includeInputFields":true}},"id":"f66a4356-2584-44b6-a4e9-1e3b5de53e71","name":"Date & Time","type":"n8n-nodes-base.dateTime","typeVersion":2,"position":[1080,360]},{"parameters":{"conditions":{"options":{"caseSensitive":true,"leftValue":"","typeValidation":"strict"},"conditions":[{"id":"7c82823a-e603-4166-8866-493f643ba354","leftValue":"={{ $json['new-date'] }}","rightValue":"1960-01-01T00:00:00","operator":{"type":"dateTime","operation":"after"}}],"combinator":"and"},"options":{}},"id":"cea39877-6183-4ea0-9400-e80523636912","name":"If","type":"n8n-nodes-base.if","typeVersion":2,"position":[1280,360]},{"parameters":{"amount":1,"unit":"minutes"},"id":"5aa860b7-c73c-4df0-ad63-215850166f13","name":"Wait","type":"n8n-nodes-base.wait","typeVersion":1.1,"position":[1480,260],"webhookId":"be78732e-787d-463e-9210-2c7e8239761e"},{"parameters":{"assignments":{"assignments":[{"id":"e058832a-2461-4c6d-b584-043ecc036427","name":"outputValue","value":"={{ $json['new-date'] }}","type":"string"}]},"includeOtherFields":true,"options":{}},"id":"be034e9e-3cf1-4264-9d15-b6760ce28f91","name":"Edit Fields","type":"n8n-nodes-base.set","typeVersion":3.3,"position":[1700,260]},{"parameters":{"rule":{"interval":[{"field":"minutes","minutesInterval":30}]}},"id":"6e8e4308-d0e0-4d0d-bc29-5131b57cf061","name":"Schedule Trigger","type":"n8n-nodes-base.scheduleTrigger","typeVersion":1.1,"position":[620,480]}],"pinData":{},"connections":{"When clicking \"Execute workflow\"":{"main":[[{"node":"Customer Datastore (n8n training)","type":"main","index":0}]]},"Customer Datastore (n8n training)":{"main":[[{"node":"Date & Time","type":"main","index":0}]]},"Date & Time":{"main":[[{"node":"If","type":"main","index":0}]]},"If":{"main":[[{"node":"Wait","type":"main","index":0}]]},"Wait":{"main":[[{"node":"Edit Fields","type":"main","index":0}]]},"Schedule Trigger":{"main":[[{"node":"Customer Datastore (n8n training)","type":"main","index":0}]]}}}
```


```
{"name":"Course 2, Ch 2, Date exercise","nodes":[{"parameters":{},"id":"6bf64d5c-4b00-43cf-8439-3cbf5e5f203b","name":"When clicking \"Execute workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[620,280]},{"parameters":{"operation":"getAllPeople","returnAll":true},"id":"a08a8157-99ee-4d50-8fe4-b6d7e16e858e","name":"Customer Datastore (n8n training)","type":"n8n-nodes-base.n8nTrainingCustomerDatastore","typeVersion":1,"position":[840,360]},{"parameters":{"operation":"roundDate","date":"={{ $json.created }}","mode":"roundUp","outputFieldName":"new-date","options":{"includeInputFields":true}},"id":"f66a4356-2584-44b6-a4e9-1e3b5de53e71","name":"Date & Time","type":"n8n-nodes-base.dateTime","typeVersion":2,"position":[1080,360]},{"parameters":{"conditions":{"options":{"caseSensitive":true,"leftValue":"","typeValidation":"strict"},"conditions":[{"id":"7c82823a-e603-4166-8866-493f643ba354","leftValue":"={{ $json['new-date'] }}","rightValue":"1960-01-01T00:00:00","operator":{"type":"dateTime","operation":"after"}}],"combinator":"and"},"options":{}},"id":"cea39877-6183-4ea0-9400-e80523636912","name":"If","type":"n8n-nodes-base.if","typeVersion":2,"position":[1280,360]},{"parameters":{"amount":1,"unit":"minutes"},"id":"5aa860b7-c73c-4df0-ad63-215850166f13","name":"Wait","type":"n8n-nodes-base.wait","typeVersion":1.1,"position":[1480,260],"webhookId":"be78732e-787d-463e-9210-2c7e8239761e"},{"parameters":{"assignments":{"assignments":[{"id":"e058832a-2461-4c6d-b584-043ecc036427","name":"outputValue","value":"={{ $json['new-date'] }}","type":"string"}]},"includeOtherFields":true,"options":{}},"id":"be034e9e-3cf1-4264-9d15-b6760ce28f91","name":"Edit Fields","type":"n8n-nodes-base.set","typeVersion":3.3,"position":[1700,260]},{"parameters":{"rule":{"interval":[{"field":"minutes","minutesInterval":30}]}},"id":"6e8e4308-d0e0-4d0d-bc29-5131b57cf061","name":"Schedule Trigger","type":"n8n-nodes-base.scheduleTrigger","typeVersion":1.1,"position":[620,480]}],"pinData":{},"connections":{"When clicking \"Execute workflow\"":{"main":[[{"node":"Customer Datastore (n8n training)","type":"main","index":0}]]},"Customer Datastore (n8n training)":{"main":[[{"node":"Date & Time","type":"main","index":0}]]},"Date & Time":{"main":[[{"node":"If","type":"main","index":0}]]},"If":{"main":[[{"node":"Wait","type":"main","index":0}]]},"Wait":{"main":[[{"node":"Edit Fields","type":"main","index":0}]]},"Schedule Trigger":{"main":[[{"node":"Customer Datastore (n8n training)","type":"main","index":0}]]}}}
```


## Binary data#

Up to now, you have mainly worked with text data. But what if you want to process data that's not text, like images or PDF files? These types of files are represented in the binary numeral system, so they're considered binary data. In this form, binary data doesn't offer you useful information, so you'll need to convert it into a readable form.
In n8n, you can process binary data with the following nodes:
- HTTP Requestto request and send files from/to web resources and APIs.
- Read/Write Files from Diskto read and write files from/to the machine where n8n is running.
- Convert to Fileto take input data and output it as a file.
- Extract From Fileto get data from a binary format and convert it to JSON.
Reading and writing files is only available on self-hosted n8n
Reading and writing files to disk isn't available on n8n Cloud. You'll read and write to the machine where you installed n8n. If you run n8n in Docker, your command runs in the n8n container and not the Docker host. The Read/Write Files From Disk node looks for files relative to the n8n install path. n8n recommends using absolute file paths to prevent any errors.
To read or write a binary file, you need to write the path (location) of the file in the node'sFile(s) Selectorparameter (for the Read operation) or in the node'sFile Path and Nameparameter (for the Write operation).
File(s) Selector
File Path and Name
Naming the right path
The file path looks slightly different depending on how you are running n8n:
- npm:~/my_file.json
~/my_file.json
- n8n cloud / Docker:/tmp/my_file.json
/tmp/my_file.json

### Binary Exercise 1#

For our first binary exercise, let's convert a PDF file to JSON:
- Make an HTTP request to get this PDF file:https://media.kaspersky.com/pdf/Kaspersky_Lab_Whitepaper_Anti_blocker.pdf.

```
https://media.kaspersky.com/pdf/Kaspersky_Lab_Whitepaper_Anti_blocker.pdf.
```

- Use theExtract From File nodeto convert the file from binary to JSON.
In theHTTP Request node, you should see the PDF file, like this:
When you convert the PDF from binary to JSON using theExtract From File node, the result should look like this:
To check the configuration of the nodes, you can copy the JSON workflow code below and paste it into your Editor UI:

```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869
```


```
{"name":"Binary to JSON","nodes":[{"parameters":{},"id":"78639a25-b69a-4b9c-84e0-69e045bed1a3","name":"When clicking \"Execute Workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[480,520]},{"parameters":{"url":"https://media.kaspersky.com/pdf/Kaspersky_Lab_Whitepaper_Anti_blocker.pdf","options":{}},"id":"a11310df-1287-4e9a-b993-baa6bd4265a6","name":"HTTP Request","type":"n8n-nodes-base.httpRequest","typeVersion":4.1,"position":[700,520]},{"parameters":{"operation":"pdf","options":{}},"id":"88697b6b-fb02-4c3d-a715-750d60413e9f","name":"Extract From File","type":"n8n-nodes-base.extractFromFile","typeVersion":1,"position":[920,520]}],"pinData":{},"connections":{"When clicking \"Execute Workflow\"":{"main":[[{"node":"HTTP Request","type":"main","index":0}]]},"HTTP Request":{"main":[[{"node":"Extract From File","type":"main","index":0}]]}}}
```


```
{"name":"Binary to JSON","nodes":[{"parameters":{},"id":"78639a25-b69a-4b9c-84e0-69e045bed1a3","name":"When clicking \"Execute Workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[480,520]},{"parameters":{"url":"https://media.kaspersky.com/pdf/Kaspersky_Lab_Whitepaper_Anti_blocker.pdf","options":{}},"id":"a11310df-1287-4e9a-b993-baa6bd4265a6","name":"HTTP Request","type":"n8n-nodes-base.httpRequest","typeVersion":4.1,"position":[700,520]},{"parameters":{"operation":"pdf","options":{}},"id":"88697b6b-fb02-4c3d-a715-750d60413e9f","name":"Extract From File","type":"n8n-nodes-base.extractFromFile","typeVersion":1,"position":[920,520]}],"pinData":{},"connections":{"When clicking \"Execute Workflow\"":{"main":[[{"node":"HTTP Request","type":"main","index":0}]]},"HTTP Request":{"main":[[{"node":"Extract From File","type":"main","index":0}]]}}}
```


### Binary Exercise 2#

For our second binary exercise, let's convert some JSON data to binary:
- Make an HTTP request to the Poetry DB APIhttps://poetrydb.org/random/1.
https://poetrydb.org/random/1
- Convert the returned data from JSON to binary using theConvert to File node.
- Write the new binary file data to the machine where n8n is running using theRead/Write Files From Disk node.
- To check that it worked out, use theRead/Write Files From Disk nodeto read the generated binary file.
The workflow for this exercise looks like this:
To check the configuration of the nodes, you can copy the JSON workflow code below and paste it into your Editor UI:

```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899100101102103104105106107108109110111112113114115116117118119120
```


```
{"name":"JSON to file and Read-Write","nodes":[{"parameters":{},"id":"78639a25-b69a-4b9c-84e0-69e045bed1a3","name":"When clicking \"Execute Workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[480,520]},{"parameters":{"url":"https://poetrydb.org/random/1","options":{}},"id":"a11310df-1287-4e9a-b993-baa6bd4265a6","name":"HTTP Request","type":"n8n-nodes-base.httpRequest","typeVersion":4.1,"position":[680,520]},{"parameters":{"operation":"toJson","options":{}},"id":"06be18f6-f193-48e2-a8d9-35f4779d8324","name":"Convert to File","type":"n8n-nodes-base.convertToFile","typeVersion":1,"position":[880,520]},{"parameters":{"operation":"write","fileName":"/tmp/poetrydb.json","options":{}},"id":"f2048e5d-fa8f-4708-b15a-d07de359f2e5","name":"Read/Write Files from Disk","type":"n8n-nodes-base.readWriteFile","typeVersion":1,"position":[1080,520]},{"parameters":{"fileSelector":"={{ $json.fileName }}","options":{}},"id":"d630906c-09d4-49f4-ba14-416c0f4de1c8","name":"Read/Write Files from Disk1","type":"n8n-nodes-base.readWriteFile","typeVersion":1,"position":[1280,520]}],"pinData":{},"connections":{"When clicking \"Execute Workflow\"":{"main":[[{"node":"HTTP Request","type":"main","index":0}]]},"HTTP Request":{"main":[[{"node":"Convert to File","type":"main","index":0}]]},"Convert to File":{"main":[[{"node":"Read/Write Files from Disk","type":"main","index":0}]]},"Read/Write Files from Disk":{"main":[[{"node":"Read/Write Files from Disk1","type":"main","index":0}]]}}}
```


```
{"name":"JSON to file and Read-Write","nodes":[{"parameters":{},"id":"78639a25-b69a-4b9c-84e0-69e045bed1a3","name":"When clicking \"Execute Workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[480,520]},{"parameters":{"url":"https://poetrydb.org/random/1","options":{}},"id":"a11310df-1287-4e9a-b993-baa6bd4265a6","name":"HTTP Request","type":"n8n-nodes-base.httpRequest","typeVersion":4.1,"position":[680,520]},{"parameters":{"operation":"toJson","options":{}},"id":"06be18f6-f193-48e2-a8d9-35f4779d8324","name":"Convert to File","type":"n8n-nodes-base.convertToFile","typeVersion":1,"position":[880,520]},{"parameters":{"operation":"write","fileName":"/tmp/poetrydb.json","options":{}},"id":"f2048e5d-fa8f-4708-b15a-d07de359f2e5","name":"Read/Write Files from Disk","type":"n8n-nodes-base.readWriteFile","typeVersion":1,"position":[1080,520]},{"parameters":{"fileSelector":"={{ $json.fileName }}","options":{}},"id":"d630906c-09d4-49f4-ba14-416c0f4de1c8","name":"Read/Write Files from Disk1","type":"n8n-nodes-base.readWriteFile","typeVersion":1,"position":[1280,520]}],"pinData":{},"connections":{"When clicking \"Execute Workflow\"":{"main":[[{"node":"HTTP Request","type":"main","index":0}]]},"HTTP Request":{"main":[[{"node":"Convert to File","type":"main","index":0}]]},"Convert to File":{"main":[[{"node":"Read/Write Files from Disk","type":"main","index":0}]]},"Read/Write Files from Disk":{"main":[[{"node":"Read/Write Files from Disk1","type":"main","index":0}]]}}}
```
