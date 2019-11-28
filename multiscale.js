// BROKEN NEEDS REWRITE

bento.define('onigiri/multiscale', [
    'bento/utils',
    'onigiri/onigiri'
], function (
    Utils,
    Onigiri
) {
    'use strict';
    /* @snippet Onigiri.MultiScale()|Component
    Onigiri.MultiScale({
        mesh: ${1},
        scales: {
            default: new THREE.Vector2(1, 1, 1)
        }
    })
     */
    var MultiScale = function (settings) {
        var entity;
        var mesh = settings.mesh;
        var scaleNames = []; // keep track of scale names
        var lastKnownSign = new THREE.Vector3(1, 1, 1);
        var component = {
            name: 'meshMultiScale',
            update: function (data) {
                var m = entity.mesh || mesh;
                if (m) {
                    m.scale.x = 1;
                    m.scale.y = 1;
                    m.scale.z = 1;
                    Utils.forEach(scaleNames, function (name) {
                        var scale = component[name];
                        m.scale.x *= scale.x;
                        m.scale.y *= scale.y;
                        m.scale.z *= scale.z;
                    });

                    // prevent scale from becoming 0 because Three doesn't like it
                    m.scale.x = m.scale.x || lastKnownSign.x;
                    m.scale.y = m.scale.y || lastKnownSign.y;
                    m.scale.z = m.scale.y || lastKnownSign.y;

                    lastKnownSign.x = Utils.sign(m.scale.x) || 1;
                    lastKnownSign.y = Utils.sign(m.scale.y) || 1;
                    lastKnownSign.z = Utils.sign(m.scale.z) || 1;
                }
            },
            attached: function (data) {
                entity = data.entity;
                if (settings.scales) {
                    Utils.forEach(settings.scales, function (vector, key) {
                        component.addScale(key, vector);
                    });
                }
            },
            addScale: function (name, vector) {
                if (component[name]) {
                    Utils.log("WARNING: scale " + name + " already exists");
                    return;
                }
                if (vector && (vector.x === 0 || vector.y === 0 || vector.z === 0)) {
                    if (!vector.x) {
                        vector.x = 1;
                    }
                    if (!vector.y) {
                        vector.y = 1;
                    }
                    if (!vector.z) {
                        vector.z = 1;
                    }
                    Utils.log("WARNING: passing new Vector with 0 results in errors from Three, defaulting to 1");
                }
                component[name] = vector || new THREE.Vector3(1, 1, 1);
                scaleNames.push(name);
            }
        };
        return component;
    };
    Utils.MultiScale = MultiScale;

    Utils.addToOnigiri = function () {
        Onigiri.MultiScale = MultiScale;
        console.log("Onigiri: added Onigiri.MultiScale");
    };
    return Utils;
});