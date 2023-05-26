// TODO set busboy filesize limit
import express = require("express");
import mongoose = require("mongoose");
import mongodb = require("mongodb");
import path = require("path");

import * as Busboy from "busboy";
import * as ims from "imagemagick-stream";
import * as stream from "stream";

interface JqUploadOptions {
  debug?: Boolean;
  inhibitAuthentication?: Boolean;
}

export interface FileSchemaObj {
  _id: mongodb.ObjectId;
  filename: string;
  size: number;
}

export const FileSchema = {
  filename: String,
  size: Number,
};

export interface IMetaData {
  original_id: any;
}

export interface IOptions {
  filename: string;
  metadata?: IMetaData;
  mode?: string;
  _id?: any;
}

interface Fng {
  app: express.Application;
  options: any;
  mongoose: mongoose.Mongoose;
  getResource(resourceName: string): any;
}

export function Controller(
  fng: Fng,
  processArgs: (options: any, array: Array<any>) => Array<any>,
  options: JqUploadOptions
) {
  this.options = options || {};
  let modifiedOptions = Object.assign({}, fng.options);
  if (this.options.inhibitAuthentication) {
    delete modifiedOptions.authentication;
  }

  fng.app.post.apply(
    fng.app,
    processArgs(modifiedOptions, [
      "file/upload/:model",
      function (req: express.Request, res: express.Response) {
        function uploadFile(
          gridFSBucket: mongodb.GridFSBucket,
          file: stream,
          options: IOptions,
          callback?: (err: Error | null, res?: any) => void
        ) {
          if (callback == null) {
            callback = function () {};
          }
          const mongo = fng.mongoose.mongo;
          options._id = new mongo.ObjectId();
          options.mode = "w";
          const openOptions: any = {};
          if (options.metadata) {
            openOptions.metadata = options.metadata;
          }
          const stream = gridFSBucket.openUploadStream(options.filename, openOptions);
          stream.once("finish", function (metaData: any) {
            return callback(null, metaData);
          });
          stream.on("error", function (err) {
            callback(err);
          });
          return file.pipe(stream);
        }

        const model = req.params.model;
        const busboy = new Busboy({
          headers: req.headers as Busboy.BusboyHeaders,
        });
        const mongo = fng.mongoose.mongo;
        const resource = fng.getResource(model);
        const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
          bucketName: resource.model.collection.name,
        });
        const promises: any = [];
        busboy.on("file", function (fieldname: string, file, filename: string) {
          return promises.push(
            new Promise(function (resolve, reject) {
              const options = {
                filename: filename,
              };
              return uploadFile(gridFSBucket, file, options, function (err: Error, res) {
                if (err) {
                  return reject(err);
                }
                const id = res._id.toString();
                const response: any = {
                  name: res.filename,
                  size: res.length,
                  url: modifiedOptions.urlPrefix + "file/" + model + "/" + id,
                  deleteUrl: modifiedOptions.urlPrefix + "file/" + model + "/" + id,
                  deleteType: "DELETE",
                };
                const typeFromExtension = path.extname(res.filename).toLowerCase();
                // Create thumbnails on ImageTragick 'safe-ish' types (according to https://lcamtuf.blogspot.co.uk/2016/05/clearing-up-some-misconceptions-around.html )
                switch (typeFromExtension) {
                  case ".gif":
                  case ".png":
                  case ".jpg":
                  case ".jpeg": {
                    // Create the thumbnail
                    const options = {
                      filename: "thumbnail_" + res.filename,
                      /*jshint -W106 */
                      metadata: { original_id: id }, // original id is needed to remove thumbnail afterwards
                      /*jshint +W106 */
                    };
                    const type = typeFromExtension.slice(1, 4);
                    const resize = ims().resize("100x100").quality(90).inputFormat(type).outputFormat(type);
                    const readstream = gridFSBucket.openDownloadStream(res._id);
                    readstream.on("error", (err2: Error) => {
                      return reject(err2);
                    });
                    uploadFile(gridFSBucket, readstream.pipe(resize), options, function (err, res) {
                      if (err) {
                        return reject(err);
                      }
                      response.thumbnailUrl =
                        modifiedOptions.urlPrefix + "file/" + model + "/thumbnail/" + res._id.toString();
                      return resolve(response);
                    });
                    break;
                  }
                  default:
                    response.thumbnailUrl =
                      "https://upload.wikimedia.org/wikipedia/commons/7/77/Icon_New_File_256x256.png";
                    return resolve(response);
                }
              });
            })
          );
        });
        busboy.on("finish", function () {
          return Promise.all(promises).then(
            function (results) {
              return res.send({ files: results });
            },
            function (err) {
              return res.status(500).send(err);
            }
          );
        });
        return req.pipe(busboy);
      },
    ])
  );

  fng.app.get.apply(
    fng.app,
    processArgs(modifiedOptions, [
      "file/:model/:id",
      function (req: any, res: any) {
        try {
          const mongo = fng.mongoose.mongo;
          const model = req.params.model;
          const resource = fng.getResource(model);
          const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
            bucketName: resource.model.collection.name,
          });
          const readstream = gridFSBucket.openDownloadStream(new mongo.ObjectId(req.params.id));
          readstream.on("error", function (err: Error) {
            res.status(400).send(err.message);
          });
          readstream.pipe(res);
        } catch (e) {
          console.log(e.message);
          res.sendStatus(400);
        }
      },
    ])
  );

  // Thumbnails endpoint
  fng.app.get.apply(
    fng.app,
    processArgs(modifiedOptions, [
      "file/:model/thumbnail/:id",
      async function (req: express.Request, res: express.Response) {
        try {
          const mongo = fng.mongoose.mongo;
          const model = req.params.model;
          const resource = fng.getResource(model);
          const id: string = req.params.id;
          const files = fng.mongoose.connection.db.collection(resource.model.collection.collectionName + ".files");
          const cursor = files.find({ "metadata.original_id": id });
          const thumbnailData = await cursor.toArray();
          const idObj = thumbnailData.length === 1 ? thumbnailData[0]._id : new mongo.ObjectId(id);
          const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
            bucketName: resource.model.collection.name,
          });
          const readstream = gridFSBucket.openDownloadStream(idObj);
          readstream.on("error", function (err: Error) {
            res.status(400).send(err.message);
          });
          readstream.pipe(res);
        } catch (e) {
          res.status(400).send(e.message);
        }
      },
    ])
  );

  fng.app.delete.apply(
    fng.app,
    processArgs(modifiedOptions, [
      "file/:model/:id",
      function (req: express.Request, res: express.Response) {
        const mongo = fng.mongoose.mongo;
        const model = req.params.model;
        const resource = fng.getResource(model);
        const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
          bucketName: resource.model.collection.name,
        });

        // Find the thumbnail image based on the original_id stored in the metadata
        // for the original file and remove it
        const collection = fng.mongoose.connection.collection(resource.model.collection.name + ".files");
        collection
          .findOne({ "metadata.original_id": req.params.id }, {})
          .then((obj: any) => {
            gridFSBucket.delete(obj._id);
          })
          .catch((err: mongodb.MongoError) => {
            // Ignore any errors
          });

        // remove the original file too
        gridFSBucket
          .delete(new mongo.ObjectId(req.params.id))
          .then(() => {
            res.sendStatus(200);
          })
          .catch((err: mongodb.MongoError) => {
            res.status(500).send(err.message);
          });
      },
    ])
  );
}
