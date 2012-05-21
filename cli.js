#!/usr/bin/env node
// The jss command-line interface.
//

var util = require('util')
  , jss = require('./jss')
  ;

var usage = 'jss <test predicate> [result expression]';
var argv = require('optimist').boolean(['bulk_docs', 'bulk-docs'])
                              .boolean(['object'])
                              .argv
  , predicate = argv._[0]
  , expression = argv._[1]
  ;

if(predicate === '-')
  predicate = 'true';

var test = new Function('scope', 'with (scope) { return (' + predicate + ') }');
var format = null;

if(argv.version) {
  console.log('jss v' + jss.version);
  process.exit(0);
}

if(!predicate) {
  console.log(usage);
  process.exit(1);
}

if(expression)
  format = new Function('scope', 'with (scope) { return (' + expression + ') }');

var stream = new jss.Stream();
stream.test = test;
stream.format = format;
stream.in = process.openStdin();
stream.out = process.stdout;

if(argv.state) {
  function json_from_file(filename) {
    var data = require('fs').readFileSync(filename).toString('utf8');
    return JSON.parse(data);
  }

  var state_init = new Function('require, util, load', 'return (' + argv.state + ')');
  stream.state = state_init(require, util, json_from_file);
}

if(argv.end)
  stream.on_end = new Function('scope', 'with (scope) { return (' + argv.end + ') }');

if(argv.bulk_docs || argv['bulk-docs']) {
	stream.out.write( '{"docs": [\n' );
	argv.head = '';
	argv.tail = ']}\n';

  stream.pre = function() {
    stream.pre = function() { return ", " };
    return "";
  }
} else if(argv.object) {
  argv.tail = '}';

  stream.pre = function() {
    stream.pre = function() { return ", " };
    return '{ ';
  }
}

; ['pre', 'suf', 'head', 'tail'].forEach(function(arg) {
  if(argv[arg])
    stream[arg] = argv[arg];
})

stream.pump();
