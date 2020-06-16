/**
 * Simple helper module to create a cannon shape
 * @moduleName Shape
 * @snippet Shape.snippet
Shape({
})
 */
bento.define('onigiri/physics/shape', [
    'bento',
    'bento/utils'
], function(
    Bento,
    Utils
) {
    'use strict';
    var CANNON = window.CANNON;
    if (!CANNON) {
        throw "Cannon is not loaded!";
    }

    return function(settings) {
        var shape = {};
        shape.offset = settings.offset || new CANNON.Vec3();
        shape.quaternion = settings.quaternion || new CANNON.Quaternion();

        switch (settings.type) {
            case 'sphere':
                shape.shape = new CANNON.Sphere(
                    Utils.getDefault(settings.radius, 1) //radius
                );
                break;

            case 'plane':
                shape.shape = new CANNON.Plane();
                break;

            case 'box':
                shape.shape = new CANNON.Box(
                    new CANNON.Vec3( //halfExtends
                        Utils.getDefault(settings.width, 1) / 2,
                        Utils.getDefault(settings.height, 1) / 2,
                        Utils.getDefault(settings.depth, 1) / 2
                    )
                );
                break;

            case 'cylinder':
                shape.shape = new CANNON.Cylinder(
                    Utils.getDefault(settings.radiusTop, Utils.getDefault(settings.radius, 1)), //radiusTop
                    Utils.getDefault(settings.radiusBottom, Utils.getDefault(settings.radius, 1)), //radiusBottom
                    Utils.getDefault(settings.height, 1), //height
                    Utils.getDefault(settings.numSegments, 8) //numSegments
                );
                shape.quaternion = shape.quaternion.mult(new CANNON.Quaternion().setFromEuler(Math.PI * 0.5, 0, 0)); // rotate cylinder 90 degrees, some reason they are made laying flat, and don't align with THREE Cylinders 🤔
                break;
            case 'convex':
            case 'particle':
            case 'heightfield':
            case 'trimesh':
            default:
                throw "unknown shape type!";
        }

        return shape;
    };
});