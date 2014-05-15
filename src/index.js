var Mocha = require('mocha');

module.exports = function (options) {

  process.argv.reduce(function (obj, value) {
    var groups = /^--(\w+):(.+)$/.exec(value);
    if (groups !== null) {
      obj[groups[1]] = groups[2];
    }
    return obj;
  }, options || (options = {}));

  var runner = new Mocha.Runner(new Mocha.Suite(''));

  var initializeReporter = function (name) {
    var context = {};
    Mocha.prototype.reporter.call(context, name);
    return new context._reporter(runner);
  };

  initializeReporter(options.reporter);

  // currently there is no way to unregister Cucumber's "formatter" (cucumber@0.4.0)
  // as the result resorting to some REALLY nasty stuff here (suppressing output outside "safe" boundaries)

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

  var stack = (function () {
    var _stack = [];
    var self = {
      push: function (runnable) {
        runnable.parent = self.peek();
        _stack.push(runnable);
        return runnable;
      },
      peek: function () {
        return _stack.length ? _stack[_stack.length - 1] : void 0;
      },
      pop: function () {
        return _stack.pop();
      }
    };
    return self;
  }());

  this.registerHandler('BeforeFeatures', function (event, callback) {
    runner.emit('start');
    callback();
  });

  this.registerHandler('BeforeFeature', function (event, callback) {
    var feature = event.getPayloadItem('feature');
    var suite = new Mocha.Suite(feature.getName());
    runner.suite.addSuite(suite);
    runner.emit('suite', stack.push(suite));
    callback();
  });

  this.registerHandler('BeforeScenario', function (event, callback) {
    var scenario = event.getPayloadItem('scenario');
    var suite = new Mocha.Suite(scenario.getName());
    stack.peek().addSuite(suite);
    runner.emit('suite', stack.push(suite));
    callback();
  });

  this.registerHandler('BeforeStep', function (event, callback) {
    var step = event.getPayloadItem('step');
    var test = new Mocha.Test(step.getKeyword() + step.getName(), function () { /* omitted */ });
    stack.peek().addTest(test);
    runner.emit('test', stack.push(test));
    callback();
  });

  this.registerHandler('StepResult', function (event, callback) {
    var stepResult = event.getPayloadItem('stepResult');
    var test = stack.peek();
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
    runner.emit('test end', stack.pop());
    callback();
  });

  this.registerHandler('AfterScenario', function (event, callback) {
    runner.emit('suite end', stack.pop());
    callback();
  });

  this.registerHandler('AfterFeature', function (event, callback) {
    runner.emit('suite end', stack.pop());
    callback();
  });

  this.registerHandler('AfterFeatures', function (event, callback) {
    runner.emit('end');
    callback();
  });

};