// The jss API
//

var lib = require('./lib')
  , util = require('util')
  , path = require('path')
  , events = require('events')
  ;

var package_json = path.join(path.dirname(module.filename), 'package.json');
package_json = require('fs').readFileSync(package_json);
package_json = JSON.parse(package_json);
exports.version = package_json.version;

function Stream () {
  var self = this;
  events.EventEmitter.call(self);

  self.test = null;
  self.format = null;
  self.in = null;
  self.out = null;
  self.pre    = null;
  self.suf    = null;
  self.head   = null;
  self.tail   = null;
  self.silent = null;
  self.state  = null;
  self.on_end = null;

  self.on('line', function on_line(line) {
    var obj;
    try      { obj = JSON.parse(line) }
    catch(e) { return; /* Nothing to do */ }

    self.emit('json', obj);
  })

  self.on('json', function on_json(obj) {
    var scope = {}

    var state = self.state.jss;
    var line_num = lib.inc(state.awk, '$INPUT_LINE_NUMBER');

    state.awk['$INPUT_LINE_NUMBER'] = line_num;
    state.awk['$NR']                = line_num;

    var key

    for (key in obj)
      scope[key] = obj[key];

    for (key in state.awk)
      scope[key] = state[key];

    scope['$']  = obj;
    scope['$s'] = self.state.caller;

    var result = false;
    try      { result = self.test.apply(obj, [scope]) }
    catch(e) { return; }

    if( !! (result) )
      self.emit('match', obj, result);
  })

  function insert(type) {
    var val = self[type];
    if(val) {
      if(typeof val === 'string')
        self.out.write(val);
      else if(typeof val === 'function')
        self.out.write(val());
      else
        throw new Error("Unknown insertion: " + type);
    }
  }

  self.on('match', function on_match(obj, result) {
    var scope = {};

    var state = self.state.jss;

    state.awk['$ONR'] = lib.inc(state.awk, '$ONR')

    if(state.awk['$ONR'] === 1) // First-time to output
      insert('head');

    var scope = {}
      , key
      ;

    for (var key in state.awk)
      scope[key] = state.awk[key];

    scope['$']  = obj;
    scope['$_'] = result;
    scope['$s'] = self.state.caller;

    for (var key in lib.formatting)
      scope[key] = lib.formatting[key];

    scope.require = require;
    scope.util    = util;

    try {
      var output = self.format.apply(obj, [scope]);
      if(output) {
        insert('pre');
        self.out.write(output);
        insert('suf');
        self.out.write("\n");
      }
    } catch (e) {
      if(self.silent)
        return; /* Nothing to do */
      throw e;
    }
  })
}
util.inherits(Stream, events.EventEmitter);

Stream.prototype.pump = function() {
  var self = this
    , unterminated = ""
    ;

  if(!self.test)
    throw new Error("No JS test defined");

  lib.setdefault(self      , 'state' , {});
  lib.setdefault(self.state, 'caller', { "A":[], "C":0, "S":"" }); // An array, a counter, and a string.
  lib.setdefault(self.state, 'jss'   , {});

  lib.setdefault(self.state.jss, 'awk', {});
  lib.setdefault(self.state.jss.awk, '$PID', process.pid);
  lib.setdefault(self.state.jss.awk, '$$'  , process.pid);
  lib.setdefault(self.state.jss.awk, '$ENV', process.env);

  function default_formatter(scope) {
    return scope['$']; // Default behavior is to output the object unmodified.
  }

  var inner_formatter = self.format || default_formatter;
  self.format = function format_result(scope) {
    var result = inner_formatter.apply(this, [scope]);

    return printable(result);
  }

  if(self.prefix)
    self.emit('line', self.prefix);

  self.in.setEncoding('utf8');
  self.in.on('data', function on_data(chunk) {
    var ready_lines = [];
    chunk.split(/\r?\n/).forEach(function(line, a, lines) {
      if(a === 0) {
        line = unterminated + line;
        unterminated = "";
      }

      if(a + 1 === lines.length)
        unterminated = line;
      else
        ready_lines.push(line.replace(/,\s*$/, "")); // Strip possible comma and spaces
    })

    var a, line;
    for(a = 0; a < ready_lines.length; a++) {
      line = ready_lines[a];
      self.emit('line', line);
    }
  })

  self.in.on('end', function() {
    var result, scope;

    if(self.on_end) {
      result = undefined;
      scope = { '$s'     : self.state.caller
              , 'require': require
              , 'util'   : util
              };
      try        { result = self.on_end.call(self, scope); }
      catch (er) { /* noop */ }

      if(Array.isArray(result))
        result.forEach(function(elem) {
          self.out.write(printable(elem) + "\n");
        })

      else if(typeof result !== 'undefined')
        self.out.write(printable(result) + "\n");
    }

    self.out.write(self.tail || '');
  })

  self.in.on('error', function(er) {
      console.error("jss: " + er);
  })
}

exports.Stream = Stream;

//
// Utilities
//

function printable(obj) {
  if(typeof obj === 'function')
    return obj();

  if(typeof obj === 'object')
    return JSON.stringify(obj);

  return "" + obj;
}
