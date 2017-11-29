0.10.0 ** BREAKING CHANGE **

Plugins are now initiated by populating a plugins object in the options passed when initialising forms-angular.

So where 0.9.0 and below had been:

    var fngHandler = new (formsAngular)(mongoose, app, {
      urlPrefix: '/api/',
      JQMongoFileUploader: {module: fngJqUpload.Controller}
    });

becomes

    var fngHandler = new (formsAngular)(mongoose, app, {
      urlPrefix: '/api/',
      plugins: {
        JQMongoFileUploader: { plugin: fngJqUpload.Controller, options: { } },
      }
    });


0.6.2   Remove blueimp-gallery dependency.  Add it to your application if you want it.