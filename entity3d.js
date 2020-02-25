/**
 * Entity 3D for Onigiri
 * @moduleName Entity3D
 */
bento.define('onigiri/entity3d', [
    'bento',
    'bento/utils',
    'bento/entity',
    'onigiri/onigiri'
], function (
    Bento,
    Utils,
    Entity,
    Onigiri
) {
    'use strict';

    // --- 'Core Constructors' ---
    /* Intermeshes bento Entity and THREE.Object3D by creating a weird mutant hybrid, 
     * that handles hierarchical and transformational changes in THREE,  while retaining as many bento features as possible.
     * 2D transforms are entirely replaced by THREE transforms
     * @snippet Entity3D()|Constructor
        Entity3D({
            name: '$1',
            family: [''],
            object3D: ${2:null}, // THREE.object3D reference
            position: new THREE.Vector3(0, 0, 0),
            euler: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(1, 1, 1),
            components: [
                $3
            ]
        })
    */
    var Entity3D = function (settings) {
        // --- Parameters ---
        var position = settings.position || new THREE.Vector3(0, 0, 0);
        var euler = settings.euler || new THREE.Euler(0, 0, 0);
        var scale = settings.scale || new THREE.Vector3(1, 1, 1);
        var object3D = settings.object3D || new THREE.Object3D({});
        var components = settings.components || [];
        var disposeMaterial = settings.disposeMaterial || false;
        var disposeGeometry = settings.disposeGeometry || false;

        // --- Vars ---
        var parent = null;

        // --- Components ---
        var threeBehaviour = {
            name: "threeBehaviour",
            onParentAttached: function (data) {
                // attach to parent
                if (data.entity && data.entity.parent && data.entity.parent.object3D) {
                    parent = data.entity.parent.object3D;
                    parent.add(object3D);
                }
            },
            onParentRemoved: function () {
                // remove self from parent
                if (parent && parent !== Onigiri.scene) {
                    parent.remove(object3D);
                    parent = null;
                }
            },
            start: function () {
                // attach to scene
                if (!parent) {
                    parent = Onigiri.scene;
                    parent.add(object3D);
                }

            },
            destroy: function (data) {
                // remove from scene
                if (parent === Onigiri.scene) {
                    parent.remove(object3D);
                    parent = null;
                }

                // dispose
                if (disposeGeometry && object3D.geometry) {
                    object3D.geometry.dispose();
                }
                if (disposeMaterial && object3D.material) {
                    object3D.material.dispose();
                }
            }
        };
        components.unshift(threeBehaviour); // threeBehaviour is top priority

        // --- Entity ---
        var entity3D = new Entity({
            name: settings.name,
            family: settings.family
        });

        // --- Post Setup ---
        // Set transform
        object3D.position.set(position.x, position.y, position.z);
        object3D.rotation.set(euler.x, euler.y, euler.z, euler.order);
        object3D.scale.set(scale.x, scale.y, scale.z);

        // set shadows
        if (settings.castShadow || settings.receiveShadow) {
            object3D.traverse(function (o3D) {
                o3D.castShadow = Utils.getDefault(settings.castShadow, false);
                o3D.receiveShadow = Utils.getDefault(settings.receiveShadow, false);
            });
        }

        // Directly put a reference to the entity3D in the object3D. this is the object3D
        object3D.entity3D = entity3D;
        entity3D.object3D = object3D;

        // expose the visibilty of the object3D
        Object.defineProperty(entity3D, 'visible', {
            get: function () {
                return entity3D.object3D.visible;
            },
            set: function (newVisible) {
                entity3D.object3D.traverse(function (o3D) {
                    o3D.visible = newVisible;
                });
            }
        });

        // expose the position of the object3D
        Object.defineProperty(entity3D, 'position', {
            get: function () {
                return object3D.position;
            },
            set: function (newPosition) {
                object3D.position.set(newPosition.x, newPosition.y, newPosition.z);
            }
        });
        // expose euler rotation of the object3D
        Object.defineProperty(entity3D, 'euler', {
            get: function () {
                return object3D.rotation;
            },
            set: function (newEuler) {
                object3D.rotation.set(newEuler.x, newEuler.y, newEuler.z);
            }
        });
        Object.defineProperty(entity3D, 'quaternion', {
            get: function () {
                return object3D.quaternion;
            },
            set: function (newQuaternion) {
                object3D.quaternion.set(newQuaternion.x, newQuaternion.y, newQuaternion.z, newQuaternion.w);
            }
        });
        // expose the scale of the object3D
        Object.defineProperty(entity3D, 'scale', {
            get: function () {
                return object3D.scale;
            },
            set: function (newScale) {
                object3D.scale.set(newScale);
            }
        });

        Utils.forEach(components, function (component, i, l, breakLoop) {
            entity3D.attach(component);
        });

        return entity3D;
    };

    // expose to Onigiri
    Onigiri.Entity3D = Entity3D;

    /* @snippet Mesh()|Entity3D
    Mesh({
        mesh: ${1}, // direct mesh reference
        path: '${2}', // or use path to mesh asset
        position: new THREE.Vector3(0, 0, 0),
        // disposeGeometry : true,
        // disposeMaterial : true,
        // castShadow: true,
        // receiveShadow: true
    })
    */
    var Mesh = function (settings) {
        // --- Parameters ---
        var mesh = settings.mesh || settings.object3D || Onigiri.getMesh(settings.path);

        // --- Entity3D ---
        var meshEntity = new Onigiri.Entity3D({
            name: settings.name || 'onigiriMesh',
            family: settings.family,
            position: settings.position,
            euler: settings.euler,
            scale: settings.scale,
            object3D: mesh,
            disposeGeometry: settings.disposeGeometry,
            disposeMaterial: settings.disposeMaterial,
            castShadow: settings.castShadow,
            receiveShadow: settings.receiveShadow,
            components: settings.components
        });
        return meshEntity;
    };


    Entity3D.addToOnigiri = function () {
        Onigiri.Entity3D = Entity3D;
        Onigiri.Mesh = Mesh;
        console.log("Onigiri: added Onigiri.Entity3D");
    };

    return Entity3D;
});