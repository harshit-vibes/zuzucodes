# Understanding the data structure#

In this chapter, you will learn about the data structure of n8n and how to use theCode nodeto transform data and simulate node outputs.

## Data structure of n8n#

In a basic sense, n8n nodes function as an Extract, Transform, Load (ETL) tool. The nodes allow you to access (extract) data from multiple disparate sources, modify (transform) that data in a particular way, and pass (load) it along to where it needs to be.
The data that moves along from node to node in your workflow must be in a format (structure) that can be recognized and interpreted by each node. In n8n, this required structure is an array of objects.
About array of objects
An array is a list of values. The array can be empty or contain several elements. Each element is stored at a position (index) in the list, starting at 0, and can be referenced by the index number. For example, in the array["Leonardo", "Michelangelo", "Donatello", "Raphael"];the elementDonatellois stored at index 2.

```
["Leonardo", "Michelangelo", "Donatello", "Raphael"];
```

Donatello
An object stores key-value pairs, instead of values at numbered indexes as in arrays. The order of the pairs isn't important, as the values can be accessed by referencing the key name. For example, the object below contains two properties (nameandcolor):
name
color
1234
{name:'Michelangelo',color:'blue',}
{name:'Michelangelo',color:'blue',}
An array of objects is an array that contains one or more objects. For example, the arrayturtlesbelow contains four objects:
turtles
123456789101112131415161718

```
varturtles=[{name:'Michelangelo',color:'orange',},{name:'Donatello',color:'purple',},{name:'Raphael',color:'red',},{name:'Leonardo',color:'blue',}];
```


```
varturtles=[{name:'Michelangelo',color:'orange',},{name:'Donatello',color:'purple',},{name:'Raphael',color:'red',},{name:'Leonardo',color:'blue',}];
```

You can access the properties of an object using dot notation with the syntaxobject.property. For example,turtles[1].colorgets the color of the second turtle.
object.property
turtles[1].color
Data sent from one node to another is sent as an array of JSON objects. The elements in this collection are called items.
An n8n node performs its action on each item of incoming data.

## Creating data sets with the Code node#

Now that you are familiar with the n8n data structure, you can use it to create your own data sets or simulate node outputs. To do this, use theCode nodeto write JavaScript code defining your array of objects with the following structure:
1234567
return[{json:{apple:'beets',}}];
return[{json:{apple:'beets',}}];
For example, the array of objects representing the Ninja turtles would look like this in the Code node:
JSON objects
Notice that this array of objects contains an extra key:json. n8n expects you to wrap each object in an array in another object, with the keyjson.
json
json
It's good practice to pass the data in the right structure used by n8n. But don't worry if you forget to add thejsonkey to an item, n8n (version 0.166.0 and above) adds it automatically.
json
You can also have nested pairs, for example if you want to define a primary and a secondary color. In this case, you need to further wrap the key-value pairs in curly braces{}.
{}
n8n data structure video
This talkoffers a more detailed explanation of data structure in n8n.

### Exercise#

In a Code node, create an array of objects namedmyContactsthat contains the propertiesnameandemail, and theemailproperty is further split intopersonalandwork.
myContacts
name
email
email
personal
work
In theCode node, in the JavaScript Code field you have to write the following code:
12345678910111213141516171819202122

```
varmyContacts=[{json:{name:'Alice',email:{personal:'[email protected]',work:'[email protected]'},}},{json:{name:'Bob',email:{personal:'[email protected]',work:'[email protected]'},}},];returnmyContacts;
```


```
varmyContacts=[{json:{name:'Alice',email:{personal:'[email protected]',work:'[email protected]'},}},{json:{name:'Bob',email:{personal:'[email protected]',work:'[email protected]'},}},];returnmyContacts;
```

When you execute theCode node, the result should look like this:

## Referencing node data with the Code node#

Just like you can useexpressionsto reference data from other nodes, you can also use somemethods and variablesin theCode node.
Please make sure you read these pages before continuing to the next exercise.

### Exercise#

Let's build on the previous exercise, in which you used the Code node to create a data set of two contacts with their names and emails. Now, connect a second Code node to the first one. In the new node, write code to create a new column namedworkEmailthat references the work email of the first contact.
workEmail
In theCode node, in the JavaScript Code field you have to write the following code:
123

```
letitems=$input.all();items[0].json.workEmail=items[0].json.email['work'];returnitems;
```


```
letitems=$input.all();items[0].json.workEmail=items[0].json.email['work'];returnitems;
```

When you execute theCode node, the result should look like this:

## Transforming data#

The incoming data from some nodes may have a different data structure than the one used in n8n. In this case, you need totransform the data, so that each item can be processed individually.
The two most common operations for data transformation are:
- Creating multiple items from one item
- Creating a single item from multiple items
There are several ways to transform data for the purposes mentioned above:
- Use n8n'sdata transformation nodes. Use these nodes to modify the structure of incoming data that contain lists (arrays) without needing to use JavaScript code in theCode node:Use theSplit Out nodeto separate a single data item containing a list into multiple items.Use theAggregate nodeto take separate items, or portions of them, and group them together into individual items.
- Use theSplit Out nodeto separate a single data item containing a list into multiple items.
- Use theAggregate nodeto take separate items, or portions of them, and group them together into individual items.
- Use theCode nodeto write JavaScript functions to modify the data structure of incoming data using theRun Once for All Itemsmode:To create multiple items from a single item, you can use JavaScript code like this. This example assumes that the item has a key nameddataset to an array of items in the form of:[{ "data": [{<item_1>}, {<item_2>}, ...] }]:12345return$input.first().json.data.map(item=>{return{json:item}});To create a single item from multiple items, you can use this JavaScript code:1234567return[{json:{data_object:$input.all().map(item=>item.json)}}];
- To create multiple items from a single item, you can use JavaScript code like this. This example assumes that the item has a key nameddataset to an array of items in the form of:[{ "data": [{<item_1>}, {<item_2>}, ...] }]:12345return$input.first().json.data.map(item=>{return{json:item}});
data
[{ "data": [{<item_1>}, {<item_2>}, ...] }]
12345

```
return$input.first().json.data.map(item=>{return{json:item}});
```


```
return$input.first().json.data.map(item=>{return{json:item}});
```

- To create a single item from multiple items, you can use this JavaScript code:1234567return[{json:{data_object:$input.all().map(item=>item.json)}}];
1234567

```
return[{json:{data_object:$input.all().map(item=>item.json)}}];
```


```
return[{json:{data_object:$input.all().map(item=>item.json)}}];
```

These JavaScript examples assume your entire input is what you want to transform. As in the exercise above, you can also execute either operation on a specific field by identifying that in the items list, for example, if our workEmail example had multiple emails in a single field, we could run some code like this:
123456

```
letitems=$input.all();returnitems[0].json.workEmail.map(item=>{return{json:item}});
```


```
letitems=$input.all();returnitems[0].json.workEmail.map(item=>{return{json:item}});
```


### Exercise#

- Use theHTTP Request nodeto make a GET request to the PokéAPIhttps://pokeapi.co/api/v2/pokemon. (This API requires no authentication).
https://pokeapi.co/api/v2/pokemon
- Transform the data in theresultsfield with theSplit Out node.
results
- Transform the data in theresultsfield with theCode node.
results
- To get the pokemon from the PokéAPI, execute theHTTP Request nodewith the following parameters:Authentication: NoneRequest Method: GETURL: https://pokeapi.co/api/v2/pokemon
- Authentication: None
- Request Method: GET
- URL: https://pokeapi.co/api/v2/pokemon
- To transform the data with theSplit Out node, connect this node to theHTTP Request nodeand set the following parameters:Field To Split Out: resultsInclude: No Other Fields
- Field To Split Out: results
- Include: No Other Fields
- To transform the data with theCode node, connect this node to theHTTP Request nodeand write the following code in the JavaScript Code field:123456letitems=$input.all();returnitems[0].json.results.map(item=>{return{json:item}});
123456

```
letitems=$input.all();returnitems[0].json.results.map(item=>{return{json:item}});
```


```
letitems=$input.all();returnitems[0].json.results.map(item=>{return{json:item}});
```
