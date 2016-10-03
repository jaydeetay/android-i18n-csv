// Android strings reside in xml files under res/values*
// where there is a separate values directory for each locale.
// The can be many individual files, their names could be different
// in each locale.  These utilities will normalize the structure
// so that each value directory will be structured as for English.
// Strings that did not appear in the English version will be dumped
// into an 'orphaned.xml' file.
//
// Method:
// For each file in values, read the strings and store them in a map keyed by id.
// Keep a map of the file names.
// For each values file, parse off the locale and use that as a key for each entry.
// all_strings = {
//   "s1": {
//     "filename": "strings.xml",
//     "translation_description": "This is a string",
//     "en" : "This is the string in English"
//     "fr" : "This is the string in French"
//   },
//   "s2" : {....
//

var _ = require('underscore')
var fs = require('fs');
var argv = require('optimist').argv;
var eyes = require('eyes');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

function add_or_update_entry(
    string_map, lang, id, translation_description, filename, value, type) {
  // English is special
  var map_entry;
  if (lang === 'en') {
    map_entry = {
      "filename": filename,
      "type": type,
      "translation_description": translation_description
    }
    map_entry[lang] = value || "";
  } else {
    map_entry = string_map[id];
    if (!map_entry) {
      //console.log("Orphaned string " + id + " in lang " + lang);
      map_entry = {
	"filename": "orphaned.xml",
        "type": type,
	"translation_description": translation_description,
	"en": ""
      }
    } else {
      map_entry[lang] = value;
    }
  }
  string_map[id] = map_entry;
}


function load_strings(string_map, lang, dir, filename) {
  //console.log("Loading strings for lang " + lang + " in file " + filename);
  var parser = new xml2js.Parser({async: false});
  var filecontents = fs.readFileSync(dir + "/" + filename);
  parser.parseString(filecontents, function (err, result) {
    //eyes.inspect(result);
    var resources = result['resources'];
    if (!resources) return;
    var strings = resources['string'];
    var string_arrays = resources['string-array'];
    if (strings) {
      for (var i = 0; i < strings.length; ++i) {
        var entry = strings[i];
        var id = entry["$"]["name"];
        var translation_description = entry["$"]["translation_description"] || "";
        var value = entry["_"];
        add_or_update_entry(string_map, lang, id, translation_description, filename, value, "string");
      }
    } else if (string_arrays) {
      //eyes.inspect(string_arrays);
      for (var i = 0; i < string_arrays.length; ++i) {
        var entry = string_arrays[i];
        var id = entry["$"]["name"];
        var items = entry["item"];
        for (var j = 0; j < items.length; ++j) {
          var item = items[j];
          var translation_description = "";
          var value = item;
          if (item["$"]) {
            translation_description = item["$"]["translation_description"] || "";
            // Ugly API wart - if there are no attributes the value
            // of the xml tag is obtained differently.
            value = item["_"]
          }
          //eyes.inspect(item);

          add_or_update_entry(string_map, lang, id + ":" + j, translation_description, filename, value, "string-array");
        }
      }
    }
    // Otherwise skip
  });
} 

if (typeof(argv.res) == 'undefined') {
  printUsage();
  eyes.inspect(argv);
  return;
} 

//eyes.inspect(argv);
var config = {
  'resDir': argv.res,
  'wantedLangs': argv.wantedlangs ? argv.wantedlangs.split(',') : null
};
//eyes.inspect(config);

var resDirStats = fs.statSync(config.resDir);
//eyes.inspect(resDirStats);
if (!resDirStats.isDirectory()) {
   console.log('Provided resource path is not a directory');
   return 1;
} 

var english_values_dir = config.resDir + "/values";
if (!fs.statSync(english_values_dir).isDirectory()) {
   console.log('No values subdirectory');
   return 1;
}

var all_english_string_files = fs.readdirSync(english_values_dir);

var all_strings = {};

for (var i = 0; i < all_english_string_files.length; ++i) {
  //console.log('Reading ' + all_english_string_files[i]);
  load_strings(all_strings, 'en', english_values_dir, all_english_string_files[i]);
}

var all_other_value_dirs = _.filter(fs.readdirSync(config.resDir),
    function(s) {return s.substr(0, 7) === 'values-';});
//console.log(all_other_value_dirs);

all_langs = []
for (var i = 0; i < all_other_value_dirs.length; ++i) {
  subdir = all_other_value_dirs[i];
  lang = subdir.substr(7);
  //console.log(lang);
  all_langs.push(lang);
  lang_dir = config.resDir + "/" + subdir;
  var all_string_files = fs.readdirSync(lang_dir);
  for (var j = 0; j < all_string_files.length; ++j) { 
    load_strings(all_strings, lang, lang_dir, all_string_files[j]);
  }
}

// console.log(all_langs);
// eyes.inspect(all_strings);

header = ['id', 'file', 'type', 'description', 'en'].concat(all_langs);
csv_data = [header];
// console.log(header);

for (var id in all_strings) {
  row = [id, all_strings[id]['filename'], all_strings[id]['type'], all_strings[id]['translation_description'], all_strings[id]['en']];
  for (var i = 0; i < all_langs.length; ++i) {
    row.push(all_strings[id][all_langs[i]] || "");
  }
  csv_data.push(row);
}

//console.log(csv_data);
writeToCsv(csv_data);
return;

// TODO - replace this with the csv library.
function writeToCsv(csvArr) {
  var stringForFile = '';
  for (var i = 0; i < csvArr.length; ++i) {
    var row = csvArr[i];
    var rowStr = '';
    for (var j = 0; j < row.length; ++j) {
      var str = row[j];
      if (str.includes('\n')) {
        str = "Multiline entry - see file";
      }
      /*str = str.replace(/\\'/g, '\'');
      if (str.indexOf('"') != -1) {
        str = str.replace(/"/g, '\\"\\"');
        str = '"' + str + '"';
      } else if (str.indexOf(',') != -1) {
        str = '"' + str + '"';
      }*/
      rowStr += ',' + str;
    }
    rowStr = rowStr.substring(1);
    stringForFile += rowStr + '\n';
  }
  console.log(stringForFile);
}

function printUsage() {
  console.log("Exports contents of Android strings files to csv");
  console.log('Usage:');
  console.log('');
  console.log(
      'node ./export.js --res path/to/res --wantedlangs it,de,fr,nl');
  console.log('If watnedlangs is unspecified, all are output.');
}

