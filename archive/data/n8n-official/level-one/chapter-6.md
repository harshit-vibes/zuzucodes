# Exporting and importing workflows#

In this chapter, you will learn how to export and import workflows.

## Exporting and importing workflows#

You can save n8n workflows locally as JSON files. This is useful if you want to share your workflow with someone else or import a workflow from someone else.
Sharing credentials
Exported workflow JSON files includecredentialnames and IDs. While IDs aren't sensitive, the names could be, depending on how you name your credentials. HTTP Request nodes may contain authentication headers when imported from cURL. Remove or anonymize this information from the JSON file before sharing to protect your credentials.
You can export and import workflows in three ways:
- From theEditor UImenu:Export: From the top navigation bar, select the three dots in the upper right, then selectDownload. This will download your current workflow as a JSON file on your computer.Import: From the top navigation bar, select the three dots in the upper right, then selectImport from URL(to import a published workflow) orImport from File(to import a workflow as a JSON file).
- Export: From the top navigation bar, select the three dots in the upper right, then selectDownload. This will download your current workflow as a JSON file on your computer.
- Import: From the top navigation bar, select the three dots in the upper right, then selectImport from URL(to import a published workflow) orImport from File(to import a workflow as a JSON file).
- From theEditor UIcanvas:Export: Select all the nodes on the canvas and useCtrl+Cto copy the workflow JSON. You can paste this into a file or share it directly with other people.Import: You can paste a copied workflow JSON directly into the canvas withCtrl+V.
- Export: Select all the nodes on the canvas and useCtrl+Cto copy the workflow JSON. You can paste this into a file or share it directly with other people.
- Import: You can paste a copied workflow JSON directly into the canvas withCtrl+V.
- From the command line:Export: See thefull list of commandsfor exporting workflows or credentials.Import: See thefull list of commandsfor importing workflows or credentials.
- Export: See thefull list of commandsfor exporting workflows or credentials.
- Import: See thefull list of commandsfor importing workflows or credentials.