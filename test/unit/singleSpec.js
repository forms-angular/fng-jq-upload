'use strict';

describe('Single file', function () {
  var elm, scope;

    // load the form code
    beforeEach(function () {
      angular.mock.module('formsAngular');
      angular.mock.module('uploadModule');
      angular.mock.module('templates/fileform.html');
    });

    describe('Input', function () {

      beforeEach(inject(function ($rootScope, $compile) {
        elm = angular.element('<div><form-input formStyle="horizontalCompact" schema="formSchema"></form-input></div>');
        scope = $rootScope;
        scope.formSchema =   {
          "help": "Attach the CV - maximumm size 0.5MB",
          "directive": "fng-jq-upload-form",
          "add": {
            "single": true,
            "autoUpload": true,
            "sizeLimit": 524288
          },
          "name": "CV",
          "schema": [
            {
              "name": "CV.filename",
              "type": "text"
            },
            {
              "name": "CV.size",
              "type": "number"
            }
          ],
          "type": "text",
          "id": "f_CV",
          "label": "C V"
        } ;
        $compile(elm)(scope);
        scope.$digest();
      }));

      it('should have a label', function () {
        var label = elm.find('label');
        expect(label.text()).toBe('C V');
        expect(label.attr('for')).toBe('f_CV');
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
