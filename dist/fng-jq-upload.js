// TODO Check the filesize https://stackoverflow.com/questions/3717793/javascript-file-upload-size-validation
//  and suggest they resize if using an appropriate tool https://www.google.com/search?q=compress+photo+online+to+200kb
//  for example https://www.img2go.com/compress-image or https://www.imgonline.com.ua/eng/compress-image-size.php
//  or https://sqooush.app

(function () {
  'use strict';

  var app = angular.module('uploadModule', ['blueimp.fileupload']);

  var getIdFromUrl = function (url) {
    var breakdown = /\/file\/(.+?)\/([0-9a-f]{24})/.exec(url);
    return breakdown[2];
  };

  app
    .controller('FngUploadAdditFieldsCtrl', [
      '$scope',
      '$timeout',
      function ($scope, $timeout) {
        $scope.record = {};

        $scope.$watch(
          'record',
          function (newVal, oldVal) {
            if (newVal !== oldVal) {
              $scope.uploadForm.formScope[$scope.uploadForm.formScope.topLevelFormName].$setDirty();
              angular.extend($scope.uploadForm.dataField()[$scope.file], newVal);
            }
          },
          true
        );

        function setUpAdditFields() {
          if ($scope.schema) {
            $scope.schema.forEach(function (field) {
              var objVal = $scope.uploadForm.dataField()[$scope.file];
              $scope.record[field.name] = objVal ? objVal[field.name] : undefined;
            });
          }
        }

        function doSetUp() {
          if (!$scope.formScope.newRecord) {
            var watchDeregister = $scope.formScope.$watch('phase', function (newVal) {
              if (newVal === 'ready') {
                setUpAdditFields();
                $scope.$on('fngCancel', function () {
                  setUpAdditFields();
                });
                watchDeregister();
              }
            });
          } else {
            $scope.record = {};
            // setUpWatch();
          }
        }

        $timeout(doSetUp);
      },
    ])
    .directive('fngUploadAdditFields', function () {
      return {
        link: function (scope, element, attrs) {
          scope.uploadForm = scope.$parent.$parent.$parent;
          scope.formScope = scope.uploadForm.formScope;
          scope.schema = scope.uploadForm.directiveOptions.additFields;
          scope.file = parseInt(attrs.file);
        },
        scope: {},
        controller: 'FngUploadAdditFieldsCtrl',
        template: '<form-input formstyle="inline" schema="schema" model="record" forceform="true"></form-input>',
      };
    })
    .controller('FngJqUploadCtrl', [
      '$scope',
      '$http',
      function ($scope, $http) {
        $scope.loadingFiles = false;
        $scope.formScope = $scope.$parent;

        $scope.dataField = function (initialise) {
          var retVal;
          if ($scope.info.name.indexOf('.') === -1) {
            var record = $scope.formScope.record;
            if (record) {
              retVal = record[$scope.info.name];
            }
            if (!retVal && initialise) {
              if (!record) {
                throw new Error(`Cannot initialise record. ${$scope.info.name} - record is not defined`);
              }
              retVal = record[$scope.info.name] = [];
            }
          } else if ($scope.options.subschema) {
            var modelBase = $scope.formScope.record;
            var compoundName = $scope.info.name;
            var root = $scope.options.subschemaroot;
            var lastPart = compoundName.slice(root.length + 1);

            retVal = modelBase;
            var rootParts = root.split('.');
            for (var i = 0, l = rootParts.length; i < l; i++) {
              retVal = retVal[rootParts[i]];
            }

            var index = $scope.options.index;
            if (index === undefined) {
              index = $scope.$parent.$index; // Works for use case where file obj sits in an array
            }
            if (index !== undefined) {
              if (!retVal[index]) {
                // when setUpAttachments() is called from $scope.$on('fngCancel'...), index can refer to an array
                // element that was added, and then cancelled before ever being saved, and therefore no longer exists.
                // in this case, there's nothing we can or should be doing, so should just...
                return;
              }
              if (!retVal[index][lastPart]) {
                retVal[index][lastPart] = [];
              }
              retVal = retVal[index][lastPart];
            } else {
              if ($scope.options.subkey) {
                var arrayIndex =
                  $scope.formScope['$_arrayOffset_' + root.replace(/\./g, '_') + '_' + $scope.options.subkeyno];
                if (arrayIndex != null && arrayIndex !== undefined && arrayIndex !== -1) {
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

        function presignUrlIfNecessary(location, unsignedUrl) {
          // if we have a location and it's > 1, we assume that unsignedUrl will yield not the file itself, but rather a
          // pre-signed url which we could then use to request the file ourselves.  this allows the server to supply us with
          // a pre-signed download url (from Amazon, for example), enabling us to save on bandwidth by NOT requiring the
          // server to request the file from a 3rd-party storage service and then forwarding it onto us.
          if (location > 1) {
            return $http.get(unsignedUrl).then((response) => {
              if (response.status === 201) {
                const url = response.data.clientUrl;
                return url;
              } else {
                const msg = 'Unexpected response to getPresignedUrl (status' + response.status + ')';
                throw new Error(msg);
              }
            });            
          } else {
            return Promise.resolve(unsignedUrl);
          }
        }

        function addAttachmentUrls(addTo, location, id, filename, thumbnailId) {
          const modelAndLocation = $scope.formScope.modelName + '/' + location;
          let url = '/api/file/' + modelAndLocation + '/' + id;
          presignUrlIfNecessary(location, url).then((possiblySignedUrl) => {
            addTo.url = possiblySignedUrl;
          })
          addTo.deleteUrl = url;
          if (thumbnailId) {
            // if we have a thumbnailId, we append this such that the fileId param becomes a comma-separated list, which the back-end
            // can iterate over, deleting each of the two files using identical logic
            addTo.deleteUrl += ',' + thumbnailId;
          }
          addTo.deleteType = 'DELETE';
          addTo.thumbnailUrl = 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Iconoir_journal-page.svg'; // the default thumbnail location - might change it below
          if (filename && !$scope.options.defaultThumbnail) {
            const lc = filename.toLowerCase();
            // this list of extensions from which thumbnails can be derived is also hard-coded in fng-jq-upload server
            // (see createThumbnailStreamIfNeeded())
            for (const extRequiringThumbnail of ['.gif', '.png', '.jpg', '.jpeg']) {
              if (lc.endsWith(extRequiringThumbnail)) {
                // historically (when files were always stored in MongoDB), we didn't store the thumbnailId.  instead, we stored
                // the id of the original image in the meta data of the thumbnail image, and looked it up like that using an entirely
                // separate end-point.  Now, we do store the thumbnail id, which means we can use the same end-point whether
                // it's the original or the thumbnail that is being requested
                if (thumbnailId) {
                  const url = '/api/file/' + modelAndLocation + '/' + thumbnailId;
                  presignUrlIfNecessary(location, url).then((possiblySignedUrl) => {
                    addTo.thumbnailUrl = possiblySignedUrl;
                  });
                } else {
                  addTo.thumbnailUrl = '/api/file/' + modelAndLocation + '/thumbnail/' + id;
                }
                break;
              }
            }
          }
        }

        function assignQueueToFormScope() {
          // also provide the form scope with a reference to the queue.  this will not be reliable for forms hosting
          // more than one fng-jq-upload directive, but in all other cases, will allow the form access
          // to (for example) the delete URL, which could be useful if they want to provide their own delete option
          $scope.formScope.fngJqUploadFileQueue = $scope.$$childHead.queue;
        }

        function setUpAttachments() {
          const storedData = $scope.dataField();
          if (!storedData) {
            return;
          }
          for (const storedElement of storedData) {
            // location did not exist in the original schema.  where no value has been saved, the file is assumed to have been
            // saved to MongoDB - which is represeted by a value of 1
            const location = storedElement.location === undefined ? 1 : storedElement.location;
            const storedName = storedElement.filename;
            const queueElement = {
              name: storedName,
              size: storedElement.size,
              location,
            };
            // add the necessary urls for downloading, deleting and retrieving a thumbail for this item.
            // when a new item is added, addAttachmentUrls() will be called from the fileuploaddone listener
            addAttachmentUrls(queueElement, location, storedElement._id, storedName, storedElement.thumbnailId);
            if (!$scope.$$childHead.queue) {
              $scope.$$childHead.queue = []; // shouldn't happen, but have seen in Sentry
            }
            $scope.$$childHead.queue.push(queueElement);
          }
          assignQueueToFormScope();
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

        $scope.$on('fileuploadstart', function () {
          delete $scope.uploadError;
        });

        $scope.$on('fileuploadfail', function (event, data) {
          // clear out the failed queue item so another upload can be attempted
          $scope.$$childHead.queue = [];
          let error;
          if (data.xhr) {
            const xhr = data.xhr();
            let response;
            try {
              response = JSON.parse(xhr.responseText);
              error = response.error || response;
            } catch (e) {
              error = xhr.responseText;
            }
          }
          if (!error) {
            error = data.errorThrown || 'an unexpected error occurred';
          }
          $scope.uploadError = error;
        });

        $scope.$on('fileuploaddone', function (event, data) {
          const field = $scope.dataField(true);
          const fileDetails = data.result.files[0];
          const _id = fileDetails.id;
          const filename = fileDetails.name;
          const location = fileDetails.location;
          const thumbnailId = fileDetails.thumbnailId;
          field.push({
            _id,
            filename,
            size: fileDetails.size,
            location,
            thumbnailId,
          });
          // at the point of fileuploaddone being fired, $scope.$$childHead.queue[0] will have already been populated
          // with the details of the file provided by the server.  we just need to decorate this now with the
          // urls for downloading, deleting and retrieving a thumbnail for this item as setUpAttachments() isn't
          // called again here
          addAttachmentUrls($scope.$$childHead.queue[0], location, _id, filename, thumbnailId);
          $scope.ngModel.$setDirty();
          assignQueueToFormScope();
        });
      },
    ])
    .directive('fngJqUploadForm', [
      'PluginHelperService',
      '$rootScope',
      function (PluginHelperService, $rootScope) {
        return {
          link: function (scope, element, attrs, ngModel) {
            angular.extend(scope, PluginHelperService.extractFromAttr(attrs, 'fngJqUploadForm'));
            // Pick up options from the mongoose schema
            scope.passedParams = scope.formScope[attrs.schema];
            angular.extend(scope.options, scope.passedParams.fngJqUploadForm);
            if (scope.options.additFields) {
              scope.directiveOptions.additFields = JSON.parse(scope.options.additFields);
            }
            scope.directiveOptions.url =
              '/api/file/upload/' + scope.formScope.modelName + '/' + encodeURIComponent(scope.info.name);
            scope.directiveOptions.autoUpload = scope.directiveOptions.autoupload;
            if (scope.passedParams.readonly) {
              scope.isDisabled = true;
            } else {
              scope.isDisabled =
                typeof $rootScope.isSecurelyDisabled === 'function'
                  ? $rootScope.isSecurelyDisabled(scope.info.id)
                  : false;
            }
            scope.name = scope.passedParams.name;
            scope.ngModel = ngModel;
          },
          restrict: 'E',
          require: '?ngModel',
          templateUrl: 'templates/fileform.html',
          scope: {},
          controller: 'FngJqUploadCtrl',
        };
      },
    ])
    .controller('FileDestroyController', [
      '$scope',
      '$http',
      function ($scope, $http) {
        var file = $scope.file,
          state;

        $scope.uploadScope = $scope.$parent.$parent.$parent;

        var removeFromRecord = function (file) {
          var id = getIdFromUrl(file.deleteUrl);
          var array = $scope.uploadScope.dataField();
          for (var i = array.length - 1; i >= 0; i--) {
            if (array[i]._id === id) {
              array.splice(i, 1);
            }
          }
          $scope.clear(file);
          $scope.ngModel.$setDirty();
        };

        if (file.deleteUrl) {
          file.$state = function () {
            return state;
          };
          file.$destroy = function ($event) {
            if (!$event || !$event.target.className.includes('ng-hide')) {
              $scope.$parent.$parent.mouseIn = false;
              state = 'pending';
              return $http({
                url: file.deleteUrl,
                method: file.deleteType,
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
            }
          };
        } else if (!file.$cancel && !file._index) {
          file.$cancel = function () {
            removeFromRecord(file);
          };
        }
      },
    ]);
})();

angular.module('uploadModule').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('templates/fileform.html',
    "<div class=\"form-group control-group\" id=cg_f_{{info.name}} {{info.add}}><label for=f_{{info.name}} id={{info.name}}-label class=\"col-sm-3 control-label\">{{info.label || (info.name | titleCase)}}</label><div class=\"bs3-input col-sm-9 row-fluid\"><div class=\"col-xs-12 span12 fileupload-form\"><div class=fileupload method=POST enctype=multipart/form-data data-ng-app=demo data-file-upload=directiveOptions data-ng-class=\"{'fileupload-processing': processing() || loadingFiles}\"><div class=controls><div class=\"row fileupload-buttonbar\"><div class=\"col-md-7 span7\" style=\"min-height: 60px;\"><div data-ng-show=\"directiveOptions.single && queue.length === 0\" class=pull-left><span class=\"btn btn-success fileinput-button\" ng-class=\"{disabled: isDisabled}\"><i class=\"glyphicon glyphicon-plus icon icon-plus\"></i> <span>Upload {{info.label || (info.name | titleCase)}}</span> <input type=file name=files ng-disabled=isDisabled placeholder=\"Upload {{info.label || (info.name | titleCase)}}\"></span></div><div data-ng-show=directiveOptions.single class=pull-left><div class=preview ng-show=!!queue[0].thumbnailUrl><a data-ng-href={{queue[0].url}} title={{queue[0].name}} download={{queue[0].name}} target=_blank data-gallery ng-mouseover=\"mouseIn=1\" ng-mouseout=\"mouseIn=0\"><img data-ng-src={{queue[0].thumbnailUrl}} alt=\"\"></a></div></div><div data-ng-show=directiveOptions.single class=\"pull-left file-delete-div\"><button ng-show=\"mouseIn && !isDisabled\" class=\"file-delete overlay-btn\" aria-label=Delete ng-mouseover=\"mouseIn=1\" data-ng-click=queue[0].$destroy($event)><i class=\"glyphicon glyphicon-trash icon icon-trash\"></i></button></div><span data-ng-hide=directiveOptions.single><span class=\"btn btn-success fileinput-button\" ng-class=\"{disabled: isDisabled}\"><i class=\"glyphicon glyphicon-plus icon icon-plus\"></i> <span>Add files...</span> <input type=file name=files multiple ng-disabled=isDisabled placeholder=\"Upload {{info.label || (info.name | titleCase)}}\"> </span></span><button type=button data-ng-hide=directiveOptions.autoupload class=\"btn btn-primary start\" data-ng-click=submit()><i class=\"glyphicon glyphicon-upload icon icon-upload\"></i> <span>Start upload</span></button> <button data-ng-show=active() type=button class=\"btn btn-warning cancel\" data-ng-click=cancel()><i class=\"glyphicon glyphicon-ban icon-circle icon-ban-circle\"></i> <span>Cancel upload</span></button><div data-ng-show=uploadError style=\"padding-top: 5px;\"><span class=\"error text-danger\">{{ uploadError }}</span></div><span class=fileupload-process></span></div><div class=\"col-md-5 span5 fade\" data-ng-class=\"{in: active()}\"><div class=\"progress progress-striped active\" data-file-upload-progress=progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div><div class=progress-extended>&nbsp;</div></div></div><table data-ng-hide=directiveOptions.single class=\"table table-striped files ng-cloak\"><tr data-ng-repeat=\"file in queue\"><td data-ng-switch data-on=!!file.thumbnailUrl><div class=preview data-ng-switch-when=true><a data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery><img data-ng-src={{file.thumbnailUrl}} alt=\"\" width=80 height=60></a></div><div class=preview data-ng-switch-default data-file-upload-preview=file></div></td><td><p class=name data-ng-switch data-on=!!file.url><span data-ng-switch-when=true data-ng-switch data-on=!!file.thumbnailUrl><a data-ng-switch-when=true data-ng-href={{file.url}} title={{file.name}} download={{file.name}} target=_blank data-gallery>{{file.name}}</a> <a data-ng-switch-default data-ng-href={{file.url}} title={{file.name}} download={{file.name}}>{{file.name}}</a> </span><span data-ng-switch-default>{{file.name}}</span></p><strong data-ng-show=file.error class=\"error text-danger\">{{file.error}}</strong></td><td><p class=size>{{file.size | formatFileSize}}</p><div class=\"progress progress-striped active fade\" data-ng-class=\"{pending: 'in'}[file.$state()]\" data-file-upload-progress=file.$progress()><div class=\"progress-bar progress-bar-success\" data-ng-style=\"{width: num + '%'}\"></div></div></td><td ng-show=directiveOptions.additFields><fng-upload-addit-fields file={{$index}}></fng-upload-addit-fields></td><td><button type=button class=\"btn btn-primary start\" data-ng-click=file.$submit() data-ng-hide=\"!file.$submit || directiveOptions.autoupload\" data-ng-disabled=\"file.$state() == 'pending' || file.$state() == 'rejected'\"><i class=\"glyphicon glyphicon-upload icon icon-upload\"></i> <span>Start</span></button> <button type=button class=\"btn btn-warning cancel\" data-ng-click=file.$cancel() data-ng-hide=!file.$cancel><i class=\"glyphicon glyphicon-ban-circle icon icon-ban-circle\"></i> <span>Cancel</span></button> <button type=button class=\"btn btn-danger destroy\" data-ng-click=file.$destroy() data-ng-hide=\"!file.$destroy || isDisabled\" data-ng-controller=FileDestroyController><i class=\"glyphicon glyphicon-trash icon icon-trash\"></i> <span>Delete</span></button></td></tr></table></div></div></div></div></div>"
  );

}]);
