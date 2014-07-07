var path = require('path');

var Mocha = require('mocha');

/**
 * @param {Object} [options]
 * @param {String} [options.reporter] One of Mocha's reporters.
 * @param {Function} [options.featureNameFormatter(feature)] Custom Feature name formatter.
 * @param {Function} [options.scenarioNameFormatter(feature, scenario)] Custom Scenario name formatter.
 * @param {Function} [options.stepNameFormatter(feature, scenario, step)] Custom Step name formatter.
 */
module.exports = function (options) {

  // gathers options from the command line (in "--option_key:option_value" form)
  process.argv.reduce(function (obj, value) {
    var groups = /^--(\w+):(.+)$/.exec(value);
    if (groups !== null) {
      obj[groups[1]] = groups[2];
    }
    return obj;
  }, options || (options = {}));

  if (!options.reporter) {
    return; // activate only if reporter has been passed in
  }

  // currently there is no way to unregister Cucumber's "formatter" (cucumber@0.4.0)
  // as the result resorting to some REALLY nasty stuff here (suppressing output outside of "safe" boundaries)

  var output = (function () {
    var stdout = process.stdout;
    var originalWrite = stdout.write;
    var suppressedWrite = function () {
      return true;
    };
    suppressedWrite._original = originalWrite;
    return {
      off: function () {
        stdout.write = suppressedWrite;
      },
      on: function () {
        stdout.write = originalWrite;
      }
    };
  }());

  var originalRegisterHandler = this.registerHandler;
  this.registerHandler = function (eventName, handler) {
    originalRegisterHandler.call(this, eventName, function (event, callback) {
      output.on();
      handler.call(this, event, function () {
        output.off();
        callback();
      });
    });
  };

  var originalDefineStep = this.defineStep;
  this.Given = this.When = this.Then = this.defineStep = function (name, fn) {
    originalDefineStep.call(this, name, function () {
      output.on();
      try {
        fn.apply(this, arguments);
      } finally {
        output.off();
      }
    });
  };

  var runner, featureIndex, scenarioIndex, stepIndex;

  this.registerHandler('BeforeFeatures', function (event, callback) {
    var rootSuite = new Mocha.Suite('');

    var features = event.getPayloadItem('features');
    if (!features) {
      throw new Error('This version of cucumber-caffeinator requires cucumber 0.4.1+. ' +
        'Check https://github.com/shyiko/cucumber-js-caffeinator for more information.');
    }
    var cwd = process.cwd();
    features.getFeatures().syncForEach(function (feature) {
      var suite = new Mocha.Suite(options.featureNameFormatter ?
        options.featureNameFormatter(feature) :
        feature.getName() + ' (' + path.relative(cwd, feature.getUri()) + ')');
      rootSuite.addSuite(suite);
      feature.getFeatureElements().syncForEach(function (scenario) {
        var innerSuite = new Mocha.Suite(options.scenarioNameFormatter ?
          options.scenarioNameFormatter(feature, scenario) :
          scenario.getName() + ' (' + path.relative(cwd, scenario.getUri()) + ':' + scenario.getLine() + ')');
        suite.addSuite(innerSuite);
        var stepCollections = [scenario.getSteps()];
        if (feature.hasBackground()) {
          stepCollections.unshift(feature.getBackground().getSteps());
        }
        stepCollections.forEach(function (steps) {
          steps.syncForEach(function (step) {
            innerSuite.addTest(new Mocha.Test(options.stepNameFormatter ?
              options.stepNameFormatter(feature, scenario, step) :
              step.getKeyword() + step.getName(), function () { /* omitted */ }));
          });
        });
      });
    });

    runner = new Mocha.Runner(rootSuite);

    var initializeReporter = function (name) {
      var context = {};
      Mocha.prototype.reporter.call(context, name);
      return new context._reporter(runner);
    };

    initializeReporter(options.reporter);

    featureIndex = 0;
    runner.emit('start');
    callback();
  });

  this.registerHandler('BeforeFeature', function (event, callback) {
    scenarioIndex = 0;
    runner.emit('suite', runner.suite.suites[featureIndex]);
    callback();
  });

  this.registerHandler('BeforeScenario', function (event, callback) {
    stepIndex = 0;
    runner.emit('suite', runner.suite.suites[featureIndex].suites[scenarioIndex]);
    callback();
  });

  this.registerHandler('BeforeStep', function (event, callback) {
    runner.emit('test', runner.suite.suites[featureIndex].suites[scenarioIndex].tests[stepIndex]);
    callback();
  });

  this.registerHandler('StepResult', function (event, callback) {
    var stepResult = event.getPayloadItem('stepResult');
    var test = runner.suite.suites[featureIndex].suites[scenarioIndex].tests[stepIndex];
    test.duration = stepResult.getDuration() / 1e6;
    if (stepResult.isSuccessful()) {
      runner.emit('pass', test);
    } else if (stepResult.isPending()) {
      runner.emit('pending', test);
    } else if (stepResult.isUndefined() || stepResult.isSkipped()) {
      runner.emit('pending', test);
    } else {
      var err = stepResult.getFailureException();
      runner.emit('fail', test, err);
    }
    callback();
  });

  this.registerHandler('AfterStep', function (event, callback) {
    runner.emit('test end', runner.suite.suites[featureIndex].suites[scenarioIndex].tests[stepIndex++]);
    callback();
  });

  this.registerHandler('AfterScenario', function (event, callback) {
    runner.emit('suite end', runner.suite.suites[featureIndex].suites[scenarioIndex++]);
    callback();
  });

  this.registerHandler('AfterFeature', function (event, callback) {
    runner.emit('suite end', runner.suite.suites[featureIndex++]);
    callback();
  });

  this.registerHandler('AfterFeatures', function (event, callback) {
    runner.emit('end');
    callback();
  });

};