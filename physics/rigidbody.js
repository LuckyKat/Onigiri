/**
 * Component that wraps around a CannonJS body
 * @moduleName Rigidbody
 * @snippet Rigidbody|constructor
Rigidbody({
    shape : new Shape({}), // shapes: [new Shape({})],
    type : 'dynamic',
    mass : 1
})
 */
bento.define('onigiri/physics/rigidbody', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'onigiri/physics/physicsworld',
    'onigiri/physics/rigidbody'
], function(
    Bento,
    Vector2,
    Rectangle,
    Entity,
    EventSystem,
    Utils,
    PhysicsWorld,
    Rigidbody
) {
    'use strict';
    var CANNON = window.CANNON;
    if (!CANNON) {
        throw "Cannon is not loaded!";
    }

    var Rigidbody = function(settings) {
        var cannonBody;
        var entity;
        var object3D;
        var world; //keep track of the world we're attached to

        var hasInitialized = false;

        // locking of position axis
        var fixedPosition = {
            x: false,
            y: false,
            z: false
        };
        if (settings.fixedPosition) {
            if (settings.fixedPosition === true) {
                fixedPosition = {
                    x: true,
                    y: true,
                    z: true
                };
            }
            fixedPosition.x = settings.fixedPosition.x || fixedPosition.x;
            fixedPosition.y = settings.fixedPosition.y || fixedPosition.y;
            fixedPosition.z = settings.fixedPosition.z || fixedPosition.z;
        }
        var fixedPositionValues;

        //callbacks
        var onCollisionCallback = settings.onCollision || function(collisionData) {};
        var onBeginContactCallback = settings.onBeginContact || function(contactData) {};

        /**
         * This function is called by 'start' and creates the CannonJS body
         */
        var initBody = function() {
            var type = CANNON.Body.DYNAMIC;
            switch (settings.type) {
                case 'dynamic':
                default:
                    type = CANNON.Body.DYNAMIC;
                    break;
                case 'kinematic':
                    type = CANNON.Body.KINEMATIC;
                    break;
                case 'static':
                    type = CANNON.Body.STATIC;
                    break;
            }

            /** Initialization of the actual CannonJS Body */
            cannonBody = new CANNON.Body({
                mass: Utils.getDefault(settings.mass, 1),
                material: settings.material || new CANNON.Material({
                    friction: 0.01,
                    restitution: 0.2
                }),
                type: type,
                allowSleep: Utils.getDefault(settings.allowSleep, true),
                sleepSpeedLimit: Utils.getDefault(settings.sleepSpeedLimit, 0.1),
                sleepTimeLimit: Utils.getDefault(settings.sleepTimeLimit, 1),
                linearDamping: Utils.getDefault(settings.linearDamping, 0),
                angularDamping: Utils.getDefault(settings.angularDamping, 0),
                collisionFilterGroup: settings.collisionFilterGroup,
                collisionFilterMask: settings.collisionFilterMask,
                fixedRotation: Utils.getDefault(settings.fixedRotation, false)
            });

            cannonBody.position.copy(object3D.position);
            cannonBody.quaternion.copy(object3D.quaternion);

            fixedPositionValues = object3D.position.clone();

            //Add shapes
            if (settings.shape) {
                cannonBody.addShape(settings.shape.shape, settings.shape.offset, settings.shape.quaternion);
            }
            if (settings.shapes) {
                for (var ii = 0; ii < settings.shapes.length; ii++) {
                    var shape = settings.shapes[ii];
                    cannonBody.addShape(shape.shape, shape.offset, shape.quaternion);
                }
            }

            cannonBody.updateMassProperties();
            cannonBody.addEventListener('collide', onCollision);
        };

        /**
         * Event handlers
         */
        var onCollision = function(e) {
            var collisionData = {};
            collisionData.cannonEvent = e;
            collisionData.other = e.body.entity;
            collisionData.self = entity;
            onCollisionCallback(collisionData);
        };

        var onBeginContact = function(e) {
            var contactData = {};
            contactData.cannonEvent = e;
            //contactData.other = e.body.entity;
            contactData.self = entity;
            onBeginContactCallback(contactData);
        };

        /**
         * Component definition
         */
        var component = {
            name: 'body',

            matchPosition: Utils.getDefault(settings.matchPosition, true),
            matchRotation: Utils.getDefault(settings.matchRotation, true),

            start: function(data) {
                initBody();
                cannonBody.component = component;
                cannonBody.entity = entity;

                hasInitialized = true;

                world = PhysicsWorld.current;
                world.addBody(component);
            },
            destroy: function(data) {
                world.removeBody(component);
                world = undefined;
            },
            attached: function(data) {
                entity = data.entity;
                object3D = entity.object3D;
                if (!object3D) {
                    console.warn('body attached to an entity that has no object3D');
                }
            },
            /**
             * Called by the world that contains this body after it has updated the internal CannonJS world
             * This function sets the position of the entity it is attached to to reflect that of the physics simulation
             */
            afterWorldUpdate: function() {
                if (!object3D) {
                    return;
                }

                if (component.matchPosition) {
                    object3D.position.set(cannonBody.position.x, cannonBody.position.y, cannonBody.position.z);
                    if (fixedPosition.x) {
                        object3D.position.x = fixedPositionValues.x;
                        cannonBody.position.x = fixedPositionValues.x;
                        cannonBody.velocity.x = 0;
                    }
                    if (fixedPosition.y) {
                        object3D.position.y = fixedPositionValues.y;
                        cannonBody.position.y = fixedPositionValues.y;
                        cannonBody.velocity.y = 0;
                    }
                    if (fixedPosition.z) {
                        object3D.position.z = fixedPositionValues.z;
                        cannonBody.position.z = fixedPositionValues.z;
                        cannonBody.velocity.z = 0;
                    }
                }

                if (component.matchRotation) {
                    object3D.quaternion.set(cannonBody.quaternion.x, cannonBody.quaternion.y, cannonBody.quaternion.z, cannonBody.quaternion.w);
                }
            },
            /**
             * the internally used CannonJS body
             */
            getCannonBody: function() {
                return cannonBody;
            },
            /**
             * shorthand for adding force to cannon, including conversion
             */
            applyForce: function(thisForce, thisPoint) {
                cannonBody.applyForce(new CANNON.Vec3(thisForce.x, thisForce.y, thisForce.z), cannonBody.position);
            },
            /**
             * lock a body to an axis in it's current position
             */
            setFixedPosition: function(newFixedPosition) {
                var oldX = fixedPosition.x;
                var oldY = fixedPosition.y;
                var oldZ = fixedPosition.z;

                fixedPosition = newFixedPosition;

                if (fixedPosition.x && fixedPosition.x !== oldX) {
                    fixedPositionValues.x = object3D.positon.x;
                }
                if (fixedPosition.y && fixedPosition.y !== oldY) {
                    fixedPositionValues.y = object3D.positon.y;
                }
                if (fixedPosition.z && fixedPosition.z !== oldZ) {
                    fixedPositionValues.z = object3D.positon.z;
                }
            },
            /**
             * used by physics world to invoke onBeginContact when relevant
             */
            _onBeginContact: onBeginContact
        };

        /**
         *  Wrapper around the position of the cannonBody
         */
        Object.defineProperties(component, {
            position: {
                get: function() {
                    return cannonBody.position;
                },
                set: function(p) {
                    cannonBody.position.copy(p);
                }
            },
            type: {
                get: function() {
                    return undefined; // TODO
                },
                set: function(t) {
                    var type = CANNON.Body.DYNAMIC;
                    switch (t) {
                        default:
                            case 'dynamic':
                            type = CANNON.Body.DYNAMIC;
                        break;
                        case 'kinematic':
                                type = CANNON.Body.KINEMATIC;
                            break;
                        case 'static':
                                type = CANNON.Body.STATIC;
                            break;
                    }
                    cannonBody.type = type;
                }
            }
        });

        return component;
    };
    Rigidbody.addToOnigiri = function() {
        Onigiri.Rigidbody = Rigidbody;
        console.log("Onigiri: added Onigiri.Rigidbody");
    };
    return Rigidbody;
});