/**
 * Clickable raycaster = ClickCaster
 * @moduleName ClickCaster
 * @snippet ClickCaster()|Component
ClickCaster({})
 */
bento.define('onigiri/clickcaster', [
    'bento',
    'bento/utils',
    'bento/components/clickable',
    'onigiri/onigiri'
], function (
    Bento,
    Utils,
    Clickable,
    Onigiri
) {
    'use strict';
    var ClickCaster = function (settings) {
        // --- PARAMETERS ---
        var useOnigiriMesh = settings.useOnigiriMesh;
        var raycastMesh = settings.raycastMesh;
        var recursive = Utils.getDefault(settings.recursive, true);

        // --- VARS ---
        var viewport = Bento.getViewport();
        var raycaster = new THREE.Raycaster();

        // --- FUNCTIONS ---
        var cast = function (screenPosition, mesh) {
            //set raycast position/direction
            var castPos = new THREE.Vector2(
                ((screenPosition.x / viewport.width) - 0.5) * 2,
                ((screenPosition.y / viewport.height) - 0.5) * -2
            );
            raycaster.setFromCamera(castPos, Onigiri.camera);

            //check if we hit the mesh
            var intersects;
            if (Utils.isArray(mesh)) {
                if (mesh.length) {
                    intersects = raycaster.intersectObjects(mesh, recursive);
                } else {
                    intersects = [];
                }
            } else {
                intersects = raycaster.intersectObject(mesh, recursive);
            }
            if (intersects.length) {
                // find impact spot
                var closest = 0;
                var closeDistance = Infinity;
                for (var i = 0; i < intersects.length; i++) {
                    if (intersects[i].distance < closeDistance) {
                        closest = i;
                        closeDistance = intersects[i].distance;
                    }
                }
                return intersects[closest];
            }
            return null;
        };

        // --- COMPONENT ---
        var clickable = new Clickable({
            name: 'onigiriClickCaster',
            pointerDown: function (data) {
                if (settings.pointerDownCast) {
                    data.castData = cast(data.position, raycastMesh);
                    settings.pointerDownCast(data);
                }
                if (settings.pointerDown) {
                    settings.pointerDown(data);
                }
            },
            pointerUp: function (data) {
                if (settings.pointerUpCast) {
                    data.castData = cast(data.position, raycastMesh);
                    settings.pointerUpCast(data);
                }
                if (settings.pointerUp) {
                    settings.pointerUp(data);
                }
            },
            pointerMove: function (data) {
                if (settings.pointerMoveCast) {
                    data.castData = cast(data.position, raycastMesh);
                    settings.pointerMoveCast(data);
                }
                if (settings.pointerMove) {
                    settings.pointerMove(data);
                }
            }
        });
        return new Object({
            name: 'clickCaster',
            start: function (data) {
                data.entity.attach(clickable);
            },
            destroy: function (data) {
                data.entity.remove(clickable);
            },
            attached: function (data) {
                if (!raycastMesh) {
                    raycastMesh = useOnigiriMesh ? ClickCaster.defaultMesh : data.entity.object3D;
                }
                if (settings.attached) {
                    settings.attached(data);
                }
            },
            raycast: cast,
            setRaycastMesh: function (newMesh) {
                raycastMesh = newMesh;
            }
        });
    };

    /* Raycasts from the camera position to the pointer position on screen, checking against a specific mesh.
     * By Default it casts against 'onigiriClickCasterMesh' which is a huge invisible plane, attached to the scene on creation on Onigiri.
     * Can be used as a replacement for the Clickable concept, but has a more limited usage due to THREE's restrictions on casting.
     * @snippet ClickCaster|Clickable
Onigiri.ClickCaster({
    raycastMesh: undefined, // THREE.Mesh - used as an overide from the default
    pointerDownCast: function (data) {
        if (data.castData) {
    
        }
    },
    pointerUpCast: function (data) {

    },
    pointerMoveCast: function (data) {

    }
})
    */
   
    ClickCaster.addToOnigiri = function () {
        Onigiri.ClickCaster = ClickCaster;
        console.log("Onigiri: added Onigiri.ClickCaster");
    };

    /* @snippet ClickCaster.defaultMesh|THREE.Mesh */
    var onigiriClickCasterMesh;
    Object.defineProperty(ClickCaster, 'defaultMesh', {
        get: function () {
            if (!onigiriClickCasterMesh) {
                onigiriClickCasterMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(100000, 100000));
                onigiriClickCasterMesh.position.set(0, 0, 0);
                onigiriClickCasterMesh.rotation.set(-Math.PI * 0.5, 0, 0);
                onigiriClickCasterMesh.material.visible = false;
                Onigiri.scene.add(onigiriClickCasterMesh);
                onigiriClickCasterMesh.updateMatrixWorld(true);

            }
            return onigiriClickCasterMesh;
        },
        set: function (newMesh) {
            if (onigiriClickCasterMesh) {
                Onigiri.scene.remove(onigiriClickCasterMesh);
            }
            onigiriClickCasterMesh = newMesh;
            Onigiri.scene.add(onigiriClickCasterMesh);
        }
    });

    return ClickCaster;
});