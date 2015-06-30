'use strict';

describe('Multiple files', function () {
  var elm, scope;

    // load the form code
    beforeEach(function () {
      angular.mock.module('formsAngular');
      angular.mock.module('uploadModule');
      angular.mock.module('templates/fileform.html');
    });

    describe('simple text input', function () {

      beforeEach(inject(function ($rootScope, $compile) {
        elm = angular.element('<div><form-input formStyle="horizontalCompact" schema="formSchema"></form-input></div>');
        scope = $rootScope;
        scope.formSchema =   {
          'help': 'Attach the scans of the interview forms - maximumm size 0.5MB',
          'directive': 'fng-jq-upload-form',
          'add': {
            'autoUpload': true,
            'sizeLimit': 524288
          },
          'name': 'interviewForms',
          'schema': [
            {
              'name': 'interviewForms.filename',
              'type': 'text'
            },
            {
              'name': 'interviewForms.size',
              'type': 'number'
            }
          ],
          'type': 'text',
          'id': 'f_interviewForms',
          'label': 'Interview Forms'
        };
        $compile(elm)(scope);
        scope.$digest();
      }));

      it('should have a label', function () {
        var label = elm.find('label');
        expect(label.text()).toBe('Interview Forms');
        expect(label.attr('for')).toBe('f_interviewForms');
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
