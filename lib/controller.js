'use strict';

var Gridform = require('gridform');
var Grid = Gridform.gridfsStream;
var path = require('path');

var ims = require('imagemagick-stream');

var FileUploaderController = function (dataform, processArgFunc, options) {

  this.options = options;
  dataform.mongoose.mongo.BSONPure = require('bson').BSONPure;

  function modelGridForm(model) {
    var gridForm;
    var resource = dataform.getResource(model);
    if (resource) {
      gridForm = new Gridform({db: resource.model.db.db, mongo: dataform.mongoose.mongo});
      gridForm.root = resource.model.collection.name;
    }
    return gridForm;
  }

  dataform.app.post('/file/upload/:model', function (req, res) {
    var model = req.params.model;
    var thisGridForm = modelGridForm(model);
    thisGridForm.parse(req, function (err, fields, files) {
      if (err) {
        res.send(500);
      } else {
        var myFile = files.files;
        var id = myFile.id.toString();
        var response = {
          files: [
            {
              name: myFile.name,
              size: myFile.size,
              url: '/file/' + model + '/' + id,
              deleteUrl: '/file/' + model + '/' + id,
              deleteType: 'DELETE'
            }
          ]
        };

        switch (path.extname(myFile.name)) {
          case '.gif':
          case '.png':
          case '.jpg':
            // Create the thumbnail
            var options = {
              mode: 'w',
              /*jshint -W106 */
              content_type: myFile.type,
              filename: 'thumbnail_' + myFile.path,
              root: myFile.root,
              metadata: {original_id: id} // original id is needed to remove thumbnail afterwards
              /*jshint +W106 */
            };

            var mongo = dataform.mongoose.mongo;
            var resize = ims().resize('100x100').quality(90);
            var resource = dataform.getResource(model);
            var gfs = new Grid(resource.model.db.db, mongo);

            var readstream = gfs.createReadStream({_id: id, root: myFile.root, fsync: true});
            var writestream = gfs.createWriteStream(options);

            // Use 'close' because of stream spec v1.0 (not finish)
            writestream.on('close', function (file) {
              response.files[0].thumbnailUrl = '/file/' + model + '/thumbnail/' + file._id;
              res.send(response);
            });

            // Apply resize transformation as it passes through
            readstream.pipe(resize).pipe(writestream);
            break;
          default:
            response.files[0].thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Icon_New_File_256x256.png';
            res.send(response);
        }
      }
    });
  });

  dataform.app.get('/file/:model/:id', function (req, res) {
    try {
      var mongo = dataform.mongoose.mongo;
      var model = req.params.model;
      var resource = dataform.getResource(model);
      var gfs = new Grid(resource.model.db.db, mongo);
      var readstream = gfs.createReadStream({_id: req.params.id, root: resource.model.collection.name});
      readstream.pipe(res);
    } catch (e) {
      console.log(e.message);
      res.send(400);
    }
  });

  // Thumbnails endpoint
  dataform.app.get('/file/:model/thumbnail/:id', function (req, res) {
    try {
      var mongo = dataform.mongoose.mongo;
      var model = req.params.model;
      var resource = dataform.getResource(model);
      var gfs = new Grid(resource.model.db.db, mongo);
      var readstream = gfs.createReadStream({_id: req.params.id, root: resource.model.collection.name});
      readstream.pipe(res);
    } catch (e) {
      console.log(e.message);
      res.send(400);
    }
  });

  dataform.app.delete('/file/:model/:id', function (req, res) {
    var mongo = dataform.mongoose.mongo;
    var model = req.params.model;
    var resource = dataform.getResource(model);
    var rootName = resource.model.collection.name;
    var gfs = new Grid(resource.model.db.db, mongo);

    // Find the thumbnail image based on the original_id stored in the metadata
    // for the original file and remove it
    var collection = dataform.mongoose.connection.collection(resource.model.collection.name + '.files');
    collection.findOne({ 'metadata.original_id': req.params.id }, { }, function (err, obj) {
      if (err) { return; }
      gfs.remove({_id: obj._id, root: rootName}, function (err) {
        return !err;
      });
    });

    // remove the original file too
    gfs.remove({_id: req.params.id, root: rootName}, function (err) {
      if (err) {
        res.send(500);
      } else {
        res.send(200);
      }
    });

  });

  dataform.app.get('/user', function (req, res) {
    res.send(200, {name: 'tobi'});
  });

};

module.exports = exports = FileUploaderController;



