# Workflow 1: Merging data#

Nathan's company stores its customer data in Airtable. This data contains information about the customers' ID, country, email, and join date, but lacks data about their respective region and subregion. You need to fill in these last two fields in order to create the reports for regional sales.
To accomplish this task, you first need to make a copy of this table in your Airtable account:
When setting up your Airtable, ensure that thecustomerSincecolumn is configured as a Date type field with theInclude timeoption enabled. Without this setting, you may encounter errors in step 4 when updating the table.
customerSince
Next, build a small workflow that merges data from Airtable and a REST Countries API:
- Use theAirtable nodeto list the data in the Airtable table namedcustomers.
customers
- Use theHTTP Request nodeto get data from the REST Countries API:https://restcountries.com/v3.1/all, and send the query parameter namefieldswith the valuename,region,subregion. This will return data about world countries, split out into separate items.
https://restcountries.com/v3.1/all
fields
name,region,subregion
- Use theMerge nodeto merge data from Airtable and the Countries API by country name, represented ascustomerCountryin Airtable andname.commonin the Countries API, respectively.
customerCountry
name.common
- Use another Airtable node to update the fieldsregionandsubregionin Airtable with the data from the Countries API.
region
subregion
The workflow should look like this:
Quiz questions
- How many items does theHTTP Request nodereturn?
- How many items does theMerge nodereturn?
- How many unique regions are assigned in the customers table?
- What's the subregion assigned to the customerID 10?