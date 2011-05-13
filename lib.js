// Miscellaneous library functions
//

function setdefault(obj, key, def) {
  if(typeof obj[key] === 'undefined' || obj[key] === null)
    obj[key] = def;

  return obj[key];
}

function inc(obj, key) {
  var val = setdefault(obj, key, 0);
  return val + 1;
}

function tab_separate() {
  return Array.prototype.slice.apply(arguments).map(function(x) { return "" + x }).join('\t');
}

function keyval_line(key, val) {
  if(typeof key !== 'string')
    throw new Error("Bad key for keyval: " + key);

  return JSON.stringify(key) + ":" + JSON.stringify(val);
}

module.exports = { 'inc'        : inc
                 , 'setdefault' : setdefault
                 };

module.exports.formatting = { 'kv' : keyval_line
                            , 'tab': tab_separate
                            };
