var fs = require('fs');
var restclient = require('node-restclient');
var Twit = require('twit');
var express = require('express');
var deferred = require("deferred");
var app = express();
var config = require("./config.json");
var recent_retweets = [];
var $ = {
  Deferred : deferred
  , when : deferred
};

var API_KEY = config.API_KEY;
var consumer_key = config.consumer_key;
var consumer_secret = config.consumer_secret;
var access_token = config.access_token; 
var access_token_secret = config.access_token_secret;

var lines;
try {
  lines = fs.readFileSync('templates.txt', 'utf-8');
  lines = lines.split('\n').map(function (line) {
    return line.length ? line : undefined;
  });
}
catch (err) {
  console.error("There was an error opening the file:");
  console.log(err);
}

/*
word types: "noun", "adjective", "verb", "adverb", "interjection", "pronoun", "preposition", "abbreviation", //"affix" no results, 
//"article" no results other than 'an' with a macron on the 'a' , // "auxiliary-verb" less useful, "conjunction", "definite-article", 
"family-name", "given-name", //"idiom", "imperative", "noun-plural", "noun-posessive", "past-participle", "phrasal-prefix", 
"proper-noun", "proper-noun-plural", "proper-noun-posessive", "suffix", "verb-intransitive", "verb-transitive"
*/
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
var backref = function(n) {
  return function(value, index, listdfd) {
    return listdfd.then(function(pack) {
      var dfds = pack[0];
      var words = pack[1];
      var idxs = words.map(function(word, i) {
        return (/\{.*\}/).test(word) ? i : undefined;
      }).filter(function(i) {
        return i != null;
      });
      return dfds[idxs[n - 1]].then(function(word) {
        return {base : word.base, composed : words[index].replace(/\{.*\}/, word.base)};
      });
    });
  };
};

var gerund_func, number_func;
var processors = {
  "a" : function(value, index, listdfd) {
    return listdfd.then(function(pack) {
      var list = pack[0];
      return list[index + 1].then(function(word) {
        var retval = /^[aeiou]/.test(word.composed.trim()) ? "an" : "a";
        return {base : retval, composed : retval};
      });
    });
  }
  , "noun-singular" : function(value, index, listdfd) {
    return defaultprocessor("noun", index, listdfd, "http://api.wordnik.com/v4/words.json/randomWords?" +
                  "hasDictionaryDef=true&includePartOfSpeech=noun&limit=1&" +
                  "minCorpusCount=100&api_key=" + API_KEY + "&excludePartOfSpeech=noun-plural,proper-noun-plural");
  }
  , "n" : (number_func = function(max, start, zeropad) {
    return function(value, index, listdfd) {
      var retval = Math.floor(Math.random() * max) + start;
      return listdfd.then(function(pack)  {
        var token = pack[1][index]
        , pad = "0000000000".slice((max - 1).toString().length)
        , retstr = zeropad ? (pad + retval.toString()).slice(-((max - 1).toString().length)) : retval.toString()
        , s = token.replace(/\{.*\}/, retstr);
        return new $.Deferred().resolve({base : retstr, composed : s});
      });
    };
  })(1000, 1)
  , "lc" : function(value, index, listdfd) {
    return listdfd.then(function(pack)  {
      var token = pack[1][index]
      , l = String.fromCharCode(65 + Math.floor(Math.random() * 26))
      , s = token.replace(/\{.*\}/, l);
      return new $.Deferred().resolve({ base : l, composed : s });
    });
  }
  , "vi-gerund" : (gerund_func = function(type) {
    return function(value, index, listdfd) {
      var d = $.Deferred();
      defaultprocessor(type, index, listdfd).then(function(word) {
        restclient.get(
          "http://api.wordnik.com/v4/word.json/" + word.base + "/relatedWords?"
          +"useCanonical=true&relationshipTypes=verb-form&limitPerRelationshipType=10&api_key="
          + API_KEY
          , function(vdata) {
            listdfd.then(function(pack) {
              var token = pack[1][index];
              var ws = (JSON.parse(vdata)[0] || {}).words;
              var w = ws && ws.filter(function(wd) {
                return (/ing$/).test(wd.word);
              })[0];
              w = w || (word.base + "ing");
              if(isBlacklisted(word.base) || isBlacklisted(w)) {
                defaultprocessor(value, index, listdfd, getURL).then(function(ow) {
                  dfd.resolve(ow).done();
                });
              } else {
                d.resolve({ base : w, composed : token.replace(/\{.*\}/, w) }).done();
              }
            });
          }
        );
      });
      return d.promise;
    };
  })("verb-intransitive")
  , "vt-gerund" : gerund_func("verb-transitive")
};
[1,2,3,4,5,6,7,8,9].forEach(function(i) {
  processors["$" + i] = backref(i);
});
[10,12,100,1000].forEach(function(i) {
  processors["n" + i] = number_func(i, 1);
  processors["zp" + i] = number_func(i, 0, true);
  processors["z" + i] = number_func(i, 0);
});

var defaultprocessor = function(value, index, listdfd, getURL) {
 getURL = getURL || "http://api.wordnik.com/v4/words.json/randomWords?" +
                  "hasDictionaryDef=true&includePartOfSpeech=" + value + "&limit=1&" +
                  "minCorpusCount=100&api_key=" + API_KEY;
 var dfd = $.Deferred();
 restclient.get(
  getURL,
  function(vdata) {
    listdfd.then(function(pack) {
      var token = pack[1][index];
      var word = JSON.parse(vdata)[0].word;
      if(isBlacklisted(word)) {
        defaultprocessor(value, index, listdfd, getURL).then(function(w) {
          dfd.resolve(w).done();
        });
      } else {
        dfd.resolve({ base : word, composed : token.replace(/\{.*\}/, word) }).done();
      }
    });
  });
 return dfd.promise;
};


// If deployed to Nodejitsu, it requires an application to respond to HTTP requests
// If you're running locally or on Openshift you don't need this, or express at all.
app.get('/', function(req, res){
    res.send("<h1>Recent retweets</h1>" + ((recent_retweets && recent_retweets.length) ? recent_retweets.join("<br>\n") : "No retweets"));
});
try {
  app.listen(
    process.env.OPENSHIFT_NODEJS_PORT || process.env.OPENSHIFT_INTERNAL_PORT || 8080,
    process.env.OPENSHIFT_NODEJS_IP ||
                         process.env.OPENSHIFT_INTERNAL_IP);
} catch(e) {
  console.error(e);
  //continue app. just forget about serving web
}
// insert your twitter app info here
var T = new Twit({
  consumer_key:     consumer_key, 
  consumer_secret:  consumer_secret,
  access_token:     access_token,
  access_token_secret: access_token_secret
});


//Step 1: List deferred resolves to the list of deferreds, one for each token.
//Step 2: wait on each token.
//Step 3: when all tokens have resolves (some being dependent on others, or REST calls), render.
function makeSnowclone() {
  var listdfd = new $.Deferred();
  var line = lines[Math.floor(Math.random() * lines.length)];
  var list = line.split(" ").filter(function(token) {
    return !!token.length;
  });
  var dfdlist = list.map(function(token, index) {
    var tc;
    token = token.trim();
    var dfd;
    if(tc = /\{(.*)\}/.exec(token)) {
      dfd = processors[tc[1]] 
            ? processors[tc[1]](tc[1], index, listdfd.promise) 
            : defaultprocessor(tc[1], index, listdfd.promise);
    } else {
      dfd = new $.Deferred().resolve({ base : token, composed : token });
    }
    return dfd;
  });
  listdfd.resolve([dfdlist, list]);

  $.when.apply(
    $,
    dfdlist
  ).done(function(results) {
    if(results.composed) {
      results = results.composed;
    }
    if(typeof results !== "string") {

      results = Array.prototype.map.call(results, function(res) {
        return res.composed;
      });
      results =  Array.prototype.join.call(results, " ");
    }
    console.log(results);

    T.post('statuses/update', { status: results}, function(err, reply) {
      if(err) console.error("error: " + err);
      console.log("reply: " + reply);
    });
  });
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
        T.post('favorites/create.json',{ id : tweet.id_str },function(e){
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
makeSnowclone();
setInterval(function() {
  try {
    makeSnowclone();
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
