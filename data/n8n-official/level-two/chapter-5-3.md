# Workflow 3: Monitoring workflow errors#

Last but not least, let's help Nathan know if there are any errors running the workflow.
To accomplish this task, create an Error workflow that monitors the main workflow:
- Create a new workflow.
- Add anError Trigger node(and execute it as a test).
- Connect aDiscord nodeto theError Trigger nodeand configure these fields:Webhook URL: The Discord URL that you received in the email from n8n when you signed up for this course.Text: "The workflow{workflow name}failed, with the error message:{execution error message}. Last node executed:{name of the last executed node}. Check this workflow execution here:{execution URL}My Unique ID: " followed by the unique ID emailed to you when you registered for this course.Note that you need to replace the text in curly brackets{}with expressions that take the respective information from the Error Trigger node.
Connect aDiscord nodeto theError Trigger nodeand configure these fields:
- Webhook URL: The Discord URL that you received in the email from n8n when you signed up for this course.
- Text: "The workflow{workflow name}failed, with the error message:{execution error message}. Last node executed:{name of the last executed node}. Check this workflow execution here:{execution URL}My Unique ID: " followed by the unique ID emailed to you when you registered for this course.Note that you need to replace the text in curly brackets{}with expressions that take the respective information from the Error Trigger node.
Text: "The workflow{workflow name}failed, with the error message:{execution error message}. Last node executed:{name of the last executed node}. Check this workflow execution here:{execution URL}My Unique ID: " followed by the unique ID emailed to you when you registered for this course.
{workflow name}
{execution error message}
{name of the last executed node}
{execution URL}
Note that you need to replace the text in curly brackets{}with expressions that take the respective information from the Error Trigger node.
{}
- Execute the Discord node.
Execute the Discord node.
- Set the newly created workflow as theError Workflowfor the main workflow you created in the previous lesson.
The workflow should look like this:
Quiz questions
- What fields does theError Trigger nodereturn?
- What information about the execution does theError Trigger nodereturn?
- What information about the workflow does theError Trigger nodereturn?
- What's the expression to reference the workflow name?