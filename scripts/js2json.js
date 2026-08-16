// scripts/js2json.js — reads JS file, outputs JSON (WSH compatible)
// Usage: cscript //nologo scripts/js2json.js <input.js> [output.json]

// JSON polyfill for WSH JScript
if (typeof JSON === 'undefined') {
    var JSON = {
        stringify: function(obj) {
            return _str(obj, 0);
        }
    };
    function _esc(s) {
        return String(s)
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }
    function _str(v, d) {
        if (d > 50) return '"[Circular]"';
        if (v === null) return 'null';
        if (typeof v === 'undefined') return 'null';
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        if (typeof v === 'number') return String(v);
        if (typeof v === 'string') return '"' + _esc(v) + '"';
        if (v instanceof Array) {
            var parts = [];
            for (var i = 0; i < v.length; i++) parts.push(_str(v[i], d + 1));
            return '[' + parts.join(',') + ']';
        }
        // object
        var pairs = [];
        for (var k in v) {
            if (v.hasOwnProperty(k)) {
                pairs.push('"' + _esc(k) + '":' + _str(v[k], d + 1));
            }
        }
        return '{' + pairs.join(',') + '}';
    }
}

function readFileUtf8(path) {
    var stream = new ActiveXObject('ADODB.Stream');
    stream.Type = 2;
    stream.Charset = 'utf-8';
    stream.Open();
    stream.LoadFromFile(path);
    var text = stream.ReadText(-1);
    stream.Close();
    return text;
}

function writeFileUtf8(path, text) {
    var stream = new ActiveXObject('ADODB.Stream');
    stream.Type = 2;
    stream.Charset = 'utf-8';
    stream.Open();
    stream.WriteText(text);
    stream.SaveToFile(path, 2);
    stream.Close();
}

var fso = new ActiveXObject('Scripting.FileSystemObject');
var args = WScript.Arguments;
if (args.length < 1) {
    WScript.Echo('Usage: js2json.js <input.js> [output.json]');
    WScript.Quit(1);
}

var inFile = args(0);
var outFile = (args.length > 1) ? args(1) : null;

var data = readFileUtf8(inFile);

// Match: var SOMENAME = [...];
var re = /var\s+\w+\s*=\s*(\[[\s\S]*?\]);/;
var m = data.match(re);
if (!m) {
    if (outFile) writeFileUtf8(outFile, '[]');
    WScript.Echo('No match');
    WScript.Quit(0);
}

var arr = eval(m[1]);
var json = JSON.stringify(arr);

if (outFile) {
    writeFileUtf8(outFile, json);
    WScript.StdErr.Write('OK: ' + arr.length + ' items\n');
} else {
    WScript.Echo(json);
}
