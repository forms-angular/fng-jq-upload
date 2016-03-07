(function () {
  'use strict';
  var app = angular.module('uploadModule', [
    'blueimp.fileupload'
  ]);

  var getIdFromUrl = function (url) {
    var breakdown = /\/file\/(.+?)\/([0-9a-f]{24})/.exec(url);
    return breakdown[2];
  };

  app.directive('fngJqUploadForm', ['pluginHelper', function (pluginHelper) {
    return {
      link: function (scope, element, attrs, ngModel) {
        angular.extend(scope, pluginHelper.extractFromAttr(attrs, 'fngJqUploadForm'));
        //scope.options = {};
        // Pick up options from the mongoose schema
        scope.formScope = scope.$parent;
        scope.passedParams = scope.formScope[attrs.schema];
        angular.extend(scope.options, scope.passedParams.fngJqUploadForm);

        scope.directiveOptions.url = '/file/upload/' + scope.formScope.modelName;
        scope.directiveOptions.sizeLimit = scope.directiveOptions.sizelimit;
        scope.directiveOptions.autoUpload = scope.directiveOptions.autoupload;
        scope.name = scope.passedParams.name;
        scope.ngModel = ngModel;
      },
      restrict: 'E',
      require: '?ngModel',
      templateUrl: 'templates/fileform.html',
      scope: {},
      controller: ['$scope', function ($scope) {
        $scope.loadingFiles = false;
        $scope.formScope = $scope.$parent;

        $scope.dataField = function (initialise) {
          var retVal;
          if ($scope.info.name.indexOf('.') === -1) {
            retVal = $scope.formScope.record[$scope.info.name];
            if (!retVal && initialise) {
              retVal = $scope.formScope.record[$scope.info.name] = [];
            }
          } else if ($scope.options.subschema) {
            var modelBase = $scope.formScope.record;
            var compoundName = $scope.info.name;
            var root = $scope.options.subschemaroot;
            var lastPart = compoundName.slice(root.length + 1);

            if ($scope.options.index) {
              retVal = modelBase[root][$scope.options.index][lastPart];
            } else {
              retVal = modelBase;
              var rootParts = root.split('.');
              for (var i = 0, l = rootParts.length; i < l; i++) {
                retVal = retVal[rootParts[i]];
              }
              if ($scope.options.subkey) {
                var arrayIndex = $scope.formScope['$_arrayOffset_' + root.replace(/\./g, '_') + '_' + $scope.options.subkeyno];
                if (arrayIndex != undefined && arrayIndex !== -1) {
                  retVal = retVal[arrayIndex][lastPart];
                } else {
                  retVal = undefined;
                }
              } else {
                console.log('No support for this yet');
                //modelString += '[$index].' + lastPart;
                //idString = null;
                //nameString = compoundName.replace(/\./g, '-');
              }
            }
          } else {
            console.log('No support for this yet either');
          }
          return retVal;
        };

        function setUpAttachments() {
          var storedData = $scope.dataField();
          if (storedData) {
            for (var i = 0; i < storedData.length; i++) {
              var storedElement = storedData[i];
              var storedName = storedElement.filename;
              var queueElement = {
                'name': storedName,
                'size': storedElement.size,
                'url': '/file/' + $scope.formScope.modelName + '/' + storedElement._id,
                'deleteUrl': '/file/' + $scope.formScope.modelName + '/' + storedElement._id,
                'deleteType': 'DELETE'
              };
              switch (storedName.slice(storedName.length - 4, storedName.length)) {     // extension
                case '.gif':
                case '.png':
                case '.jpg':
                  queueElement.thumbnailUrl = '/file/' + $scope.formScope.modelName + '/thumbnail/' + storedElement._id;
                  break;
                default:
                  queueElement.thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/77/Icon_New_File_256x256.png';
              }
              $scope.$$childHead.queue.push(queueElement);
            }
          }
        }

        if (!$scope.formScope.newRecord) {
          var watchDeregister = $scope.formScope.$watch('phase', function (newVal) {
            if (newVal === 'ready') {
              $scope.$$childHead.queue = $scope.$$childHead.queue || [];
              setUpAttachments();
              $scope.$on('fngCancel', function () {
                $scope.$$childHead.queue = [];
                setUpAttachments();
              });

              watchDeregister();
            }
          });
        }

        $scope.$on('fileuploaddone', function (event, data) {
          var field = $scope.dataField(true);
          var fileDetails = data.result.files[0];
          field.push(
            {
              _id: getIdFromUrl(fileDetails.url),
              filename: fileDetails.name,
              size: fileDetails.size
            });
          $scope.ngModel.$setDirty();
        });
      }]
    };
  }])
    .controller('FileDestroyController', ['$scope', '$http', function ($scope, $http) {
      var file = $scope.file,
        state;

      $scope.uploadScope = $scope.$parent.$parent.$parent;

      var removeFromRecord = function (file) {
        var id = getIdFromUrl(file.url);
        var array = $scope.uploadScope.dataField();
        for (var i = array.length - 1; i >= 0; i--) {
          if (array[i]._id === id) {
            array.splice(i, 1);
          }
        }
        $scope.clear(file);
        $scope.ngModel.$setDirty();
      };

      if (file.url) {
        file.$state = function () {
          return state;
        };
        file.$destroy = function () {
          $scope.$parent.$parent.mouseIn = false;
          state = 'pending';
          return $http({
            url: file.deleteUrl,
            method: file.deleteType
          }).then(
            function () {
              state = 'resolved';
              removeFromRecord(file);
            },
            function () {
              state = 'rejected';
              removeFromRecord(file);
            }
          );
        };
      } else if (!file.$cancel && !file._index) {
        file.$cancel = function () {
          removeFromRecord(file);
        };
      }
    }
    ]);
})();
angular.module('uploadModule').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('templates/fileform.html',
    "<div class=\"form-group control-group\" id=cg_f_{{info.name}}><label for=f_{{info.name}} class=\"col-sm-3 control-label\">{{info.label || (info.name | titleCase)}}</label><div class=\"bs3-input col-sm-9 row-fluid\"><div class=\"col-xs-12 span12 fileupload-form\"><div class=fileupload method=POST enctype=multipart/form-data data-ng-app=demo data-file-upload=directiveOptions data-ng-class=\"{'fileupload-processing': processing() || loadingFiles}\"><div class=controls><div class=\"row fileupload-buttonbar\"><div class=\"col-md-7 span7\" style=\"min-height: 60px\"><div data-ng-show=\"directiveOptions.single && queue.length === 0\" class=pull-left><span class=\"btn btn-success fileinput-button\" ng-class=\"{disabled: disabled}\"><i class=\"glyphicon glyphicon-plus icon icon-plus\"></i> <span>Upload {{info.label || (info.name | titleCase)}}</span> <input type=file name=files ng-disabled=disabled></span></div><div data-ng-show=directiveOptions.single class=pull-left><div class=preview ng-show=!!queue[0].thumbnailUrl><a data-ng-href={{queue[0].url}} title={{queue[0].name}} download={{queue[0].name}} target=_blank data-gallery ng-mouseover=\"mouseIn=1\" ng-mouseout=\"mouseIn=0\"><img data-ng-src={{queue[0].thumbnailUrl}} alt=\"\" width=\"{{ options.width || 80 }}\" height=\"{{ options.height || 60 }}\"></a></div></div><div data-ng-show=directiveOptions.single class=\"pull-left file-delete-div\"><button ng-show=mouseIn class=\"file-delete overlay-btn\" aria-label=Delete ng-mouseover=\"mouseIn=1\" data-ng-click=queue[0].$destroy()><i class=\"glyphicon glyphicon-trash icon icon-trash\"></i></button></div><span data-ng-hide=directiveOptions.single><span class=\"btn btn-success fileinput-button\" ng-class=\"{disabled: disabled}\"><i class=\"glyphicon glyphicon-plus icon icon-plus\"></i> <span>Add files...</span> <input type=file name=files multiple ng-disabled=disabled></span></span> <button type=button data-ng-hide=directiveOptions.autoupload class=\"btn btn-primary start\" data-ng-click=submit()><i class=\"glyphicon glyphicon-upload icon icon-upload\"></i> <span>Start upload</span></button> <button ng-show=active() type=button class=\"btn btn-warning cancel\" data-ng-click=cancel()><i class=\"glyphicon glyphicon-ban icon-circle icon-ban-circle\"></i> <span>Cancel upload</span></button> <span class=fileupload-process></span></div><div class=\"col-md-5 span5 fade\" data-ng-class=\"{in: active()}\"><div class=\"progress progress-striped active\" data-file-upload-progress=progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div><div class=progress-extended>&nbsp;</div></div></div><table data-ng-hide=directiveOptions.single class=\"table table-striped files ng-cloak\"><tr data-ng-repeat=\"file in queue\"><td data-ng-switch data-on=!!file.thumbnailUrl><div class=preview data-ng-switch-when=true><a data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery><img data-ng-src={{file.thumbnailUrl}} alt=\"\" width=80 height=60></a></div><div class=preview data-ng-switch-default data-file-upload-preview=file></div></td><td><p class=name data-ng-switch data-on=!!file.url><span data-ng-switch-when=true data-ng-switch data-on=!!file.thumbnailUrl><a data-ng-switch-when=true data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery>{{file.name}}</a> <a data-ng-switch-default data-ng-href={{file.url}} title={{file.name}} download={{file.name}}>{{file.name}}</a></span> <span data-ng-switch-default>{{file.name}}</span></p><strong data-ng-show=file.error class=\"error text-danger\">{{file.error}}</strong></td><td><p class=size>{{file.size | formatFileSize}}</p><div class=\"progress progress-striped active fade\" data-ng-class=\"{pending: 'in'}[file.$state()]\" data-file-upload-progress=file.$progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div></td><td><button type=button class=\"btn btn-primary start\" data-ng-click=file.$submit() data-ng-hide=\"!file.$submit || directiveOptions.autoupload\" data-ng-disabled=\"file.$state() == 'pending' || file.$state() == 'rejected'\"><i class=\"glyphicon glyphicon-upload icon icon-upload\"></i> <span>Start</span></button> <button type=button class=\"btn btn-warning cancel\" data-ng-click=file.$cancel() data-ng-hide=!file.$cancel><i class=\"glyphicon glyphicon-ban-circle icon icon-ban-circle\"></i> <span>Cancel</span></button> <button type=button class=\"btn btn-danger destroy\" data-ng-click=file.$destroy() data-ng-hide=!file.$destroy data-ng-controller=FileDestroyController><i class=\"glyphicon glyphicon-trash icon icon-trash\"></i> <span>Delete</span></button></td></tr></table></div></div></div></div></div><div id=blueimp-gallery class=\"blueimp-gallery blueimp-gallery-controls\" data-filter=:even><div class=slides></div><h3 class=title></h3><a class=prev>‹</a> <a class=next>›</a> <a class=close>×</a> <a class=play-pause></a><ol class=indicator></ol></div>"
  );

}]);
