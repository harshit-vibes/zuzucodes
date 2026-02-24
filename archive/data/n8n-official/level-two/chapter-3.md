# Merging and splitting data#

In this chapter, you will learn how to merge and split data, and in what cases it might be useful to perform these operations.

## Merging data#

In some cases, you might need to merge (combine) and process data from different sources.
Merging data can involve:
- Creating one data set from multiple sources.
- Synchronizing data between multiple systems. This could include removing duplicate data or updating data in one system when it changes in another.
One-way vs. two-way sync
In a one-way sync, data is synchronized in one direction. One system serves as the single source of truth. When information changes in that main system, it automatically changes in the secondary system; but if information changes in the secondary system, the changes aren't reflected in the main system.
In a two-way sync, data is synchronized in both directions (between both systems). When information changes in either of the two systems, it automatically changes in the other one as well.
This blog tutorialexplains how to sync data one-way and two-way between two CRMs.
In n8n, you can merge data from two different nodes using theMerge node, which provides several merging options:
- Append
- CombineMerge by Fields: requires input fields to match onMerge by PositionCombine all possible combinations
- Merge by Fields: requires input fields to match on
- Merge by Position
- Combine all possible combinations
- Choose Branch
Notice that Combine > Merge by Fields requires you enter input fields to match on. These fields should contain identical values between the data sources so n8n can properly match data together. In theMerge node, they're calledInput 1 FieldandInput 2 Field.
Input 1 Field
Input 2 Field
Property Input in dot notation
If you want to reference nested values in theMerge nodeparametersInput 1 FieldandInput 2 Field, you need to enter the property key in dot-notation format (as text, not as an expression).
Input 1 Field
Input 2 Field
Note
You can also find theMerge nodeunder the alias Join. This might be more intuitive if you're familiar with SQL joins.

### Merge Exercise#

Build a workflow that merges data from the Customer Datastore node and Code node.
- Add aMerge nodethat takesInput 1from aCustomer Datastore nodeandInput 2from aCode node.
Input 1
Input 2
- In theCustomer Datastore node, run the operationGet All People.
- In theCode node, create an array of two objects with three properties:name,language, andcountry, where the propertycountryhas two sub-propertiescodeandname.Fill out the values of these properties with the information of two characters from the Customer Database.For example, Jay Gatsby's language is English and country name is United States.
name
language
country
country
code
name
- Fill out the values of these properties with the information of two characters from the Customer Database.
- For example, Jay Gatsby's language is English and country name is United States.
- In theMerge node, try out different merge options.
The workflow for this exercise looks like this:
If you merge data with the optionKeep Matchesusing the name as the input fields to match, the result should look like this (note this example only contains Jay Gatsby; yours might look different depending on which characters you selected):
To check the configuration of the nodes, you can copy the JSON workflow code below and paste it into your Editor UI:

```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899100101102103104105106107108
```


```
{"meta":{"templateCredsSetupCompleted":true,"instanceId":"cb484ba7b742928a2048bf8829668bed5b5ad9787579adea888f05980292a4a7"},"nodes":[{"parameters":{"mode":"combine","mergeByFields":{"values":[{"field1":"name","field2":"name"}]},"options":{}},"id":"578365f3-26dd-4fa6-9858-f0a5fdfc413b","name":"Merge","type":"n8n-nodes-base.merge","typeVersion":2.1,"position":[720,580]},{"parameters":{},"id":"71aa5aad-afdf-4f8a-bca0-34450eee8acc","name":"When clicking \"Execute workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[260,560]},{"parameters":{"operation":"getAllPeople"},"id":"497174fe-3cab-4160-8103-78b44efd038d","name":"Customer Datastore (n8n training)","type":"n8n-nodes-base.n8nTrainingCustomerDatastore","typeVersion":1,"position":[500,460]},{"parameters":{"jsCode":"return [\n  {\n    'name': 'Jay Gatsby',\n    'language': 'English',\n    'country': {\n      'code': 'US',\n      'name': 'United States'\n    }\n    \n  }\n  \n];"},"id":"387e8a1e-e796-4f05-8e75-7ce25c786c5f","name":"Code","type":"n8n-nodes-base.code","typeVersion":2,"position":[500,720]}],"connections":{"When clicking \"Execute workflow\"":{"main":[[{"node":"Customer Datastore (n8n training)","type":"main","index":0},{"node":"Code","type":"main","index":0}]]},"Customer Datastore (n8n training)":{"main":[[{"node":"Merge","type":"main","index":0}]]},"Code":{"main":[[{"node":"Merge","type":"main","index":1}]]}},"pinData":{}}
```


```
{"meta":{"templateCredsSetupCompleted":true,"instanceId":"cb484ba7b742928a2048bf8829668bed5b5ad9787579adea888f05980292a4a7"},"nodes":[{"parameters":{"mode":"combine","mergeByFields":{"values":[{"field1":"name","field2":"name"}]},"options":{}},"id":"578365f3-26dd-4fa6-9858-f0a5fdfc413b","name":"Merge","type":"n8n-nodes-base.merge","typeVersion":2.1,"position":[720,580]},{"parameters":{},"id":"71aa5aad-afdf-4f8a-bca0-34450eee8acc","name":"When clicking \"Execute workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[260,560]},{"parameters":{"operation":"getAllPeople"},"id":"497174fe-3cab-4160-8103-78b44efd038d","name":"Customer Datastore (n8n training)","type":"n8n-nodes-base.n8nTrainingCustomerDatastore","typeVersion":1,"position":[500,460]},{"parameters":{"jsCode":"return [\n  {\n    'name': 'Jay Gatsby',\n    'language': 'English',\n    'country': {\n      'code': 'US',\n      'name': 'United States'\n    }\n    \n  }\n  \n];"},"id":"387e8a1e-e796-4f05-8e75-7ce25c786c5f","name":"Code","type":"n8n-nodes-base.code","typeVersion":2,"position":[500,720]}],"connections":{"When clicking \"Execute workflow\"":{"main":[[{"node":"Customer Datastore (n8n training)","type":"main","index":0},{"node":"Code","type":"main","index":0}]]},"Customer Datastore (n8n training)":{"main":[[{"node":"Merge","type":"main","index":0}]]},"Code":{"main":[[{"node":"Merge","type":"main","index":1}]]}},"pinData":{}}
```


## Looping#

In some cases, you might need to perform the same operation on each element of an array or each data item (for example sending a message to every contact in your address book). In technical terms, you need to iterate through the data (with loops).
n8n generally handles this repetitive processing automatically, as the nodes run once for each item, so you don't need to build loops into your workflows.
However, there are someexceptions of nodes and operationsthat will require you to build a loop into your workflow.
Tocreate a loop in an n8n workflow, you need to connect the output of one node to the input of a previous node, and add anIf nodeto check when to stop the loop.

## Splitting data in batches#

If you need to process large volumes of incoming data, execute theCode nodemultiple times, or avoid API rate limits, it's best to split the data into batches (groups) and process these batches.
For these processes, use theLoop Over Items node. This node splits input data into a specified batch size and, with each iteration, returns a predefined amount of data.
Execution of Loop Over Items node
TheLoop Over Items nodestops executing after all the incoming items get divided into batches and passed on to the next node in the workflow, so it's not necessary to add anIf nodeto stop the loop.

### Loop/Batch Exercise#

Build a workflow that reads the RSS feed from Medium and dev.to. The workflow should consist of three nodes:
- ACode nodethat returns the URLs of the RSS feeds of Medium (https://medium.com/feed/n8n-io) and dev.to (https://dev.to/feed/n8n).
https://medium.com/feed/n8n-io
https://dev.to/feed/n8n
- ALoop Over Items nodewithBatch Size: 1, that takes in the inputs from theCode nodeandRSS Read nodeand iterates over the items.
Batch Size: 1
- AnRSS Read nodethat gets the URL of the Medium RSS feed, passed as an expression:{{ $json.url }}.TheRSS Read nodeis one of theexception nodeswhich processes only the first item it receives, so theLoop Over Items nodeis necessary for iterating over multiple items.
{{ $json.url }}
- TheRSS Read nodeis one of theexception nodeswhich processes only the first item it receives, so theLoop Over Items nodeis necessary for iterating over multiple items.
- Add aCode Node. You can format the code in several ways, one way is:SetModetoRun Once for All Items.SetLanguagetoJavaScript.Copy the code below and paste it into the JavaScript Code editor:12345678910111213leturls=[{json:{url:'https://medium.com/feed/n8n-io'}},{json:{url:'https://dev.to/feed/n8n'}}]returnurls;
- SetModetoRun Once for All Items.
Run Once for All Items
- SetLanguagetoJavaScript.
JavaScript
- Copy the code below and paste it into the JavaScript Code editor:12345678910111213leturls=[{json:{url:'https://medium.com/feed/n8n-io'}},{json:{url:'https://dev.to/feed/n8n'}}]returnurls;
12345678910111213

```
leturls=[{json:{url:'https://medium.com/feed/n8n-io'}},{json:{url:'https://dev.to/feed/n8n'}}]returnurls;
```


```
leturls=[{json:{url:'https://medium.com/feed/n8n-io'}},{json:{url:'https://dev.to/feed/n8n'}}]returnurls;
```

- Add aLoop Over Items nodeconnected to theCode node.SetBatch Sizeto1.
- SetBatch Sizeto1.
1
- TheLoop Over Items nodeautomatically adds a node called "Replace Me". Replace that node with anRSS Read node.Set theURLto use the url from the Code Node:{{ $json.url }}.
- Set theURLto use the url from the Code Node:{{ $json.url }}.
{{ $json.url }}
The workflow for this exercise looks like this:
To check the configuration of the nodes, you can copy the JSON workflow code below and paste it into your Editor UI:

```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899100101102103104105106107
```


```
{"meta":{"templateCredsSetupCompleted":true,"instanceId":"cb484ba7b742928a2048bf8829668bed5b5ad9787579adea888f05980292a4a7"},"nodes":[{"parameters":{},"id":"ed8dc090-ae8c-4db6-a93b-0fa873015c25","name":"When clicking \"Execute workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[460,460]},{"parameters":{"jsCode":"let urls = [\n  {\n    json: {\n      url: 'https://medium.com/feed/n8n-io'\n    }\n  },\n  {\n   json: {\n     url: 'https://dev.to/feed/n8n'\n   } \n  }\n]\n\nreturn urls;"},"id":"1df2a9bf-f970-4e04-b906-92dbbc9e8d3a","name":"Code","type":"n8n-nodes-base.code","typeVersion":2,"position":[680,460]},{"parameters":{"options":{}},"id":"3cce249a-0eab-42e2-90e3-dbdf3684e012","name":"Loop Over Items","type":"n8n-nodes-base.splitInBatches","typeVersion":3,"position":[900,460]},{"parameters":{"url":"={{ $json.url }}","options":{}},"id":"50e1c1dc-9a5d-42d3-b7c0-accc31636aa6","name":"RSS Read","type":"n8n-nodes-base.rssFeedRead","typeVersion":1,"position":[1120,460]}],"connections":{"When clicking \"Execute workflow\"":{"main":[[{"node":"Code","type":"main","index":0}]]},"Code":{"main":[[{"node":"Loop Over Items","type":"main","index":0}]]},"Loop Over Items":{"main":[null,[{"node":"RSS Read","type":"main","index":0}]]},"RSS Read":{"main":[[{"node":"Loop Over Items","type":"main","index":0}]]}},"pinData":{}}
```


```
{"meta":{"templateCredsSetupCompleted":true,"instanceId":"cb484ba7b742928a2048bf8829668bed5b5ad9787579adea888f05980292a4a7"},"nodes":[{"parameters":{},"id":"ed8dc090-ae8c-4db6-a93b-0fa873015c25","name":"When clicking \"Execute workflow\"","type":"n8n-nodes-base.manualTrigger","typeVersion":1,"position":[460,460]},{"parameters":{"jsCode":"let urls = [\n  {\n    json: {\n      url: 'https://medium.com/feed/n8n-io'\n    }\n  },\n  {\n   json: {\n     url: 'https://dev.to/feed/n8n'\n   } \n  }\n]\n\nreturn urls;"},"id":"1df2a9bf-f970-4e04-b906-92dbbc9e8d3a","name":"Code","type":"n8n-nodes-base.code","typeVersion":2,"position":[680,460]},{"parameters":{"options":{}},"id":"3cce249a-0eab-42e2-90e3-dbdf3684e012","name":"Loop Over Items","type":"n8n-nodes-base.splitInBatches","typeVersion":3,"position":[900,460]},{"parameters":{"url":"={{ $json.url }}","options":{}},"id":"50e1c1dc-9a5d-42d3-b7c0-accc31636aa6","name":"RSS Read","type":"n8n-nodes-base.rssFeedRead","typeVersion":1,"position":[1120,460]}],"connections":{"When clicking \"Execute workflow\"":{"main":[[{"node":"Code","type":"main","index":0}]]},"Code":{"main":[[{"node":"Loop Over Items","type":"main","index":0}]]},"Loop Over Items":{"main":[null,[{"node":"RSS Read","type":"main","index":0}]]},"RSS Read":{"main":[[{"node":"Loop Over Items","type":"main","index":0}]]}},"pinData":{}}
```
