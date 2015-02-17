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

Quick dev guide
============

Other than the items above which need to be inserted into metaphor.js, there is zero coding required to extend Snowclone-a-Minute.  You need only to add templates to templates.txt and relaunch the node process to tweet snowclones or any templated form however you see fit.

Command language
----------------

All text in Snowclone-a-Minute not within curly braces is tweeted literally. So a template of "foo" tweets as "foo"

The fun lies in making random bits, which can come from a fairly rich set of sources.  These are identified by curly braces ({}) surrounding a token.  The meaning of each token is described below:

* {a} provides the correct indefinite article for the next word.  If the next word starts with a vowel, {a} is replaced by "an", otherwise with "a".
> Example: "{a} melon" -> "a melon"; "{a} orange" -> "an orange"

* {n} provides a random integer from 1 to 1000.  Also supported are {n10}, {n12}, and {n100}, which provide a random integer from 1 to 10, 12, and 100, respectively.
> Example: "{n} grapes" -> "567 grapes"; "{n10} melons" -> "10 melons"

* {z} provides a random integer from 0 to 999. Also {z10}, {z12}, and {z100} provide integers from 0 to 9, 11, and 99, respectively.
> Example: "{z10} apples" -> "0 apples"; "{z} kumquats" -> "486 kumquats"

* {zp} provides a random integer from 0 to 999, but always with zeroes leading the displayed number so it will be the same length as 999, i.e. "zero-padded".  Also {zp12}, and {zp100} apply as with {z} above, with zero-padding.
> Example: "20{zp100} is {noun} awareness year" -> "2002 is pomegranate awareness year"; "{z}.{zp} grams of bananas" -> "38.094 grams of bananas"

* {lc} provides a random uppercase English-alphabet letter.
> Example: "{lc} for effort" -> "P for effort"

* {$1} through {$9} provide "backreferences" to previous curly-brace tokens, displaying the same item as was displayed for them.
> Example: "James {lc}, and the {$2} is for {noun}" -> "James W, and the W is for grapefruit"

* A comma-separated list of one or more Wordnik-recognized parts of speech (noun, adjective, verb, adverb, interjection, pronoun, preposition, abbreviation, affix, article, auxiliary-verb, conjunction, definite-article, family-name, given-name, idiom, imperative, noun-plural, noun-posessive, past-participle, phrasal-prefix, proper-noun, proper-noun-plural, proper-noun-posessive, suffix, verb-intransitive, verb-transitive) will query Wordnik for a random word from one of those parts of speech and provide it to the template.
> Example: "{noun,adjective} is {$1}" -> "radish is radish" or "reddish is reddish"; "{verb} faster!" -> "peels faster!"

* {vt-gerund} and {vi-gerund} are special wrappers around {verb-transitive} and {verb-intransitive}, respectively, that attempt to put "-ing" on the end of a verb.  Since the conjugation of verbs returned from Wordnik's randomWord service is unpredictable, this can lead to interesting results
> Example: "I'm {vt-gerund} the dream!" -> "I'm compileing the dream!"

* {noun-singular} is a special wrapper around {noun}, an attempt to coerce nouns returned for Wordnik to be only singular.  It does not currently work as intended but will still return nouns.

That's all that's needed to get started with Snowclone-a-Minute.  Feel free to adapt this software to your own needs, and start bots with it.  Pull requests are welcome and tweet Bradley Momberger (@air_hadoken) with any help requests or suggestions!
