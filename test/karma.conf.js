'use strict';

module.exports = function (config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine'],
    files: [
      'client/bower_components/jquery/jquery.js',
      'client/bower_components/angular/angular.js',
      'client/bower_components/angular-mocks/angular-mocks.js',
      'client/bower_components/forms-angular/dist/forms-angular.js',
      'client/bower_components/forms-angular/bower_components/angular-sanitize/angular-sanitize.js',
      'client/bower_components/forms-angular/bower_components/angular-messages/angular-messages.js',
      'client/bower_components/forms-angular/bower_components/angular-ui-bootstrap-bower/ui-bootstrap.js',
      'client/bower_components/forms-angular/bower_components/ngInfiniteScroll/build/ng-infinite-scroll.js',
      'client/bower_components/forms-angular/bower_components/angular-elastic/elastic.js',
      'client/bower_components/blueimp-file-upload/js/cors/jquery.postmessage-transport.js',
      'client/bower_components/blueimp-file-upload/js/cors/jquery.xdr-transport.js',
      'client/bower_components/blueimp-file-upload/js/vendor/jquery.ui.widget.js',
      'client/bower_components/blueimp-file-upload/js/jquery.fileupload.js',
      'client/bower_components/blueimp-file-upload/js/jquery.fileupload-process.js',
      'client/bower_components/blueimp-file-upload/js/jquery.fileupload-validate.js',
      'client/bower_components/blueimp-file-upload/js/jquery.fileupload-image.js',
      'client/bower_components/blueimp-file-upload/js/jquery.fileupload-audio.js',
      'client/bower_components/blueimp-file-upload/js/jquery.fileupload-video.js',
      'client/bower_components/blueimp-file-upload/js/jquery.fileupload-ui.js',
      'client/bower_components/blueimp-file-upload/js/jquery.fileupload-angular.js',
      'client/bower_components/blueimp-file-upload/js/jquery.iframe-transport.js',
      'app/fng-jq-upload.js',
      'templates/*.html',
      'test/helpers/**/*.js',
      'test/unit/**/*.js'
    ],

    autoWatch: true,
    usePolling: true,

    browsers: ['PhantomJS'],

    // use dots reporter, as travis terminal does not support escaping sequences
    // possible values: 'dots', 'progress'
    // CLI --reporters progress
    reporters: ['progress', 'junit'],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    },
    plugins: [
      'karma-jasmine',
      'karma-phantomjs-launcher',
      'karma-ng-html2js-preprocessor',
      'karma-junit-reporter'
    ],
    ngHtml2JsPreprocessor: {
      // strip this from the file path
      stripPrefix: ''
    },
    preprocessors: {
      'templates/*.html': 'ng-html2js'
    }
  });
};
