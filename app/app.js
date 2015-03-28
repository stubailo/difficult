var parseDiff = function (text) {
  var lines = text.split("\n");

  var filesDone = [];

  var currentFile = null;

  var currentLineNumberA = 0;
  var currentLineNumberB = 0;

  var currentChunk = null;

  var initializeChunkAndAddLine = function (type, line) {
    if (currentChunk && currentChunk.type !== type) {
      // keep track of current line
      if (currentChunk.type === "add") {
        currentLineNumberB += currentChunk.lines.length;
      } else if (currentChunk.type === "remove") {
        currentLineNumberA += currentChunk.lines.length;
      } else {
        currentLineNumberA += currentChunk.lines.length;
        currentLineNumberB += currentChunk.lines.length;
      }

      currentFile.chunks.push(currentChunk);
      currentChunk = null;
    }

    if (! currentChunk) {
      currentChunk = {
        type: type,
        lines: [],
        startLineA: currentLineNumberA,
        startLineB: currentLineNumberB
      };
    }

    currentChunk.lines.push(line.substr(1));
  }

  _.each(lines, function (line) {
    if (line.match(/^diff/)) {
      if (currentFile) {
        filesDone.push(currentFile);
      }

      currentFile = {
        chunks: []
      };

      currentLineNumberA = 0;
      currentLineNumberB = 0;

      currentChunk = null;
    } else if (line.match(/^index/)) {
    } else if (line.match(/^---/)) {
      // Get rid of "--- "
      currentFile.filename = line.substr(4);
    } else if (line.match(/^\+\+\+/)) {
      // do nothing
    } else if (line.match(/^@@/)) {
      currentLineNumberA = parseInt(line.split(" ")[1].substr(1).split(",")[0], 10);
      currentLineNumberB = parseInt(line.split(" ")[2].substr(1).split(",")[0], 10);

      initializeChunkAndAddLine("skip", line);

      if (currentChunk) {
        currentFile.chunks.push(currentChunk);
        currentChunk = null;
      }
    } else if (line.match(/^\+/)) {
      initializeChunkAndAddLine("add", line);
    } else if (line.match(/^-/)) {
      initializeChunkAndAddLine("remove", line);
    } else {
      // else, this is just an existing chunk
      initializeChunkAndAddLine("unchanged", line);
    }
  });

  return filesDone;
};

if (Meteor.isClient) {
  var diffFile = new ReactiveVar("");
  var parsedDiff = new ReactiveVar(null);

  HTTP.get("/mydiff.diff", function (err, res) {
    diffFile.set(res.content);
  });

  Tracker.autorun(function () {
    var diffContents = diffFile.get();
    parsedDiff.set(parseDiff(diffContents));
    console.log(parsedDiff.get());
  });

  Template.diff.helpers({
    diff: function () {
      return parsedDiff.get();
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
