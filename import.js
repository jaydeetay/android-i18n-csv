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

/*
   fs.statSync(config.csvFile, function (err, stats) {
  if (err) {
	console.log("File not found or not readable");
		} else {
			fs.readFile(config.csvFile, function(err, data) {
				if (err) {
					console.log("File not readable");

				} else {
					var converted = [];
					csv()
					.from(data, {'columns': true})
					.on('data',function(data,index) {
						converted.push(data);
					})
					.on('end', function() {
						saveTranslations(converted);
					});



				}
			});
		}
	} );
*/


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
          console.log("====");
          var fullId = entry["id"].split(":");
          // console.log(fullId);
          var id = fullId[0];
          var num = fullId[1];
          console.log(id);
          console.log(num);
          console.log(lang); 
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
            console.log(stringArrayEntry);
            console.log(itemEntry);
            stringArrayEntry.push(itemEntry);
            stringArrayEntries[id] = stringArrayEntry;
          } else {
            // Create
            var stringArrayEntries = {"string-array" : {}};
            stringArrayEntries["string-array"][id] = itemEntry;
            console.log(stringArrayEntries);
            currentDoc = {"resources" : stringArrayEntries};
            fileToData[fileKey] = currentDoc;
          }
        } else if (type == "string") { // fix
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
    console.log(fileKey);
    eyes.inspect(docObj);
    //console.log();
    var builder = new xml2js.Builder();
    var xml = builder.buildObject(docObj, {rootName: "resources"});
    console.log(xml);
  });
  /*
    fileKey = {entry["file"], entry["


  var columns = Object.keys(translationData[0]);
  var NUM_METADATA_COLS = 3;
  var nLanguages = columns.length - NUM_META_DATA_COLS;
  for (var i=0; i<nLanguages; i++) {
		var languageIdx	= i+2;
		var languageKey = columns[languageIdx];
		var doc = "<resources>\n";
		var stringArrays = {};
		for (var row=0; row<translationData.length; row++) {
			var item = translationData[row];
			if (item.type == 'string-array') {
				if ( typeof(stringArrays[item.Key]) == 'undefined') {
					stringArrays[item.Key] = [];
				}
				stringArrays[item.Key].push(parseContentForAndroidCompliancy(item[languageKey]));
			} else {
				if (typeof(item[languageKey]) == 'undefined' || item[languageKey] == null ) {
					console.log("Skipped "+item.Key+" Language: "+languageKey);
				} else {
					var extraAttributes = '';
					if (parseContentForAndroidCompliancy(item[languageKey]).indexOf('%s') != -1) {
						extraAttributes = ' formatted="false" ';
					}

					doc+="\t<string name=\""+item.Key+"\""+extraAttributes+">"+parseContentForAndroidCompliancy(item[languageKey])+"</string>\n";
				}
			}
		}

		// Adding stringarrays
		for (key in stringArrays) {
			doc +="\t<string-array name=\""+key+"\">\n";
			for (item in stringArrays[key]) {
				doc +="\t\t<item>"+stringArrays[key][item]+"</item>\n";
			}
			doc +="\t</string-array>\n";
		}

		doc+='</resources>';
		writeXml(languageKey, doc);

	}
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

