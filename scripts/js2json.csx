// scripts/js2json.csx — parses JS var = [...] to JSON using .NET
// Run: dotnet script scripts/js2json.csx <input.js>
// Or compile: csc scripts/js2json.csx

using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

class Program {
    static string ParseJsValue(string text, ref int pos) {
        while (pos < text.Length && char.IsWhiteSpace(text[pos])) pos++;
        if (pos >= text.Length) return "null";

        char c = text[pos];

        if (c == '\'' || c == '"') {
            char sc = c; pos++;
            var sb = new StringBuilder();
            while (pos < text.Length && text[pos] != sc) {
                if (text[pos] == '\\' && pos + 1 < text.Length) {
                    sb.Append(text[pos]); sb.Append(text[pos + 1]); pos += 2;
                } else {
                    sb.Append(text[pos]); pos++;
                }
            }
            if (pos < text.Length) pos++;
            string s = sb.ToString();
            s = s.Replace("\\", "\\\\").Replace("\"", "\\\"")
                 .Replace("\n", "\\n").Replace("\r", "\\r").Replace("\t", "\\t");
            return "\"" + s + "\"";
        }

        if (c == '{') {
            pos++;
            var pairs = new List<string>();
            while (pos < text.Length) {
                while (pos < text.Length && (char.IsWhiteSpace(text[pos]) || text[pos] == ',')) pos++;
                if (pos >= text.Length || text[pos] == '}') { pos++; break; }
                // Read key
                int ks = pos;
                while (pos < text.Length && (char.IsLetterOrDigit(text[pos]) || text[pos] == '_')) pos++;
                string key = text.Substring(ks, pos - ks);
                // Skip :
                while (pos < text.Length && (char.IsWhiteSpace(text[pos]) || text[pos] == ':')) pos++;
                // Read value
                string val = ParseJsValue(text, ref pos);
                pairs.Add("\"" + key + "\":" + val);
            }
            return "{" + string.Join(",", pairs) + "}";
        }

        if (c == '[') {
            pos++;
            var items = new List<string>();
            while (pos < text.Length) {
                while (pos < text.Length && (char.IsWhiteSpace(text[pos]) || text[pos] == ',')) pos++;
                if (pos >= text.Length || text[pos] == ']') { pos++; break; }
                items.Add(ParseJsValue(text, ref pos));
            }
            return "[" + string.Join(",", items) + "]";
        }

        if (text.Substring(pos).StartsWith("true"))  { pos += 4; return "true"; }
        if (text.Substring(pos).StartsWith("false")) { pos += 5; return "false"; }
        if (text.Substring(pos).StartsWith("null"))  { pos += 4; return "null"; }

        if (c == '-' || char.IsDigit(c)) {
            int ns = pos;
            if (c == '-') pos++;
            while (pos < text.Length && (char.IsDigit(text[pos]) || text[pos] == '.' || text[pos] == 'e' || text[pos] == 'E' || text[pos] == '+' || text[pos] == '-')) pos++;
            return text.Substring(ns, pos - ns);
        }

        pos++;
        return "null";
    }

    static void Main(string[] args) {
        if (args.Length < 1) { Console.Error.WriteLine("Usage: js2json.csx <input.js>"); return; }

        string content = File.ReadAllText(args[0], Encoding.UTF8);
        var m = Regex.Match(content, @"var\s+\w+\s*=\s*(\[[\s\S]*?\]);");
        if (!m.Success) { Console.Write("[]"); return; }

        string jsArray = m.Groups[1].Value;
        int pos = 0;
        string json = ParseJsValue(jsArray, ref pos);
        Console.Write(json);
    }
}
