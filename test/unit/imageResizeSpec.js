'use strict';

// Photos are shrunk in the browser before they are uploaded, and anything still over the server's limit is refused
// before it is sent, rather than being uploaded only for the server to reject it.
describe('Image resize and size limit', function () {
  var elm, scope, $httpBackend, $timeout;
  var MAX = 3 * 1024 * 1024;

  beforeEach(function () {
    angular.mock.module('formsAngular');
    angular.mock.module('uploadModule');
    angular.mock.module('templates/fileform.html');
  });

  function compile(fngJqUploadForm, limitsResponse) {
    inject(function ($rootScope, $compile, _$httpBackend_, _$timeout_) {
      $httpBackend = _$httpBackend_;
      $timeout = _$timeout_;
      $httpBackend.whenGET('/api/file/limits/Applicant/photo').respond(limitsResponse || { maxFileSize: MAX });
      elm = angular.element('<div><form-input formStyle="horizontalCompact" schema="formSchema"></form-input></div>');
      angular.element(document.body).append(elm);
      scope = $rootScope;
      scope.modelName = 'Applicant';
      scope.formSchema = [
        {
          directive: 'fng-jq-upload-form',
          fngJqUploadForm: angular.extend({ autoUpload: true }, fngJqUploadForm),
          name: 'photo',
          schema: [
            { name: 'photo.filename', type: 'text' },
            { name: 'photo.size', type: 'number' },
          ],
          type: 'text',
          id: 'f_photo',
          label: 'Photo',
        },
      ];
      scope.record = {};
      $compile(elm)(scope);
      scope.$digest();
      $httpBackend.flush();
    });
  }

  afterEach(function () {
    elm.remove();
  });

  function widget() {
    return $(elm).find('.fileupload');
  }

  function uploadScope() {
    return angular.element(widget()[0]).scope();
  }

  it('shrinks JPEG and PNG photos to 2048px', function () {
    compile();
    expect(widget().fileupload('option', 'disableImageResize')).toBe(false);
    expect(widget().fileupload('option', 'imageMaxWidth')).toBe(2048);
    expect(widget().fileupload('option', 'imageMaxHeight')).toBe(2048);
    expect(widget().fileupload('option', 'loadImageFileTypes').test('image/jpeg')).toBe(true);
    expect(widget().fileupload('option', 'loadImageFileTypes').test('image/gif')).toBe(false);
    // a photo bigger than blueimp's 10MB default is still shrunk, rather than sent as it is
    expect(widget().fileupload('option', 'loadImageMaxFileSize')).toBeGreaterThan(30 * 1024 * 1024);
  });

  it('does not shrink photos when the field says not to', function () {
    compile({ noImageResize: true });
    expect(widget().fileupload('option', 'disableImageResize')).toBe(true);
  });

  it('takes the server\'s limit', function () {
    compile();
    expect(widget().fileupload('option', 'maxFileSize')).toBe(MAX);
    expect(widget().fileupload('option', 'messages').maxFileSize).toBe(
      'The file is too large.  The maximum permitted size is 3 megabytes.'
    );
  });

  it('has no limit when the server gives none', function () {
    compile({}, {});
    expect(widget().fileupload('option', 'maxFileSize')).toBeFalsy();
  });

  describe('a file over the limit', function () {
    var submitted;

    beforeEach(function (done) {
      compile();
      submitted = 0;
      widget().on('fileuploadsubmit', function (e) {
        submitted++;
        e.preventDefault();
      });
      widget().on('fileuploadprocessalways', function () {
        setTimeout(function () {
          scope.$digest();
          $timeout.flush();
          done();
        });
      });
      var big = new File([new Uint8Array(MAX + 1)], 'big.pdf', { type: 'application/pdf' });
      widget().fileupload('add', { files: [big] });
    });

    it('is not uploaded', function () {
      expect(submitted).toBe(0);
    });

    it('says why, and is cleared so another can be chosen', function () {
      var s = uploadScope();
      expect(s.uploadError).toBe('The file is too large.  The maximum permitted size is 3 megabytes.');
      expect(s.queue.length).toBe(0);
    });
  });

  it('uploads a file under the limit', function (done) {
    compile();
    widget().on('fileuploadsubmit', function (e) {
      e.preventDefault();
      expect(uploadScope().uploadError).toBeUndefined();
      done();
    });
    widget().fileupload('add', { files: [new File(['small'], 'small.txt', { type: 'text/plain' })] });
  });
  it('sends a large photo shrunk to 2048px', function (done) {
    compile();
    var canvas = document.createElement('canvas');
    canvas.width = 4000;
    canvas.height = 3000;
    var ctx = canvas.getContext('2d');
    // noise, so the JPEG is big, as a real photo would be
    var imageData = ctx.createImageData(4000, 3000);
    for (var i = 0; i < imageData.data.length; i++) {
      imageData.data[i] = (i * 2654435761) % 256;
    }
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob(
      function (blob) {
        var photo = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        expect(photo.size).toBeGreaterThan(MAX);
        widget().on('fileuploadsubmit', function (e, data) {
          e.preventDefault();
          var sent = data.files[0];
          expect(sent.size).toBeLessThan(photo.size);
          var img = new Image();
          img.onload = function () {
            expect(img.width).toBe(2048);
            expect(img.height).toBe(1536);
            done();
          };
          img.src = URL.createObjectURL(sent);
        });
        widget().fileupload('add', { files: [photo] });
      },
      'image/jpeg',
      0.95
    );
  });
});
