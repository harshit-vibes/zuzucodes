# Navigating the Editor UI#

In this lesson you will learn how to navigate theEditor UI. We will walk through thecanvasand show you what each icon means and where to find things you will need while building workflows in n8n.
n8n version
This course is based on n8n version 1.82.1. In other versions, some user interfaces might look different, but this shouldn't impact the core functionality.

## Getting started#

Begin by setting up n8n.
We recommend starting withn8n Cloud, a hosted solution that doesn't require installation and includes a free trial.
Alternative set up
If n8n Cloud isn't a good option for you, you canself-host with Docker. This is an advanced option recommended only for technical users familiar with hosting services, Docker, and the command line.
For more details on the different ways to set up n8n, see ourplatforms documentation.
Once you have n8n running, open the Editor UI in a browser window. Log in to your n8n instance. SelectOverviewand thenCreate Workflowto view the main canvas.
It should look like this:

## Editor UI settings#

The editor UI is the web interface where you buildworkflows. You can access all your workflows andcredentials, as well as support pages, from the Editor UI.

### Left-side panel#

On the left side of theEditor UI, there is a panel which contains the core functionalities and settings for managing your workflows. Expand and collapse it by selecting the small arrow icon.
The panel contains the following sections:
- Overview: Contains all the workflows, credentials, and executions you have access to. During this course, create new workflows here.
- Personal: Every user gets a default personal project. If you don’t create a custom project, your workflows and credentials are stored here.
- Projects: Projects let you group workflows and credentials together. You can assignrolesto users in a project to control what they can do. Projects aren’t available on the Community edition.
- Admin Panel: n8n Cloud only. Access your n8n instance usage, billing, and version settings.
- Templates: A collection of pre-made workflows. Great place to get started with common use cases.
- Variables: Used to store and access fixed data across your workflows. This feature is available on the Pro and Enterprise Plans.
- Insights: Provides analytics and insights about your workflows.
- Help: Contains resources around n8n product and community.
- What’s New: Shows the latest product updates and features.

### Top bar#

The top bar of theEditor UIcontains the following information:
- Workflow Name: By default, n8n names a new workflow as "My workflow", but you can edit the name at any time.
- + Add Tag: Tags help you organise your workflows by category, use case, or whatever is relevant for you. Tags are optional.
- Publish: This button publishes the current workflow. By default, workflows are not published.
- Share: You can share and collaborate with others on workflows on the Starter, Pro, and Enterprise plans.
- Save: This button saves the current workflow.
- History: Once you save your workflow, you can view previous versions here.

### Canvas#

Thecanvasis the gray dotted grid background in the Editor UI. It displays several icons and a node with different functionalities:
- Buttons to zoom the canvas to fit the screen, zoom in or out of the canvas, reset zoom, and tidy up the nodes on screen.
- A button toExecute workflowonce you add your first node. When you click on it, n8n executes all nodes on the canvas in sequence.
- A button with a+sign inside. This button opens the nodes panel.
- A button with a note icon inside. This button adds asticky noteto the canvas (visible when hovering on the top right + icon).
- A button labeledAsk Assistantappears on the right side of the canvas. You can ask the AI Assistant for help with building workflows.
- A dotted square with the text "Add first step." This is where you add your first node.
Moving the canvas
You can move the workflow canvas around in three ways:
- SelectCtrl+Left Buttonon the canvas and move it around.
- SelectMiddle Buttonon the canvas and move it around.
- Place two fingers on your touchpad and slide.
Don't worry about workflow execution and publishing for now; we'll explain these concepts later on in the course.

## Nodes#

You can think of nodes as building blocks that serve different functions that, when put together, make up a functioning machine: an automated workflow.
Node
A node is an individual step in your workflow: one that either (a) loads, (b) processes, or (c) sends data.
Based on their function, n8n classifies nodes into four types:
- ApporAction Nodesadd, remove, and edit data; request and send external data; and trigger events in other systems. Refer to theAction nodes libraryfor a full list of these nodes.
- Trigger Nodesstart a workflow and supply the initial data. Refer to theTrigger nodes libraryfor a list of trigger nodes.
- Core Nodescan be trigger or app nodes. Whereas most nodes connect to a specific external service, core nodes provide functionality such as logic, scheduling, or generic API calls. Refer to theCore Nodes libraryfor a full list of core nodes.
- Cluster Nodesare node groups that work together to provide functionality in a workflow, primarily for AI workflows. Refer toCluster nodesfor more information.
Learn more
Refer toNode typesfor a more detailed explanation of all node types.

### Finding nodes#

You can find all available nodes in thenodes panelon the right side of the Editor UI. There are three ways in which you can open the nodes panel:
- Click the+icon in the top right corner of the canvas.
- Click the+icon on the right side of an existing node on the canvas (the node to which you want to add another one).
- Click theTabkey on your keyboard.
In the nodes panel, notice that when adding your first node, you will see the different trigger node categories. After you have added your trigger node, you'll see that the nodes panel changes to show Advanced AI, Actions in an App, Data transformation, Flow, Core, and Human in the loop nodes.
If you want to find a specific node, use the search input at the top of the nodes panel.

### Adding nodes#

There are two ways to add nodes to your canvas:
- Select the node you want in the nodes panel. The new node will automatically connect to the selected node on the canvas.
- Drag and drop the node from the nodes panel to the canvas.

### Node buttons#

If you hover on a node, you'll notice that three icons appear on top:
- Execute the node (Play icon)
- Deactivate/Activate the node (Power icon)
- Delete the node (Trash icon)
There will also be an ellipsis icon, which opens a context menu containing othernode options.
Moving a workflow
To move a workflow around the canvas, select all nodes with your mouse orCtrl+A, select and hold on a node, then drag it to any point you want on the canvas.

## Summary#

In this lesson you learned how to navigate the Editor UI, what the icons mean, how to access the left-side and node panels, and how to add nodes to the canvas.
In the next lesson, you will build a mini-workflow to put into practice what you've learned so far.