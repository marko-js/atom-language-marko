var season = require('season');
var path = require('path');

var language = season.readFileSync(path.join(__dirname, '../snippets/language-marko.cson'));
var snippets = language['.text.html.marko'];

var snippetsOut = {};

var out = {
    marko: {
        extends: 'html',
        snippets: snippetsOut
    }
};



Object.keys(snippets).forEach(function(name) {
    var snippet = snippets[name];
    var prefix = snippet.prefix;
    var body = snippet.body;

    snippetsOut[prefix] = body;
});

console.log(JSON.stringify(out, null, 4));