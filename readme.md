# cucumber-js-caffeinator [![Build Status](https://travis-ci.org/shyiko/cucumber-js-caffeinator.svg?branch=master)](https://travis-ci.org/shyiko/cucumber-js-caffeinator)

[Cucumber.js](https://github.com/cucumber/cucumber-js) supercharged with [Mocha reporters](http://visionmedia.github.io/mocha/#reporters) (both built-in and [third-party](https://github.com/visionmedia/mocha/wiki#interfaces--reporters)). 

This project is just a plugin (i.e. it does not replace Cucumber.js in any way. In fact, you have to `npm install cucumber` prior to cucumber-caffeinator). 

## Installation

```sh
$ npm install --save cucumber-caffeinator
```

## Usage

Imagine you keep your tests under "test" directory as shown bellow:

```
    test/
      features/
        support/
          world.js
        step_definitions/
          ?.js
          ...
        ?.feature
        ...
```

Now, depending on how you run cucumber and on the level of coupling you are willing to introduce, you have the following
 options:

#### Use cucumber-js (or cucumber.js) shell script as before but with addition of "--require ./node_modules/cucumber-caffeinator/src/index.js --reporter:&lt;mocha's reporter name&gt;".

So, for example, if you are running cucumber-js like so

```sh
$ cucumber-js test/features
```

and all you can think of is "nyan" reporter, then type in

```sh
$ cucumber-js --require ./node_modules/cucumber-caffeinator/src/index.js --reporter:nyan --require test/features test/features
```

and hit enter. To switch between different reporters change the value next to "--reporter:" (e.g. --reporter:spec,
--reporter:xunit, ...).

> Note the addition of "--require test/features". Cucumber's CLI disables automatic scripts loading on "--require", so
you have to add that part as well.

#### (OR) Add require('cucumber-caffeinator').call(this, options) to the world.js (recommended)

In this case world.js might look like:

```js
var caffeinator = require('cucumber-caffeinator');

module.exports = function() {

    caffeinator.call(this, {
        reporter: process.env.REPORTER || 'spec'
    });

    ...
};
```

Note that you'll still be able to switch reporters with "--reporter:&lt;mocha's reporter name&gt;". In case of cucumber-js
(or cucumber.js) shell script it's as simple as `cucumber-js --reporter:nyan test/features`.

## Changelog

- 1.1.4 - Fixed pending/fail callbacks advising (by [jhenriquez](https://github.com/shyiko/cucumber-js-caffeinator/pull/1)).
- 1.1.3 - Compatibility with Cucumber.js 0.4.3.
- 1.1.2 - Fixed "Test duration: NaN".
- 1.1.1 - Fixed "RangeError: Maximum call stack size exceeded", Cucumber's output suppression.
- 1.1.0 - Backgrounds support, turned off leaks detection. 
- 1.0.0 - Requires Cucumber.js &gt;=0.4.1. Better compatibility with existing Mocha reporters, optional activation and 
output formatting.  
- 0.1.0 - Compatible with Cucumber.js &lt;=0.4.0.

## License

[MIT License](https://github.com/shyiko/cucumber-js-caffeinator/blob/master/mit.license)
