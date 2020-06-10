/**
 * Onigiri Camera
 * @moduleName Camera
 * @snippet Onigiri.Camera|constructor
Onigiri.Camera({
    style: '${1:perspective}', // or orthographic
    perspectiveFieldOfView: ${2:45},
    orthographicSize: ${3:15},
    nearClippingPlane : ${4:0.1},
    farClippingPlane : ${5:1000},
    autoModifyFieldOfView : ${6:true} //if kept true, the field of view will be modified based on the screenratio (taller screens get a higher FoV).
})
 */
bento.define('onigiri/camera', [
    'bento',
    'bento/utils',
    'onigiri/onigiri',
    'bento/entity',
    'bento/eventsystem'
], function (
    Bento,
    Utils,
    Onigiri,
    Entity,
    EventSystem
) {
    'use strict';
    var Camera = function (settings) {
        var style = Utils.getDefault(settings.style, 'perspective');

        var viewport = Bento.getViewport();
        var aspectRatio = viewport.width / viewport.height;
        var isLandscape = aspectRatio > 1;

        var perspectiveFoV = Utils.getDefault(settings.perspectiveFieldOfView, 45);
        var orthographicSize = Utils.getDefault(settings.orthographicSize, 15);
        var autoModifyFoV = Utils.getDefault(settings.autoModifyFieldOfView, true); //TODO needs a better property name

        var nearClippingPlane = Utils.getDefault(settings.nearClippingPlane, 0.1);
        var farClippingPlane = Utils.getDefault(settings.farClippingPlane, 1000);

        var _camera;

        var getCorrectFoV = function () {
            var fov = perspectiveFoV;
            if (autoModifyFoV) fov = perspectiveFoV * (isLandscape ? (viewport.height / 480) : (viewport.height / 640));

            return fov;
        };

        /**
         * Creates the ThreeJS camera
         */
        var createCamera = function () {
            // setup camera
            if (style === 'perspective') {
                _camera = new THREE.PerspectiveCamera(getCorrectFoV(), aspectRatio, nearClippingPlane, farClippingPlane);
            }

            if (style === 'orthographic') {
                var width = isLandscape ? (orthographicSize) : (orthographicSize * aspectRatio);
                var height = isLandscape ? (orthographicSize / aspectRatio) : (orthographicSize);
                _camera = new THREE.OrthographicCamera(-width * 0.5, width * 0.5, height * 0.5, -height * 0.5, nearClippingPlane, farClippingPlane);
            }

            // Custom Value pertaining to the camera frustrum
            _camera.frustum = new THREE.Frustum();
        };

        /**
         * Called whenever Bento's viewport (or something else that affects the projectionMatrix) has changed
         */
        var updateViewport = function () {
            viewport = Bento.getViewport();
            aspectRatio = viewport.width / viewport.height;
            isLandscape = aspectRatio > 1;

            if (style === 'perspective') {
                _camera.fov = getCorrectFoV();
                _camera.aspect = aspectRatio;
            }

            if (style === 'orthographic') {
                var thisWidth = isLandscape ? (orthographicSize) : (orthographicSize * aspectRatio);
                var thisHeight = isLandscape ? (orthographicSize / aspectRatio) : (orthographicSize);

                _camera.left = -thisWidth * 0.5;
                _camera.right = thisWidth * 0.5;
                _camera.top = thisHeight * 0.5;
                _camera.bottom = -thisHeight * 0.5;
            }
            _camera.updateProjectionMatrix();
            updateFrustrum();
        };

        /**
         * Called every frame to update the frustrum culling bounds
         */
        var updateFrustrum = function () {
            _camera.frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(_camera.projectionMatrix, _camera.matrixWorldInverse));
        };

        /**
         * Entity definition
         */
        var entity = new Entity({
            z: settings.z || 9999, //we want a high z value, so frustrum is updated last
            name: settings.name || 'camera',
            visible: false,
            family: settings.family || ['camera'],
            components: [{
                name: 'cameraComponent',
                start: function () {
                    EventSystem.on('resize', updateViewport);
                },
                update: function () {
                    updateFrustrum();
                },
                destroy: function () {
                    EventSystem.off('resize', updateViewport);
                }
            }]
        });

        createCamera();

        //some accesors. ThreeCamera is to get access to the actual THREE node, all the others are just for convenience
        //TODO expose FoV, clipping planes
        Object.defineProperties(entity, {
            object3D: {
                get: () => _camera
            },
            position: {
                get: () => _camera.position,
                set: v => _camera.position.copy(v)
            },
            quaternion: {
                get: () => _camera.quaternion,
                set: v => _camera.quaternion.copy(v)
            },
            rotation: {
                get: () => _camera.rotation,
                set: v => _camera.rotation.copy(v)
            }
        });

        return entity;
    };

    Camera.addToOnigiri = function () {
        Onigiri.Camera = Camera;
        console.log("Onigiri: added Onigiri.Camera");
    };

    return Camera;
});