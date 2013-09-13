var restclient = require('node-restclient');
var Twit = require('twit');
var express = require('express');
var app = express();
// Set the values of these before deploying.
var API_KEY, consumer_key, consumer_secret, access_token, access_token_secret;
var recent_retweets = [];



var fs = require('fs');
var blacklist = [];
try {
  var data = fs.readFileSync('badwords.txt', 'ascii');
  data.split('\n').forEach(function (line) {
    if(line.length>0) {
      blacklist.push(line.trim().toLowerCase());
    }
  });
}
catch (err) {
  console.error("There was an error opening the file:");
  console.log(err);
}

function isBlacklisted(data) {
  var result = false;
  for (var i=0;i<blacklist.length;i++) {
    if (data.trim().toLowerCase() === blacklist[i]) {
      result = true;
    }
  }
  return result;
}

// I deployed to Nodejitsu, which requires an application to respond to HTTP requests
// If you're running locally you don't need this, or express at all.
app.get('/', function(req, res){
    res.send("<h1>Recent retweets</h1>" + ((recent_retweets && recent_retweets.length) ? recent_retweets.join("<br>\n") : "No retweets"));
});
app.listen(3000);

// insert your twitter app info here
var T = new Twit({
  consumer_key:     consumer_key, 
  consumer_secret:  consumer_secret,
  access_token:     access_token,
  access_token_secret: access_token_secret
});

var statement =   "";

// insert your Wordnik API info below
var getNounsURL = "http://api.wordnik.com/v4/words.json/randomWords?" +
                  "minCorpusCount=1000&minDictionaryCount=10&" +
                  "excludePartOfSpeech=proper-noun,proper-noun-plural,proper-noun-posessive,suffix,family-name,idiom,affix&" +
                  "hasDictionaryDef=true&includePartOfSpeech=noun&limit=1&maxLength=12&" +
                  "api_key=" + API_KEY;

var getAdjsURL =  "http://api.wordnik.com//v4/words.json/randomWords?" +
                  "hasDictionaryDef=true&includePartOfSpeech=adjective&limit=2&" + 
                  "minCorpusCount=100&api_key=" + API_KEY;

var getVerbsURL =  "http://api.wordnik.com//v4/words.json/randomWords?" +
                  "hasDictionaryDef=true&includePartOfSpeech=verb-transitive&limit=1&" + 
                  "minCorpusCount=100&api_key=" + API_KEY;


function makeMetaphor() {
  statement = "";
  restclient.get(getNounsURL,
  function(data) {
    var first = data[0].word.substr(0,1);
    var article = "a";
    if (first === 'a' ||
        first === 'e' ||
        first === 'i' ||
        first === 'o' ||
        first === 'u') {
      article = "an";
    }

    restclient.get(
      getVerbsURL,
      function(vdata) {
        statement = "Computers will never " + vdata[0].word + " " + article + " " + data[0].word + " as well as humans";

        //statement = statement + ": " + output;
        console.log(statement);
	if(isBlacklisted(vdata[0].word) || isBlacklisted(data[0].word)) {
	    statement = "[This reassurance was deemed unacceptable for humans]";
	    console.log("Previous line tweeted as:", statement);
	}
        T.post('statuses/update', { status: statement}, function(err, reply) {
          if(err) console.error("error: " + err);
          console.log("reply: " + reply);
        });
      }    
    ,"json");
  }    
  ,"json");
}

var last_rt = 1;
function favRTs () {
  recent_retweets = recent_retweets.length > 100 ? recent_retweets.slice(0, 100) : recent_retweets;
  T.get('statuses/retweets_of_me', { since_id : last_rt }, function (e,r) {
    e && console.error(e);
    r.forEach(function(tweet,i) {
      setTimeout(function() {
	  last_rt = Math.max(last_rt, tweet.id) + 1;
	  T.get("statuses/retweets/"+tweet.id_str,{}, function(e, rt) {
	      e && console.error("Error when getting retweets:", e);
	      var sns = rt.map(function(t) { return "@" + t.user.screen_name }).join(", ");
	      recent_retweets.unshift(tweet.text + " [Retweeted by " + (sns || "unknown") + "]");
	  });
	  if(!tweet.favorited) {
	      T.post('favorites/create.json?id='+tweet.id_str,{},function(e){
		  e && console.error("Error creating favorite", e);
	      });
	  }
      }, Math.floor(i / 15) * 15*60000); //Only allowed to get 15 retweet lists every 15 minutes
    });
    console.log('harvested some RTs'); 
  });
}

// every 2 minutes, make and tweet a metaphor
// wrapped in a try/catch in case Twitter is unresponsive, don't really care about error
// handling. it just won't tweet.
setInterval(function() {
  try {
    makeMetaphor();
  }
 catch (e) {
    console.log(e);
  }
},120000);

// every 5 hours, check for people who have RTed a metaphor, and favorite that metaphor
setInterval(function() {
  try {
    favRTs();
  }
 catch (e) {
    console.log(e);
  }
},60000*60*5);
