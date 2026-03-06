I will now add the next stage for this project, which you will turn into milestones.  

First off, the end goal for the reactivated part of this platform is to run automatically where on a set time frame (e.g. every 5 minutes), it will process new data, dynamically segment, and trigger hyper targeted emails.

Here is the user journey so you understand the full context: 

User logins in 
User creates pixel - we would like to use the ‘AL_pixel_endpoint’ file which I have added. This file contains the end point to create a pixel and then the end point to retrieve the data from the pixel. 
User sets schedule on when they would like new pixel data to come in (which triggers the emails) - it can be in minutes, hours, days 


Based on the schedule set by the user, the pixel api is triggered which brings in new data. 


Once data is in, it is automatically added to the dynamic segments that the user can set-up. The segments should have filters that use all the pixel fields. Refer to ‘Pixel_Fields’ to find these. These segments should have boolean logic. 

Users should be able to create dynamic segments such as: 

URL Contains ‘product_abc’ AND Does URL does not contain ‘confirm’ OR JOB TITLE contains ‘founder’. 

These segments are to update dynamically. 

6. Users can upload PDF, Markdown files and any text to the ‘knowledge_bank’ 

7. Once the knowledge bank is updated, users will be able to create an ‘email template’ using the current copy generator where the user chooses the knowledge bank, writes a custom prompt and then is able to preview the email template. 

8. Users can then save the email template which has all the variables based on the knowledge bank, and then they can enable it. 

9. In order to enable the template, the user must map an ‘email’ field which is found in the pixel data. 

9. Now the set-up is complete, the following will take place: 

Based on time window the pixel end point is triggered and brings in new data 
Based on the logic/fields, dynamic segments are updated 
Once dynamic segments are updated, the email templates are triggered. 
Personalised emails with template and custom copy gets sent to the email that has been mapped. 
