JSON Sed
========

JSS is like Unix sed ("stream editor") for JSON.

If you've got a stream of JSON blobs (such as output from CouchDB or MongoDB), JSS is a quick way to filter and modify the JSON in a Unix pipeline.

Wherever possible, JSS draws inspiration from sed, awk, and Perl; however the top priority is convenience and usefulness.

## Input Stream

JSS expects JSON objects, one per line, and it outputs JSON objects, one per line. Helpfully, it ignores commas at the end of lines, and it ignores lines which don't parse as JSON.

This stream

    $ cat example_stream.json
    Hello, JSS. This line won't parse! And neither will the next.
    [
      {"but": "this one will", "awesome": true},
      {"and": "this will too"}
    ]
    
    The blank line above and this one are, of course, ignored.
    {"finally": "This line will parse", "awesome": "you bet!"}
    And we're done!

would parse as

    {"but": "this one will", "awesome":true},
    {"and": "this will too"}
    {"finally": "This line will parse", "awesome": "you bet!"}

## The test expression

The only required argument to JSS is a Javascript expression to filter the stream. If the expression returns "truthy," then the object will pass through the stream.

To match all lines which parse as JSON, (i.e., to clean the stream and output only the good stuff), use the expression `true` or `1`, or the shortcut `-`. Notice that JSS has parsed and re-encoded the JSON, so you know it's valid.

    $ cat example_stream.json | jss -
    {"but":"this one will","awesome":true}
    {"and":"this will too"}
    {"finally":"This line will parse","awesome":"you bet!"}

Each object's keys are acessible right in the expression. For example, to see the "awesome" objects from the example above:

    $ cat example_stream.json | jss 'awesome'
    {"but":"this one will","awesome":true}
    {"finally":"This line will parse","awesome":"you bet!"}

The object is also set to the `$` variable which is convenient for looking at the object as a whole. For example, to see objects with only one key:

    $ cat example_stream.json | jss 'Object.keys($).length == 1'
    {"and":"this will too"}

## The modifier expression

By default, JSS outputs the JSON objects which passed the input filter. But you can supply an optional second argument (another Javascript expression) to indicate any output you want. Objects will be converted to JSON, strings will output as-is.

For example, to show the number of keys in the exmample input, as a text string:

    $ cat example_stream.json | jss awesome '"Awesome is: " + awesome'
    Awesome is: true
    Awesome is: you bet!

Or, to output a new JSON object with a key count:

    $ cat example_stream.json | jss - '{count:Object.keys($).length, orig:$}'
    {"count":2,"orig":{"but":"this one will","awesome":true}}
    {"count":1,"orig":{"and":"this will too"}}
    {"count":2,"orig":{"finally":"This line will parse","awesome":"you bet!"}}

Note, for convenience, the expression is a **Javascript object**, not necessarily a **JSON object**.

An optional second argument will indicate what JSS should output instead of the
