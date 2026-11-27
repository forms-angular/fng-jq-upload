'use strict';

// A file dropped on the page must only go to the upload field it was dropped on.  blueimp's default dropZone is the
// whole document, so with several upload fields on a form (one per row of an array, say) a single drop was uploaded
// by every one of them, and each field saved its own copy.
describe('Drop zone', function () {
  var elm, scope;

  beforeEach(function () {
    angular.mock.module('formsAngular');
    angular.mock.module('uploadModule');
    angular.mock.module('templates/fileform.html');
  });

  function fieldSchema(name) {
    return {
      directive: 'fng-jq-upload-form',
      fngJqUploadForm: { autoUpload: true },
      name: name,
      schema: [
        { name: name + '.filename', type: 'text' },
        { name: name + '.size', type: 'number' },
      ],
      type: 'text',
      id: 'f_' + name,
      label: name,
    };
  }

  beforeEach(inject(function ($rootScope, $compile) {
    elm = angular.element('<div><form-input formStyle="horizontalCompact" schema="formSchema"></form-input></div>');
    angular.element(document.body).append(elm);
    scope = $rootScope;
    scope.formSchema = [fieldSchema('first'), fieldSchema('second')];
    scope.record = {};
    $compile(elm)(scope);
    scope.$digest();
  }));

  afterEach(function () {
    elm.remove();
  });

  function dropOn(target) {
    var dataTransfer = { files: [new File(['x'], 'dropped.txt', { type: 'text/plain' })] };
    $(target).trigger($.Event('drop', { originalEvent: { dataTransfer: dataTransfer, preventDefault: function () {} } }));
  }

  function countDrops() {
    var counts = [];
    $(elm).find('.fileupload').each(function (i, widget) {
      counts[i] = 0;
      $(widget).on('fileuploaddrop', function (e) {
        counts[i]++;
        // stop the widget going on to upload the file
        e.preventDefault();
      });
    });
    return counts;
  }

  it('has an upload widget per field', function () {
    expect($(elm).find('.fileupload').length).toBe(2);
  });

  it('ignores a file dropped elsewhere on the page', function () {
    var counts = countDrops();
    dropOn(document);
    expect(counts).toEqual([0, 0]);
  });

  it('gives a file dropped on a field to that field only', function () {
    var counts = countDrops();
    dropOn($(elm).find('.fileupload')[1]);
    expect(counts).toEqual([0, 1]);
  });
});
