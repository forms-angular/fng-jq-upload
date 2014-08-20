'use strict';

var Gridform = require('gridform');
var Grid = Gridform.gridfsStream;

var FileUploader = function (dataform, processArgFunc, options) {

  function modelGridForm(model) {
    var gridForm;
    var resource = dataform.getResource(model);
    if (resource) {
      gridForm = Gridform({db: resource.model.db.db, mongo: dataform.mongoose.mongo});
      gridForm.root = resource.model.collection.name;
      }
    return gridForm;
  }

  this.options = options;

  dataform.app.post('/file/upload/:model', function (req, res) {
    var model = req.params.model;
    modelGridForm(model).parse(req, function (err, fields, files) {
      if (err) {
        res.send(500);
      } else {
        var myFile = files.files;
        var id = myFile.id.toString();
        res.send({files:[{
          name: myFile.name,
          size: myFile.size,
          url: '/file/' + model + '/' + id,
          thumbnailUrl: '/file/' + model + '/' + id,
          deleteUrl: '/file/' + model + '/' + id,
          deleteType: "DELETE"
        }]});
      }
    });
  });

  dataform.app.get('/file/:model/:id', function (req, res) {
    try {
      var mongo = dataform.mongoose.mongo;
      var model = req.params.model;
      var resource = dataform.getResource(model);
      var gfs = Grid(resource.model.db.db, mongo);
      var readstream = gfs.createReadStream({_id: req.params.id, root:resource.model.collection.name});
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
    var gfs = Grid(resource.model.db.db, mongo);
    var BSON = mongo.BSONPure;
    var o_id = new BSON.ObjectID(req.params.id);

    gfs.collection(rootName).find({_id: o_id}).toArray(function (err, files) {
      if (err) {
        res.send(500);
      } else {
        gfs.remove({_id:req.params.id, root: rootName}, function(err) {
          if (err) {
            res.send(500);
          } else {
            var response = {};
            response[files[0].filename] = true;
            res.send({files: [response]});
          }
        });
      }
    })
  });

};

module.exports = exports = FileUploader;



