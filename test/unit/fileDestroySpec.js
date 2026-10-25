'use strict';

describe('FileDestroyController', function () {
  beforeEach(function () {
    angular.mock.module('formsAngular');
    angular.mock.module('uploadModule');
  });

  function makeScope($rootScope, file, data) {
    var uploadScope = $rootScope.$new();
    uploadScope.dataField = function () {
      return data;
    };
    var scope = uploadScope.$new().$new().$new();
    scope.file = file;
    scope.clear = jasmine.createSpy('clear');
    scope.ngModel = { $setDirty: jasmine.createSpy('$setDirty') };
    return scope;
  }

  it('cancels a file that was never uploaded without touching the record', inject(function ($rootScope, $controller) {
    var data = [{ _id: '0123456789abcdef01234567' }];
    var file = { name: 'never-uploaded.pdf' };
    var scope = makeScope($rootScope, file, data);
    $controller('FileDestroyController', { $scope: scope });
    expect(typeof file.$cancel).toBe('function');
    expect(function () {
      file.$cancel();
    }).not.toThrow();
    expect(scope.clear).toHaveBeenCalledWith(file);
    expect(scope.ngModel.$setDirty).not.toHaveBeenCalled();
    expect(data.length).toBe(1);
  }));
});
