Snowclone-a-Minute! (based on Metaphor-a-Minute)
==========

Requires [node](http://nodejs.org/) and [npm](http://npmjs.org/). You also need a Twitter App access token, consumer key, and associated secrets: https://dev.twitter.com/apps/new

Finally, you need a Wordnik API key, which you can apply for here: http://developer.wordnik.com/

You'll need to add all that info to metaphor.js before running the program, otherwise Wordnik and Twitter won't play nice.  If you are hosting on Openshift, like I do, put those additions in a commit on a branch that tracks your Openshift git repo, and merge from Github as necessary.  This keeps your private things private, and you can still make commits!

The package.json included here is enough to get started on Openshift, but to run locally, install the following packages:

> npm install node-restclient@0.0.1

> npm install twit@1.1.6

> npm install express@2.5.9

> npm install deferred

Then to try it out locally:

> node metaphor.js
