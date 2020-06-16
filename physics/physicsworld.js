/**
 * Entity that takes care of updating the CannonJS world. Can also add Body components via this instance
 * @moduleName PhysicsWorld
 * @snippet PhysicsWorld|constructor
PhysicsWorld({
    // gravity: new CANNON.Vec3(0, -9.81, 0),
    // allowSleep: true
    // iterations: 5,
    // quatNormalizeFast: false,
    // quatNormalizeSkip: 0,
    // useContactEvents: false
})
 */
bento.define('onigiri/physics/physicsworld', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/entity',
    'bento/eventsystem',
    'bento/utils',
    'bento/tween',
    'onigiri/onigiri'
], function(
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Entity,
    EventSystem,
    Utils,
    Tween,
    Onigiri
) {
    'use strict';
    var CANNON = window.CANNON;

    if (!CANNON) {
        throw "Cannon is not loaded!";
    }

    var PhysicsWorld = function(settings) {
        /** private properties */
        var cannonWorld;
        var bodies = []; //this array is purely to keep track of body components that need to update their entity after the world has updated

        /**
         * Event listeners
         */
        var onBeginContact = function(e) {
            var bodyA = e.bodyA;
            var bodyB = e.bodyB;

            //check if these are bodies with components
            if (bodyA && bodyA.component) {
                bodyA.component._onBeginContact({
                    cannonEvent: e,
                    other: bodyB.entity,
                    self: bodyA.entity
                });
            }
            if (bodyB && bodyB.component) {
                bodyB.component._onBeginContact({
                    cannonEvent: e,
                    other: bodyA.entity,
                    self: bodyB.entity
                });
            }
        };

        /**
         * Initializes the CannonJS World
         */
        var initWorld = function() {
            cannonWorld = new CANNON.World();
            // Init physics world with some default properties
            cannonWorld.broadphase = Utils.getDefault(settings.broadphase, new CANNON.NaiveBroadphase());
            cannonWorld.gravity = Utils.getDefault(settings.gravity, new CANNON.Vec3(0, -9.81, 0));
            cannonWorld.allowSleep = Utils.getDefault(settings.allowSleep, true);
            cannonWorld.solver.iterations = Utils.getDefault(settings.iterations, 3);
            cannonWorld.quatNormalizeFast = Utils.getDefault(settings.quatNormalizeFast, false);
            cannonWorld.quatNormalizeSkip = Utils.getDefault(settings.quatNormalizeSkip, 0);

            if (settings.useContactEvents) {
                cannonWorld.addEventListener('beginContact', onBeginContact);
            }

            PhysicsWorld.current = physicsWorld;
        };

        /**
         * Destroys the CannonJS world
         */
        var destroyWorld = function() {
            PhysicsWorld.mainWorld = null;
        };

        /**
         * Updates the CannonJS world. After that, updates all the bodies attached to this world
         */
        var updateWorld = function(dt) {
            if (!cannonWorld) {
                return;
            }
            cannonWorld.step(dt);

            for (var ii = 0; ii < bodies.length; ii++) {
                bodies[ii].afterWorldUpdate();
            }
        };

        /**
         * Add a body component to this world
         */
        var addBody = function(bodyComponent) {
            if (!cannonWorld) {
                return;
            }
            var idx = bodies.indexOf(bodyComponent);
            if (idx !== -1) {
                //body already added to world! Due to our double reference set-up (body references worlds, worlds reference bodies) we always hit this, so we don't throw a warning
                return;
            }

            cannonWorld.addBody(bodyComponent.getCannonBody());
            bodies.push(bodyComponent);
        };

        /**
         * Removes a body component from this world
         */
        var removeBody = function(bodyComponent) {
            if (!cannonWorld) {
                return;
            }
            var idx = bodies.indexOf(bodyComponent);
            if (idx === -1) {
                //body already removed from world! Due to our double reference set-up (body references worlds, worlds reference bodies) we always hit this, so we don't throw a warning
                return;
            }

            cannonWorld.removeBody(bodyComponent.getCannonBody());
            bodies.splice(idx, 1);
        };

        /**
         * Simple behavior in charge of creating, updating and removing the CannonJS world
         */
        var worldUpdater = {
            name: 'worldUpdater',
            start: function(data) {
                if (PhysicsWorld.current) {
                    console.warn("Onigiri.PhysicsWorld: Yeah-no, you can't have more than a single PhysicsWorld, unless you want to hack this together");
                    return;
                }
                initWorld();
            },
            destroy: function(data) {
                destroyWorld();
            },
            update: function(data) {
                var speedFactor = 1.0; //TODO slowmo manager
                updateWorld((1 / 60) * speedFactor);
            },
            draw: function(data) {}
        };

        /**
         * Entity definition
         */
        var physicsWorld = new Entity({
            z: settings.z || 1000000000000000,
            name: 'physicsWorld',
            family: ['physics', 'game'],
            visible: false,
            updateWhenPaused: settings.updateWhenPaused || false,
            components: [
                worldUpdater
            ]
        }).extend({
            addBody: addBody,
            removeBody: removeBody
        });

        return physicsWorld;
    };
    PhysicsWorld.current = null;
    PhysicsWorld.addToOnigiri = function() {
        Onigiri.PhysicsWorld = PhysicsWorld;
        console.log("Onigiri: added Onigiri.PhysicsWorld");
    };
    return PhysicsWorld;
});