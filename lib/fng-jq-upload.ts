// TODO set busboy filesize limit
import express = require("express");
import mongoose = require("mongoose");
import mongodb = require("mongodb");
import path = require("path");
import busboy = require("busboy");
import * as ims from "imagemagick-stream";
import * as stream from "stream";

import { fngServer } from "forms-angular/dist/server";
import { BusboyConfig } from "busboy";

// the numeric values are written to the document property that stores the reference to the file (which
// will be of type FileSchemaObj, using schema FileSchema - see below).
const StoreInMongoDB = 1;

export interface IStoredFileInfo {
  name: string;
  size: number;
  location: number; // might be StoreInMongoDB, or something else if a StorageDelegate is used
  id: string;
  thumbnailId?: string;
}

export interface IStorageLimits {
  maxFileSize?: number;
}

export type StorageLimitsDelegate = (
  req: express.Request,
  fieldname: string,
  resource: fngServer.ResourceExport
) => Promise<IStorageLimits>;

export type StorageDelegate = (
  req: express.Request,
  fieldname: string,
  file: stream,
  filename: string,
  resource: fngServer.ResourceExport,
  thumbnailOpts: ISchemaThumbnailOpts
) => Promise<IStoredFileInfo>;

export type RetrievalDelegate = (req: express.Request, fileId: string, location: number, res: express.Response) => void;

export type DeletionDelegate = (req: express.Request, fileId: string, location: number) => void;

export interface JqUploadOptions {
  debug?: Boolean;
  inhibitAuthentication?: Boolean;
  storageDelegate?: StorageDelegate;
  storageLimitsDelegate?: StorageLimitsDelegate;
  retrievalDelegate?: RetrievalDelegate;
  deletionDelegate: DeletionDelegate;
}

export interface FileSchemaObj {
  _id: mongoose.Types.ObjectId;
  filename: string;
  size: number;
  location?: number; // only optional because old data has no value (in which case a value of StoreInMongoDB should be assumed)
  thumbnailId?: mongoose.Types.ObjectId; // only optional because old data has no value
}

export const FileSchema = {
  filename: String,
  size: Number,
  location: Number, // valueof StoredFileLocation
  thumbnailId: {
    type: mongoose.Schema.Types.ObjectId,
    form: {
      hidden: true, // needed to prevent fng from complaining about "No supported select lookup type..."
    },
  },
};

export interface IMetaData {
  original_id: any;
}

export interface IMongoDBFileStorageOptions {
  filename: string;
  metadata?: IMetaData;
}

export interface ISchemaThumbnailOpts {
  required: boolean;
  width?: number;
  height?: number;
}

interface Fng {
  app: express.Application;
  options: fngServer.FngOptions;
  mongoose: mongoose.Mongoose;
  getResource(resourceName: string): fngServer.ResourceExport;
}

export const TOO_LARGE_FLAG = "__tooLarge";
export class TooLargeError extends Error {
  // need a property like this because instanceof does not work with the compiler options currently used for this project
  [TOO_LARGE_FLAG] = true;
}

function storeOneFileInMongoDB(
  gridFSBucket: mongodb.GridFSBucket,
  file: stream,
  options: IMongoDBFileStorageOptions,
  callback: (err: Error | null, file?: mongodb.GridFSFile) => void
) {
  const internalOptions: mongodb.GridFSBucketWriteStreamOptions = {};
  if (options.metadata) {
    internalOptions.metadata = options.metadata;
  }
  const stream = gridFSBucket.openUploadStream(options.filename, internalOptions);
  stream.once("finish", (file: mongodb.GridFSFile) => {
    callback(null, file);
  });
  stream.on("error", (err: Error) => {
    callback(err);
  });
  file.on("limit", () => {
    stream.abort();
    callback(new TooLargeError());
  });
  file.pipe(stream);
}

export function createThumbnailStreamIfNeeded(opts: ISchemaThumbnailOpts, filename: string): any {
  if (!opts.required) {
    return;
  }
  const typeFromExtension = path.extname(filename).toLowerCase();
  // Create thumbnails on ImageTragick 'safe-ish' types (according to https://lcamtuf.blogspot.co.uk/2016/05/clearing-up-some-misconceptions-around.html)
  if (![".gif", ".png", ".jpg", ".jpeg"].includes(typeFromExtension)) {
    return;
  }
  const type = typeFromExtension.slice(1, 4);
  let size: string;
  if (opts.height && opts.width) {
    size = `${opts.width}x${opts.height}`;
  } else if (opts.height) {
    // this is the preferable scenario in most cases - a height but not a width (which will be whatever the aspect ratio
    // results in it being)
    size = `x${opts.height}`;
  } else if (opts.width) {
    size = `${opts.width}x`;
  } else {
    throw new Error("opts must specify a height or a width or both when required is true");
  }
  // > tells it not to make the image bigger if it is already smaller than the dimensions specified here.  Unlikely, but
  // you never know...
  size += ">";
  // unsharp can improve the image quality after the resize.  See https://legacy.imagemagick.org/Usage/thumbnails/#height.
  return ims().thumbnail(size).autoOrient().op("unsharp", "0x.5").inputFormat(type).outputFormat(type);
}

function storeInMongoDB(
  fng: Fng,
  resource: fngServer.ResourceExport,
  file: stream,
  filename: string,
  schemaThumbnailOpts: ISchemaThumbnailOpts
): Promise<IStoredFileInfo> {
  const mongo = fng.mongoose.mongo;
  const bucketName = resource.model.collection.name;
  const bucket = new mongo.GridFSBucket(fng.mongoose.connection.db, { bucketName });
  const opts: IMongoDBFileStorageOptions = { filename };
  return new Promise((resolve, reject) => {
    storeOneFileInMongoDB(bucket, file, opts, (writeError: Error, storedFile: mongodb.GridFSFile) => {
      if (writeError) {
        return reject(writeError);
      }
      const id = storedFile._id.toString();
      const storedFileInfo: IStoredFileInfo = {
        id,
        location: StoreInMongoDB,
        name: storedFile.filename,
        size: storedFile.length,
      };
      const tnStream = createThumbnailStreamIfNeeded(schemaThumbnailOpts, storedFile.filename);
      if (tnStream) {
        const readstream = bucket.openDownloadStream(storedFile._id);
        readstream.on("error", (readError: Error) => {
          return reject(readError);
        });
        const tnFile = readstream.pipe(tnStream);
        const tnOpts: IMongoDBFileStorageOptions = {
          filename: "thumbnail_" + filename,
          metadata: { original_id: id }, // store the id of the thing that this is a thumbail for
        };
        storeOneFileInMongoDB(bucket, tnFile, tnOpts, (tnWriteErr: Error, storedTnFile: mongodb.GridFSFile) => {
          if (tnWriteErr) {
            return reject(tnWriteErr);
          }
          storedFileInfo.thumbnailId = storedTnFile._id.toString();
          return resolve(storedFileInfo);
        });
      } else {
        return resolve(storedFileInfo);
      }
    });
  });
}

export function controller(
  fng: Fng,
  processArgs: (options: any, array: Array<any>) => Array<any>,
  options: JqUploadOptions
) {
  const modifiedFngOpts = Object.assign({}, fng.options);
  if (options.inhibitAuthentication) {
    delete modifiedFngOpts.authentication;
  }

  // the route used when saving an upload
  fng.app.post.apply(
    fng.app,
    processArgs(modifiedFngOpts, [
      "file/upload/:model/:fieldName",
      function (req: express.Request, res: express.Response) {
        const modelName = req.params.model;
        const resource = fng.getResource(modelName);
        const fieldName = req.params.fieldName;
        const schemaThumbnailOpts: ISchemaThumbnailOpts = { required: true };
        if (resource.model) {
          const fieldDef = resource.model.schema.path(fieldName);
          if (fieldDef) {
            const directiveOpts = fieldDef.options.form?.fngJqUploadForm;
            if (directiveOpts) {
              if (directiveOpts.defaultThumbnail) {
                schemaThumbnailOpts.required = false;
              } else {
                schemaThumbnailOpts.width = directiveOpts.width || schemaThumbnailOpts.width;
                schemaThumbnailOpts.height = directiveOpts.height || schemaThumbnailOpts.height;
              }
            }
          }
        }
        // the height of the thumbnail is typically more significant than the width (because thumbnails are
        // generally portrait, and vertical screen real estate is typically more limited).  so, if the schema
        // doesn't provide a width or a height, we'll provide a default height only.  the aspect ratio will
        // be preserved in this scenario.
        if (schemaThumbnailOpts.required && !schemaThumbnailOpts.height && !schemaThumbnailOpts.width) {
          schemaThumbnailOpts.height = 100;
        }
        const storageLimitsPromise = options.storageLimitsDelegate?.(req, fieldName, resource) || Promise.resolve({});
        storageLimitsPromise.then((storageLimits: IStorageLimits) => {
          const bb = busboy({
            headers: req.headers,
            limits: { fileSize: storageLimits.maxFileSize },
          });
          const filePromises: Promise<IStoredFileInfo | string>[] = [];
          bb.on("file", (internalFieldname: string, file: stream, fileInfo) => {
            // if we have been provided with a storageDelegate and it returns something, it is taking responsibility
            // for storing the file.  If we haven't, or it doesn't, we'll do it ourselves (to MongoDB)
            filePromises.push(
              (
                options.storageDelegate?.(req, fieldName, file, fileInfo.filename, resource, schemaThumbnailOpts) ||
                storeInMongoDB(fng, resource, file, fileInfo.filename, schemaThumbnailOpts)
              ) // we need to catch here rather than waiting for the promise.all(..) call that we make in the bb.on("close")
                // handler, below, because otherwise the error will leak out to the "next" handler and get reported to Sentry
                .catch((e) => {
                  // can't use instanceof here (think the compiler options need to be more up-to-date to allow that)
                  if (TOO_LARGE_FLAG in e) {
                    let units = "byte";
                    let value = storageLimits.maxFileSize;
                    if (value % 1024 === 0) {
                      value = value / 1024;
                      units = "kilobyte";
                      if (value % 1024 === 0) {
                        value = value / 1024;
                        units = "megabyte";
                      }
                    }
                    if (value > 1) {
                      units += "s";
                    }
                    return `The file is too large.  The maximum permitted size is ${value} ${units}.`;
                  } else {
                    return e.message || "An unexpected error occurred";
                  }
                })
            );
          });
          bb.on("close", () => {
            // we'll send errors back as an object because the front-end seems to be expecting JSON, even when
            // the status indicates an error.  this is parsed by the fileuploadfail handler at the front end.
            Promise.all(filePromises)
              .then(function (filesOrErrorMessages) {
                const firstErrorMsg = filesOrErrorMessages.find((result) => typeof result === "string");
                if (firstErrorMsg) {
                  res.status(500).send({ error: firstErrorMsg });
                } else {
                  res.send({ files: filesOrErrorMessages });
                }
              })
              .catch((e) => {
                // because of the catch that is chained to each promise which we added to filePromises earlier, I
                // don't think we should ever get here
                const msg = e.message || "An unexpected error occurred";
                return res.status(500).send({ error: msg });
              });
          });
          req.pipe(bb);
        });
      },
    ])
  );

  // the route used when retrieving the thumbnail for a previously-uploaded file
  fng.app.get.apply(
    fng.app,
    processArgs(modifiedFngOpts, [
      "file/:model/:location/thumbnail/:fileId",
      async function (req: express.Request, res: express.Response) {
        try {
          const location = Number.parseInt(req.params.location);
          if (location !== StoreInMongoDB) {
            throw new Error("This URL should only be used for files stored in MongoDB");
          }
          const mongo = fng.mongoose.mongo;
          const modelName = req.params.model;
          const fileId = req.params.fileId;
          const resource = fng.getResource(modelName);
          const files = fng.mongoose.connection.db.collection(resource.model.collection.collectionName + ".files");
          const cursor = files.find({ "metadata.original_id": fileId });
          const thumbnailData = await cursor.toArray();
          const idObj = thumbnailData.length === 1 ? thumbnailData[0]._id : new mongo.ObjectId(fileId);
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

  // the route used when retrieving a previously-uploaded file
  fng.app.get.apply(
    fng.app,
    processArgs(modifiedFngOpts, [
      "file/:model/:location/:fileId",
      function (req: express.Request, res: express.Response) {
        try {
          const location = Number.parseInt(req.params.location);
          const fileId = req.params.fileId;
          if (location === StoreInMongoDB) {
            const mongo = fng.mongoose.mongo;
            const modelName = req.params.model;
            const resource = fng.getResource(modelName);
            const bucketName = resource.model.collection.name;
            const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, { bucketName });
            const readstream = gridFSBucket.openDownloadStream(new mongo.ObjectId(fileId));
            readstream.on("error", function (err: Error) {
              res.status(400).send(err.message);
            });
            readstream.pipe(res);
          } else {
            if (!options.retrievalDelegate) {
              throw new Error(`A retrievalDelegate is required when the storage location is not MongoDB`);
            }
            options.retrievalDelegate(req, fileId, location, res);
          }
        } catch (e) {
          console.log(e.message);
          res.sendStatus(400);
        }
      },
    ])
  );

  // the route used when deleting a file (when clicking on the trashcan icon that is provided alongside the thumbnail)
  fng.app.delete.apply(
    fng.app,
    processArgs(modifiedFngOpts, [
      // if you think you want to change this route (in particular, changing the name of the :id param),
      // ensure that the host app does not (through the modifiedFngArgs) inject some additional handlers
      // (perhaps related to permissions) which expect certain params to exist.
      // Plait developer note: :id is assumed to exist in the async function check() of permissions.ts
      "file/:model/:location/:id",
      async function (req: express.Request, res: express.Response) {
        try {
          const location = Number.parseInt(req.params.location);
          const fileId = req.params.id;
          if (location === StoreInMongoDB) {
            const mongo = fng.mongoose.mongo;
            const model = req.params.model;
            const resource = fng.getResource(model);
            const gridFSBucket = new mongo.GridFSBucket(fng.mongoose.connection.db, {
              bucketName: resource.model.collection.name,
            });
            // For older data, the thumbnailId was not stored alongside the id of the file itself, and cannot
            // therefore have been provided to us via the querystring.  In this case, we will attempt to find it by
            // reference to the metadata.
            let thumbnailId = req.query.thumbnailId as string;
            if (!thumbnailId) {
              const collection = fng.mongoose.connection.collection(resource.model.collection.name + ".files");
              try {
                const obj = await collection.findOne({ "metadata.original_id": fileId }, {});
                if (obj) {
                  thumbnailId = obj._id.toString();
                }
              } catch {
                // ignore any errors
              }
            }
            await gridFSBucket.delete(new mongo.ObjectId(fileId));
            if (thumbnailId) {
              await gridFSBucket.delete(new mongo.ObjectId(thumbnailId));
            }
          } else {
            if (!options.deletionDelegate) {
              throw new Error(`A deletionDelegate is required when the storage location is not MongoDB`);
            }
            // for files that are NOT stored in MongoDB, the querystring should have the filename and - where appropriate -
            // the thumbnail id.  we just pass this through to the delegate which should refer to req.query.fn and
            // req.query.thumbnailId and delete the one or two files accordingly
            options.deletionDelegate(req, fileId, location);
          }
          res.sendStatus(200);
        } catch (e) {
          res.status(500).send(e.message);
        }
      },
    ])
  );

  let retVal: Partial<fngServer.IFngPlugin> = {};
  // here we can set up any necessary values to be returned as retVal.dependencyChecks (see fng-audit for an example).
  // but in our case, we have nothing, so we can simply...
  return retVal;
}
