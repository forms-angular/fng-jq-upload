'use strict';

var assert = require('assert');
var formsAngular = require('forms-angular');
var express = require('express');
var async = require('async');
var path = require('path');
var fs = require('fs');
var mongoose = require('mongoose');
var request = require('../../node_modules/gridform/test/_request.js');
var gridform = require('gridform');

describe('API', function () {

  var fng, app, db, mongo;

  before(function (done) {
    app = express();

    fng = new (formsAngular)(app, {urlPrefix: '/api/', JQMongoFileUploader: {}});

    mongoose.connect('localhost', 'forms-ng_test');
    mongoose.connection.on('error', function () {
      console.error('connection error', arguments);
    });

    mongoose.connection.on('open', function () {
      // Bootstrap models
      var modelsPath = path.join(__dirname, '/models');
      fs.readdirSync(modelsPath).forEach(function (file) {
        var fname = modelsPath + '/' + file;
        if (fs.statSync(fname).isFile()) {
          fng.addResource(file.slice(0, -3), require(fname));
        }
      });
      done();

    });

  });

  after(function (done) {
    mongoose.connection.db.dropDatabase(function () {
      mongoose.disconnect(function () {
        done();
      });
    });
  });

  describe('upload', function() {

    var address;
    var fn; // switched out for each test

    it('should support files', function(done){

      fn = function (req, res, next) {
        var form = gridform({ db: fng.resources[0].model.db.db, mongo: fng.mongoose.mongo });
        form.parse(req, function (err, fields, files) {
          if (err) return done(err);
          assert.equal(fields['user[name]'], 'Tobi');
          assert(files.text.path);
          assert.equal('File', files.text.constructor.name);

          // https://github.com/aheckmann/gridform/issues/1
          db.collection('fs.files', function (err, coll) {
            assert.ifError(err);
            coll.findOne({ _id: files.text.id }, function (err, doc) {
              assert.ifError(err);
              assert.ok(doc);
              res.end(files.text.name);
            })
          })
        });
      };

      var server = require('http').createServer(app);
      request.address = {address: '0.0.0.0', port: 8999};
      server.listen(request.address.port, request.address.address, fn);
      request()
        .post('/')
        .header('Content-Type', 'multipart/form-data; boundary=foo')
        .write('--foo\r\n')
        .write('Content-Disposition: form-data; name="user[name]"\r\n')
        .write('\r\n')
        .write('Tobi')
        .write('\r\n--foo\r\n')
        .write('Content-Disposition: form-data; name="text"; filename="foo.txt"\r\n')
        .write('\r\n')
        .write('some text here')
        .write('\r\n--foo--')
        .end(function(res){
          assert.equal(res.body, 'foo.txt');
          done();
        });
    });


  });

});