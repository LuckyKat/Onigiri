/**
 * A 3D trail that follows the entity it is attached to, creating a keeping clean trailing geometry
 * @moduleName Trail
 * @snippet Trail.snippet
Trail({
    nodeLength: 20, // number of total nodes
    nodeModulo: 5,   // frames between rcreation of a node
    width: 1, // width of the trail
    material: new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
    }),
    positionOffset: new THREE.Vector3(0, 0, 0),
    rotationOffset: new THREE.Quaternion()
})
 */
bento.define('onigiri/trail', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/eventsystem',
    'bento/gui/clickbutton',
    'bento/gui/counter',
    'bento/gui/text',
    'bento/utils',
    'bento/tween',
    'onigiri/entity3d',
    'onigiri/onigiri'
], function (
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    EventSystem,
    ClickButton,
    Counter,
    Text,
    Utils,
    Tween,
    Entity3D,
    Onigiri
) {
    'use strict';
    var Trail = function (settings) {
        // --- Parameters ---
        var positionOffset = settings.positionOffset;
        var rotationOffset = settings.rotationOffset;
        var nodeLength = settings.nodeLength || 20;
        var nodeModulo = settings.nodeModulo || 5;
        var width = settings.width || 1;
        var material = settings.material || new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending
        });

        // --- Variables ---
        var entity;
        var geometry;
        var mesh;


        // --- Functions ---
        var getLocalVector = function (thisVector) {
            var vec = thisVector.applyQuaternion(entity.quaternion);
            if (trail.rotationOffset) {
                vec.applyQuaternion(trail.rotationOffset);
            }
            return vec;
        };
        var setup = function () {
            var pos = entity.position.clone();
            if (trail.positionOffset) {
                pos.add(trail.positionOffset);
            }

            // trail geometry
            geometry = new THREE.Geometry();
            addFaces(pos);
            addFaces(pos);
            // make a mesh for this geo
            mesh = new THREE.Mesh(geometry, material);
            mesh.renderOrder = 1;
            geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), Infinity);

            // add to scene
            Onigiri.scene.add(mesh);
        };

        var cleanup = function () {
            //remove from scene
            Onigiri.scene.remove(mesh);
            //clean up
            if (geometry) {
                geometry.dispose();
            }
        };

        var addFaces = function (p) {
            var oldA;
            var oldB;
            if (geometry.vertices.length > 1) {
                oldA = geometry.vertices.length - 1;
                oldB = geometry.vertices.length - 2;
            }
            geometry.vertices.push(
                p.clone().add(getLocalVector(new THREE.Vector3(-trail.width * 0.5, 0, 0))),
                p.clone().add(getLocalVector(new THREE.Vector3(trail.width * 0.5, 0, 0)))
            );
            var newA = geometry.vertices.length - 1;
            var newB = geometry.vertices.length - 2;
            if (oldA !== undefined && oldB !== undefined) {
                geometry.faces.push(new THREE.Face3(newA, oldA, oldB));
                geometry.faces.push(new THREE.Face3(newA, oldB, newB));
            }
            // make the correct length
            if (geometry.faces.length > trail.nodeLength) {
                geometry.vertices.shift();
                geometry.vertices.shift();
                geometry.faces.pop();
                geometry.faces.pop();
            }
        };

        var updateFaceUVs = function (p) {
            //edit UVs
            var sizeY = (1 / trail.nodeLength);
            var sub_i = 1 - ((entity.ticker % trail.nodeModulo) / trail.nodeModulo);
            geometry.faceVertexUvs[0] = [];
            for (var i = 0; i < nodeLength; i++) {
                var ind = i + sub_i;
                var newY = ((ind + 1) * sizeY) * 2;
                var oldY = (ind * sizeY) * 2;
                geometry.faceVertexUvs[0].push([
                    new THREE.Vector2(0, 1 - newY),
                    new THREE.Vector2(0, 1 - oldY),
                    new THREE.Vector2(1, 1 - oldY)
                ]);
                geometry.faceVertexUvs[0].push([
                    new THREE.Vector2(0, 1 - newY),
                    new THREE.Vector2(1, 1 - oldY),
                    new THREE.Vector2(1, 1 - newY)
                ]);
            }
            geometry.uvsNeedUpdate = true;
        };

        var updateLastVerts = function (p) {
            if (geometry.vertices.length > 1) {
                geometry.vertices[geometry.vertices.length - 1] = p.clone().add(getLocalVector(new THREE.Vector3(trail.width * 0.5, 0, 0)));
                geometry.vertices[geometry.vertices.length - 2] = p.clone().add(getLocalVector(new THREE.Vector3(-trail.width * 0.5, 0, 0)));
                geometry.elementsNeedUpdate = true;
            }
        };

        var trail = {
            name: 'trail',
            positionOffset: positionOffset,
            rotationOffset: rotationOffset,
            nodeLength: nodeLength,
            width: width,
            nodeModulo: nodeModulo,
            start: function (data) {
                if (!entity) {
                    return;
                }
                setup();
            },
            destroy: function (data) {
                cleanup();
            },
            update: function (data) {
                if (!entity) {
                    return;
                }
                var pos = entity.position.clone();
                if (trail.positionOffset) {
                    pos.add(trail.positionOffset);
                }
                if (entity.ticker % trail.nodeModulo === 0) {
                    addFaces(pos);

                    geometry.elementsNeedUpdate = true;
                } else {
                    updateLastVerts(pos);
                }
                updateFaceUVs(pos);
            },
            attached: function (data) {
                entity = data.entity;
            }
        };
        return trail;
    };
    Trail.addToOnigiri = function () {
        Onigiri.Trail = Trail;
        console.log("Onigiri: added Onigiri.Trail");
    };
    return Trail;
});