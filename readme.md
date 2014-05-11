# cucumber-with-caffeine

Cucumber.js supercharged with Mocha reporters (both built-in and third-party).

## Installation

```sh
$ npm install --save cucumber-with-caffeine
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

* Use cucumber-js (or cucumber.js) shell script as before but with addition of
"--require ./node_modules/cucumber-with-caffeine/src/index.js --reporter:<mocha's reporter name>".

So, for example, if you are running cucumber-js like so

```sh
$ cucumber-js test/features
```

and all you can think of is "nyan" reporter, then type in

```sh
$ cucumber-js --require ./node_modules/cucumber-with-caffeine/src/index.js --reporter:nyan --require test/features test/features
```

and hit enter. To switch between different reporters change the value next to "--reporter:" (e.g. --reporter:spec,
--reporter:xunit, ...).

> Note the addition of "--require test/features". Cucumber's CLI disables automatic scripts loading on "--require", so
you have to add that part as well.

* Add require('cucumber-with-caffeine').call(this, options) to the world.js

In this case world.js might look like:

```js
var caffeinator = require('cucumber-with-caffeine');

module.exports = function() {

    caffeinator.call(this, {
        reporter: process.env.REPORTER || 'spec'
    });

    ...
};
```

Note that you'll still be able to switch reporters with "--reporter:<mocha's reporter name>". In case of cucumber-js
(or cucumber.js) shell script it's as simple as `cucumber-js --reporter:nyan test/features`.

## License

[MIT](https://github.com/shyiko/cucumber-with-caffeine/blob/master/mit.license)