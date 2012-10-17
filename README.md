auth-proxy
==========

This module is made for a scenario where you use Node.js and separate frontend from the API.
For incoming requests we need to know if the user is logged in and what rights (s)he has. 

The module runs on your frontend server and enables you to specify a URL that will be called. 
You can pass along a function that will be called to ensure that the user is valid (i.e. check the response from the API). 

I am a novice Node programmer, so feedback is more than welcome. 
It would be great to have some collaborators on this project. 

Also, do _not_ rely on this code if you're a newbie too.
