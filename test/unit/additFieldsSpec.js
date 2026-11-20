'use strict';

describe('FngUploadAdditFieldsCtrl', function () {
  var data, form, scope, formScope;

  beforeEach(function () {
    angular.mock.module('formsAngular');
    angular.mock.module('uploadModule');
  });

  // phase is 'ready' before the controller is created, as it is when the directive is in a tab that is only
  // compiled once it is selected
  beforeEach(inject(function ($rootScope, $controller, $timeout) {
    data = [{ filename: 'contract.pdf', caption: 'Signed contract' }];
    form = { $setDirty: jasmine.createSpy('$setDirty') };
    formScope = $rootScope.$new();
    formScope.phase = 'ready';
    formScope.topLevelFormName = 'baseForm';
    formScope.baseForm = form;
    scope = $rootScope.$new();
    scope.formScope = formScope;
    scope.uploadForm = {
      formScope: formScope,
      dataField: function () {
        return data;
      },
    };
    scope.schema = [{ name: 'caption' }];
    scope.file = 0;
    $controller('FngUploadAdditFieldsCtrl', { $scope: scope });
    scope.$digest(); // the directive is linked, and its watches initialised, before the setup $timeout runs
    $timeout.flush();
    scope.$digest();
  }));

  it('copies in the stored values without dirtying the form', function () {
    expect(scope.record.caption).toBe('Signed contract');
    expect(form.$setDirty).not.toHaveBeenCalled();
  });

  it('dirties the form and stores the value when one is changed', function () {
    scope.record.caption = 'Unsigned contract';
    scope.$digest();
    expect(form.$setDirty).toHaveBeenCalled();
    expect(data[0].caption).toBe('Unsigned contract');
  });
});
