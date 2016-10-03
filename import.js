// Takes a CSV file of translations and recreates the original Android res/values
// files.  See export.js for the format of the file.

var fs		= require('fs');
var argv 	= require('optimist').argv;
var eyes	= require('eyes');
var xml2js	= require('xml2js');
var parse	= require('csv-parse/lib/sync');
var builder = require('xmlbuilder');
var path	= require('path');
var _           = require('underscore');

if (typeof(argv.csv) == 'undefined' || typeof(argv.folderout) == 'undefined') {
  printUsage();
  return;
}

function reprocessStringArrayDocument(doc) {
  // console.log("Reprocessing:");
  // eyes.inspect(doc);
  stringArrays = doc["resources"]["string-array"];
  newStringArrays = [];
  // eyes.inspect(stringArrays);
  _.forEach(stringArrays, function(items, name, stringArrays) {
      // console.log(name);
      // console.log(items);
      newStringArray = {
        "$": {name: name},
        "item": items};
      newStringArrays.push(newStringArray);
  });
  doc["resources"]["string-array"] = newStringArrays; 
  // console.log("Reprocessed:");
  // eyes.inspect(doc);
}


function parseContentForAndroidCompliancy(str) {
	return str.replace(/'/g,'\\\'').replace(/\\\\'/g, '\\\'');
}

function saveTranslations(translationData) {
  var fileToData = {};
  for (var i = 0; i < translationData.length; ++i) {
    var entry = translationData[i];
    _.forEach(entry, function(value, lang, entry) {
        if (_.contains(['id', 'file', 'description', 'type'], lang) || !value) {
          return;
        }
        //console.log(lang);
        //console.log(value);
        //console.log(entry)
        var fileKey = [entry["file"], lang];
        var type = entry["type"];
        if (type == "string-array") {
          // console.log("====");
          var fullId = entry["id"].split(":");
          // console.log(fullId);
          var id = fullId[0];
          var num = fullId[1];
          // console.log(id);
          // console.log(num);
          // console.log(lang); 
          var description = entry["description"] || "";
          var currentDoc = fileToData[fileKey];
          var itemEntry = {
              "$": {"translation_description": description},
              "_": value
          }
          if (currentDoc) {
            var stringArrayEntries = currentDoc["resources"]["string-array"]
            // Append
            var stringArrayEntry = stringArrayEntries[id] || []
            // console.log("append to:");
            // console.log(stringArrayEntry);
            // console.log("with: ");
            // console.log(itemEntry);
            stringArrayEntry.push(itemEntry);
            stringArrayEntries[id] = stringArrayEntry;
          } else {
            // Create
            var stringArrayEntries = {"string-array" : {}};
            stringArrayEntries["string-array"][id] = [itemEntry];
            // console.log(stringArrayEntries);
            currentDoc = {"resources" : stringArrayEntries};
            fileToData[fileKey] = currentDoc;
          }
        } else if (type == "string") {
          return;
          var id = entry["id"];
          var description = entry["description"] || "";
          var currentDoc = fileToData[fileKey];
          var stringEntry = {
              "$": {"name": id, "translation_description": description},
              "_": value
          }
          if (currentDoc) {
            var stringEntries = currentDoc["resources"]["string"]
            // Append
            stringEntries.push(stringEntry);
          } else {
            // Create
            currentDoc = {"resources": {"string": [stringEntry]}};
            fileToData[fileKey] = currentDoc;
          }
        } else {
          console.log("Unknown type for entry " + entry);
        }
    });
  }
  // eyes.inspect(fileToData);
  _.forEach(fileToData, function(docObj, fileKey, fileToData) {
    // console.log(fileKey);
    // eyes.inspect(docObj);
    if (docObj["resources"]["string-array"]) {
      reprocessStringArrayDocument(docObj);
    }
    //console.log();
    var builder = new xml2js.Builder();
    var xml = builder.buildObject(docObj, {rootName: "resources"});
    console.log(xml);
  });
  /*
     writeXml(languageKey, doc);
        */

}

function writeXml(langKey, xmlDoc) {
	try {
		fs.mkdirSync(path.join(config.outDir, 'values-'+langKey));
	} catch (e) {}
	try {
		fs.writeFileSync(path.join(config.outDir, 'values-'+langKey, 'strings.xml'), xmlDoc,'utf8');
	} catch (e) {
		console.log("E. writing");
	}

}

function printUsage() {
	console.log("Usage:");
	console.log("");
	console.log("node ./export.js --csv path/to/strings.csv  --folderout path/to/folder");

}


csvFileContents = fs.readFileSync(argv.csv);
var converted = parse(csvFileContents, {'columns': true});
//console.log(converted);
saveTranslations(converted);

