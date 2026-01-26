# Automating a business workflow#

Rememberour friend Nathan?
Nathan 🙋:Hello, it's me again. My manager was so impressed with my first workflow automation solution that she entrusted me with more responsibility.You 👩‍🔧:More work and responsibility. Congratulations, I guess. What do you need to do now?Nathan 🙋:I got access to all our sales data and I'm now responsible for creating two reports: one for regional sales and one for orders prices. They're based on data from different sources and come in different formats.You 👩‍🔧:Sounds like a lot of manual work, but the kind that can be automated. Let's do it!

## Workflow design#

Now that we know what Nathan wants to automate, let's list the steps he needs to take to achieve this:
- Get and combine data from all necessary sources.
- Sort the data and format the dates.
- Write binary files.
- Send notifications using email and Discord.
n8n providescore nodesfor all these steps. This use case is somewhat complex. We should build it from three separate workflows:
- A workflow that merges the company data with external information.
- A workflow that generates the reports.
- A workflow that monitors errors in the second workflow.

## Workflow prerequisites#

To build the workflows, you will need the following:
- AnAirtableaccount andcredentials.
- AGoogleaccount andcredentialsto access Gmail.
- ADiscordaccount and webhook URL (you receive this using email when you sign up for this course).
Next, you will build these three workflows with step-by-step instructions.