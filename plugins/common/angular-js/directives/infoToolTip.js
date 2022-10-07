import template from './infoToolTip.html';

export function infoToolTip(){
    return {
      restrict: 'E',
      scope: {
        info: '@',
        placement: '@'
      },
      template,
      link: function ($scope) {
        $scope.placement = $scope.placement || 'top';
      }
    };
  }
