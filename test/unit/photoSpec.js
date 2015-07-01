'use strict';

describe('Photo', function () {
  var elm, scope;

  'use strict';

  beforeEach(function () {
    angular.mock.module('formsAngular');
    angular.mock.module('uploadModule');
    angular.mock.module('templates/fileform.html');
  });

  describe('Input', function () {

    beforeEach(inject(function ($rootScope, $compile) {
      elm = angular.element('<div><form-input formStyle="horizontalCompact" schema="formSchema"></form-input></div>');
      scope = $rootScope;
      scope.formSchema = {
        'directive': 'fng-jq-upload-form',
        'fngJqUploadForm': {
          'autoUpload': true,
          'sizeLimit': 524288,
          'single': true,
          'width': 100,
          'height': 100
        },
        'name': 'photo',
        'schema': [
          {
            'name': 'photo.filename',
            'type': 'text'
          },
          {
            'name': 'photo.size',
            'type': 'number'
          }
        ],
        'type': 'text',
        'id': 'f_photo',
        'label': 'Photo'
      };
      $compile(elm)(scope);
      scope.$digest();
    }));

    it('should have a label', function () {
      var label = elm.find('label');
      expect(label.text()).toBe('Photo');
      expect(label.attr('for')).toBe('f_photo');
      expect(label).toHaveClass('control-label');
    });

    //it('should have input', function () {
    //  console.log(elm['0']);
    //  var input = elm.find('input');
    //  expect(input).toHaveClass('ng-pristine');
    //  expect(input).toHaveClass('ng-valid');
    //  expect(input.attr('id')).toBe('descId');
    //  expect(input.attr('type')).toBe('text');
    //});
    //
    //it('should connect the input to the form', function () {
    //  expect(scope.myForm.descId.$pristine).toBe(true);
    //});

  });

});
