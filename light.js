/**
 * Light
 * @moduleName Light
 */
bento.define('onigiri/light', [
    'bento',
    'bento/utils',
    'onigiri/entity3d',
    'onigiri/onigiri'
], function (
    Bento,
    Utils,
    Entity3D,
    Onigiri
) {
    'use strict';
    /* @snippet Light()|Entity3D
    Light({
        type: THREE.AmbientLight,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Vector3(0, 0, 0),
        color: '#ffffff',
        intensity: 1
    })
    */
    var Light = function (settings) {
        // --- Parameters ---
        var LightType = settings.type || THREE.AmbientLight;
        var position = settings.position || new THREE.Vector3(0, 0, 0);
        var targetPosition = settings.targetPosition || new THREE.Vector3(0, 0, 0);
        var color = settings.color || '#ffffff';
        var intensity = settings.intensity || 1;

        // --- THREE Objects ---
        var lightObject = new LightType(color, intensity);
        lightObject.position.set(position.x, position.y, position.z);
        //make the target anyway
        var targetObject = new THREE.Object3D();
        targetObject.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
        lightObject.target = targetObject;

        //group to hold both
        var lightGroup = new THREE.Group();
        lightGroup.add(lightObject);
        lightGroup.add(targetObject);

        // --- Entity3D ---
        var lightEntity = new Entity3D({
            name: settings.name || 'onigiriLight',
            family: settings.family,
            disposeGeometry: false,
            disposeMaterial: false,
            object3D: lightGroup
        }).extend({
            lightObject: lightObject,
            targetObject: targetObject
        });
        return lightEntity;
    };

    Light.addToOnigiri = function () {
        Onigiri.Light = Light;
        console.log("Onigiri: added Onigiri.Light");
    };

    return Light;
});