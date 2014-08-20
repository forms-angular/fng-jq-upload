# fng-jq-upload

jQuery file upload plugin for forms-angular, storing data in Mongo.  A wrapper for BlueImp jquery-file-upload).

## Usage

On the server side: 

    npm install fng-jq-upload
    
In the call to create the forms-angular object (normally in the main server express start-up module) add a key of 
*JQMongoFielUploader* as follows:
     
    var DataFormHandler = new (formsAngular)(app, {JQMongoFileUploader: {}});     

There are currently no configuration options, so just pass an empty object.

For the client side you need to run

    bower install fng-jq-upload
    
Add the following lines to your index.html (or equivalent) file

    <!-- blueimp Gallery styles -->
    <link rel="stylesheet" href="/bower_components/blueimp-gallery/css/blueimp-gallery.css">
    <!-- CSS to style the file input field as button and adjust the Bootstrap progress bars -->
    <link rel="stylesheet" href="/bower_components/fng-jqfile-upload/css/jquery.fileupload.css">
    <link rel="stylesheet" href="/bower_components/fng-jqfile-upload/css/jquery.fileupload-ui.css">
    
    <script type="text/javascript" src="/bower_components/blueimp-load-image/js/load-image.min.js"></script>
    <!-- The Canvas to Blob plugin is included for image resizing functionality -->
    <script type="text/javascript" src="/bower_components/blueimp-canvas-to-blob/js/canvas-to-blob.min.js"></script>
    <!-- blueimp Gallery script -->
    <script type="text/javascript" src="/bower_components/blueimp-gallery/js/jquery.blueimp-gallery.min.js"></script>
    <script type="text/javascript" src="/bower_components/fng-jq-upload/fng-jq-upload.js"></script>
            
File fields need to be set up as follows:

    var uploadSchema = new mongoose.Schema({
      filename: String,
      size: Number
    });

    var mySchema = new mongoose.Schema({
      domrField: String,
      files: {type: [uploadSchema], form: {directive: 'fng-jq-upload-form', add:{autoUpload:true, sizeLimit:50000000}}}
    });

The chunks and file details get stored in the collection.files and collection.chunks collections where 'collection' is
the collection in which the data for mySchema is stored