/**
 * Helper module for collisions
 * @moduleName Collider
 */
bento.define('onigiri/collider', [
    'bento',
    'bento/math/vector2',
    'bento/eventsystem',
    'bento/utils',
    'onigiri/onigiri'
], function (
    Bento,
    Vector2,
    EventSystem,
    Utils,
    Onigiri
) {
    'use strict';
    var debug = false;

    // this exists because 'getComponentS' doesn't
    var getComponents = function (entity, name) {
        return entity.components.slice().filter(function (component) {
            return (component && component.name === name);
        });
    };

    // class isn't externally accessible - should it be?
    var Collider = function (settings) {
        // --- Parameters ---
        var type = settings.type;
        var shape = settings.shape;
        var data = settings.data || {};

        // --- Variables ---
        var parent;
        var helper;
        var checkedThisFrame = false;
        var collidedThisFrame = false;
        var uncollidedColor;

        // --- Functions ---
        //checks if this collder intersects another collider
        var intersectShape = function (thisShape, offset) {
            var didCollide = false;
            switch (type) {
            case 'box':
                didCollide = thisShape.intersectsBox(collider.getShape(offset));
                break;
            case 'sphere':
                didCollide = thisShape.intersectsSphere(collider.getShape(offset));
                break;
            case 'plane':
                didCollide = thisShape.intersectsPlane(collider.getShape(offset));
                break;
            }

            if (didCollide) {
                return didCollide;
            } else {
                return null;
            }
        };

        var intersects = function (otherCollider, offset) {
            var didCollide = false;
            switch (otherCollider.type) {
            case 'box':
                didCollide = collider.getShape(offset).intersectsBox(otherCollider.getShape());
                break;
            case 'sphere':
                didCollide = collider.getShape(offset).intersectsSphere(otherCollider.getShape());
                break;
            case 'plane':
                didCollide = collider.getShape(offset).intersectsPlane(otherCollider.getShape());
                break;
            }

            if (didCollide) {
                return otherCollider;
            } else {
                return null;
            }
        };

        // sets collider.shape based on the geometry of a specific object3D
        var generateShapeFromObject3D = function (object3D) {
            if (object3D && object3D.geometry) {
                // derive bounds from the geometry
                switch (type) {
                case 'box':
                    object3D.geometry.computeBoundingBox();
                    collider.shape = object3D.geometry.boundingBox.clone();
                    break;
                case 'sphere':
                    object3D.geometry.computeBoundingSphere();
                    collider.shape = object3D.up.geometry.boundingSphere.clone();
                    break;
                case 'plane':
                    collider.shape = new THREE.Plane(new THREE.Vector3(0, 0, 1).applyQuaternion(object3D.quaternion));
                    break;
                }

            } else {
                // we have no geometry so default to the standards from THREE
                switch (type) {
                case 'box':
                    collider.shape = new THREE.Box3();
                    break;
                case 'sphere':
                    collider.shape = new THREE.Sphere();
                    break;
                case 'plane':
                    collider.shape = new THREE.Plane();
                    break;
                }
                console.log('Onigiri:  No detected geometry for collider generation - Using default for ' + type);
            }
        };
        /**
         * Onigiri equivelant to entity.getBoundingBox returning a world scaled and translated Three Math shape 
         * @function
         * @instance
         * @param {THREE.Vector3} [offset] - An offset in world units that the shape will be moved by
         * @name collidesWith
         * @snippet #Collider.getShape|Entity/Array
            getShape(new THREE.THREE.Vector3(0, 0, 0))
         * @returns {Sphere/Box} The scaled and translated Mathematical shape
         */
        var getShape = function (offset) {
            //set default for offset
            offset = offset || new THREE.Vector3(0, 0, 0);

            // copy the base shape
            var transformedShape = collider.shape.clone();

            // get transforms
            var position = new THREE.Vector3(0, 0, 0);
            var scale = new THREE.Vector3(1, 1, 1);
            if (parent) {
                position = parent.position;
                scale = parent.scale;
            }

            switch (type) {
            case 'box':
                transformedShape.min.multiply(scale);
                transformedShape.max.multiply(scale);
                transformedShape.translate(position);
                transformedShape.translate(offset);
                if (helper) {
                    helper.box.min = transformedShape.min;
                    helper.box.max = transformedShape.max;
                }
                break;
            case 'sphere':
                transformedShape.radius *= Math.max(scale.x, scale.y);
                transformedShape.translate(position);
                transformedShape.translate(offset);
                if (helper) {
                    transformedShape.getBoundingBox(helper.box);
                }
                break;
            case 'plane':
                transformedShape.translate(position);
                if (data.offset) {
                    transformedShape.translate(data.offset);
                }
                transformedShape.translate(offset);
                if (helper) {
                    helper.box.min = new THREE.Vector3(0, 0, 0);
                    helper.box.max = new THREE.Vector3(0, 0, 0);
                }
                break;
            }
            return transformedShape;
        };

        /**
         * Checks if thiscollider is colliding with another entity's or group of entities' colliders
         * @function
         * @instance
         * @param {Object} settings
         * @param {Entity} settings.entity - The other entity
         * @param {Array} settings.entities - Or an array of entities to check with
         * @param {String} settings.family - Or the name of the family to collide with
         * @param {Entity} settings.rectangle - Or if you want to check collision with a shape directly instead of entity
         * @param {Vector2} [settings.offset] - A position offset
         * @param {CollisionCallback} [settings.onCollide] - Called when entities are colliding
         * @param {Boolean} [settings.firstOnly] - For detecting only first collision or more, default true
         * @name collidesWith
         * @snippet #Collider.collidesWith|Entity/Array
collidesWith({
    entity: obj, // when you have the reference
    entities: [], // or when colliding with this array
    family: '', // or when colliding with a family
    offset: new THREE.Vector3(0, 0, 0), // offset the collision check on original entity's position
    ignoreSelf: true, // don't detect self
    firstOnly: true, // onCollide stops after having found single collision 
    onCollide: function (other) { // fires for every successful collision
        // other is the other collder we collided with
        // onCollide is not called if no collision occurred 
    }
})
         * @returns {Array} The collided entities, otherwise null
     */
        var collidesWith = function (params) {
            var offset = params.offset || new THREE.Vector3(0, 0, 0);
            var ignoreSelf = params.ignoreSelf || false;
            var firstOnly = params.firstOnly || false;
            var onCollide = params.onCollide;
            var intersectedColliders = [];

            //debug
            checkedThisFrame = true;

            //checks this collider
            var checkCollision = function (otherCollider) {
                if (ignoreSelf && otherCollider.parent && collider.parent && collider.parent.id === otherCollider.parent.id) {
                    return null; // ignore self if we need to
                }
                var collisionResult = intersects(otherCollider, offset);
                if (collisionResult) {
                    intersectedColliders.push(collisionResult);
                    if (onCollide) {
                        onCollide(collisionResult);
                    }
                }
                return collisionResult;
            };
            //loops an array of entities and tries colliding with them all
            var loopEntityArray = function (entityArray) {
                var didCollide = false;
                // for each entity
                Utils.forEach(entityArray, function (thisEntity, i, l, breakLoop) {
                    // get all the colliders
                    var colliders = getComponents(thisEntity, 'collider');
                    // for each collider
                    Utils.forEach(colliders, function (thisCollider, ii, ll, breakLoop2) {
                        //check collision
                        if (thisCollider && checkCollision(thisCollider)) {
                            didCollide = true;
                            // cancel if needed
                            if (firstOnly) {
                                breakLoop2();
                            }
                        }
                    });
                    // cancel if needed
                    if (firstOnly && didCollide) {
                        breakLoop();
                    }
                });
            };

            // try from params
            if (params.entity) { // a specific entity
                loopEntityArray([params.entity]);
            } else if (params.entities && params.entities.length > 0) { // an array of entities
                loopEntityArray(params.entities);
            } else if (params.family && params.family.length > 0) { // a family
                loopEntityArray(Bento.objects.getByFamily(params.family));
            } else if (params.shape) {
                return intersectShape(params.shape, offset);
            }
            if (intersectedColliders.length > 0) {
                collidedThisFrame = true;
                return intersectedColliders;
            } else {
                return null;
            }
        };

        var collider = {
            name: 'collider',
            type: type,
            shape: shape,
            data: data,
            onParentAttached: function (e) {
                parent = e.entity;

                //auto generate shape from mesh if not supplied
                if (parent && parent.object3D && !this.shape) {
                    generateShapeFromObject3D(parent.object3D);
                }
            },
            start: function () {
                if (helper) {
                    Onigiri.scene.add(helper);
                }
                EventSystem.on('postUpdate', this.postUpdate);
            },
            destroy: function () {
                if (helper) {
                    Onigiri.scene.remove(helper);
                }
                EventSystem.off('postUpdate', this.postUpdate);
            },
            postUpdate: function () {
                if (helper) {
                    getShape();
                    if (collidedThisFrame) {
                        helper.material.color = new THREE.Color(0xff0000);
                    } else {
                        helper.material.color = new THREE.Color(uncollidedColor);
                    }
                    if (!checkedThisFrame) {
                        helper.box.translate(new THREE.Vector3(0, 0, 100000));
                    }
                    collidedThisFrame = false;
                    checkedThisFrame = false;
                }
            },
            getShape: getShape,
            collidesWith: collidesWith
        };

        // --- Pre Setup ---
        if (debug) {
            switch (type) {
            case 'box':
                uncollidedColor = 0xffff00; // yellow as box
                break;
            case 'sphere':
                uncollidedColor = 0x00ffff; // cyan as sphere
                break;
            }
            helper = new THREE.Box3Helper(new THREE.Box3(), uncollidedColor);
        }

        return collider;
    };

    /**
     * Makes a Box Collider Component, if a box isn't supplied it will be generated from the geometry of the entity3D it is attached to
     * @snippet Collider.BoxCollider()|Collider
        Collider.BoxCollider(new THREE.Box3(min, max));
     */
    var BoxCollider = function (box) {
        return new Collider({
            type: 'box',
            shape: box // if i am null i will be generated from the geometry
        });
    };
    /** 
     * Makes a Sphere Collider Component, if a box isn't supplied it will be generated from the geometry of the entity3D it is attached to
     * @snippet Collider.SphereCollider()|Collider
        Collider.SphereCollider(new THREE.Sphere(center, radius));
    */
    var SphereCollider = function (sphere) {
        return new Collider({
            type: 'sphere',
            shape: sphere // if i am null i will be generated from the geometry
        });
    };
    /** 
     * Makes a Plane Collider Component, if a shape isn't supplied it will be generated from the geometry of the entity3D it is attached to
     * @snippet Collider.SphereCollider()|Collider
        Collider.SphereCollider(new THREE.Sphere(center, radius));
    */
    var PlaneCollider = function (plane, width, height, offset) {
        return new Collider({
            type: 'plane',
            shape: plane, // if i am null i will be generated
            data: {
                width: width,
                height: height,
                offset: offset
            }
        });
    };
    //TODO: Investigate possible usage of Seperating Axis Theorum for versatile collisions - Perhaps just leave this to a physics engine

    Collider.BoxCollider = BoxCollider;
    Collider.SphereCollider = SphereCollider;
    Collider.PlaneCollider = PlaneCollider;

    Collider.addToOnigiri = function () {
        Onigiri.Collider = Collider;
        console.log("Onigiri: added Onigiri.Collider");
        console.log("Onigiri: added Onigiri.Collider.BoxCollider");
        console.log("Onigiri: added Onigiri.Collider.SphereCollider");
        console.log("Onigiri: added Onigiri.Collider.PlaneCollider");
    };
    return Collider;
});